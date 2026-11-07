import { beforeEach, describe, expect, it } from 'vitest';
import sessionService from '../../src/service/session-service';
import jwtUtils from '../../src/utils/jwt-utils';

function fakeContext(ip = '1.2.3.4') {
	const store = new Map();
	return {
		store,
		env: {
			jwt_secret: 'Local-session-key-6V8n2R5q9W4z7X1c3M0b!',
			kv: {
				async get(key) {
					return store.has(key) ? JSON.parse(store.get(key)) : null;
				},
				async put(key, value) {
					store.set(key, value);
				}
			}
		},
		req: {
			header(name) {
				if (name === 'CF-Connecting-IP') return ip;
				if (name === 'user-agent') return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
				return undefined;
			}
		}
	};
}

function newAuthInfo() {
	return { tokens: [], sessions: {}, user: { userId: 1, email: 'a@b.c' }, refreshTime: new Date().toISOString() };
}

describe('会话管理', () => {

	let c;
	beforeEach(() => { c = fakeContext(); });

	it('密钥轮换清除旧会话，新登录不混入旧设备', async () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 'old', 'password');
		await sessionService.save(c, 1, authInfo);
		c.env.jwt_secret = 'Rotated-session-key-9Q7v3L1m8Z6x4C0b2N5k!';
		expect(await sessionService.list(c, 1, 'old')).toEqual([]);
		const migrated = await sessionService.get(c, 1);
		sessionService.add(c, migrated, 'new', 'oauth');
		await sessionService.save(c, 1, migrated);
		expect((await sessionService.list(c, 1, 'new')).map(row => row.current)).toEqual([true]);
		expect((await sessionService.get(c, 1)).tokens).toEqual(['new']);
	});

	it('会话清理与 JWT 密钥轮换后的实际验证结果一致', async () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 'old', 'password');
		await sessionService.save(c, 1, authInfo);
		const jwt = await jwtUtils.generateToken(c, { userId: 1, token: 'old' });
		expect(await jwtUtils.verifyToken(c, jwt)).toMatchObject({ token: 'old' });
		c.env.jwt_secret = 'Rotated-session-key-9Q7v3L1m8Z6x4C0b2N5k!';
		expect(await jwtUtils.verifyToken(c, jwt)).toBeNull();
		expect(await sessionService.list(c, 1, 'old')).toEqual([]);
	});

	it('同一密钥版本保留多个有效设备，重复读取不写 KV', async () => {
		const authInfo = newAuthInfo();
		['one', 'two'].forEach(token => sessionService.add(c, authInfo, token, 'password'));
		await sessionService.save(c, 1, authInfo);
		const before = c.store.get('auth-uid:1');
		expect(await sessionService.list(c, 1, 'two')).toHaveLength(2);
		expect(c.store.get('auth-uid:1')).toBe(before);
	});

	it('旧数据只保留已经用当前密钥验证的会话', async () => {
		const legacy = newAuthInfo();
		['stale', 'valid'].forEach(token => sessionService.add(c, legacy, token, 'password'));
		c.store.set('auth-uid:1', JSON.stringify(legacy));
		const migrated = await sessionService.get(c, 1, 'valid');
		expect(migrated.tokens).toEqual(['valid']);
		expect(Object.keys(migrated.sessions)).toEqual(['valid']);
		expect(migrated.signingKeyId).not.toContain(c.env.jwt_secret);
		expect((await sessionService.list(c, 1, 'valid'))[0]).not.toHaveProperty('signingKeyId');
	});

	it('没有已验证凭证时丢弃未标记的旧会话', async () => {
		c.store.set('auth-uid:1', JSON.stringify({ ...newAuthInfo(), tokens: ['old'] }));
		expect((await sessionService.get(c, 1)).tokens).toEqual([]);
	});

	it('旧实例的延迟保存不能将旧会话标成当前密钥', async () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 'old', 'password');
		await sessionService.save(c, 1, authInfo);
		c.env.jwt_secret = 'Rotated-session-key-9Q7v3L1m8Z6x4C0b2N5k!';
		await sessionService.save(c, 1, authInfo);
		expect((await sessionService.get(c, 1)).tokens).toEqual([]);
	});

	it('登录时记录设备、IP 和登录方式', async () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 't1', 'password');
		await sessionService.save(c, 1, authInfo);

		const [session] = await sessionService.list(c, 1, 't1');
		expect(session.current).toBe(true);
		expect(session.ip).toBe('1.2.3.4');
		expect(session.method).toBe('password');
		expect(session.browser).toContain('Chrome');
		expect(session.sid).toMatch(/^[0-9a-f]{16}$/);
		expect(session).not.toHaveProperty('token');
	});

	it('最多保留 10 个会话，挤掉最早的', () => {
		const authInfo = newAuthInfo();
		for (let i = 0; i < 12; i++) sessionService.add(c, authInfo, `t${i}`, 'password');
		expect(authInfo.tokens).toHaveLength(10);
		expect(authInfo.tokens[0]).toBe('t2');
		expect(Object.keys(authInfo.sessions)).toHaveLength(10);
	});

	it('过期会话被拒绝并在整理时清掉', () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 'old', 'password');
		authInfo.sessions.old.expireTime = new Date(Date.now() - 1000).toISOString();
		expect(sessionService.isExpired(authInfo, 'old')).toBe(true);
		sessionService.normalize(authInfo);
		expect(authInfo.tokens).not.toContain('old');
	});

	it('按 sid 踢掉单个设备', async () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 't1', 'password');
		sessionService.add(c, authInfo, 't2', 'oauth');
		await sessionService.save(c, 1, authInfo);

		const target = (await sessionService.list(c, 1, 't1')).find(item => !item.current);
		await sessionService.revokeBySid(c, 1, target.sid);

		const left = await sessionService.list(c, 1, 't1');
		expect(left).toHaveLength(1);
		expect(left[0].current).toBe(true);
	});

	it('退出其他设备只保留当前会话', async () => {
		const authInfo = newAuthInfo();
		['t1', 't2', 't3'].forEach(token => sessionService.add(c, authInfo, token, 'password'));
		await sessionService.save(c, 1, authInfo);

		await sessionService.revokeOthers(c, 1, 't2');
		const saved = await sessionService.get(c, 1);
		expect(saved.tokens).toEqual(['t2']);
		expect(Object.keys(saved.sessions)).toEqual(['t2']);
	});

	it('退出登录只删当前凭证', async () => {
		const authInfo = newAuthInfo();
		['t1', 't2'].forEach(token => sessionService.add(c, authInfo, token, 'password'));
		await sessionService.save(c, 1, authInfo);

		await sessionService.revokeToken(c, 1, 't1');
		const saved = await sessionService.get(c, 1);
		expect(saved.tokens).toEqual(['t2']);
	});

	it('兼容旧版本只有 tokens 的数据', async () => {
		await sessionService.save(c, 1, { tokens: ['legacy1', 'legacy2'], user: { userId: 1 } });
		const list = await sessionService.list(c, 1, 'legacy2');
		expect(list).toHaveLength(2);
		expect(list.every(item => item.sid)).toBe(true);
		expect(list[0].current).toBe(true);

		await sessionService.revokeBySid(c, 1, list[1].sid);
		expect((await sessionService.get(c, 1)).tokens).toEqual(['legacy2']);
	});

	it('活跃时间一小时内不重复写入，旧会话首次访问补全设备信息', () => {
		const authInfo = newAuthInfo();
		sessionService.add(c, authInfo, 't1', 'password');
		expect(sessionService.touch(c, authInfo, 't1')).toBe(false);

		authInfo.sessions.t1.activeTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		expect(sessionService.touch(fakeContext('5.6.7.8'), authInfo, 't1')).toBe(true);
		expect(authInfo.sessions.t1.ip).toBe('5.6.7.8');

		const legacy = { tokens: ['x'], user: {} };
		expect(sessionService.touch(c, legacy, 'x')).toBe(true);
		expect(legacy.sessions.x.ip).toBe('1.2.3.4');
		expect(legacy.sessions.x.createTime).toBeNull();
	});
});
