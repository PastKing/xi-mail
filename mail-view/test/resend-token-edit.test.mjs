import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reactive, ref } from 'vue';

test('Resend edit submits only the selected domain and never reuses the masked token', async () => {
  const source = readFileSync(new URL('../src/views/sys-setting/sections/registration.vue', import.meta.url), 'utf8');
  const handlers = source.slice(source.indexOf('function openResendTokenForm('), source.indexOf('</script>'));
  const form = reactive({ domain: '', token: '' });
  const editing = ref(false);
  const visible = ref(false);
  const updates = [];
  let succeeds = true;
  const {openResendTokenForm, resetResendTokenForm, saveResendToken} = new Function(
    'resendTokenForm', 'editingResendToken', 'resendTokenFormShow', 'settingStore', 'editSetting',
    `${handlers}; return {openResendTokenForm, resetResendTokenForm, saveResendToken};`
  )(form, editing, visible, { domainList: ['@first.example'] }, async data => {
    updates.push(data);
    return succeeds;
  });

  openResendTokenForm({key: 'second.example', value: 'masked******'});
  assert.equal(form.domain, '@second.example');
  assert.equal(form.token, '');
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
  openResendTokenForm({key: 'second.example', value: 'masked******'});
  succeeds = false;
  form.token = 'fake-test-failed-save';
  await saveResendToken();
  assert.equal(visible.value, true, 'failed save must leave the dialog open');
  openResendTokenForm();
  assert.equal(form.domain, '@first.example');
  assert.equal(form.token, '');
  assert.equal(editing.value, false);
});
