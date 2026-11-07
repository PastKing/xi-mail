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
    sendChannels: { 'cloudflare.example': 'cloudflare' },
    sendProviders: { 'other.example': 'queensmtp' },
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
      channel: 'resend',
      providers: [{ id: 'resend', field: 'resendTokens' }],
      value: '',
    },
    {
      domain: 'cloudflare.example',
      channel: 'cloudflare',
      providers: [],
      value: '',
    },
    {
      domain: 'other.example',
      channel: 'resend',
      providers: [{ id: 'queensmtp', field: 'queenTokens' }],
      value: 'queensmtp',
    },
  ]);
});

test('channel changes preserve other domain choices', async () => {
  const start = source.indexOf('function saveSendChannel');
  const end = source.indexOf('const authRefreshOptions', start);
  const script = source.slice(start, end);
  const setting = ref({ sendChannels: { 'first.example': 'resend' } });
  const updates = [];
  const saveSendChannel = new Function(
    'editSetting',
    'setting',
    `${script}; return saveSendChannel;`,
  )(payload => {
    updates.push(payload);
    return Promise.resolve(true);
  }, setting);

  await saveSendChannel('cloudflare.example', 'cloudflare');
  assert.deepEqual(updates, [{
    sendChannels: {
      'first.example': 'resend',
      'cloudflare.example': 'cloudflare',
    },
  }]);
});
