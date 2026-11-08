import orm from '../entity/orm';
import subWorker from '../entity/sub-worker';
import email from '../entity/email';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import settingService from './setting-service';
import roleService from './role-service';
import userService from './user-service';
import accountService from './account-service';
import aiService from './ai-service';
import telegramService from './telegram-service';
import { managedSender, authenticatedSender, managedDomainList } from '../utils/sender-auth';

const SYNC_CURSOR = 'sub-sync-sw:';
const SYNC_LOCK = 'sub-sync-lock:';
const SYNC_BATCH = 20;
const SYNC_INTERVAL_MS = 10000;
const FETCH_TIMEOUT_MS = 8000;

// 同一个 isolate 内的节流，避免每个请求都去拉子 Worker
let lastSyncAt = 0;

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

function matchDomainList(list, address) {
	if (!address) return false;
	const atIdx = address.lastIndexOf('@');
	if (atIdx === -1) return false;
	const senderDomain = address.slice(atIdx + 1).toLowerCase().trim();
	return list.some(item => {
		const d = item.toLowerCase().trim().replace(/^@/, '');
		return d && (senderDomain === d || senderDomain.endsWith('.' + d));
	});
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

	// 按投递规则处理一封子 Worker 邮件，与 email.js 收信逻辑保持一致；返回 null 表示被拒收
	async resolveTarget(c, row, settings) {
		const { noRecipient, senderFilterMode, senderDomainBlacklist, senderDomainWhitelist, domainMapping } = settings;
		const fromAddress = row.send_email || '';
		if (managedSender(fromAddress, managedDomainList(settings, c.env)) && !authenticatedSender(fromAddress, row.auth_result)) return null;

		if (senderFilterMode === 1) {
			if (senderDomainWhitelist?.length > 0 && !matchDomainList(senderDomainWhitelist, fromAddress)) return null;
		} else if (senderDomainBlacklist?.length > 0 && matchDomainList(senderDomainBlacklist, fromAddress)) {
			return null;
		}

		let recipientTo = (row.to_email || '').trim();
		const atIdx = recipientTo.indexOf('@');
		if (atIdx !== -1 && domainMapping && typeof domainMapping === 'object') {
			const mapped = domainMapping[recipientTo.slice(atIdx + 1)];
			if (mapped) recipientTo = `${recipientTo.slice(0, atIdx)}@${mapped}`;
		}

		let account = await accountService.selectByEmailIncludeDel(c, recipientTo);
		if (!account) {
			const baseEmail = emailUtils.getBaseEmail(recipientTo);
			if (baseEmail && baseEmail !== recipientTo) {
				account = await accountService.selectByEmailIncludeDel(c, baseEmail);
			}
		}

		if (!account) {
			return noRecipient === settingConst.noRecipient.CLOSE ? null : { recipientTo, account: null };
		}

		const userRow = await userService.selectByIdIncludeDel(c, account.userId);
		if (userRow && userRow.email !== c.env.admin) {
			const { banEmail, availDomain } = await roleService.selectByUserId(c, account.userId) || {};
			if (!roleService.isPrimaryEmail(userRow.email, account.email) && !roleService.hasAvailDomainPerm(availDomain || '', recipientTo)) return null;
			if (roleService.isBanEmail(banEmail || '', fromAddress)) return null;
		}

		return { recipientTo, account };
	},

	async importRow(c, sw, row, settings) {
		const target = await this.resolveTarget(c, row, settings);
		if (!target) return;

		const { recipientTo, account } = target;
		const fromAddress = row.send_email || '';
		const code = await aiService.extractCode(c, {
			subject: row.subject || '',
			html: row.content || '',
			text: row.text || '',
			from: { address: fromAddress, name: row.name || '' },
		}, settings);

		const emailRow = await orm(c).insert(email).values({
			sendEmail: fromAddress,
			name: row.name || emailUtils.getName(fromAddress),
			subject: row.subject || '',
			content: row.content || '',
			text: row.text || '',
			toEmail: recipientTo,
			toName: row.to_name || '',
			recipient: JSON.stringify([{ address: recipientTo, name: row.to_name || '' }]),
			messageId: syncMessageId(sw.id, row.email_id),
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			type: emailConst.type.RECEIVE,
			status: account ? emailConst.status.RECEIVE : emailConst.status.NOONE,
			isDel: isDel.NORMAL,
			code: code || '',
			...(row.create_time ? { createTime: row.create_time } : {}),
		}).returning().get();

		const { tgBotStatus, tgChatId, ruleType, ruleEmail } = settings;
		if (ruleType === settingConst.ruleType.RULE && !(ruleEmail || '').split(',').includes(recipientTo)) return;
		if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
			try {
				await telegramService.sendEmailToBot(c, emailRow);
			} catch (e) {
				console.error('子 Worker 邮件转发 TG 失败:', e?.message);
			}
		}
	},

	async fetchSince(sw, after) {
		const synced = await fetchJson(`${sw.url}/api/sync?after=${after}&limit=${SYNC_BATCH}`, sw.apiToken);
		if (synced.notFound) {
			throw new Error('子 Worker 版本过旧，请更新到 1.2.0 及以上');
		}
		return synced.data || [];
	},

	async syncWorker(c, sw, settings) {
		const lockKey = SYNC_LOCK + sw.id;
		if (await c.env.kv.get(lockKey)) return;
		await c.env.kv.put(lockKey, '1', { expirationTtl: 60 });

		try {
			const cursorKey = SYNC_CURSOR + sw.id;
			const after = Number(await c.env.kv.get(cursorKey)) || 0;
			const rows = await this.fetchSince(sw, after);
			if (rows.length === 0) return;

			// message_id 没有索引，用 create_time 索引缩小范围（同步时原样保存了子 Worker 的收信时间）
			const minTime = rows.map(row => row.create_time).filter(Boolean).sort()[0];
			const idFilter = inArray(email.messageId, rows.map(row => syncMessageId(sw.id, row.email_id)));
			const existing = await orm(c).select({ messageId: email.messageId }).from(email)
				.where(minTime ? and(gte(email.createTime, minTime), idFilter) : idFilter)
				.all();
			const existingSet = new Set(existing.map(row => row.messageId));

			for (const row of rows) {
				if (existingSet.has(syncMessageId(sw.id, row.email_id))) continue;
				await this.importRow(c, sw, row, settings);
			}

			const maxId = Math.max(after, ...rows.map(row => Number(row.email_id) || 0));
			await c.env.kv.put(cursorKey, String(maxId));
		} finally {
			await c.env.kv.delete(lockKey);
		}
	},

	// Admin lists can show stored mail while remote workers synchronize. Keep the
	// task alive after the HTTP response, rather than waiting for network timeouts.
	async syncInBackground(c) {
		let execution;
		try { execution = c.executionCtx; } catch { /* Non-Worker callers may not have a context. */ }
		if (execution?.waitUntil) execution.waitUntil(this.syncAll(c));
		else await this.syncAll(c);
	},

	// 把所有子 Worker 的新邮件按收信规则同步进主库，失败不影响正常查询
	async syncAll(c) {
		try {
			if (Date.now() - lastSyncAt < SYNC_INTERVAL_MS) return;
			lastSyncAt = Date.now();

			const list = await this.enabledList(c);
			if (list.length === 0) return;

			const settings = await settingService.query(c);
			if (settings.receive === settingConst.receive.CLOSE) return;

			await Promise.all(list.map(sw =>
				this.syncWorker(c, sw, settings).catch(e => console.error('子 Worker 同步失败:', sw.url, e?.message))
			));
		} catch (e) {
			console.error('子 Worker 同步异常:', e?.message);
		}
	},
};

export default subWorkerService;
