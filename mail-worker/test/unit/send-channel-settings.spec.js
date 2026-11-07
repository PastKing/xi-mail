import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({set: vi.fn(), permissions: [], authenticated: false}));
vi.mock('../../src/entity/orm', () => ({default: () => ({update: () => ({set: data => {
  state.set(data); return {returning: () => ({get: async () => ({})})};
}})})}));
vi.mock('../../src/service/r2-service', () => ({default: {storageType: async () => 'r2'}}));
vi.mock('../../src/service/verify-record-service', () => ({default: {selectListByIP: async () => []}}));
vi.mock('../../src/utils/jwt-utils', () => ({default: {verifyToken: async () => state.authenticated ? {userId: 1, token: 'test'} : null}}));
vi.mock('../../src/service/session-service', () => ({default: {
  get: async () => ({tokens: ['test'], user: {userId: 1, email: 'editor@example.net'}, refreshTime: new Date().toISOString()}),
  isExpired: () => false, touch: () => false,
}}));
vi.mock('../../src/service/user-service', () => ({default: {}}));
vi.mock('../../src/service/perm-service', () => ({default: {userPermKeys: async () => state.permissions}}));
vi.mock('../../src/i18n/i18n', () => ({t: key => key}));

import settingService from '../../src/service/setting-service';
import app from '../../src/hono/hono';
import '../../src/security/security';
import '../../src/api/setting-api';
import KvConst from '../../src/const/kv-const';

let env;
beforeEach(() => {
  vi.restoreAllMocks(); state.set.mockClear(); state.permissions = []; state.authenticated = true;
  vi.spyOn(settingService, 'query').mockResolvedValue({
    domainList: ['@first.example'],
    resendTokens: {'first.example': 'fake-saved-token'},
    queenTokens: {},
    sendProviders: {},
    sendflareTokens: {},
    emailPrefixFilter: [],
  });
  vi.spyOn(settingService, 'refresh').mockResolvedValue();
  env = {admin: 'owner@example.net', EMAIL: {send: vi.fn()}, kv: {
    get: vi.fn(async () => null),
    put: vi.fn(),
  }};
});

const save = data => app.request('/setting/set', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}, env);

it('migrates legacy Cloudflare selection without overriding a newer provider choice', async () => {
  const run = vi.fn();
  const bind = vi.fn(() => ({run}));
  const c = {env: {
    db: {prepare: vi.fn(() => ({bind}))},
    kv: {
      get: vi.fn().mockResolvedValue({'first.example': 'cloudflare', 'other.example': 'resend'}),
      delete: vi.fn(),
    },
  }};

  await expect(settingService.migrateSendChannels(c, {'other.example': 'queensmtp'}))
    .resolves.toEqual({'first.example': 'cloudflare', 'other.example': 'queensmtp'});
  expect(c.env.db.prepare).toHaveBeenCalledWith('UPDATE setting SET send_providers = ?');
  expect(JSON.parse(bind.mock.calls[0][0])).toEqual({
    'first.example': 'cloudflare',
    'other.example': 'queensmtp',
  });
  expect(run).toHaveBeenCalled();
  expect(c.env.kv.delete).toHaveBeenCalledWith(KvConst.SEND_CHANNELS);
});

it('requires login and setting:set, validates before writes, and persists the unified provider selection', async () => {
  const data = {sendProviders: {'first.example': 'cloudflare'}, hasCloudflareEmail: true};
  state.authenticated = false;
  expect((await (await save(data)).json()).code).toBe(401);
  state.authenticated = true; state.permissions = ['setting:query'];
  expect((await (await save(data)).json()).code).toBe(403);
  expect(state.set).not.toHaveBeenCalled(); expect(env.kv.put).not.toHaveBeenCalled();
  state.permissions = ['setting:set'];
  expect((await (await save({sendProviders: {'unknown.example': 'cloudflare'}})).json()).code).not.toBe(200);
  expect(state.set).not.toHaveBeenCalled();
  delete env.EMAIL;
  expect((await (await save(data)).json()).message).toBe('cloudflareEmailNotBound');
  expect(state.set).not.toHaveBeenCalled();
  env.EMAIL = {send: vi.fn()};
  expect((await (await save(data)).json()).code).toBe(200);
  expect(state.set).toHaveBeenCalledWith({
    resendTokens: JSON.stringify({'first.example': 'fake-saved-token'}),
    queenTokens: '{}',
    sendProviders: JSON.stringify({'first.example': 'cloudflare'}),
  });
  await save({send: 0});
  expect(env.kv.put).not.toHaveBeenCalled();
});

it('returns binding availability and unified selections to authorized settings readers but excludes them from public configuration', async () => {
  state.permissions = ['setting:query'];
  settingService.get = vi.fn().mockResolvedValue({
    sendProviders: {'first.example': 'cloudflare'},
    hasCloudflareEmail: true,
    resendTokens: {'first.example': 'token******'},
  });
  const response = await app.request('/setting/query', {}, env);
  const body = await response.json();
  expect(body.data).toMatchObject({sendProviders: {'first.example': 'cloudflare'}, hasCloudflareEmail: true});
  expect(body.data.resendTokens['first.example']).toContain('******');
  state.authenticated = false;
  settingService.websiteConfig = vi.fn().mockResolvedValue({});
  const website = (await (await app.request('/setting/websiteConfig', {}, env)).json()).data;
  expect(website).not.toHaveProperty('sendProviders'); expect(website).not.toHaveProperty('hasCloudflareEmail'); expect(website).not.toHaveProperty('resendTokens');
});
