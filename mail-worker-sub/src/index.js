import { Hono } from 'hono';
import { cors } from 'hono/cors';
import PostalMime from 'postal-mime';
import { managedSender, authenticatedSender, firstAuthenticationResult } from '../../mail-worker/src/utils/sender-auth';

const authSchema = new WeakMap();
async function ensureAuthColumn(env) {
	if (!authSchema.has(env.db)) {
		const pending = env.db.prepare('PRAGMA table_info(email)').all().then(async result => {
			if (!result.results.some(column => column.name === 'auth_result')) {
				try { await env.db.prepare("ALTER TABLE email ADD COLUMN auth_result TEXT NOT NULL DEFAULT ''").run(); }
				catch (error) { if (!/duplicate column/i.test(error.message || '')) throw error; }
			}
		}).catch(error => { authSchema.delete(env.db); throw error; });
		authSchema.set(env.db, pending);
	}
	await authSchema.get(env.db);
}

const app = new Hono();

app.use('*', cors({
	origin: '*',
	allowHeaders: ['Content-Type', 'x-api-token'],
	allowMethods: ['GET', 'POST', 'OPTIONS'],
	maxAge: 86400,
}));

function verifyToken(c) {
	const token = c.req.header('x-api-token');
	if (!token || token !== c.env.api_token) {
		return c.json({ code: 401, message: 'Invalid API token' }, 401);
	}
}

