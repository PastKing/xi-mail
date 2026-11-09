import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import worker from '../../src/index';
import jwt from '../../src/utils/jwt-utils';
import sessionService from '../../src/service/session-service';
import permService from '../../src/service/perm-service';
import { ensureFeaturePermissions, FEATURE_PERMISSIONS } from '../../src/service/feature-permission-service';
import flare from '../../src/service/sendflare-service';
import emailService from '../../src/service/email-service';
import userService from '../../src/service/user-service';
import roleService from '../../src/service/role-service';
import transfer from '../../src/service/account-transfer-service';
import rate from '../../src/service/security-rate-limit-service';

let db, c, store, permissions, remote;
function adapter(db) {
	const prepare = (sql, args = []) => ({
		bind: (...values) => prepare(sql, values),
		run: async () => ({ meta: db.prepare(sql).run(...args) }),
		first: async () => db.prepare(sql).get(...args) || null,
		all: async () => ({ results: db.prepare(sql).all(...args) }),
		raw: async () => {
			const s = db.prepare(sql);
			s.setReturnArrays(true);
			return s.all(...args);
		},
		execute: () =>
			/\bRETURNING\b|^SELECT/i.test(sql) ? { results: db.prepare(sql).all(...args) } : { meta: db.prepare(sql).run(...args) },
	});
	return {
		prepare,
		batch: async (statements) => {
			db.exec('BEGIN');
			try {
				const results = statements.map((s) => s.execute());
				db.exec('COMMIT');
				return results;
			} catch (e) {
				db.exec('ROLLBACK');
				throw e;
			}
		},
	};
}
beforeEach(() => {
	db = new DatabaseSync(':memory:');
	store = new Map();
	permissions = [];
	db.exec(`CREATE TABLE perm(perm_id INTEGER PRIMARY KEY,name TEXT,perm_key TEXT,pid INTEGER,type INTEGER,sort INTEGER);
    CREATE TABLE account(account_id INTEGER PRIMARY KEY,user_id INTEGER,email TEXT,is_del INTEGER DEFAULT 0);
    CREATE TABLE email(email_id INTEGER PRIMARY KEY,account_id INTEGER,user_id INTEGER);
    CREATE TABLE attachments(att_id INTEGER PRIMARY KEY,account_id INTEGER,user_id INTEGER);
    CREATE TABLE account_transfer(transfer_id INTEGER PRIMARY KEY,account_id INTEGER,account_email TEXT,from_user_id INTEGER,to_user_id INTEGER,status INTEGER,create_time TEXT);`);
	c = {
		env: {
			db: adapter(db),
			admin: 'admin@local.example',
			jwt_secret: 'ABcdefghijklmnopqrstuvwxyz0123456789-Session-Key',
			kv: {
				get: async (key, options) => (store.has(key) ? (options?.type === 'json' ? JSON.parse(store.get(key)) : store.get(key)) : null),
				put: async (key, value) => store.set(key, value),
				delete: async (key) => store.delete(key),
			},
		},
		req: { header: () => '', url: 'https://local.example' },
		get: () => undefined,
	};
	vi.spyOn(rate, 'consume').mockResolvedValue(undefined);
	vi.spyOn(permService, 'userPermKeys').mockImplementation(async () => permissions);
	remote = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'));
});
afterEach(() => {
	vi.restoreAllMocks();
	db.close();
});
describe('SendFlare provider', () => {
	const form = () => ({ from: 'owned@local.example', to: ['one@outside.example'], subject: 'Test', html: '<p>Body</p>', attachments: [] });
	it('uses the official single-send API, owned sender and normal attachment payload', async () => {
		remote.mockResolvedValue(Response.json({ success: true, data: { emilId: 'one-id' } }));
		expect(
			await flare.send('local-token', { ...form(), attachments: [{ filename: 'file.txt', content: 'dGVzdA==', type: 'text/plain' }] }),
		).toBe('one-id');
		const [url, options] = remote.mock.calls[0],
			body = JSON.parse(options.body);
		expect(url).toBe('https://api.sendflare.com/v1/send');
		expect(options.redirect).toBe('manual');
		expect(body.from).toBe('owned@local.example');
		expect(body.attachments).toEqual([{ filename: 'file.txt', content: 'dGVzdA==', contentType: 'text/plain', disposition: 'attachment' }]);
	});
	it('uses batchSend for multiple recipients and retains inline content IDs and reply headers', async () => {
		remote.mockResolvedValue(Response.json({ success: true, data: ['one', 'two'] }));
		expect(
			await flare.send('token', {
				...form(),
				to: ['one@example.com', 'two@example.com'],
				inReplyTo: '<thread>',
				attachments: [{ filename: 'image.png', content: 'base64', contentId: 'inline' }],
			}),
		).toBe('one,two');
		expect(remote.mock.calls[0][0]).toContain('/batchSend');
		const body = JSON.parse(remote.mock.calls[0][1].body);
		expect(body.to).toHaveLength(2);
		expect(body.header['In-Reply-To']).toBe('<thread>');
		expect(body.attachments[0].disposition).toBe('inline');
	});
	it.each([
		[{ emailId: 'one' }, { emilId: 'two' }],
		{ emailIds: ['one', 'two'] },
	])('accepts batch delivery IDs returned as objects or a named list: %j', async data => {
		remote.mockResolvedValue(Response.json({ success: true, code: 0, data }));
		await expect(flare.send('token', { ...form(), to: ['one@example.test', 'two@example.test'] })).resolves.toBe('one,two');
		expect(remote).toHaveBeenCalledOnce();
	});
	it.each([0, undefined])('keeps the receipt of an explicitly accepted batch with code %j and no delivery IDs', async code => {
		remote.mockResolvedValue(Response.json({ success: true, code, requestId: 'batch-request', data: null }));
		await expect(flare.send('token', { ...form(), to: ['one@example.test', 'two@example.test'] })).resolves.toBe('request:batch-request');
		expect(remote).toHaveBeenCalledOnce();
	});
	it('uses an explicitly local marker if an accepted batch omits all provider identifiers', async () => {
		remote.mockResolvedValue(Response.json({ success: true, code: 0, data: [] }));
		await expect(flare.send('token', { ...form(), to: ['one@example.test', 'two@example.test'] })).resolves.toMatch(/^accepted:[a-f0-9-]{36}$/);
		expect(remote).toHaveBeenCalledOnce();
	});
	it.each([
		{ success: false, code: 100030, requestId: 'rejected-request', data: null },
		{ code: 0, requestId: 'unconfirmed-request', data: null },
	])('does not treat an unconfirmed or rejected batch as accepted: %j', async result => {
		remote.mockResolvedValue(Response.json(result));
		await expect(flare.send('token', { ...form(), to: ['one@example.test', 'two@example.test'] })).rejects.toMatchObject({ code: 502 });
		expect(remote).toHaveBeenCalledOnce();
	});
	it('does not retry uncertain delivery or accept an HTTP failure as success', async () => {
		remote.mockRejectedValue(new Error('timeout'));
		await expect(flare.send('token', form())).rejects.toMatchObject({ code: 502 });
		expect(remote).toHaveBeenCalledOnce();
		remote.mockResolvedValue(Response.json({ success: true, data: { emailId: 'id' } }, { status: 503 }));
		await expect(flare.send('token', form())).rejects.toMatchObject({ code: 502 });
	});
	it('preserves masked API tokens, supports removal, and selects an explicit provider', async () => {
		await flare.saveTokens(c, { 'local.example': 'sensitive-token' });
		await flare.saveTokens(c, { 'local.example': '******' });
		expect(await flare.tokens(c)).toEqual({ 'local.example': 'sensitive-token' });
		const setting = {
			resendTokens: { 'local.example': 're' },
			sendflareTokens: { 'local.example': 'sf' },
			sendProviders: { 'local.example': 'sendflare' },
		};
		expect(emailService.resolveSendProvider(setting, 'local.example', true)).toEqual({ type: 'sendflare', token: 'sf' });
		await flare.saveTokens(c, { 'local.example': '' });
		expect(await flare.tokens(c)).toEqual({});
	});
	it('rejects redirects without following or retrying with the API token', async () => {
		remote.mockResolvedValue(new Response(null, { status: 307, headers: { Location: 'https://other.example/collect' } }));
		await expect(flare.send('token', form())).rejects.toThrow('unexpected redirect (HTTP 307)');
		expect(remote).toHaveBeenCalledOnce();
	});
	it('reports provider rejection details and redacts the API token', async () => {
		remote.mockResolvedValue(Response.json({ success: false, code: 100030, message: 'The sending domain is invalid' }));
		await expect(flare.send('private-token', form())).rejects.toThrow('The sending domain is invalid (HTTP 200, code 100030)');
		remote.mockResolvedValue(Response.json({ success: false, code: 100029, message: 'Invalid signature private-token\r\n' }));
		await expect(flare.send('private-token', form())).rejects.toThrow('Invalid signature [redacted]');
	});
	it.each([200, 502])('reports non-JSON HTTP %i separately from transport failures', async status => {
		remote.mockResolvedValue(new Response('<html>gateway error</html>', { status }));
		await expect(flare.send('token', form())).rejects.toThrow(`invalid response (HTTP ${status})`);
		expect(remote).toHaveBeenCalledOnce();
	});
	it.each([null, {}, { success: true, data: null }])('treats malformed success data as uncertain without retrying: %j', async value => {
		remote.mockResolvedValue(Response.json(value));
		await expect(flare.send('token', form())).rejects.toMatchObject({ code: 502 });
		expect(remote).toHaveBeenCalledOnce();
	});
});

