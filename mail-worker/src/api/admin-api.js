import app from '../hono/hono';
import result from '../model/result';
import KvConst from '../const/kv-const';
import orm from '../entity/orm';
import email from '../entity/email';
import account from '../entity/account';
import BizError from '../error/biz-error';
import { and, eq, desc, like, count } from 'drizzle-orm';
import { isDel } from '../const/entity-const';

/** Verify x-admin-auth header against stored global token */
async function verifyAdminToken(c) {
	const enabled = await c.env.kv.get(KvConst.GLOBAL_TOKEN_ENABLED);
	if (enabled !== '1') {
		throw new BizError('Global Token 未启用', 403);
	}
	const storedToken = await c.env.kv.get(KvConst.GLOBAL_TOKEN);
	if (!storedToken) {
		throw new BizError('Global Token 未配置', 403);
	}
	const headerToken = c.req.header('x-admin-auth');
	if (!headerToken || headerToken !== storedToken) {
		throw new BizError('Token 验证失败', 401);
	}
}

/**
 * GET /admin/mails
 * Query params: limit (default 20), offset (default 0), address (required)
 * Header: x-admin-auth: <token>
 */
app.get('/admin/mails', async (c) => {
	await verifyAdminToken(c);

	let { limit = '20', offset = '0', address } = c.req.query();
	limit  = Math.min(Number(limit)  || 20, 100);
	offset = Math.max(Number(offset) || 0,  0);

	if (!address) {
		throw new BizError('address 参数必填', 400);
	}

	const db = orm(c);

	const acct = await db.select()
		.from(account)
		.where(and(eq(account.email, address), eq(account.isDel, isDel.NORMAL)))
		.get();

	if (!acct) {
		return c.json({ results: [], count: 0 });
	}

	const [rows, countRow] = await Promise.all([
		db.select({
			emailId:   email.emailId,
			messageId: email.messageId,
			sendEmail: email.sendEmail,
			name:      email.name,
			toEmail:   email.toEmail,
			subject:   email.subject,
			text:      email.text,
			content:   email.content,
			createTime:email.createTime,
			unread:    email.unread,
			type:      email.type,
		})
		.from(email)
		.where(and(
			eq(email.accountId, acct.accountId),
			eq(email.isDel, isDel.NORMAL),
		))
		.orderBy(desc(email.emailId))
		.limit(limit)
		.offset(offset),

		db.select({ total: count() })
		.from(email)
		.where(and(
			eq(email.accountId, acct.accountId),
			eq(email.isDel, isDel.NORMAL),
		))
		.get(),
	]);

	return c.json({
		results: rows,
		count: countRow?.total ?? 0,
	});
});