// wrangler.toml 里 domain = ["a.com"] 部署后是 JSON 变量（数组），控制台手填则是字符串，两种都要兼容
function parseDomains(raw) {
	let list = raw;
	if (typeof raw === 'string') {
		try {
			list = JSON.parse(raw);
		} catch {
			list = raw.split(',');
		}
	}
	if (typeof list === 'string') list = [list];
	if (!Array.isArray(list)) return [];
	return list.map(item => String(item).trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
}

function subAddressPattern(address) {
	const atIdx = address.indexOf('@');
	return atIdx > 0 ? address.slice(0, atIdx) + '+%' + address.slice(atIdx) : address;
}

const ADDRESS_WHERE = `(to_email = ?1 COLLATE NOCASE OR to_email LIKE ?2 COLLATE NOCASE) AND is_del = 0`;

app.use('/api/*', async (c, next) => {
	const err = verifyToken(c);
	if (err) return err;
	return next();
});

app.get('/api/info', (c) => {
	const domains = parseDomains(c.env.domain);
	return c.json({ code: 200, data: { name: c.env.name || 'Xi-Mail Sub', domains, version: '1.2.1' } });
});

// 增量同步：返回 email_id > after 的完整邮件（含正文），按 id 升序，供主 Worker 拉取；不传 address 则返回所有地址
app.get('/api/sync', async (c) => {
	await ensureAuthColumn(c.env);
	const address = c.req.query('address');
	const after = parseInt(c.req.query('after') || '0') || 0;
	const limit = Math.min(parseInt(c.req.query('limit') || '20') || 20, 50);
	const columns = 'email_id, send_email, name, subject, content, text, to_email, to_name, create_time, auth_result';

	const stmt = address
		? c.env.db.prepare(
			`SELECT ${columns} FROM email WHERE ${ADDRESS_WHERE} AND email_id > ?3 ORDER BY email_id ASC LIMIT ?4`
		).bind(address, subAddressPattern(address), after, limit)
		: c.env.db.prepare(
			`SELECT ${columns} FROM email WHERE is_del = 0 AND email_id > ?1 ORDER BY email_id ASC LIMIT ?2`
		).bind(after, limit);

	const { results } = await stmt.all();
	return c.json({ code: 200, data: results || [] });
});

app.get('/api/mails', async (c) => {
	const address = c.req.query('address');
	const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
	const offset = parseInt(c.req.query('offset') || '0');

	if (!address) {
		return c.json({ code: 400, message: 'address is required' }, 400);
	}

	// 子地址机制：查询 user@domain 时同时返回 user+tag@domain 的邮件
	const where = ADDRESS_WHERE;
	const subPattern = subAddressPattern(address);

	const countResult = await c.env.db.prepare(
		`SELECT COUNT(*) as total FROM email WHERE ${where}`
	).bind(address, subPattern).first();

	const { results } = await c.env.db.prepare(
		`SELECT email_id, send_email, name, subject, text, to_email, to_name, create_time, is_del
		 FROM email WHERE ${where}
		 ORDER BY email_id DESC LIMIT ?3 OFFSET ?4`
	).bind(address, subPattern, limit, offset).all();

	return c.json({ code: 200, data: { results, count: countResult?.total || 0 } });
});

app.get('/api/mail/:id', async (c) => {
	const id = parseInt(c.req.param('id'));
	const row = await c.env.db.prepare(
		`SELECT * FROM email WHERE email_id = ? AND is_del = 0`
	).bind(id).first();

	if (!row) {
		return c.json({ code: 404, message: 'Mail not found' }, 404);
	}
	return c.json({ code: 200, data: row });
});

app.get('/api/domains', (c) => {
	return c.json({ code: 200, data: parseDomains(c.env.domain) });
});

app.get('/api/addresses', async (c) => {
	const { results } = await c.env.db.prepare(
		`SELECT DISTINCT to_email as address, COUNT(*) as count
		 FROM email WHERE is_del = 0
		 GROUP BY to_email COLLATE NOCASE
		 ORDER BY MAX(email_id) DESC LIMIT 200`
	).all();
	return c.json({ code: 200, data: results || [] });
});

async function handleEmail(message, env) {
	const rawEmail = await new Response(message.raw).arrayBuffer();
	const parser = new PostalMime();
	const email = await parser.parse(rawEmail);

	const toAddress = message.to;
	// message.from 是信封发件人（如 Resend/SES 的退信地址），展示用邮件头里的 From
	const fromAddress = email.from?.address || message.from;
	const auth = firstAuthenticationResult(message.headers?.get('Authentication-Results'));
	if (managedSender(fromAddress, parseDomains(env.domain)) && !authenticatedSender(fromAddress, auth)) {
		message.setReject('Sender authentication failed');
		return;
	}
	await ensureAuthColumn(env);
	const fromName = email.from?.name || fromAddress.split('@')[0];
	const toName = (email.to || []).find(item => item.address?.toLowerCase() === toAddress.toLowerCase())?.name || '';

	await env.db.prepare(
		`INSERT INTO email (send_email, name, subject, content, text, to_email, to_name, auth_result, create_time, is_del, account_id, user_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, 0, 0)`
	).bind(
		fromAddress,
		fromName,
		email.subject || '',
		email.html || '',
		email.text || '',
		toAddress,
		toName,
		auth,
	).run();
}

async function initDB(env) {
	await env.db.prepare(`
		CREATE TABLE IF NOT EXISTS email (
			email_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			send_email TEXT,
			name TEXT,
			account_id INTEGER NOT NULL DEFAULT 0,
			user_id INTEGER NOT NULL DEFAULT 0,
			subject TEXT,
			content TEXT,
			text TEXT,
			to_email TEXT NOT NULL DEFAULT '',
			to_name TEXT NOT NULL DEFAULT '',
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
			is_del INTEGER DEFAULT 0 NOT NULL
		)
	`).run();
	await ensureAuthColumn(env);
}

export default {
	async fetch(req, env, ctx) {
		const url = new URL(req.url);
		if (url.pathname === '/init') {
			const token = req.headers.get('x-api-token');
			if (!token || token !== env.api_token) {
				return new Response('Unauthorized', { status: 401 });
			}
			await initDB(env);
			return new Response('Database initialized');
		}
		return app.fetch(req, env, ctx);
	},
	async email(message, env, ctx) {
		try {
			await handleEmail(message, env);
		} catch (e) {
			console.error('Sub-worker email error:', e);
		}
	},
	async scheduled(c, env, ctx) {
		try {
			await env.db.prepare(`DELETE FROM email WHERE is_del = 1`).run();

			// 自动清理：删除超过保留天数的邮件，auto_clean_days 未配置或为 0 时不清理
			const days = Number(env.auto_clean_days || 0);
			if (days > 0) {
				await env.db.prepare(
					`DELETE FROM email WHERE create_time < datetime('now', ?)`
				).bind(`-${days} days`).run();
			}
		} catch (e) {
			console.error('Cleanup error:', e);
		}
	},
};
