import { getTableColumns, sql } from 'drizzle-orm';
import email from '../entity/email';
import emailUtils from '../utils/email-utils';

export const EMAIL_LIST_TEXT_LEN = 300;
export const EMAIL_LIST_HTML_LEN = 32 * 1024;

// List responses carry plain summaries; full HTML is fetched only when a message is opened.
export function applyMailPreviews(list) {
	for (const item of list) {
		item.text = (emailUtils.formatText(item.text) || emailUtils.htmlToText(item.content?.slice(0, EMAIL_LIST_HTML_LEN))).replace(/\s+/g, ' ').trim().slice(0, EMAIL_LIST_TEXT_LEN);
		item.content = null;
	}
}

/** 去掉换行/回车/制表符，并压缩连续空格、标签间空白 */
function sqlStripWhitespace(column) {
	return sql`trim(replace(replace(replace(replace(replace(replace(
		coalesce(${column}, ''),
		char(13), ''),
		char(10), ''),
		char(9), ' '),
		'  ', ' '),
		'  ', ' '),
		'> <', '><'))`;
}

/** 完整查询：全部字段 */
export const emailListColumns = getTableColumns(email);

/** 摘要查询：列表只取头部字段；有 text 则不读 content，没有才取 content（去空白）用于预览 */
export const emailBriefColumns = {
	emailId: email.emailId,
	sendEmail: email.sendEmail,
	name: email.name,
	accountId: email.accountId,
	userId: email.userId,
	subject: email.subject,
	code: email.code,
	recipient: email.recipient,
	toEmail: email.toEmail,
	toName: email.toName,
	type: email.type,
	status: email.status,
	message: email.message,
	unread: email.unread,
	createTime: email.createTime,
	isDel: email.isDel,
	content: sql`CASE WHEN trim(coalesce(${email.text}, '')) != '' THEN NULL ELSE ${sqlStripWhitespace(sql`substr(${email.content}, 1, ${EMAIL_LIST_HTML_LEN})`)} END`.as('content'),
	text: sql`substr(coalesce(${email.text}, ''), 1, ${EMAIL_LIST_TEXT_LEN})`.as('text'),
};
