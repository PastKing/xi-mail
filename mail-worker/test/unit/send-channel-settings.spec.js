import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({set: vi.fn(), permissions: [], authenticated: false, channels: {}}));
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
  vi.restoreAllMocks(); state.set.mockClear(); state.permissions = []; state.authenticated = true; state.channels = {};
  vi.spyOn(settingService, 'query').mockResolvedValue({domainList: ['@first.example'], resendTokens: {'first.example': 'fake-saved-token'}, emailPrefixFilter: []});
  vi.spyOn(settingService, 'refresh').mockResolvedValue();
  env = {admin: 'owner@example.net', EMAIL: {send: vi.fn()}, kv: {
    get: vi.fn(async key => key === KvConst.SEND_CHANNELS ? state.channels : null),
    put: vi.fn(async (key, value) => {if (key === KvConst.SEND_CHANNELS) state.channels = JSON.parse(value);}),
  }};
});

const save = data => app.request('/setting/set', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}, env);

it('requires login and setting:set, validates before writes, and persists channel selection without changing tokens', async () => {
  const data = {sendChannels: {'first.example': 'cloudflare'}, hasCloudflareEmail: true};
  state.authenticated = false;
  expect((await (await save(data)).json()).code).toBe(401);
  state.authenticated = true; state.permissions = ['setting:query'];
  expect((await (await save(data)).json()).code).toBe(403);
  expect(state.set).not.toHaveBeenCalled(); expect(env.kv.put).not.toHaveBeenCalled();
  state.permissions = ['setting:set'];
  expect((await (await save({sendChannels: {'unknown.example': 'cloudflare'}})).json()).code).not.toBe(200);
  expect(state.set).not.toHaveBeenCalled();
  delete env.EMAIL;
  expect((await (await save(data)).json()).message).toBe('cloudflareEmailNotBound');
  expect(state.set).not.toHaveBeenCalled();
  env.EMAIL = {send: vi.fn()};
  expect((await (await save(data)).json()).code).toBe(200);
  expect(state.set).toHaveBeenCalledWith({resendTokens: JSON.stringify({'first.example': 'fake-saved-token'})});
  expect(state.channels).toEqual({'first.example': 'cloudflare'});
  await save({send: 0});
  expect(state.channels).toEqual({'first.example': 'cloudflare'});
  expect(env.kv.put).toHaveBeenCalledTimes(1);
});

it('returns binding availability and selections to authorized settings readers but excludes them from public configuration', async () => {
  state.channels = {'first.example': 'cloudflare'}; state.permissions = ['setting:query'];
  const response = await app.request('/setting/query', {}, env);
  const body = await response.json();
  expect(body.data).toMatchObject({sendChannels: state.channels, hasCloudflareEmail: true});
  expect(body.data.resendTokens['first.example']).toContain('******');
  state.authenticated = false;
  const website = (await (await app.request('/setting/websiteConfig', {}, env)).json()).data;
  expect(website).not.toHaveProperty('sendChannels'); expect(website).not.toHaveProperty('hasCloudflareEmail'); expect(website).not.toHaveProperty('resendTokens');
});
