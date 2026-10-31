import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ permissions: [], authenticated: false, saved: null }));
vi.mock('../../src/utils/jwt-utils', () => ({ default: { verifyToken: async () => state.authenticated ? { userId: 1, token: 'test' } : null } }));
vi.mock('../../src/service/session-service', () => ({ default: {
	get: async () => ({ tokens: ['test'], user: { userId: 1, email: 'editor@example.net' }, refreshTime: new Date().toISOString() }),
	isExpired: () => false, touch: () => false,
} }));
vi.mock('../../src/service/user-service', () => ({ default: {} }));
vi.mock('../../src/service/perm-service', () => ({ default: { userPermKeys: async () => state.permissions } }));
vi.mock('../../src/i18n/i18n', () => ({ t: key => key }));
import app from '../../src/hono/hono';
import '../../src/security/security';
import '../../src/api/setting-api';
import settingService from '../../src/service/setting-service';
import KvConst from '../../src/const/kv-const';

let env;
beforeEach(() => {
	vi.restoreAllMocks();
	state.authenticated = true; state.permissions = []; state.saved = null;
	env = { admin: 'owner@example.net', kv: {
		get: vi.fn(async key => key === KvConst.WECOM ? state.saved : null),
		put: vi.fn(async (key, value) => { state.saved = JSON.parse(value); }),
	} };
});
const request = (path, method = 'GET', data) => app.request(`/setting/wecom/${path}`, {
	method, headers: { 'Content-Type': 'application/json' },
	...(data ? { body: JSON.stringify(data) } : {}),
}, env);

it('enforces login, read permission, and separate save/test permissions', async () => {
	state.authenticated = false;
	for (const [path, method] of [['query', 'GET'], ['set', 'PUT'], ['test', 'POST']]) {
		expect((await (await request(path, method, method === 'GET' ? undefined : {})).json()).code).toBe(401);
	}
	state.authenticated = true;
	expect((await (await request('query')).json()).code).toBe(403);
	state.permissions = ['setting:query'];
	const read = await request('query');
	expect((await read.json()).data).toEqual({ enabled: false, hasWebhook: false, webhookUrl: '' });
	expect(read.headers.get('cache-control')).toBe('no-store');
	for (const [path, method] of [['set', 'PUT'], ['test', 'POST']]) {
		expect((await (await request(path, method, { enabled: false })).json()).code).toBe(403);
	}
	expect(env.kv.put).not.toHaveBeenCalled();
	state.permissions = ['setting:set'];
	const savedUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=fake-secret-1234567890';
	expect((await (await request('set', 'PUT', { enabled: true, webhookUrl: savedUrl })).json()).code).toBe(200);
	const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ errcode: 0 }));
	expect((await (await request('test', 'POST', {})).json()).code).toBe(200);
	expect(fetchMock).toHaveBeenCalledOnce();
	fetchMock.mockResolvedValue(Response.json({ errcode: 93000, errmsg: 'key=fake-secret-1234567890' }));
	const failedTest = await (await request('test', 'POST', {})).json();
	expect(failedTest.message).toBe('wecomSendFailedDetails');
	expect(JSON.stringify(failedTest)).not.toContain('fake-secret-1234567890');
	state.permissions = ['setting:query'];
	const body = await (await request('query')).json();
	expect(body.data).toEqual({ enabled: true, hasWebhook: true, webhookUrl: savedUrl });
	expect(body.data.webhookUrl).toBe(savedUrl);
});

it('does not include WeCom configuration in public site settings', async () => {
	vi.spyOn(settingService, 'get').mockResolvedValue({ domainList: [], wecom: { webhookUrl: 'fake-secret' } });
	state.authenticated = false;
	const response = await app.request('/setting/websiteConfig', {}, env);
	const body = await response.json();
	expect(body.code).toBe(200);
	expect(JSON.stringify(body)).not.toContain('fake-secret');
	expect(body.data).not.toHaveProperty('wecom');
});
