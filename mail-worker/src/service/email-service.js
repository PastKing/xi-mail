import orm from '../entity/orm';
import email from '../entity/email';
import { emailBriefColumns, applyMailPreviews } from '../lib/email-list-columns';
import { attConst, emailConst, isDel, settingConst } from '../const/entity-const';
import { and, desc, eq, gt, inArray, notInArray, lt, count, asc, sql, ne, or, like, lte, gte } from 'drizzle-orm';
import { star } from '../entity/star';
import settingService from './setting-service';
import accountService from './account-service';
import BizError from '../error/biz-error';
import emailUtils from '../utils/email-utils';
import { Resend } from 'resend';
import attService from './att-service';
import { parseHTML } from 'linkedom';
import userService from './user-service';
import roleService from './role-service';
import user from '../entity/user';
import starService from './star-service';
import dayjs from 'dayjs';
import kvConst from '../const/kv-const';
import { t } from '../i18n/i18n'
import account from "../entity/account";
import { att } from '../entity/att';
import telegramService from './telegram-service';
import permService from './perm-service';
import subWorkerService from './sub-worker-service';
import queenSmtpService from './queen-smtp-service';
import sendflareService from './sendflare-service';
import domainUtils from '../utils/domain-uitls';
import { mailFilterConditions, personalMailConditions } from './mail-filter-service';
import { ensureMailIndexes } from './mail-index-service';
import starSchemaService from './star-schema-service';

// QueenSMTP 的消息 id 存在 resend_email_id 字段，加前缀区分来源，避免和 Resend 的状态回调混淆
const QUEEN_ID_PREFIX = 'queensmtp:';

