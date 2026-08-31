import PostalMime from 'postal-mime';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import settingService from '../service/setting-service';
import attService from '../service/att-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { emailConst, isDel, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import roleService from '../service/role-service';
import userService from '../service/user-service';
import telegramService from '../service/telegram-service';
import aiService from '../service/ai-service';

function matchDomainList(list, address) {
	if (!address) return false;
	const atIdx = address.lastIndexOf('@');
	if (atIdx === -1) return false;
	const senderDomain = address.slice(atIdx + 1).toLowerCase().trim().replace(/[>)]+$/, '');
	return list.some(item => {
		const d = item.toLowerCase().trim().replace(/^@/, '');
		if (!d) return false;
		return senderDomain === d || senderDomain.endsWith('.' + d);
	});
}

export async function email(message, env, ctx) {

	try {

		const {
			receive,
			tgChatId,
			tgBotStatus,
			forwardStatus,
			forwardEmail,
			ruleEmail,
			ruleType,
			r2Domain,
			noRecipient,
			domainMapping,
			senderDomainBlacklist,
			senderFilterMode,
			senderDomainWhitelist,
			aiCode,
			aiCodeFilter
		} = await settingService.query({ env });

		if (receive === settingConst.receive.CLOSE) {
			message.setReject('Service suspended');
			return;
		}

		const isWhitelistMode = senderFilterMode === 1;

		// Blacklist mode: reject on envelope sender match (cheap early reject).
		// Whitelist mode is checked after parsing since either envelope or header From may authorize.
		if (!isWhitelistMode && senderDomainBlacklist && senderDomainBlacklist.length > 0
			&& matchDomainList(senderDomainBlacklist, message.from)) {
			message.setReject('Sender domain blocked');
			return;
		}

		// Apply domain mapping: replace the domain part of message.to if a mapping exists
		// e.g. pk.azx.us → wdy.pkxi.sandbox.lib.uci.edu
		let recipientTo = message.to;
		if (domainMapping && typeof domainMapping === 'object') {
			const atIdx = recipientTo.indexOf('@');
			if (atIdx !== -1) {
				const localPart = recipientTo.slice(0, atIdx);
				const domainPart = recipientTo.slice(atIdx + 1);
				if (domainMapping[domainPart]) {
					recipientTo = `${localPart}@${domainMapping[domainPart]}`;
				}
			}
		}

		const reader = message.raw.getReader();
		let content = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			content += new TextDecoder().decode(value);
		}

		const email = await PostalMime.parse(content);

		if (isWhitelistMode) {
			// Whitelist mode: only authorized sender domains may deliver.
			// Passes if the envelope sender OR the header From matches the whitelist,
			// so admins can authorize either the provider bounce domain or the visible domain.
			// An empty whitelist accepts everything to avoid accidentally rejecting all mail.
			if (senderDomainWhitelist && senderDomainWhitelist.length > 0
				&& !matchDomainList(senderDomainWhitelist, message.from)
				&& !matchDomainList(senderDomainWhitelist, email.from?.address)) {
				message.setReject('Sender not authorized');
				return;
			}
		} else {
			// Second blacklist check on the parsed header From address.
			// Spam often uses a bounce/relay envelope sender on a different domain,
			// while the visible From header (what users see and block) differs.
			if (senderDomainBlacklist && senderDomainBlacklist.length > 0
				&& matchDomainList(senderDomainBlacklist, email.from?.address)) {
				message.setReject('Sender domain blocked');
				return;
			}
		}

		// If domain mapping was applied, update the To list in the parsed email
		// so the stored `recipient` field reflects the mapped address
		if (recipientTo !== message.to && Array.isArray(email.to)) {
			email.to = email.to.map(item =>
				item.address === message.to ? { ...item, address: recipientTo } : item
			);
		}

		let account = await accountService.selectByEmailIncludeDel({ env: env }, recipientTo);

		// 子地址机制：user+tag@domain 找不到账号时投递到 user@domain
		if (!account) {
			const baseEmail = emailUtils.getBaseEmail(recipientTo);
			if (baseEmail && baseEmail !== recipientTo) {
				account = await accountService.selectByEmailIncludeDel({ env: env }, baseEmail);
			}
		}

		if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
			message.setReject('Recipient not found');
			return;
		}

		let userRow = {}

		if (account) {
			 userRow = await userService.selectByIdIncludeDel({ env: env }, account.userId);
		}

		if (account && userRow.email !== env.admin) {

			let { banEmail, availDomain } = await roleService.selectByUserId({ env: env }, account.userId);

			if (!roleService.hasAvailDomainPerm(availDomain, recipientTo)) {
				message.setReject('The recipient is not authorized to use this domain.');
				return;
			}

			if(roleService.isBanEmail(banEmail, email.from.address)) {
				message.setReject('The recipient is disabled from receiving emails.');
				return;
			}

		}


		if (!email.to) {
			email.to = [{ address: recipientTo, name: emailUtils.getName(recipientTo)}]
		}

		const toName = email.to.find(item => item.address === recipientTo)?.name
			|| email.to.find(item => item.address === message.to)?.name
			|| '';

		const code = await aiService.extractCode({ env }, email, { aiCode, aiCodeFilter });

		const params = {
			toEmail: recipientTo,
			toName: toName,
			sendEmail: email.from.address,
			name: email.from.name || emailUtils.getName(email.from.address),
			subject: email.subject,
			content: email.html,
			text: email.text,
			cc: email.cc ? JSON.stringify(email.cc) : '[]',
			bcc: email.bcc ? JSON.stringify(email.bcc) : '[]',
			recipient: JSON.stringify(email.to),
			inReplyTo: email.inReplyTo,
			relation: email.references,
			messageId: email.messageId,
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			code: code || '',
			isDel: isDel.DELETE,
			status: emailConst.status.SAVING
		};

		const attachments = [];
		const cidAttachments = [];

		for (let item of email.attachments) {
			let attachment = { ...item };
			attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content) + fileUtils.getExtFileName(item.filename);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);
			if (attachment.contentId) {
				cidAttachments.push(attachment);
			}
		}

		let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

		attachments.forEach(attachment => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		try {
			if (attachments.length > 0) {
				await attService.addAtt({ env }, attachments);
			}
		} catch (e) {
			console.error(e);
		}

		emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);


		if (ruleType === settingConst.ruleType.RULE) {

			const emails = ruleEmail.split(',');

			if (!emails.includes(recipientTo)) {
				return;
			}

		}

		//转发到TG
		if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
			await telegramService.sendEmailToBot({ env }, emailRow)
		}

		//转发到其他邮箱
		if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {

			const emails = forwardEmail.split(',');

			await Promise.all(emails.map(async email => {

				try {
					await message.forward(email);
				} catch (e) {
					console.error(`转发邮箱 ${email} 失败：`, e);
				}

			}));

		}

	} catch (e) {
		console.error('邮件接收异常: ', e);
		throw e
	}
}