describe('Role boundaries for personal integrations', () => {
	async function call(path, method = 'GET', body) {
		const auth = { tokens: [], sessions: {}, user: { userId: 10, email: 'user@local.example' }, refreshTime: new Date().toISOString() };
		sessionService.add(c, auth, 'fixture', 'password');
		await sessionService.save(c, 10, auth);
		const token = await jwt.generateToken(c, { userId: 10, token: 'fixture' });
		const response = await worker.fetch(
			new Request('https://local.example/api' + path, {
				method,
				headers: { Authorization: token, 'Content-Type': 'application/json' },
				...(body ? { body: JSON.stringify(body) } : {}),
			}),
			c.env,
			{},
		);
		return response.json();
	}
	it.each([
		['/transfer/pending', 'GET'],
		['/transfer/create', 'POST'],
		['/transfer/accept', 'PUT'],
		['/my/oauth', 'GET'],
		['/translation/config', 'GET'],
		['/translation/generate', 'POST'],
		['/translation/save', 'POST'],
		['/translation/register', 'POST'],
		['/translation/catalog/refresh', 'POST'],
	])('denies direct %s calls without role permission', async (path, method) => {
		expect(await call(path, method, method === 'GET' ? undefined : {})).toMatchObject({ code: 403 });
		expect(remote).not.toHaveBeenCalled();
	});
	it('settings read permission does not grant token generation', async () => {
		permissions = ['setting:query'];
		expect(await call('/setting/globalToken/generate', 'POST', {})).toMatchObject({ code: 403 });
	});
	it('settings read permission can inspect languages but cannot generate or enable them', async () => {
		permissions = ['setting:query'];
		expect(await call('/translation/config')).toMatchObject({code:200,data:{languages:['zh']}});
		expect(await call('/translation/generate','POST',{language:'en'})).toMatchObject({code:403});
		expect(await call('/translation/save','POST',{languages:['zh'],mailTranslation:false})).toMatchObject({code:403});
		expect(await call('/translation/register','POST',{code:'fr-CA'})).toMatchObject({code:403});
		expect(await call('/translation/catalog/refresh','POST',{})).toMatchObject({code:403});
		expect(remote).not.toHaveBeenCalled();
	});
	it('installs role controls idempotently without automatically granting them to users', async () => {
		await Promise.all([ensureFeaturePermissions(c), ensureFeaturePermissions(c)]);
		const rows = db.prepare('SELECT perm_key FROM perm WHERE type=2').all();
		expect(new Set(rows.map((row) => row.perm_key))).toEqual(new Set(FEATURE_PERMISSIONS.map((row) => row[2])));
		expect(rows).toHaveLength(FEATURE_PERMISSIONS.length);
	});
});

