import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/layout/write/index.vue', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('async function persistExistingDraft('), source.indexOf('async function close()'));

function createPersistence(fail = false) {
  const calls = [];
  const store = {refreshList: 0};
  const database = {
    draft: {
      delete: async draftId => calls.push(['deleteDraft', draftId]),
      update: async (draftId, draft) => calls.push(['updateDraft', draftId, draft]),
    },
    att: {
      delete: async draftId => calls.push(['deleteAttachments', draftId]),
      put: async attachments => calls.push(['putAttachments', attachments]),
    },
    transaction: async (mode, drafts, attachments, callback) => {
      assert.equal(mode, 'rw');
      assert.equal(drafts, database.draft);
      assert.equal(attachments, database.att);
      if (fail) throw new Error('storage failed');
      await callback();
    },
  };
  const persist = new Function('db', 'draftStore', 'toRaw', 'dayjs', `${helper}; return persistExistingDraft;`)(
    {value: database}, store, value => value, () => ({utc: () => ({format: () => '2026-11-07 12:00:00'})}),
  );
  return {persist, calls, store};
}

test('existing CC-only drafts retain recipients and attachments', async () => {
  const {persist, calls, store} = createPersistence();
  const draft = {draftId: 7, subject: '', content: '', receiveEmail: [], cc: ['copy@example.test'], attachments: [{name: 'file.txt'}]};
  await persist(draft);
  assert.deepEqual(calls, [
    ['updateDraft', 7, {subject: '', content: '', receiveEmail: [], cc: draft.cc, createTime: '2026-11-07 12:00:00'}],
    ['putAttachments', {draftId: 7, attachments: draft.attachments}],
  ]);
  assert.equal(store.refreshList, 1);
});

test('cleared sent drafts remove both draft and attachment records', async () => {
  const {persist, calls, store} = createPersistence();
  await persist({draftId: 7, subject: '', content: '', receiveEmail: [], cc: []});
  assert.deepEqual(calls, [['deleteDraft', 7], ['deleteAttachments', 7]]);
  assert.equal(store.refreshList, 1);
  assert.match(source, /form\.cc = \[\]\s+form\.bcc = \[\]\s+await persistExistingDraft/);
});

test('storage failures propagate without reporting a refreshed draft list', async () => {
  const {persist, calls, store} = createPersistence(true);
  await assert.rejects(persist({draftId: 7, cc: ['copy@example.test']}), /storage failed/);
  assert.deepEqual(calls, []);
  assert.equal(store.refreshList, 0);
});