const emailService = {

	async list(c, params, userId) {
		await ensureMailIndexes(c);

		let { emailId, type, accountId, size, timeSort, allReceive } = params;

		size = Math.min(50, Math.max(1, Math.floor(Number(size) || 20)));
		emailId = Number(emailId);
		timeSort = Number(timeSort);
		accountId = Number(accountId);
		allReceive = Number(allReceive);

		if (size > 50) {
			size = 50;
		}

		const firstPage = !emailId;

		if (!emailId) {

			if (timeSort) {
				emailId = 0;
			} else {
				emailId = 9999999999;
			}

		}

		if (accountId > 0) {
			const accountRow = await accountService.selectOwnedById(c, accountId, userId);
			if (!accountRow) return { list: [], total: 0, latestEmail: { emailId: 0, accountId, userId } };
			if (isNaN(allReceive)) allReceive = accountRow.allReceive;
		} else if (isNaN(allReceive)) allReceive = 1;

		if (firstPage && Number(type) === emailConst.type.RECEIVE) {
			await subWorkerService.syncAll(c);
		}

		await starSchemaService.ensure(c);
		const filters = personalMailConditions(c, { ...params, type, accountId, allReceive }, userId);
		const skipStats = emailId !== 9999999999 && !firstPage && (params.skipStats === '1' || params.skipStats === true);
		const query = orm(c)
			.select({
				...emailBriefColumns,
				starId: star.starId
			})
			.from(email)
			.leftJoin(
				star,
				and(
					eq(star.emailId, email.emailId),
					eq(star.userId, userId)
				)
			).innerJoin(
				account,
				eq(account.accountId, email.accountId)
			)
			.where(
				and(
					...filters,
					timeSort ? gt(email.emailId, emailId) : lt(email.emailId, emailId),
					eq(account.isDel, isDel.NORMAL)
				)
			);

		if (timeSort) {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		const listQuery = query.limit(size).all();

		const totalQuery = skipStats ? Promise.resolve(null) : orm(c).select({ total: count() }).from(email)
			.innerJoin(
				account,
				eq(account.accountId, email.accountId)
			)
			.where(
				and(
					...filters,
					eq(account.isDel, isDel.NORMAL)
				)
		).get();

		const latestEmailQuery = skipStats ? Promise.resolve(null) : orm(c).select({
			emailId: email.emailId,
			accountId: email.accountId,
			userId: email.userId
		}).from(email).innerJoin(account, eq(account.accountId,email.accountId)).where(
			and(
				...filters, eq(account.isDel,0)
			))
			.orderBy(desc(email.emailId)).limit(1).get();

		let [list, totalRow, latestEmail] = await Promise.all([listQuery, totalQuery, latestEmailQuery]);

		list = list.map(item => ({
			...item,
			isStar: item.starId != null ? 1 : 0
		}));


		await this.emailAddAtt(c, list);

		if (!latestEmail && !skipStats) {
			latestEmail = {
				emailId: 0,
				accountId: accountId,
				userId: userId,
			}
		}

		return { list, total: totalRow?.total ?? null, latestEmail };
	},

	async delete(c, params, userId) {
		const { emailIds } = params;
		const emailIdList = emailIds.split(',').map(Number);
		const { syncDelete } = await settingService.query(c);

		if (syncDelete === settingConst.syncDelete.OPEN) {
			const ownedRows = await orm(c).select({ emailId: email.emailId }).from(email)
				.where(and(eq(email.userId, userId), inArray(email.emailId, emailIdList)))
				.all();
			const ownedIds = ownedRows.map(row => row.emailId);
			if (ownedIds.length) {
				await this.physicsDelete(c, { emailIds: ownedIds.join(',') });
			}
			return;
		}

		await orm(c).update(email).set({ isDel: isDel.DELETE }).where(
			and(
				eq(email.userId, userId),
				inArray(email.emailId, emailIdList)))
			.run();
	},

	receive(c, params, cidAttList, r2domain) {
		params.content = this.imgReplace(params.content, cidAttList, r2domain)
		return orm(c).insert(email).values({ ...params }).returning().get();
	},

	// 选择域名的发件服务：按「发件服务」设置优先，未设置时 Resend 优先，保持旧行为
	resolveSendProvider(setting, domain, hasAttachments) {
		const resendToken = setting.resendTokens?.[domain];
		const queenToken = setting.queenTokens?.[domain];
		const flareToken = setting.sendflareTokens?.[domain];
		const preferred = setting.sendProviders?.[domain];

		const resend = resendToken ? { type: 'resend', token: resendToken } : null;
		const queen = queenToken ? { type: 'queensmtp', token: queenToken } : null;
		const flare = flareToken ? { type: 'sendflare', token: flareToken } : null;

		let provider = ({ resend, queensmtp: queen, sendflare: flare })[preferred] || resend || queen || flare;

		//QueenSMTP 不支持附件，有附件时换用 Resend
		if (provider?.type === 'queensmtp' && hasAttachments) {
			if (!resend) throw new BizError(t('queenNoAttachment'));
			provider = resend;
		}

		return provider;
	},

	//邮件发送
	async send(c, params, userId) {

		let {
			accountId, //发送账号id
			name, //发件人名字
			sendType, //发件类型
			emailId, //邮件id，如果是回复邮件会带
			receiveEmail, //收件人邮箱
			text, //邮件纯文本
			content, //邮件内容
			subject, //邮件标题
			attachments //附件
		} = params;

		const setting = await settingService.query(c);
		const { r2Domain, send, domainList } = setting;

		//判断是否关闭发件功能
		if (send === settingConst.send.CLOSE) {
			throw new BizError(t('disabledSend'), 403);
		}
		const accountRow = await accountService.selectOwnedById(c, accountId, userId);
		if (!accountRow) throw new BizError(t('senderAccountNotExist'));
		const domain = emailUtils.getDomain(accountRow.email);
		if (!domainList.includes('@' + domain)) throw new BizError(t('noDomainPermSend'), 403);

		let { imageDataList, html } = await attService.toImageUrlHtml(c, content);

		//数量校验必须在发件之前，否则邮件已经发出去了才报错
		if (imageDataList.length > 10) {
			throw new BizError(t('imageAttLimit'));
		}

		if (attachments?.length > 10) {
			throw new BizError(t('attLimit'));
		}

		const userRow = await userService.selectById(c, userId);
		const roleRow = await roleService.selectById(c, userRow.type);

		//判断接收方是不是全部为站内邮箱
		const allInternal = receiveEmail.every(email => {
			const domain = '@' + emailUtils.getDomain(email);
			return domainList.includes(domain);
		});

		if (c.env.admin !== userRow.email) {

			//发件被禁用
			if (roleRow.sendType === 'ban') {
				throw new BizError(t('bannedSend'), 403);
			}

			//发件被禁用
			if (roleRow.sendType === 'internal' && !allInternal) {
				throw new BizError(t('onlyInternalSend'), 403);
			}

		}

		//如果不是管理员，权限设置了发送次数
		if (c.env.admin !== userRow.email && roleRow.sendCount) {

			if (userRow.sendCount >= roleRow.sendCount) {
				if (roleRow.sendType === 'day') throw new BizError(t('daySendLimit'), 403);
				if (roleRow.sendType === 'count') throw new BizError(t('totalSendLimit'), 403);
			}

			if (userRow.sendCount + receiveEmail.length > roleRow.sendCount) {
				if (roleRow.sendType === 'day') throw new BizError(t('daySendLack'), 403);
				if (roleRow.sendType === 'count') throw new BizError(t('totalSendLack'), 403);
			}

		}

		if (c.env.admin !== userRow.email) {
			//用户没有这个域名的使用权限
			if(!roleService.hasAvailDomainPerm(roleRow.availDomain, accountRow.email)) {
				throw new BizError(t('noDomainPermSend'),403)
			}

		}

		const provider = allInternal ? null : this.resolveSendProvider(setting, domain, attachments?.length > 0);

		//如果接收方存在站外邮箱，又没有可用的发件服务
		if (!provider && !allInternal) {
			throw new BizError(t('noResendToken'));
		}

		//没有发件人名字自动截取
		name = typeof name === 'string' ? name.replace(/[\x00-\x1f\x7f]/g, ' ').trim() : '';
		if (!name) {
			name = emailUtils.getName(accountRow.email);
		}

		let emailRow = {
			messageId: null
		};

		//如果是回复邮件
		if (sendType === 'reply') {

			emailRow = await this.selectById(c, emailId);

			if (!emailRow) {
				throw new BizError(t('notExistEmailReply'));
			}

		}

		let resendResult = {};
		let providerMessage = null;

		//存在站外时邮箱全部交给该域名的发件服务
		if (!allInternal && provider.type === 'queensmtp') {

			//QueenSMTP 不支持 cid 内嵌图片，正文图片换成可公开访问的地址（图片在发件后写入存储，收件人打开时已可访问）
			const baseUrl = domainUtils.toOssDomain(r2Domain) || new URL(c.req.url).origin;
			const queenHtml = this.imgReplace(html, imageDataList, r2Domain).replace(/{{domain}}/g, baseUrl + '/');

			const { ids, failed } = await queenSmtpService.send(provider.token, {
				from: accountRow.email,
				fromName: name,
				to: receiveEmail,
				subject,
				html: queenHtml,
				text,
				inReplyTo: sendType === 'reply' ? emailRow.messageId : null,
			});

			resendResult = { data: { id: QUEEN_ID_PREFIX + ids[0] } };

			if (failed.length > 0) {
				providerMessage = 'QueenSMTP: ' + failed.map(item => `${item.to} ${item.error}`).join('; ');
			}

		} else if (!allInternal && provider.type === 'sendflare') {
			const id = await sendflareService.send(provider.token, {
				from: accountRow.email, to: receiveEmail, subject, html, text,
				attachments: [...imageDataList, ...attachments],
				inReplyTo: sendType === 'reply' ? emailRow.messageId : null,
			});
			resendResult = { data: { id: 'sendflare:' + id } };
		} else if (!allInternal) {

			const resend = new Resend(provider.token);

			const sendForm = {
				from: `"${name.replace(/["\\]/g, '\\$&')}" <${accountRow.email}>`,
				to: [...receiveEmail],
				subject: subject,
				text: text,
				html: html,
				attachments: [...imageDataList, ...attachments]
			};

			if (sendType === 'reply') {
				sendForm.headers = {
					'in-reply-to': emailRow.messageId,
					'references': emailRow.messageId
				};
			}

			resendResult = await resend.emails.send(sendForm);

		}

		const { data, error } = resendResult;


		if (error) {
			throw new BizError(error.message);
		}

		imageDataList = imageDataList.map(item => ({...item, contentId: `<${item.contentId}>`}))

		//把图片标签cid标签切换会通用url
		html = this.imgReplace(html, imageDataList, r2Domain);

		//封装数据保存到数据库
		const emailData = {};
		emailData.sendEmail = accountRow.email;
		emailData.name = name;
		emailData.subject = subject;
		emailData.content = html;
		emailData.text = text;
		emailData.accountId = accountId;
		emailData.status = emailConst.status.SENT;
		emailData.type = emailConst.type.SEND;
		emailData.userId = userId;
		emailData.resendEmailId = data?.id;
		if (providerMessage) {
			emailData.message = providerMessage;
		}

		const recipient = [];

		receiveEmail.forEach(item => {
			recipient.push({ address: item, name: '' });
		});

		emailData.recipient = JSON.stringify(recipient);

		if (sendType === 'reply') {
			emailData.inReplyTo = emailRow.messageId;
			emailData.relation = emailRow.messageId;
		}

		//如果权限有发送次数增加用户发送次数
		if (roleRow.sendCount && roleRow.sendType !== 'internal') {
			await userService.incrUserSendCount(c, receiveEmail.length, userId);
		}

		//保存到数据库并返回结果
		const emailResult = await orm(c).insert(email).values(emailData).returning().get();

		//保存内嵌附件
		if (imageDataList.length > 0) {
			await attService.saveArticleAtt(c, imageDataList, userId, accountId, emailResult.emailId);
		}

		//保存普通附件
		if (attachments?.length > 0) {
			await attService.saveSendAtt(c, attachments, userId, accountId, emailResult.emailId);
		}

		const attList = await attService.selectByEmailIds(c, [emailResult.emailId]);
		emailResult.attList = attList;

		//如果全是站内接收方，直接写入数据库
		if (allInternal) {
			await this.HandleOnSiteEmail(c, receiveEmail, emailResult, attList);
		}

		const dateStr = dayjs().format('YYYY-MM-DD');
		let daySendTotal = await c.env.kv.get(kvConst.SEND_DAY_COUNT + dateStr);

		//记录每天发件次数统计
		if (!daySendTotal) {
			await c.env.kv.put(kvConst.SEND_DAY_COUNT + dateStr, JSON.stringify(receiveEmail.length), { expirationTtl: 60 * 60 * 24 });
		} else  {
			daySendTotal = Number(daySendTotal) + receiveEmail.length
			await c.env.kv.put(kvConst.SEND_DAY_COUNT + dateStr, JSON.stringify(daySendTotal), { expirationTtl: 60 * 60 * 24 });
		}

		return [ emailResult ];
	},

	//处理站内邮件发送
	async HandleOnSiteEmail(c, receiveEmail, sendEmailData, attList) {

		const { noRecipient  } = await settingService.query(c);

		//查询所有收件人账号信息
		let accountList = await orm(c).select().from(account).where(inArray(account.email, receiveEmail)).all();

		//查询所有收件人权限身份
		const userIds = accountList.map(accountRow => accountRow.userId);
		let roleList = await roleService.selectByUserIds(c, userIds);

		//封装数据库准备保存到数据库
		const emailDataList = [];

		for (const email of receiveEmail) {

			//把发件人邮件改成收件
			const emailValues = {...sendEmailData}
			emailValues.status = emailConst.status.RECEIVE;
			emailValues.type = emailConst.type.RECEIVE;
			emailValues.toEmail = email;
			emailValues.toName = emailUtils.getName(email);
			emailValues.emailId = null;

			const accountRow = accountList.find(accountRow => accountRow.email === email);

			//如果收件人存在就把邮件信息改成收件人的
			if (accountRow) {

				//设置给收件人保存
				emailValues.userId = accountRow.userId;
				emailValues.accountId = accountRow.accountId;
				emailValues.type = emailConst.type.RECEIVE;
				emailValues.status = emailConst.status.RECEIVE;

				const roleRow = roleList.find(roleRow => roleRow.userId === accountRow.userId);

				let { banEmail, availDomain, userEmail } = roleRow;

				//如果收件人没有这个域名的使用权限和有邮件拦截，就把邮件改为拒收状态
				if (email !== c.env.admin) {

					if (!roleService.isPrimaryEmail(userEmail, accountRow.email) && !roleService.hasAvailDomainPerm(availDomain, email)) {
						emailValues.status = emailConst.status.BOUNCED;
						emailValues.message = `The recipient <${email}> is not authorized to use this domain.`;
					} else if(roleService.isBanEmail(banEmail, sendEmailData.sendEmail)) {
						emailValues.status = emailConst.status.BOUNCED;
						emailValues.message = `The recipient <${email}> is disabled from receiving emails.`;
					}

				}

				emailDataList.push(emailValues);

			} else {

				//设置无收件人邮件信息
				emailValues.userId = 0;
				emailValues.accountId = 0;
				emailValues.type = emailConst.type.RECEIVE;
				emailValues.status = emailConst.status.NOONE;

				//如果无人收件关闭改为拒收
				if (noRecipient === settingConst.noRecipient.CLOSE) {
					emailValues.status = emailConst.status.BOUNCED;
					emailValues.message = `Recipient not found: <${email}>`;
				}

				emailDataList.push(emailValues);

			}

		}

		//保存邮件
		const receiveEmailList = emailDataList.filter(emailRow => emailRow.status === emailConst.status.RECEIVE || emailRow.status === emailConst.status.NOONE);

		for (const emailData of receiveEmailList) {

			const emailRow = await orm(c).insert(email).values(emailData).returning().get();

			//设置附件保存
			for (const attRow of attList) {
				const attValues = {...attRow};
				attValues.emailId = emailRow.emailId;
				attValues.accountId = emailRow.accountId;
				attValues.userId = emailRow.userId;
				attValues.attId = null;
				await orm(c).insert(att).values(attValues).run();
			}

		}

		const bouncedEmail = emailDataList.find(emailRow => emailRow.status === emailConst.status.BOUNCED);


		let status = emailConst.status.DELIVERED;
		let message = ''
		//如果有拒收邮件，就把发件人的邮件改成拒收
		if (bouncedEmail) {
			const messageJson = { message: bouncedEmail.message };
			message = JSON.stringify(messageJson);
			status = emailConst.status.BOUNCED;
		}

		await orm(c).update(email).set({ status, message: message }).where(eq(email.emailId, sendEmailData.emailId)).run();

	},

	imgReplace(content, cidAttList, r2domain) {

		if (!content) {
			return ''
		}

		const { document } = parseHTML(content);

		const images = Array.from(document.querySelectorAll('img'));

		const useAtts = []

		for (const img of images) {

			const src = img.getAttribute('src');
			if (src && src.startsWith('cid:') && cidAttList) {

				const cid = src.replace(/^cid:/, '');
				const attCidIndex = cidAttList.findIndex(cidAtt => cidAtt.contentId.replace(/^<|>$/g, '') === cid);

				if (attCidIndex > -1) {
					const cidAtt = cidAttList[attCidIndex];
					img.setAttribute('src', '{{domain}}' + cidAtt.key);
					useAtts.push(cidAtt)
				}

			}

			const attKey = attService.toAttKey(src, r2domain);

			if (attKey) {
				img.setAttribute('src', '{{domain}}' + attKey);
			}

		}

		useAtts.forEach(att => {
			att.type = attConst.type.EMBED
		})

		return document.toString();
	},

	selectById(c, emailId) {
		return orm(c).select().from(email).where(
			and(eq(email.emailId, emailId),
				eq(email.isDel, isDel.NORMAL)))
			.get();
	},

	// 懒加载正文：列表只返回摘要，打开邮件时再取全文
	async content(c, params, userId) {
		const emailId = Number(params.emailId);
		const currentUser = c.get('user');
		let canViewAll = currentUser?.email === c.env.admin;
		if (!canViewAll) {
			const keys = await permService.userPermKeys(c, userId);
			canViewAll = keys.includes('all-email:query') || keys.includes('*');
		}

		const emailRow = await orm(c).select({
			emailId: email.emailId,
			userId: email.userId,
			content: email.content,
			text: email.text
		}).from(email).where(and(eq(email.emailId, emailId), canViewAll ? sql`1 = 1` : eq(email.userId, userId))).get();

		if (!emailRow) {
			throw new BizError(t('unauthorized'), 404);
		}

		return {
			emailId: emailRow.emailId,
			content: emailRow.content,
			text: emailRow.text,
		};
	},

	async latest(c, params, userId) {
		await ensureMailIndexes(c);
		let { emailId, accountId, allReceive } = params;
		allReceive = Number(allReceive);
		const accountRow = await accountService.selectOwnedById(c, accountId, userId);
		if (!accountRow) return [];

		if (isNaN(allReceive)) {
			allReceive = accountRow.allReceive;
		}

		await subWorkerService.syncAll(c);
		const filters = personalMailConditions(c, { ...params, accountId, allReceive, type: 0 }, userId);

		let list = await orm(c).select({...emailBriefColumns}).from(email)
			.innerJoin(
				account,
				eq(account.accountId, email.accountId)
			)
			.where(
				and(
					gt(email.emailId, emailId),
					...filters,
					eq(account.isDel, isDel.NORMAL),
				))
			.orderBy(desc(email.emailId))
			.limit(20);

		await this.emailAddAtt(c, list);

		return list;
	},

	async physicsDelete(c, params) {
		let { emailIds } = params;
		emailIds = emailIds.split(',').map(Number);
		await attService.removeByEmailIds(c, emailIds);
		await starService.removeByEmailIds(c, emailIds);
		await orm(c).delete(email).where(inArray(email.emailId, emailIds)).run();
	},

	async physicsDeleteUserIds(c, userIds) {
		await attService.removeByUserIds(c, userIds);
		await orm(c).delete(email).where(inArray(email.userId, userIds)).run();
	},

	updateEmailStatus(c, params) {
		const { status, resendEmailId, message } = params;
		return orm(c).update(email).set({
			status: status,
			message: message
		}).where(eq(email.resendEmailId, resendEmailId)).returning().get();
	},

	async selectUserEmailCountList(c, userIds, type, del = isDel.NORMAL) {
		const result = await orm(c)
			.select({
				userId: email.userId,
				count: count(email.emailId)
			})
			.from(email)
			.where(and(
				inArray(email.userId, userIds),
				eq(email.type, type),
				eq(email.isDel, del),
				ne(email.status, emailConst.status.SAVING),
			))
			.groupBy(email.userId);
		return result;
	},

	async allList(c, params) {
		await ensureMailIndexes(c);

		let { emailId, size, name, subject, accountEmail, userEmail, type, timeSort } = params;

		size = Math.min(50, Math.max(1, Math.floor(Number(size) || 20)));

		emailId = Number(emailId);
		timeSort = Number(timeSort);

		if (size > 50) {
			size = 50;
		}

		const skipStats = !!emailId && (params.skipStats === '1' || params.skipStats === true);
		if (!emailId) {

			await subWorkerService.syncInBackground(c);

			if (timeSort) {
				emailId = 0;
			} else {
				emailId = 9999999999;
			}

		}

		const conditions = mailFilterConditions(c, params);

		const countConditions = [...conditions];

		if (timeSort) {
			conditions.unshift(gt(email.emailId, emailId));
		} else {
			conditions.unshift(lt(email.emailId, emailId));
		}

		const query = orm(c).select({ ...emailBriefColumns, userEmail: user.email })
			.from(email)
			.leftJoin(user, eq(email.userId, user.userId))
			.where(and(...conditions));

		// 不按用户搜索时 count 无需 join user
		const queryCount = userEmail
			? orm(c).select({ total: count() })
				.from(email)
				.leftJoin(user, eq(email.userId, user.userId))
				.where(and(...countConditions))
			: orm(c).select({ total: count() })
				.from(email)
				.where(and(...countConditions));

		if (timeSort) {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		const listQuery = query.limit(size).all();
		const totalQuery = skipStats ? Promise.resolve(null) : queryCount.get();
		const latestEmailQuery = skipStats ? Promise.resolve(null) : orm(c).select({
			emailId: email.emailId,
			accountId: email.accountId,
			userId: email.userId
		}).from(email)
			.where(and(
				eq(email.type, emailConst.type.RECEIVE),
				ne(email.status, emailConst.status.SAVING)
			))
			.orderBy(desc(email.emailId)).limit(1).get();

		let [list, totalRow, latestEmail] = await Promise.all([listQuery, totalQuery, latestEmailQuery]);

		await this.emailAddAtt(c, list);

		if (!latestEmail && !skipStats) {
			latestEmail = {
				emailId: 0,
				accountId: 0,
				userId: 0,
			}
		}

		return { list, total: totalRow?.total ?? null, latestEmail };
	},

	async allEmailLatest(c, params) {
		await ensureMailIndexes(c);

		const { emailId } = params;
		const conditions = mailFilterConditions(c, { ...params, type: 'receive' });

		await subWorkerService.syncAll(c);

		let list = await orm(c).select({...emailBriefColumns, userEmail: user.email}).from(email)
			.leftJoin(user, eq(email.userId, user.userId))
			.where(
				and(
					gt(email.emailId, Number(emailId) || 0),
					...conditions
				))
			.orderBy(desc(email.emailId))
			.limit(20);

		await this.emailAddAtt(c, list);

		return list;
	},

	async emailAddAtt(c, list) {
		applyMailPreviews(list);

		const emailIds = list.map(item => item.emailId);

		if (emailIds.length > 0) {

			const attList = await attService.selectByEmailIds(c, emailIds);

			const grouped = new Map();
			for (const attachment of attList) {
				if (!grouped.has(attachment.emailId)) grouped.set(attachment.emailId, []);
				grouped.get(attachment.emailId).push(attachment);
			}
			for (const message of list) message.attList = grouped.get(message.emailId) || [];
		}
	},

	async restoreByUserId(c, userId) {
		await orm(c).update(email).set({ isDel: isDel.NORMAL }).where(eq(email.userId, userId)).run();
	},

	async completeReceive(c, status, emailId) {
		return await orm(c).update(email).set({
			isDel: isDel.NORMAL,
			status: status
		}).where(eq(email.emailId, emailId)).returning().get();
	},

	async completeReceiveAll(c) {
		await ensureMailIndexes(c);
		await c.env.db.prepare(`UPDATE email as e SET status = ${emailConst.status.RECEIVE} WHERE status = ${emailConst.status.SAVING} AND EXISTS (SELECT 1 FROM account WHERE account_id = e.account_id)`).run();
		await c.env.db.prepare(`UPDATE email as e SET status = ${emailConst.status.NOONE} WHERE status = ${emailConst.status.SAVING} AND NOT EXISTS (SELECT 1 FROM account WHERE account_id = e.account_id)`).run();
	},

	// 定时清理超过保留天数的邮件，autoCleanDays 为 0 表示不清理
	async autoClean(c) {
		const { autoCleanDays, autoCleanExclude } = await settingService.query(c);
		const days = Number(autoCleanDays);

		if (!days || days <= 0) {
			return;
		}

		const cutoff = dayjs().subtract(days, 'day').format('YYYY-MM-DD HH:mm:ss');

		const excludeEmails = String(autoCleanExclude || '')
			.split(/[,，\s]+/)
			.map(item => item.trim().toLowerCase())
			.filter(Boolean);

		let excludeUserIds = [];

		if (excludeEmails.length) {
			const rows = await orm(c).select({ userId: user.userId, email: user.email }).from(user).all();
			excludeUserIds = rows
				.filter(row => excludeEmails.includes((row.email || '').toLowerCase()))
				.map(row => row.userId);
		}

		// D1 单次语句有绑定参数上限，分批删除
		const batchSize = 90;
		let cleaned = 0;

		while (true) {
			const conditions = [lt(email.createTime, cutoff)];

			if (excludeUserIds.length) {
				conditions.push(notInArray(email.userId, excludeUserIds));
			}

			const rows = await orm(c).select({ emailId: email.emailId }).from(email)
				.where(and(...conditions))
				.limit(batchSize)
				.all();

			if (!rows.length) {
				break;
			}

			await this.physicsDelete(c, { emailIds: rows.map(row => row.emailId).join(',') });
			cleaned += rows.length;

			if (rows.length < batchSize) {
				break;
			}
		}

		if (cleaned) {
			console.log(`自动清理邮件完成，共 ${cleaned} 封，保留 ${days} 天`);
		}
	},

	async batchDelete(c, params) {
		let { sendName, sendEmail, toEmail, subject, startTime, endTime, type  } = params

		let right = type === 'left' || type === 'include'
		let left = type === 'include'

		const conditions = []

		if (sendName) {
			conditions.push(like(email.name,`${left ? '%' : ''}${sendName}${right ? '%' : ''}`))
		}

		if (subject) {
			conditions.push(like(email.subject,`${left ? '%' : ''}${subject}${right ? '%' : ''}`))
		}

		if (sendEmail) {
			conditions.push(like(email.sendEmail,`${left ? '%' : ''}${sendEmail}${right ? '%' : ''}`))
		}

		if (toEmail) {
			conditions.push(like(email.toEmail,`${left ? '%' : ''}${toEmail}${right ? '%' : ''}`))
		}

		if (startTime && endTime) {
			conditions.push(gte(email.createTime,`${startTime}`))
			conditions.push(lte(email.createTime,`${endTime}`))
		}

		if (conditions.length === 0) {
			return;
		}

		const emailIdsRow = await orm(c).select({emailId: email.emailId}).from(email).where(conditions.length > 1 ? and(...conditions) : conditions[0]).all();

		const emailIds = emailIdsRow.map(row => row.emailId);

		if (emailIds.length === 0){
			return;
		}

		await attService.removeByEmailIds(c, emailIds);

		await orm(c).delete(email).where(conditions.length > 1 ? and(...conditions) : conditions[0]).run();
	},

	async physicsDeleteByAccountId(c, accountId) {
		await attService.removeByAccountId(c, accountId);
		await orm(c).delete(email).where(eq(email.accountId, accountId)).run();
	},

	async read(c, params, userId) {
		const { emailIds } = params;
		if (!Array.isArray(emailIds) || emailIds.length === 0) {
			return;
		}
		const ids = emailIds.map(Number).filter(id => Number.isInteger(id));
		if (ids.length === 0) {
			return;
		}
		await orm(c).update(email).set({ unread: emailConst.unread.READ }).where(and(eq(email.userId, userId), inArray(email.emailId, ids))).run();
	}
};

export default emailService;
