import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reactive, ref } from 'vue';

test('Resend edit loads the original token and submits only the selected domain', async () => {
  const source = readFileSync(new URL('../src/views/sys-setting/sections/registration.vue', import.meta.url), 'utf8');
  const handlers = source.slice(source.indexOf('async function openResendTokenForm('), source.indexOf('</script>'));
  const form = reactive({ domain: '', token: '' });
  const editing = ref(false);
  const visible = ref(false);
  const listVisible = ref(true);
  const loading = ref('');
  const updates = [];
  let succeeds = true;
  const {openResendTokenForm, resetResendTokenForm, saveResendToken} = new Function(
    'resendTokenForm', 'editingResendToken', 'resendTokenFormShow', 'settingStore', 'editSetting',
    'settingLoading', 'resendTokenLoading', 'showResendList', 'getResendToken',
    `${handlers}; return {openResendTokenForm, resetResendTokenForm, saveResendToken};`
  )(form, editing, visible, { domainList: ['@first.example'] }, async data => {
    updates.push(data);
    return succeeds;
  }, ref(false), loading, listVisible, async domain => {
    assert.equal(domain, 'second.example');
    return {token: 'fake-test-original-token'};
  });

  await openResendTokenForm({key: 'second.example', value: 'masked******'});
  assert.equal(form.domain, '@second.example');
  assert.equal(form.token, 'fake-test-original-token');
  assert.ok(editing.value && visible.value);
  form.token = '   ';
  await saveResendToken();
  assert.equal(updates.length, 0, 'blank edit must keep the existing token');
  assert.equal(visible.value, true);
  form.token = ' fake-test-replacement ';
  await saveResendToken();
  assert.deepEqual(updates, [{resendTokens: {'second.example': 'fake-test-replacement'}}]);
  assert.equal(visible.value, false);

  resetResendTokenForm();
  assert.deepEqual({...form}, {domain: '', token: ''});
  assert.equal(editing.value, false);
  await openResendTokenForm({key: 'second.example', value: 'masked******'});
  succeeds = false;
  form.token = 'fake-test-failed-save';
  await saveResendToken();
  assert.equal(visible.value, true, 'failed save must leave the dialog open');
  await openResendTokenForm();
  assert.equal(form.domain, '@first.example');
  assert.equal(form.token, '');
  assert.equal(editing.value, false);
  listVisible.value = false;
  visible.value = false;
  await openResendTokenForm({key: 'second.example', value: 'masked******'});
  assert.equal(visible.value, false, 'closed list must not open an edit dialog after the fetch');
  assert.equal(form.token, '', 'closed list must not retain the fetched token');
  assert.equal(loading.value, '');
});
