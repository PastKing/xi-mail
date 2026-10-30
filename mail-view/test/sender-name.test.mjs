import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {ref} from 'vue';

test('composer saves names per sender, keeps failed edits, and clears only the selected name', async () => {
  const source = readFileSync(new URL('../src/layout/write/index.vue', import.meta.url), 'utf8');
  const handlers = source.slice(source.indexOf('function changeSender('), source.indexOf('const openSelect ='));
  const form = {accountId: 1, name: 'support'};
  const accounts = ref([{accountId: 1, email: 'support@example.com', name: 'support'}, {accountId: 2, email: 'sales@example.com', name: 'sales'}]);
  const saved = ref('support'), loading = ref(false), fetching = ref(false);
  const user = {user: {account: {accountId: 1}, name: 'support'}};
  const store = {currentAccount: {accountId: 1}};
  const calls = [];
  let fail = false;
  const {saveSenderName, changeSender} = new Function('form', 'accountOptions', 'savedSenderName', 'senderNameLoading', 'accountsLoading', 'accountSetName', 'accountStore', 'userStore', 'ElMessage', 't', `${handlers};return {saveSenderName,changeSender}`)(
    form, accounts, saved, loading, fetching, async (id, name) => {
      calls.push({id, name});
      if (fail) throw new Error('save failed');
      return {name: name || accounts.value.find(item => item.accountId === id).email.split('@')[0]};
    }, store, user, () => {}, key => key);
  form.name = ' 客服 ';
  assert.equal(await saveSenderName(), true);
  assert.equal(user.user.name, '客服');
  changeSender(2);
  assert.equal(form.name, 'sales');
  form.name = '销售部';
  assert.equal(await saveSenderName(), true);
  assert.deepEqual(calls, [{id: 1, name: '客服'}, {id: 2, name: '销售部'}]);
  assert.equal(user.user.name, '客服');
  assert.equal(accounts.value[0].name, '客服');
  fail = true;
  form.name = '失败后的编辑';
  assert.equal(await saveSenderName(), false);
  assert.equal(accounts.value[1].name, '销售部');
  assert.equal(form.name, '失败后的编辑');
  assert.equal(loading.value, false);
  fail = false;
  form.name = '';
  assert.equal(await saveSenderName(), true);
  assert.equal(form.name, 'sales');
  changeSender(1);
  assert.equal(form.name, '客服');
});
