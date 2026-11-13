import orm from '../entity/orm';
import email from '../entity/email';
import account from '../entity/account';
import user from '../entity/user';
import { and, eq } from 'drizzle-orm';
import { emailConst } from '../const/entity-const';

export const MAIL_LINK_TTL = 86400;
const PREFIX = 'mail-link:v1:';
async function key(token) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return PREFIX + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
const validId = value => Number.isSafeInteger(value) && value > 0;

// A random, expiring capability stored server-side, NOT a JWT signed with the login key.
const mailLinkService = {
	async issue(c, message) {
		if (!validId(message.emailId)) return null;
		const owned = [message.userId, message.accountId].every(validId);
		// The configured Telegram integration also forwards catch-all mail with no registered mailbox.
		// Give it a separate, single-message scope; never relax ownership checks for normal mail.
		const unassigned = message.userId === 0 && message.accountId === 0
			&& message.type === emailConst.type.RECEIVE && message.status === emailConst.status.NOONE;
		if (!owned && !unassigned) return null;
		const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
		await c.env.kv.put(await key(token), JSON.stringify({ purpose: owned ? 'telegram-mail' : 'telegram-unassigned-mail',
			emailId: message.emailId, userId: message.userId, accountId: message.accountId,
			expiresAt: Date.now() + MAIL_LINK_TTL * 1000 }), { expirationTtl: MAIL_LINK_TTL });
		return token;
	},
	async read(c, token, withIdentity=false) {
		// All legacy JWT links fail before a database lookup, regardless of signing key.
		if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
		const link = await c.env.kv.get(await key(token), { type: 'json' });
		if (!link || !validId(link.emailId)
			|| !Number.isFinite(link.expiresAt) || link.expiresAt <= Date.now()) return null;
		const columns={content:email.content,text:email.text,...(withIdentity?{emailId:email.emailId,userId:email.userId,accountId:email.accountId}:{})};
		if (link.purpose === 'telegram-unassigned-mail') {
			if (link.userId !== 0 || link.accountId !== 0) return null;
			return await orm(c).select(columns).from(email)
				.where(and(eq(email.emailId, link.emailId), eq(email.userId, 0), eq(email.accountId, 0),
					eq(email.type, emailConst.type.RECEIVE), eq(email.status, emailConst.status.NOONE), eq(email.isDel, 0))).get() || null;
		}
		if (link.purpose !== 'telegram-mail' || ![link.userId, link.accountId].every(validId)) return null;
		return await orm(c).select(columns).from(email)
			.innerJoin(account, and(eq(account.accountId, email.accountId), eq(account.userId, email.userId), eq(account.isDel, 0)))
			.innerJoin(user, and(eq(user.userId, email.userId), eq(user.isDel, 0), eq(user.status, 0)))
			.where(and(eq(email.emailId, link.emailId), eq(email.userId, link.userId), eq(email.accountId, link.accountId), eq(email.isDel, 0))).get() || null;
	},
};
export default mailLinkService;
