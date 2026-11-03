import orm from '../entity/orm';
import subWorker from '../entity/sub-worker';
import email from '../entity/email';
import { and, eq, inArray } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import settingService from './setting-service';
import roleService from './role-service';
import userService from './user-service';
import aiService from './ai-service';

const SYNC_CURSOR = 'sub-sync:';
const SYNC_BATCH = 20;
// 一次请求最多同步的邮箱数，避免「全部邮件」视图下子请求过多
const MAX_SYNC_ACCOUNTS = 10;
const FETCH_TIMEOUT_MS = 8000;

export function parseDomains(raw) {
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

// 子 Worker 邮件在主库里的唯一标识，用于去重
function syncMessageId(subWorkerId, remoteId) {
	return `<sub-${subWorkerId}-${remoteId}@xi-mail.sub>`;
}

async function fetchJson(url, apiToken) {
	const res = await fetch(url, {
		headers: { 'x-api-token': apiToken },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (res.status === 404) return { notFound: true };
	const data = await res.json();
	return { data: data?.code === 200 ? data.data : null };
}

const subWorkerService = {

	async enabledList(c, fresh = false) {
		if (!fresh && c.get?.('subWorkers')) {
			return c.get('subWorkers');
		}
		let rows = [];
		try {
			rows = await orm(c).select().from(subWorker).where(eq(subWorker.status, 1)).all();
		} catch {
			rows = [];
		}
		const list = rows.map(row => ({ ...row, domains: parseDomains(row.domains) }));
		c.set?.('subWorkers', list);
		return list;
	},

	async domains(c, fresh = false) {
		const list = await this.enabledList(c, fresh);
		return [...new Set(list.flatMap(row => row.domains))];
	},

	findByEmail(list, address) {
		const domain = emailUtils.getDomain(address || '').toLowerCase();
		if (!domain) return null;
		return list.find(row => row.domains.includes(domain)) || null;
	},

	// 拉取 remoteId > after 的邮件；子 Worker 1.2.0 起有 /api/sync，旧版本退回逐封查询
	async fetchSince(sw, address, after) {
		const query = `address=${encodeURIComponent(address)}&after=${after}&limit=${SYNC_BATCH}`;
		const synced = await fetchJson(`${sw.url}/api/sync?${query}`, sw.apiToken);
		if (!synced.notFound) {
			return synced.data || [];
		}

		const listed = await fetchJson(`${sw.url}/api/mails?address=${encodeURIComponent(address)}&limit=${SYNC_BATCH}&offset=0`, sw.apiToken);
		const ids = (listed.data?.results || [])
			.map(row => row.email_id)
			.filter(id => id > after)
			.sort((a, b) => a - b)
			.slice(0, 10);

		const rows = [];
		for (const id of ids) {
			const detail = await fetchJson(`${sw.url}/api/mail/${id}`, sw.apiToken);
			if (detail.data) rows.push(detail.data);
		}
		return rows;
	},

	async syncAccount(c, sw, accountRow, settings) {
		const cursorKey = SYNC_CURSOR + accountRow.accountId;
		const after = Number(await c.env.kv.get(cursorKey)) || 0;

		const rows = await this.fetchSince(sw, accountRow.email, after);
		if (rows.length === 0) return;

		const messageIds = rows.map(row => syncMessageId(sw.id, row.email_id));
		const existing = await orm(c).select({ messageId: email.messageId }).from(email)
			.where(and(eq(email.accountId, accountRow.accountId), inArray(email.messageId, messageIds)))
			.all();
		const existingSet = new Set(existing.map(row => row.messageId));

		const userRow = await userService.selectByIdIncludeDel(c, accountRow.userId);
		const roleRow = userRow ? await roleService.selectByUserId(c, accountRow.userId) : null;
		const isAdmin = userRow?.email === c.env.admin;
		const isPrimary = roleService.isPrimaryEmail(userRow?.email, accountRow.email);

		for (const row of rows) {
			const messageId = syncMessageId(sw.id, row.email_id);
			if (existingSet.has(messageId)) continue;

			const fromAddress = row.send_email || '';
			if (!isAdmin && roleRow) {
				if (!isPrimary && !roleService.hasAvailDomainPerm(roleRow.availDomain || '', accountRow.email)) continue;
				if (roleService.isBanEmail(roleRow.banEmail || '', fromAddress)) continue;
			}

			const parsed = {
				subject: row.subject || '',
				html: row.content || '',
				text: row.text || '',
				from: { address: fromAddress, name: row.name || '' },
			};
			const code = await aiService.extractCode(c, parsed, settings);

			await orm(c).insert(email).values({
				sendEmail: fromAddress,
				name: row.name || emailUtils.getName(fromAddress),
				subject: row.subject || '',
				content: row.content || '',
				text: row.text || '',
				toEmail: row.to_email || accountRow.email,
				toName: row.to_name || '',
				recipient: JSON.stringify([{ address: row.to_email || accountRow.email, name: row.to_name || '' }]),
				messageId,
				userId: accountRow.userId,
				accountId: accountRow.accountId,
				type: emailConst.type.RECEIVE,
				status: emailConst.status.RECEIVE,
				isDel: isDel.NORMAL,
				code: code || '',
				...(row.create_time ? { createTime: row.create_time } : {}),
			}).run();
		}

		const maxId = Math.max(after, ...rows.map(row => Number(row.email_id) || 0));
		await c.env.kv.put(cursorKey, String(maxId));
	},

	// 在查询收件箱前调用：把子 Worker 域名邮箱的新邮件同步进主库，失败不影响正常查询
	async syncAccounts(c, accountRows) {
		try {
			const list = await this.enabledList(c);
			if (list.length === 0) return;

			const targets = accountRows
				.filter(row => row && row.isDel !== isDel.DELETE)
				.map(row => ({ row, sw: this.findByEmail(list, row.email) }))
				.filter(item => item.sw)
				.slice(0, MAX_SYNC_ACCOUNTS);
			if (targets.length === 0) return;

			const settings = await settingService.query(c);
			await Promise.all(targets.map(({ row, sw }) =>
				this.syncAccount(c, sw, row, settings).catch(e => console.error('子 Worker 同步失败:', sw.url, e?.message))
			));
		} catch (e) {
			console.error('子 Worker 同步异常:', e?.message);
		}
	},
};

export default subWorkerService;
