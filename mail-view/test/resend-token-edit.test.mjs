import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { computed, ref } from 'vue';

const source = readFileSync(
  new URL('../src/views/sys-setting/sections/registration.vue', import.meta.url),
  'utf8',
);

test('sending services is the single entry for channels and provider settings', () => {
  assert.equal(
    (source.match(/class="sys-setting-dialog sending-services-dialog"/g) || []).length,
    1,
  );
  assert.doesNotMatch(source, /send-config-dialog|showResendList|resendTokenFormShow/);
});

test('provider rows include configured domains without provider tokens', () => {
  const start = source.indexOf('const providerDomains = computed');
  const end = source.indexOf('const configurationCount', start);
  const script = source.slice(start, end);
  const setting = ref({
    sendProviders: {
      'cloudflare.example': 'cloudflare',
      'other.example': 'queensmtp',
    },
    resendTokens: { 'first.example': 'masked-resend' },
    queenTokens: { 'other.example': 'masked-queen' },
    sendflareTokens: {},
  });
  const settingStore = { domainList: ['@first.example', '@cloudflare.example'] };
  const providers = [
    { id: 'resend', field: 'resendTokens' },
    { id: 'queensmtp', field: 'queenTokens' },
    { id: 'sendflare', field: 'sendflareTokens' },
  ];
  const providerDomains = new Function(
    'computed',
    'setting',
    'settingStore',
    'providers',
    `${script}; return providerDomains;`,
  )(computed, setting, settingStore, providers);

  assert.deepEqual(providerDomains.value, [
    {
      domain: 'first.example',
      providers: [{ id: 'resend', field: 'resendTokens' }],
      value: '',
    },
    {
      domain: 'cloudflare.example',
      providers: [],
      value: 'cloudflare',
    },
    {
      domain: 'other.example',
      providers: [{ id: 'queensmtp', field: 'queenTokens' }],
      value: 'queensmtp',
    },
  ]);
});

test('provider changes use the unified sendProviders mapping', async () => {
  const setting = ref({ sendProviders: { 'first.example': 'resend' } });
  const updates = [];
  const saveProvider = new Function(
    'editSetting',
    'setting',
    'return (domain, provider) => editSetting({ sendProviders: { [domain]: provider } });',
  )(payload => {
    updates.push(payload);
    return Promise.resolve(true);
  }, setting);

  await saveProvider('cloudflare.example', 'cloudflare');
  assert.deepEqual(updates, [{
    sendProviders: { 'cloudflare.example': 'cloudflare' },
  }]);
});

function tokenEditor({ active = 'resend', confirm = async () => {}, saved = true } = {}) {
  const setting = ref({
    sendProviders: { 'first.example': active },
    sendflareTokens: { 'first.example': 'existing-token' },
  });
  const tokenForm = {
    service: 'sendflare', originalService: 'resend', domain: 'first.example', token: ' replacement-token ',
  };
  const settingLoading = ref(false);
  const tokenDialogShow = ref(true);
  const updates = [];
  const providers = source.slice(source.indexOf('const providers = ['), source.indexOf('const tokenForm ='));
  const handlers = source.slice(source.indexOf('async function saveToken()'), source.indexOf('function resetEmailPrefix()'));
  const editor = new Function(
    'tokenForm', 'setting', 'settingLoading', 'tokenDialogShow', 'editSetting', 'ElMessageBox', 't',
    `${providers}\n${handlers}\nreturn { saveToken, deleteToken };`,
  )(tokenForm, setting, settingLoading, tokenDialogShow, async payload => {
    updates.push(payload);
    return saved;
  }, { confirm }, key => key);
  return { ...editor, tokenForm, settingLoading, tokenDialogShow, updates };
}

test('switching token services updates the unified selection without replacing explicit Cloudflare', async () => {
  for (const active of ['resend', 'cloudflare', '']) {
    const editor = tokenEditor({ active });
    await editor.saveToken();
    assert.deepEqual(editor.updates, [{
      sendflareTokens: { 'first.example': 'replacement-token' },
      resendTokens: { 'first.example': '' },
      ...(active === 'resend' ? { sendProviders: { 'first.example': 'sendflare' } } : {}),
    }]);
    assert.equal(editor.tokenForm.token, '');
    assert.equal(editor.tokenDialogShow.value, false);
  }
});

test('cancelled token overwrite and in-progress settings writes do not submit changes', async () => {
  const editor = tokenEditor({ confirm: async () => { throw new Error('cancelled'); } });
  await editor.saveToken();
  assert.deepEqual(editor.updates, []);
  assert.equal(editor.tokenDialogShow.value, true);
  editor.settingLoading.value = true;
  await editor.saveToken();
  await editor.deleteToken();
  assert.deepEqual(editor.updates, []);
});

test('failed token writes retain the replacement for retry', async () => {
  const editor = tokenEditor({ saved: false });
  await editor.saveToken();
  assert.equal(editor.tokenForm.token, ' replacement-token ');
  assert.equal(editor.tokenDialogShow.value, true);
});

test('deleting after an unsaved service change still removes only the original token', async () => {
  const editor = tokenEditor({ active: 'cloudflare' });
  await editor.deleteToken();
  assert.deepEqual(editor.updates, [{ resendTokens: { 'first.example': '' } }]);
});
