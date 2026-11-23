import emailUtils from '../utils/email-utils';
import { escapeHtml } from './email-viewer';

const TELEGRAM_TEXT_LIMIT = 4096;

function shorten(value, limit) {
	const text = String(value ?? '');
	if (text.length <= limit) return text;
	return text.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/, '') + '…';
}

export default function emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText) {
	const subject = shorten(email.subject?.trim() || '（无主题）', 512);
	let details = '';
	if (tgMsgFrom === 'only-name' || tgMsgFrom === 'show') {
		details += `\n\nFrom\u200B：${shorten(email.name, 256)}`;
		if (tgMsgFrom === 'show') details += `  <${shorten(email.sendEmail, 320)}>`;
	}
	if (tgMsgTo === 'show') {
		details += `${details ? '\n' : '\n\n'}To：\u200B${shorten(email.toEmail, 512)}`;
	}

	let message = `<b>${escapeHtml(subject)}</b>${escapeHtml(details)}`;
	if (tgMsgText === 'show') {
		const preview = emailUtils.formatText(email.text) || emailUtils.htmlToText(email.content);
		if (preview) {
			const remaining = TELEGRAM_TEXT_LIMIT - subject.length - details.length - 2;
			message += `\n\n${escapeHtml(shorten(preview, remaining))}`;
		}
	}
	return message;
}
