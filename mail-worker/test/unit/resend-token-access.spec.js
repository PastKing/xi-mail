import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const state = vi.hoisted(() => ({ authenticated: false, permissions: [], email: 'editor@example.com', getToken: vi.fn() }));
vi.mock('../../src/utils/jwt-utils', () => ({default: {verifyToken: async () => state.authenticated ? {userId: 1, token: 'test-session'} : null}}));
vi.mock('../../src/service/session-service', () => ({default: {
  get: async () => ({tokens: ['test-session'], user: {userId: 1, email: state.email}, refreshTime: new Date().toISOString()}),
  isExpired: () => false, touch: () => false, save: vi.fn()
}}));
vi.mock('../../src/service/perm-service', () => ({default: {userPermKeys: async () => state.permissions}}));
vi.mock('../../src/service/user-service', () => ({default: {updateUserInfo: vi.fn()}}));
vi.mock('../../src/service/setting-service', () => ({default: {getResendToken: state.getToken}}));
vi.mock('../../src/i18n/i18n', () => ({t: key => key}));

import app from '../../src/hono/hono';
import '../../src/security/security';
import '../../src/api/setting-api';

beforeEach(() => {
  state.authenticated = false;
  state.permissions = [];
  state.email = 'editor@example.com';
  state.getToken.mockReset().mockResolvedValue({token: 'fake-test-original-token'});
});

it('only setting editors or the configured administrator can read a token, with no caching', async () => {
  const request = () => app.request('/setting/resendToken?domain=second.example', {}, {admin: 'owner@example.com'});
  expect((await (await request()).json()).code).toBe(401);
  state.authenticated = true;
  state.permissions = ['setting:query'];
  expect((await (await request()).json()).code).toBe(403);
  expect(state.getToken).not.toHaveBeenCalled();
  state.permissions = ['setting:set'];
  const response = await request();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect((await response.json()).data).toEqual({token: 'fake-test-original-token'});
  expect(state.getToken.mock.calls[0][1]).toBe('second.example');
  state.permissions = [];
  state.email = 'owner@example.com';
  expect((await (await request()).json()).code).toBe(200);
});

it('the actual service method returns only the selected token and excludes inherited properties', async () => {
  const source = readFileSync(new URL('../../src/service/setting-service.js', import.meta.url), 'utf8');
  const body = source.match(/async getResendToken\(c, domain\) \{([\s\S]*?)\n\t\},/)[1];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const get = new AsyncFunction('c', 'domain', body);
  const tokens = {'first.example': 'fake-first-token', 'second.example': 'fake-second-token'};
  const context = {query: async () => ({resendTokens: tokens})};
  expect(await get.call(context, {}, 'second.example')).toEqual({token: 'fake-second-token'});
  expect(await get.call(context, {}, 'missing.example')).toEqual({token: ''});
  expect(await get.call(context, {}, '__proto__')).toEqual({token: ''});
  expect(tokens['first.example']).toBe('fake-first-token');
});
