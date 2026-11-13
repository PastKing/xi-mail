import settingService from './setting-service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import mailLinkService from './mail-link-service';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import verifyUtils from '../utils/verify-utils';
import domainUtils from "../utils/domain-uitls";
import {objectProxyBase} from './storage-config-service';

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params

		const emailRow = await mailLinkService.read(c, token);

		if (emailRow) {

			if (emailRow.content) {
				const setting = await settingService.query(c);
				return emailHtmlTemplate(emailRow.content || '', objectProxyBase(c,setting)||setting.r2Domain)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate('Access denied')
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		const tgChatIds = tgChatId.split(',');

		let viewOrigin = null;
		try {
			const url = new URL(domainUtils.toOssDomain(customDomain?.trim()));
			if (url.protocol === 'https:' && !url.username && !url.password) viewOrigin = url.origin;
		} catch { /* Missing/invalid viewer configuration must not create a broken button. */ }
		const viewToken = viewOrigin ? await mailLinkService.issue(c, email) : null;
		const webAppUrl = viewToken ? `${viewOrigin}/api/telegram/getEmail/${viewToken}` : null;

		await Promise.all(tgChatIds.map(async chatId => {
			try {
				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: chatId,
						parse_mode: 'HTML',
						text: emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText),
						...(webAppUrl ? { reply_markup: {
							inline_keyboard: [
								[
									{
										text: '查看',
										web_app: { url: webAppUrl }
									}
								]
							]
						} } : {})
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