describe('Mailbox transfer ownership and quota', () => {
	beforeEach(() => {
		permissions = ['transfer:send', 'transfer:receive'];
		db.exec(
			"INSERT INTO account VALUES(1,10,'secondary@local.example',0),(2,20,'target@local.example',0);INSERT INTO email VALUES(1,1,10);INSERT INTO attachments VALUES(1,1,10);INSERT INTO account_transfer VALUES(1,1,'secondary@local.example',10,20,0,'2026-11-06')",
		);
		vi.spyOn(userService, 'selectByIdIncludeDel').mockImplementation(async (_, id) => ({
			userId: id,
			type: 2,
			email: `user${id}@local.example`,
			status: 0,
			isDel: 0,
		}));
		vi.spyOn(roleService, 'selectById').mockResolvedValue({ accountCount: 5, availDomain: 'local.example' });
	});
	it('moves mailbox, messages and attachments atomically and cannot accept twice', async () => {
		await transfer.accept(c, 1, 20);
		expect(db.prepare('SELECT user_id FROM account WHERE account_id=1').get().user_id).toBe(20);
		expect(db.prepare('SELECT user_id FROM email').get().user_id).toBe(20);
		expect(db.prepare('SELECT user_id FROM attachments').get().user_id).toBe(20);
		await expect(transfer.accept(c, 1, 20)).rejects.toMatchObject({ name: 'BizError' });
	});
	it.each(['quota', 'domain', 'permission', 'stale-owner', 'already-target'])(
		'preserves all ownership when blocked by %s',
		async (mode) => {
			if (mode === 'quota') roleService.selectById.mockResolvedValue({ accountCount: 1, availDomain: 'local.example' });
			if (mode === 'domain') roleService.selectById.mockResolvedValue({ accountCount: 5, availDomain: 'other.example' });
			if (mode === 'permission') permissions = [];
			if (mode === 'stale-owner') db.exec('UPDATE account SET user_id=30 WHERE account_id=1');
			if (mode === 'already-target') db.exec('UPDATE account SET user_id=20 WHERE account_id=1');
			await expect(transfer.accept(c, 1, 20)).rejects.toMatchObject({ name: 'BizError' });
			expect(db.prepare('SELECT user_id FROM email').get().user_id).toBe(10);
			expect(db.prepare('SELECT user_id FROM attachments').get().user_id).toBe(10);
			expect(db.prepare('SELECT status FROM account_transfer').get().status).toBe(0);
		},
	);
});
