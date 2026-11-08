import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {computed, ref} from 'vue';

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

test('sender search retains sendability restrictions and the internal-only fallback', () => {
  const source = readFileSync(new URL('../src/layout/write/index.vue', import.meta.url), 'utf8');
  const handlers = source.slice(source.indexOf('const sendableAccounts ='), source.indexOf('const contacts ='));
  const accounts = ref([
    {accountId: 1, email: 'support@example.test', name: 'Support Team', canSend: true},
    {accountId: 2, email: 'internal@example.test', name: 'Internal', canSend: false},
  ]);
  const query = ref('');
  const {filteredSenderOptions, internalOnly, filterSenders, senderVisibleChange} = new Function(
    'computed', 'accountOptions', 'accountsLoaded', 'senderQuery', 'loadAccounts',
    `${handlers}; return {filteredSenderOptions, internalOnly, filterSenders, senderVisibleChange};`,
  )(computed, accounts, ref(true), query, () => {});
  filterSenders(' TEAM ');
  assert.deepEqual(filteredSenderOptions.value.map(account => account.accountId), [1]);
  filterSenders('internal');
  assert.deepEqual(filteredSenderOptions.value, []);
  assert.equal(internalOnly.value, false);
  accounts.value[0].canSend = false;
  assert.deepEqual(filteredSenderOptions.value.map(account => account.accountId), [2]);
  assert.equal(internalOnly.value, true);
  senderVisibleChange(false);
  assert.equal(query.value, '');
  assert.equal(filteredSenderOptions.value.length, 2);
});

test('account loading is single-flight and releases the name-edit lock after failure', async () => {
  const source = readFileSync(new URL('../src/layout/write/index.vue', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('async function loadAccounts()'), source.indexOf('function changeSender('));
  const form = {accountId: 1, sendEmail: 'support@example.test', name: 'Support'};
  const accounts = ref([]), loading = ref(false), loaded = ref(false), saved = ref('');
  let requests = 0, rejectRequest;
  const fetchAccounts = () => {
    requests++;
    return new Promise((resolve, reject) => { rejectRequest = reject; });
  };
  const load = new Function('form', 'accountOptions', 'accountsLoading', 'accountsLoaded', 'savedSenderName', 'fetchAccountList', 'sendableAccounts', 'changeSender', `${handler}; return loadAccounts;`)(
    form, accounts, loading, loaded, saved, fetchAccounts, computed(() => accounts.value.filter(account => account.canSend)), () => {},
  );
  const first = load();
  await load();
  assert.equal(requests, 1);
  assert.equal(loading.value, true);
  assert.equal(saved.value, 'Support');
  rejectRequest(new Error('network failure'));
  await first;
  assert.equal(loading.value, false);
  assert.equal(loaded.value, true);
  assert.deepEqual(accounts.value, [{accountId: 1, email: form.sendEmail, name: form.name}]);
});
