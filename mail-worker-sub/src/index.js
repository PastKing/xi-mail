import { Hono } from 'hono';
import { cors } from 'hono/cors';
import PostalMime from 'postal-mime';

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

app.use('/api/*', async (c, next) => {
	const err = verifyToken(c);
	if (err) return err;
	return next();
});

app.get('/api/info', (c) => {
	const domains = (() => {
		try { return JSON.parse(c.env.domain); } catch { return []; }
	})();
	return c.json({ code: 200, data: { name: c.env.name || 'Xi-Mail Sub', domains, version: '1.1.0' } });
});

app.get('/api/mails', async (c) => {
	const address = c.req.query('address');
	const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
	const offset = parseInt(c.req.query('offset') || '0');

	if (!address) {
		return c.json({ code: 400, message: 'address is required' }, 400);
	}

	// 子地址机制：查询 user@domain 时同时返回 user+tag@domain 的邮件
	const where = `(to_email = ?1 COLLATE NOCASE OR to_email LIKE ?2 COLLATE NOCASE) AND is_del = 0`;
	const atIdx = address.indexOf('@');
	const subPattern = atIdx > 0
		? address.slice(0, atIdx) + '+%' + address.slice(atIdx)
		: address;

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
	const domains = (() => {
		try { return JSON.parse(c.env.domain); } catch { return []; }
	})();
	return c.json({ code: 200, data: domains });
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
	const fromAddress = message.from;
	const fromName = email.from?.name || fromAddress.split('@')[0];

	await env.db.prepare(
		`INSERT INTO email (send_email, name, subject, content, text, to_email, to_name, create_time, is_del, account_id, user_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, 0, 0)`
	).bind(
		fromAddress,
		fromName,
		email.subject || '',
		email.html || '',
		email.text || '',
		toAddress,
		'',
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
