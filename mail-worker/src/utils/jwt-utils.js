import { isSecureSecret } from './secret-policy';
import constant from '../const/constant';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64url = (input) => {
	const str = btoa(String.fromCharCode(...new Uint8Array(input)));
	return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64urlDecode = (str) => {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	while (str.length % 4) str += '=';
	return Uint8Array.from(atob(str), c => c.charCodeAt(0));
};

const jwtUtils = {
	async generateToken(c, payload, expiresInSeconds) {
		if (!isSecureSecret(c.env.jwt_secret)) throw new Error('A strong signing secret is required');
		const header = {
			alg: 'HS256',
			typ: 'JWT'
		};

		const now = Math.floor(Date.now() / 1000);
		const exp = now + (expiresInSeconds ?? constant.TOKEN_EXPIRE);

		const fullPayload = {
			...payload,
			purpose: 'session', aud: 'xi-mail', iss: 'xi-mail',
			iat: now,
			...(exp ? { exp } : {})
		};

		const headerStr = base64url(encoder.encode(JSON.stringify(header)));
		const payloadStr = base64url(encoder.encode(JSON.stringify(fullPayload)));
		const data = `${headerStr}.${payloadStr}`;

		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(c.env.jwt_secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
		const signatureStr = base64url(signature);

		return `${data}.${signatureStr}`;
	},

	async verifyToken(c, token) {
		if (!isSecureSecret(c.env.jwt_secret) || typeof token !== 'string' || token.length > 8192
			|| !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
		try {
			const [headerB64, payloadB64, signatureB64] = token.split('.');

			if (!headerB64 || !payloadB64 || !signatureB64) return null;
			const header = JSON.parse(decoder.decode(base64urlDecode(headerB64)));
			if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

			const data = `${headerB64}.${payloadB64}`;
			const key = await crypto.subtle.importKey(
				'raw',
				encoder.encode(c.env.jwt_secret),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['verify']
			);

			const valid = await crypto.subtle.verify(
				'HMAC',
				key,
				base64urlDecode(signatureB64),
				encoder.encode(data)
			);

			if (!valid) return null;

			const payloadJson = decoder.decode(base64urlDecode(payloadB64));
			const payload = JSON.parse(payloadJson);

			const now = Math.floor(Date.now() / 1000);
			if (payload.purpose !== 'session' || payload.aud !== 'xi-mail' || payload.iss !== 'xi-mail'
				|| !Number.isSafeInteger(payload.userId) || payload.userId <= 0 || typeof payload.token !== 'string' || !payload.token
				|| !Number.isFinite(payload.iat) || payload.iat > now + 60 || !Number.isFinite(payload.exp)
				|| payload.exp <= now || payload.exp <= payload.iat) return null;

			return payload;

		} catch (err) {
			return null;
		}
	}
};

export default jwtUtils;
