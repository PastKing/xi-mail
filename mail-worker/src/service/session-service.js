import dayjs from 'dayjs';
import KvConst from '../const/kv-const';
import constant from '../const/constant';
import reqUtils from '../utils/req-utils';
import { isSecureSecret } from '../utils/secret-policy';

const MAX_SESSIONS = 10;
// 活跃时间按小时粒度刷新，避免每个请求都写一次 KV
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

function randomSid() {
	const arr = new Uint8Array(8);
	crypto.getRandomValues(arr);
	return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function expireFrom(time) {
	return dayjs(time).add(constant.TOKEN_EXPIRE, 'second').toISOString();
}

function isExpired(session, now = Date.now()) {
	return !!session?.expireTime && new Date(session.expireTime).getTime() <= now;
}

async function signingKeyId(c) {
	if (!isSecureSecret(c.env.jwt_secret)) throw new Error('A strong signing secret is required');
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', encoder.encode(c.env.jwt_secret),
		{ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('xi-mail:session-key:v1'));
	return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

const sessionService = {

	async get(c, userId, verifiedToken) {
		const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userId, { type: 'json' });
		if (!authInfo) return null;
		const keyId = await signingKeyId(c);
		if (authInfo.signingKeyId !== keyId) {
			// Only a JWT already verified with the current key can migrate an unversioned session.
			// A known different key generation always revokes every stored session.
			authInfo.tokens = !authInfo.signingKeyId && verifiedToken
				? (authInfo.tokens || []).filter(token => token === verifiedToken) : [];
			authInfo.sessions = Object.fromEntries(authInfo.tokens
				.filter(token => authInfo.sessions?.[token]).map(token => [token, authInfo.sessions[token]]));
			authInfo.signingKeyId = keyId;
			this.normalize(authInfo);
			await this.save(c, userId, authInfo);
		}
		return authInfo;
	},

	async save(c, userId, authInfo) {
		const keyId = await signingKeyId(c);
		if (authInfo.signingKeyId && authInfo.signingKeyId !== keyId) {
			authInfo.tokens = [];
			authInfo.sessions = {};
		}
		authInfo.signingKeyId = keyId;
		return c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
	},

	describe(c, method) {
		const now = new Date().toISOString();
		const { os, browser, device } = reqUtils.getUserAgent(c);
		return {
			sid: randomSid(),
			ip: reqUtils.getIp(c),
			os,
			browser,
			device,
			method,
			createTime: now,
			activeTime: now,
			expireTime: expireFrom(now)
		};
	},

	// 让 sessions 与 tokens 一一对应：清理过期会话，旧版本留下的 token 补一条占位记录
	normalize(authInfo) {
		const before = JSON.stringify(authInfo.sessions);
		const sessions = authInfo.sessions || {};
		const now = Date.now();

		authInfo.tokens = (authInfo.tokens || []).filter(token => !isExpired(sessions[token], now));

		const next = {};
		for (const token of authInfo.tokens) {
			next[token] = sessions[token] || { sid: randomSid(), ip: '', os: '', browser: '', device: '', method: '', createTime: null, activeTime: null, expireTime: null };
		}
		authInfo.sessions = next;
		return JSON.stringify(next) !== before;
	},

	add(c, authInfo, token, method) {
		this.normalize(authInfo);
		while (authInfo.tokens.length >= MAX_SESSIONS) {
			delete authInfo.sessions[authInfo.tokens.shift()];
		}
		authInfo.tokens.push(token);
		authInfo.sessions[token] = this.describe(c, method);
	},

	isExpired(authInfo, token) {
		return isExpired(authInfo.sessions?.[token]);
	},

	// 刷新当前会话的活跃时间、IP 和到期时间，返回是否需要写回 KV
	touch(c, authInfo, token) {
		authInfo.sessions = authInfo.sessions || {};
		const session = authInfo.sessions[token];
		const now = Date.now();

		if (!session || !session.activeTime) {
			authInfo.sessions[token] = { ...this.describe(c, session?.method || ''), sid: session?.sid || randomSid(), createTime: session?.createTime || null };
			return true;
		}

		if (now - new Date(session.activeTime).getTime() < TOUCH_INTERVAL_MS) {
			return false;
		}

		session.activeTime = new Date(now).toISOString();
		session.expireTime = expireFrom(session.activeTime);
		session.ip = reqUtils.getIp(c);
		return true;
	},

	async list(c, userId, currentToken) {
		const authInfo = await this.get(c, userId, currentToken);
		if (!authInfo) return [];

		if (this.normalize(authInfo)) {
			await this.save(c, userId, authInfo);
		}

		return authInfo.tokens
			.map(token => {
				const { sid, ip, os, browser, device, method, createTime, activeTime, expireTime } = authInfo.sessions[token];
				return { sid, ip, os, browser, device, method, createTime, activeTime, expireTime, current: token === currentToken };
			})
			.sort((a, b) => {
				if (a.current !== b.current) return a.current ? -1 : 1;
				return new Date(b.activeTime || 0) - new Date(a.activeTime || 0);
			});
	},

	async revokeBySid(c, userId, sid) {
		const authInfo = await this.get(c, userId);
		if (!authInfo) return;
		this.normalize(authInfo);
		const token = authInfo.tokens.find(item => authInfo.sessions[item].sid === sid);
		if (!token) return;
		await this.revokeToken(c, userId, token, authInfo);
	},

	async revokeToken(c, userId, token, authInfo) {
		authInfo = authInfo || await this.get(c, userId);
		if (!authInfo) return;
		this.normalize(authInfo);
		if (!authInfo.tokens.includes(token)) return;
		authInfo.tokens = authInfo.tokens.filter(item => item !== token);
		delete authInfo.sessions[token];
		await this.save(c, userId, authInfo);
	},

	async revokeOthers(c, userId, currentToken) {
		const authInfo = await this.get(c, userId);
		if (!authInfo) return;
		this.normalize(authInfo);
		authInfo.tokens = authInfo.tokens.filter(item => item === currentToken);
		authInfo.sessions = Object.fromEntries(authInfo.tokens.map(item => [item, authInfo.sessions[item]]));
		await this.save(c, userId, authInfo);
	}
};

export default sessionService;
