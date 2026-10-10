import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { computed, reactive, watch, nextTick } from 'vue';
import { availableAccountDomains } from '../src/utils/domain-utils.js';

test('account options follow role restrictions and preserve configured order', () => {
  const domains = ['@iemao.com', '@ntun.cn', '@other.example'];
  assert.deepEqual(availableAccountDomains(domains, { role: { availDomain: 'ntun.cn' } }), ['@ntun.cn']);
  assert.deepEqual(availableAccountDomains(domains, { role: { availDomain: 'NTUN.CN,IEMAO.COM' } }), domains.slice(0, 2));
  assert.deepEqual(availableAccountDomains(domains, { role: { availDomain: '' } }), domains);
  assert.deepEqual(availableAccountDomains(domains, { type: 0, role: { availDomain: 'ntun.cn' } }), domains);
  assert.deepEqual(availableAccountDomains(domains, {}), []);
  assert.deepEqual(availableAccountDomains(domains, { role: { availDomain: 'disabled.example' } }), []);
  assert.deepEqual(availableAccountDomains([], { role: { availDomain: '' } }), []);
  assert.deepEqual(domains, ['@iemao.com', '@ntun.cn', '@other.example']);
});

test('component clears stale selections when user permissions or configured domains change', async () => {
  const state = reactive({ domains: ['@iemao.com', '@ntun.cn'], user: {} });
  const domainList = computed(() => availableAccountDomains(state.domains, state.user));
  const addForm = reactive({ suffix: '@iemao.com' });
  // Run the component's actual watcher without unrelated DOM and API setup.
  const component = readFileSync(new URL('../src/layout/account/index.vue', import.meta.url), 'utf8');
  const selectionWatcher = component.match(/watch\(domainList,[\s\S]*?\{ immediate: true \}\);/);
  assert.ok(selectionWatcher, 'component must synchronise its selected suffix');
  const stop = new Function('watch', 'domainList', 'addForm', `return ${selectionWatcher[0]}`)(watch, domainList, addForm);
  try {
    assert.equal(addForm.suffix, '');
    state.user = { role: { availDomain: 'ntun.cn' } };
    await nextTick();
    assert.equal(addForm.suffix, '@ntun.cn');
    state.user.role.availDomain = '';
    await nextTick();
    assert.equal(addForm.suffix, '@ntun.cn', 'keep a valid user choice');
    state.user.role.availDomain = 'iemao.com';
    await nextTick();
    assert.equal(addForm.suffix, '@iemao.com');
    state.domains = ['@ntun.cn'];
    await nextTick();
    assert.equal(addForm.suffix, '');
    state.user = { type: 0 };
    await nextTick();
    assert.equal(addForm.suffix, '@ntun.cn');
  } finally {
    stop();
  }
});
