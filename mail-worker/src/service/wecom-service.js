import KvConst from '../const/kv-const';
import BizError from '../error/biz-error';
import emailUtils from '../utils/email-utils';
import { t } from '../i18n/i18n';
import { parseHTML } from 'linkedom';

const MAX_BYTES = 1900;
const encoder = new TextEncoder();

function validateWebhook(value) {
	try {
		if (typeof value !== 'string' || value.length > 500) throw new Error();
		const url = new URL(value.trim());
		const key = url.searchParams.get('key');
		if (url.protocol !== 'https:' || url.hostname !== 'qyapi.weixin.qq.com'
			|| url.port || url.username || url.password || url.hash
			|| url.pathname !== '/cgi-bin/webhook/send'
			|| [...url.searchParams.keys()].length !== 1 || !/^[\w-]+$/.test(key || '')) {
			throw new Error();
		}
		return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`;
	} catch {
		throw new BizError(t('wecomInvalidWebhook'));
	}
}

function splitByBytes(text, maxBytes) {
	const chunks = [];
	let current = '';
	let bytes = 0;
	for (const character of text) {
		const size = encoder.encode(character).length;
		if (bytes + size > maxBytes) {
			chunks.push(current);
			current = '';
			bytes = 0;
		}
		current += character;
		bytes += size;
	}
	if (current || !chunks.length) chunks.push(current);
	return chunks;
}

export function buildMessages(email) {
	let html = email.content || '';
	if (!emailUtils.formatText(email.text) && html) {
		const { document } = parseHTML(html);
		document.querySelectorAll('style, script, title').forEach(element => element.remove());
		document.querySelectorAll('a[href]').forEach(link => {
			const href = link.getAttribute('href');
			const label = link.textContent.trim();
			link.textContent = !label || label === href ? href : `${label}（${href}）`;
		});
		document.querySelectorAll('img[alt]').forEach(image => {
			image.replaceWith(document.createTextNode(`[图片：${image.getAttribute('alt')}]`));
		});
		html = document.toString();
	}
	const body = emailUtils.formatText(email.text)
		|| emailUtils.htmlToText(html) || '[邮件正文为空，请在邮箱中查看原邮件]';
	const sender = email.name ? `${email.name} <${email.sendEmail || ''}>` : email.sendEmail;
	const metadata = [
		`发件人｜${sender || '未知发件人'}`,
		`收件人｜${email.toEmail || '未知收件人'}`,
		`主　题｜${email.subject || '无主题'}`,
		email.createTime ? `时　间｜${email.createTime}` : '',
	].filter(Boolean).join('\n');
	// Keep a fixed budget even when sender names or subjects are unusually long.
	const header = splitByBytes(metadata, 900)[0];
	const details = `${header}${header.length < metadata.length ? '…' : ''}\n────────────\n邮件正文\n\n`;
	const prefix = '📬 新邮件';
	const chunks = splitByBytes(body, MAX_BYTES - encoder.encode(`${prefix}（第 9999999999/9999999999 段）\n${details}`).length);
	return chunks.map((chunk, index) =>
		`${prefix}${chunks.length > 1 ? `（第 ${index + 1}/${chunks.length} 段）` : ''}\n${details}${chunk}`);
}

async function send(webhookUrl, messages) {
	for (const content of messages) {
		let response;
		let result;
		try {
			response = await fetch(validateWebhook(webhookUrl), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ msgtype: 'text', text: { content } }),
				redirect: 'error',
				signal: AbortSignal.timeout(10000),
			});
			result = await response.json();
		} catch {
			// Fetch errors may include the URL; never expose the webhook key in logs or API errors.
			throw new BizError(t('wecomSendFailed'));
		}
		if (!response.ok || result?.errcode !== 0) {
			throw new BizError(t('wecomSendFailed'));
		}
	}
}

const wecomService = {
	async query(c) {
		return await c.env.kv.get(KvConst.WECOM, { type: 'json' }) || { enabled: false, webhookUrl: '' };
	},

	async get(c) {
		const config = await this.query(c);
		return { enabled: config.enabled === true, hasWebhook: !!config.webhookUrl };
	},

	async set(c, params) {
		if (!params || typeof params.enabled !== 'boolean'
			|| (params.webhookUrl !== undefined && typeof params.webhookUrl !== 'string')) {
			throw new BizError(t('wecomInvalidWebhook'));
		}
		const saved = await this.query(c);
		const webhookUrl = params.webhookUrl?.trim()
			? validateWebhook(params.webhookUrl) : saved.webhookUrl || '';
		if (params.enabled && !webhookUrl) throw new BizError(t('wecomWebhookRequired'));
		await c.env.kv.put(KvConst.WECOM, JSON.stringify({ enabled: params.enabled, webhookUrl }));
	},

	async test(c, params) {
		if (!params || (params.webhookUrl !== undefined && typeof params.webhookUrl !== 'string')) {
			throw new BizError(t('wecomInvalidWebhook'));
		}
		const saved = await this.query(c);
		const webhookUrl = params.webhookUrl?.trim()
			? validateWebhook(params.webhookUrl) : saved.webhookUrl;
		if (!webhookUrl) throw new BizError(t('wecomWebhookRequired'));
		await send(webhookUrl, ['📬 Xi-Mail 企业微信推送测试\n\n收到此消息表示机器人连接成功。此消息为测试通知，不包含真实邮件。']);
	},

	async sendEmail(c, email) {
		try {
			const config = await this.query(c);
			if (!config.enabled || !config.webhookUrl) return;
			await send(config.webhookUrl, buildMessages(email));
		} catch {
			console.error('WeCom email notification failed');
		}
	},
};

export default wecomService;
