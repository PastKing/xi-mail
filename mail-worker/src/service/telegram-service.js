import settingService from './setting-service';
import mailLinkService from './mail-link-service';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import domainUtils from "../utils/domain-uitls";
import {objectProxyBase} from './storage-config-service';
import {rewriteAttachmentImages} from './attachment-access-service';

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params

		const emailRow = await mailLinkService.read(c, token, true);

		if (emailRow) {

			if (emailRow.content) {
				const setting = await settingService.query(c);
				const rows=(await c.env.db.prepare('SELECT key FROM attachments WHERE email_id=? AND user_id=? AND account_id=?').bind(emailRow.emailId,emailRow.userId,emailRow.accountId).all()).results;
				const urls=Object.fromEntries(rows.map(({key})=>[key,new URL(c.req.url).origin+'/api/telegram/attachment/'+token+'?key='+encodeURIComponent(key)]));
				return emailHtmlTemplate(rewriteAttachmentImages(emailRow.content || '',urls), objectProxyBase(c,setting)||setting.r2Domain)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate('Access denied')
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		const tgChatIds = (tgChatId || '').split(',').map(id => id.trim()).filter(Boolean);
		if (!tgBotToken || !tgChatIds.length) return;

		let viewOrigin = null;
		try {
			const url = new URL(domainUtils.toOssDomain(customDomain?.trim()));
			if (url.protocol === 'https:' && !url.username && !url.password) viewOrigin = url.origin;
		} catch { /* Missing/invalid viewer configuration must not create a broken button. */ }
		let viewToken;
		if (viewOrigin) {
			try {
				viewToken = await mailLinkService.issue(c, email);
			} catch {
				console.error('生成 Telegram 邮件查看链接失败');
			}
		}

		let code = '';
		if (typeof email.code === 'string' && /^[A-Za-z0-9]{4,12}$/.test(email.code)) {
			try {
				if (await settingService.telegramCodeEnabled(c)) code = email.code;
			} catch {
				console.error('读取 Telegram 验证码推送设置失败');
			}
		}
		const viewUrl = viewToken ? `${viewOrigin}/api/telegram/getEmail/${viewToken}` : null;
		const text = emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText);

		await Promise.all(tgChatIds.map(async chatId => {
			const buttons = [];
			if (code) buttons.push({text: '复制验证码', copy_text: {text: code}});
			if (viewUrl) {
				const action = /^[1-9]\d*$/.test(chatId) ? { web_app: {url: viewUrl} } : { url: viewUrl };
				buttons.push({text: '查看原邮件', ...action});
			}
			try {
				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: chatId,
						parse_mode: 'HTML',
						text,
						link_preview_options: {is_disabled: true},
						...(buttons.length ? {reply_markup: {inline_keyboard: [buttons]}} : {}),
					})
				});
				if (!res.ok) {
					console.error(`转发 Telegram 失败 status: ${res.status} response: ${await res.text()}`);
				}
			} catch (e) {
				console.error(`转发 Telegram 失败:`, e.message);
			}
		}));

	}

}

export default telegramService
