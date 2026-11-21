import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ref } from 'vue';

const source = readFileSync(new URL('../src/views/sys-setting/use-sys-setting.js', import.meta.url), 'utf8');
const contextSource = source.slice(source.indexOf('function createContext()'), source.indexOf('export function useSysSetting()'));

function settingsEditor({ failFirst = false } = {}) {
  const server = {
    sendProviders: { 'sender.example': 'cloudflare' },
    domainList: ['@sender.example'],
    send: 0,
    receive: 0,
    websiteName: 'Original',
  };
  const setting = ref({});
  const writes = [];
  const context = new Function(
    'ref', 'useSettingStore', 'useAccountStore', 'useUserStore', 'storeToRefs',
    'settingQuery', 'settingSet', 'ElMessage', 'i18n', 'getCurrentInstance', 'onUnmounted', 'OAUTH_PROVIDERS',
    `${contextSource}\nreturn createContext();`,
  )(
    ref, () => ({}), () => ({}), () => ({}), () => ({ settings: setting }),
    async () => structuredClone(server), async payload => {
      writes.push(structuredClone(payload));
      if (failFirst && writes.length === 1) throw new Error('Save failed');
      Object.assign(server, structuredClone(payload));
    }, () => {}, { global: { t: key => key } }, () => null, () => {}, [],
  );
  return { context, setting, writes, server };
}

test('queued setting saves preserve unsaved edits and explicit Cloudflare routing', async () => {
  const { context, setting, writes } = settingsEditor();
  await context.getSettings();
  setting.value.websiteName = 'Unsaved';
  setting.value.send = 1;
  const first = context.change('send');
  setting.value.receive = 1;
  const second = context.change('receive');
  assert.equal(context.isSaving('send', 'receive'), true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  await context.getSettings();
  assert.deepEqual(writes, [{ send: 1 }, { receive: 1 }]);
  assert.equal(setting.value.websiteName, 'Unsaved');
  assert.deepEqual(setting.value.sendProviders, { 'sender.example': 'cloudflare' });
  assert.equal(context.isSaving('send', 'receive'), false);
});

test('failed queued saves roll back only their own field without blocking later saves', async () => {
  const { context, setting } = settingsEditor({ failFirst: true });
  await context.getSettings();
  setting.value.send = 1;
  const first = context.change('send');
  setting.value.receive = 1;
  const second = context.change('receive');
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  assert.equal(setting.value.send, 0);
  assert.equal(setting.value.receive, 1);
  assert.equal(context.settingLoading.value, false);
});

test('unrelated setting changes never resubmit provider routing or binding metadata', async () => {
  const { context, setting, writes } = settingsEditor();
  await context.getSettings();
  setting.value.sendProviders = { 'sender.example': 'resend' };
  setting.value.websiteName = 'Updated';
  assert.equal(await context.change(), true);
  assert.deepEqual(writes, [{ websiteName: 'Updated' }]);
});
