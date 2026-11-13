import BizError from '../error/biz-error';
import verifyUtils from '../utils/verify-utils';
import emailUtils from '../utils/email-utils';
import userService from './user-service';
import emailService from './email-service';
import orm from '../entity/orm';
import account from '../entity/account';
import { and, asc, eq, gt, inArray, count, sql, ne, or, lt, desc } from 'drizzle-orm';
import {accountConst, isDel, settingConst} from '../const/entity-const';
import settingService from './setting-service';
import turnstileService from './turnstile-service';
import roleService from './role-service';
import { t } from '../i18n/i18n';
import verifyRecordService from './verify-record-service';
import securityRateLimit from './security-rate-limit-service';

const accountService = {

	async add(c, params, userId) {

		const { addEmailVerify , addEmail, manyEmail, addVerifyCount, minEmailPrefix, emailPrefixFilter, emailKeywordBlacklist, domainList } = await settingService.query(c);

		let { email, token } = params;
		if (typeof email === 'string') email = email.trim().toLowerCase();


		if (!(addEmail === settingConst.addEmail.OPEN && manyEmail === settingConst.manyEmail.OPEN)) {
			throw new BizError(t('addAccountDisabled'));
		}
		await securityRateLimit.consume(c, 'account-add', String(userId), 20, 300);


		if (typeof email !== 'string' || !email || email.length > 320) {
			throw new BizError(t('emptyEmail'));
		}

		if (!verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}

		// domainList is prefixed with '@', e.g. '@nlfree.me'
		if (!domainList.includes('@' + emailUtils.getDomain(email))) {
			throw new BizError(t('notExistDomain'));
		}

		if (emailUtils.getName(email).length < minEmailPrefix) {
			throw new BizError(t('minEmailPrefix', { msg: minEmailPrefix } ));
		}

		if (emailPrefixFilter.some(content => emailUtils.getName(email).includes(content))) {
			throw new BizError(t('banEmailPrefix'));
		}

		const userRow = await userService.selectById(c, userId);

		if (emailKeywordBlacklist.length > 0 && userRow.email !== c.env.admin) {
			const emailName = emailUtils.getName(email).toLowerCase();
			if (emailKeywordBlacklist.some(kw => emailName.includes(kw.toLowerCase()))) {
				throw new BizError(t('emailKeywordBlocked'));
			}
		}

		const roleRow = await roleService.selectById(c, userRow.type);
		const quota = userRow.email === c.env.admin ? 0 : Math.max(0, Number(roleRow.accountCount) || 0);

		if (userRow.email !== c.env.admin) {

			if (roleRow.accountCount > 0) {
				const userAccountCount = await accountService.countUserAccount(c, userId)
				if(userAccountCount >= roleRow.accountCount) throw new BizError(t('accountLimit'), 403);
			}

			if(!roleService.hasAvailDomainPerm(roleRow.availDomain, email)) {
				throw new BizError(t('noDomainPermAdd'),403)
			}

		}

		let addVerifyOpen = false

		// Admin bypasses Turnstile verification
		const currentUserEmail = c.get('user')?.email;
		const isAdmin = currentUserEmail && currentUserEmail === c.env.admin;

		if (!isAdmin) {
			if (addEmailVerify === settingConst.addEmailVerify.OPEN) {
				addVerifyOpen = true
				await turnstileService.verify(c, token);
			}

			if (addEmailVerify === settingConst.addEmailVerify.COUNT) {
				addVerifyOpen = await verifyRecordService.isOpenAddVerify(c, addVerifyCount);
				if (addVerifyOpen) {
					await turnstileService.verify(c, token)
				}
			}
		}


		// Do not disclose availability until role, quota and CAPTCHA checks have passed.
		let accountRow = await this.selectByEmailIncludeDel(c, email);
		if (accountRow && accountRow.isDel !== isDel.DELETE) throw new BizError(t('accountUnavailable'));
		// Each write must check the quota itself: a preceding COUNT can race with another request.
		const quotaSql = '(? <= 0 OR (SELECT COUNT(*) FROM account WHERE user_id = ? AND is_del = 0) < ?)';
		const quotaBindings = [quota, userId, quota];
		const unavailable = async () => {
			if (quota > 0 && await this.countUserAccount(c, userId) >= quota) throw new BizError(t('accountLimit'), 403);
			throw new BizError(t('accountUnavailable'));
		};
		try {
			if (accountRow?.isDel === isDel.DELETE && accountRow.userId === userId) {
				const restored = await orm(c).update(account).set({ isDel: isDel.NORMAL, name: emailUtils.getName(email) })
					.where(and(eq(account.accountId, accountRow.accountId), eq(account.userId, userId), eq(account.isDel, isDel.DELETE),
						sql`${account.email} COLLATE NOCASE = ${email}`,
						sql`(${quota} <= 0 OR (SELECT COUNT(*) FROM account WHERE user_id = ${userId} AND is_del = 0) < ${quota})`)).returning().get();
				if (!restored) await unavailable();
				accountRow = restored;
			} else if (accountRow) {
				// A user's primary login identity must never be reassigned as somebody else's mailbox.
				const identity = await userService.selectByEmailIncludeDel(c, email);
				if (identity && identity.userId !== userId) throw new BizError(t('accountUnavailable'));
				// Reusing an address creates a new mailbox ID. Old mail/attachments keep their original owner and mailbox ID.
				// The conditional archive and insert run in a single D1 transaction, so concurrent claims cannot share a mailbox.
				const result = await c.env.db.batch([
					c.env.db.prepare(`UPDATE account SET email = ? WHERE account_id = ? AND user_id <> ? AND is_del = 1 AND email = ? COLLATE NOCASE AND ${quotaSql}`)
						.bind(`retired:${accountRow.accountId}:${accountRow.email}`, accountRow.accountId, userId, email, ...quotaBindings),
					c.env.db.prepare(`INSERT INTO account(email, user_id, name) SELECT ?, ?, ?
						WHERE NOT EXISTS (SELECT 1 FROM account WHERE email = ? COLLATE NOCASE) AND ${quotaSql} RETURNING account_id`)
						.bind(email, userId, emailUtils.getName(email), email, ...quotaBindings),
				]);
				const id = result[1].results?.[0]?.account_id;
				if (!id) await unavailable();
				accountRow = await this.selectById(c, id);
			} else {
				const created = await c.env.db.prepare(`INSERT INTO account(email, user_id, name) SELECT ?, ?, ? WHERE ${quotaSql} RETURNING account_id`)
					.bind(email, userId, emailUtils.getName(email), ...quotaBindings).first();
				if (!created) await unavailable();
				accountRow = await this.selectById(c, created.account_id);
			}
		} catch (error) {
			if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message || '')) throw new BizError(t('accountUnavailable'));
			throw error;
		}

		if (addEmailVerify === settingConst.addEmailVerify.COUNT && !addVerifyOpen) {
			const row = await verifyRecordService.increaseAddCount(c);
			addVerifyOpen = row.count >= addVerifyCount
		}

		accountRow.addVerifyOpen = addVerifyOpen
		return accountRow;
	},

	selectByEmailIncludeDel(c, email) {
		return orm(c).select().from(account).where(sql`${account.email} COLLATE NOCASE = ${email}`).get();
	},

	async list(c, params, userId) {
		const rows = await this.selectList(c, params, userId);
		const sendable = await this.sendableChecker(c, userId);
		return rows.map(row => ({ ...row, canSend: sendable(row.email) }));
	},

	// 判断邮箱能否给站外发件：域名配置了发件服务，且用户等级允许对外发件和使用该域名
	async sendableChecker(c, userId) {
		const [{ resendTokens = {}, queenTokens = {}, sendflareTokens = {}, domainList = [] }, userRow] = await Promise.all([
			settingService.query(c),
			userService.selectById(c, userId),
		]);
		const isAdmin = userRow?.email === c.env.admin;
		const roleRow = isAdmin ? null : await roleService.selectById(c, userRow?.type);

		if (!isAdmin && (!roleRow || ['ban', 'internal'].includes(roleRow.sendType))) {
			return () => false;
		}

		return email => {
			const domain = emailUtils.getDomain(email || '');
			if (!domainList.includes('@' + domain) || (!resendTokens[domain] && !queenTokens[domain] && !sendflareTokens[domain])) return false;
			return isAdmin || roleService.hasAvailDomainPerm(roleRow.availDomain || '', email);
		};
	},

	selectList(c, params, userId) {

		let { accountId, size, lastSort } = params;

		accountId = Number(accountId);
		size = Number(size);
		lastSort = Number(lastSort);

		if (size > 100) {
			size = 100;
		}

		if (!accountId) {
			accountId = 0;
		}

		if(Number.isNaN(lastSort)) {
			lastSort = 9999999999;
		}

		return orm(c).select().from(account).where(
			and(
				eq(account.userId, userId),
				eq(account.isDel, isDel.NORMAL),
					or(
						lt(account.sort, lastSort),
						and(
							eq(account.sort, lastSort),
							gt(account.accountId, accountId)
						)
					))
				)
			.orderBy(desc(account.sort), asc(account.accountId))
			.limit(size)
			.all();
	},

	async delete(c, params, userId) {

		let { accountId } = params;

		const user = await userService.selectById(c, userId);
		const accountRow = await this.selectOwnedById(c, accountId, userId);
		if (!accountRow) throw new BizError(t('noUserAccount'), 404);

		if (accountRow.email === user.email) {
			throw new BizError(t('delMyAccount'));
		}

		if (accountRow.userId !== user.userId) {
			throw new BizError(t('noUserAccount'));
		}

		await orm(c).update(account).set({ isDel: isDel.DELETE }).where(
			and(eq(account.userId, userId),
				eq(account.accountId, accountId)))
			.run();
	},

	selectById(c, accountId) {
		return orm(c).select().from(account).where(
			and(eq(account.accountId, accountId),
				eq(account.isDel, isDel.NORMAL)))
			.get();
	},
	selectOwnedById(c, accountId, userId) {
		return orm(c).select().from(account).where(and(eq(account.accountId, Number(accountId)),
			eq(account.userId, userId), eq(account.isDel, isDel.NORMAL))).get();
	},

	async insert(c, params) {
		await orm(c).insert(account).values({ ...params }).returning();
	},

	async insertList(c, list) {
		await orm(c).insert(account).values(list).run();
	},

	async physicsDeleteByUserIds(c, userIds) {
		await emailService.physicsDeleteUserIds(c, userIds);
		await orm(c).delete(account).where(inArray(account.userId,userIds)).run();
	},

	async selectUserAccountCountList(c, userIds, del = isDel.NORMAL) {
		const result = await orm(c)
			.select({
				userId: account.userId,
				count: count(account.accountId)
			})
			.from(account)
			.where(and(
				inArray(account.userId, userIds),
				eq(account.isDel, del)
			))
			.groupBy(account.userId)
		return result;
	},

	async countUserAccount(c, userId) {
		const { num } = await orm(c).select({num: count()}).from(account).where(and(eq(account.userId, userId),eq(account.isDel, isDel.NORMAL))).get();
		return num;
	},

	async restoreByEmail(c, email, userId) {
		await orm(c).update(account).set({isDel: isDel.NORMAL}).where(and(eq(account.email, email), eq(account.userId, userId))).run();
	},

	async restoreByUserId(c, userId) {
		await orm(c).update(account).set({isDel: isDel.NORMAL}).where(eq(account.userId, userId)).run();
	},

	async setName(c, params, userId) {
		const { accountId } = params
		if (typeof params.name !== 'string') {
			throw new BizError(t('usernameLengthLimit'));
		}
		// 去掉尖括号，避免显示名被当作 HTML 注入到回信模板 / 正文渲染
		const name = params.name.replace(/[<>]/g, '').trim();
		if (name.length > 30) {
			throw new BizError(t('usernameLengthLimit'));
		}
		await orm(c).update(account).set({name}).where(and(eq(account.userId, userId),eq(account.accountId, accountId))).run();
	},

	async allAccount(c, params) {

		let { userId, num, size } = params

		userId = Number(userId)

		num = Number(num)
		size = Number(size)

		if (size > 30) {
			size = 30;
		}

		num = (num - 1) * size;

		const userRow = await userService.selectByIdIncludeDel(c, userId);

		const list = await orm(c).select().from(account).where(and(eq(account.userId, userId),ne(account.email,userRow.email))).limit(size).offset(num);
		const { total } = await orm(c).select({ total: count() }).from(account).where(eq(account.userId, userId)).get();

		return { list, total }
	},

	async physicsDelete(c, params) {
		const { accountId } = params
		await emailService.physicsDeleteByAccountId(c, accountId)
		await orm(c).delete(account).where(eq(account.accountId, accountId)).run();
	},

	async setAllReceive(c, params, userId) {
		let a = null
		const { accountId } = params;
		const accountRow = await this.selectOwnedById(c, accountId, userId);
		if (!accountRow) {
			return;
		}
		await orm(c).update(account).set({ allReceive: accountConst.allReceive.CLOSE }).where(eq(account.userId, userId)).run();
		await orm(c).update(account).set({ allReceive: accountRow.allReceive ? 0 : 1 }).where(and(eq(account.accountId, accountId), eq(account.userId, userId))).run();
	},

	async cancelTop(c, params, userId) {
		const { accountId } = params;
		await orm(c).update(account).set({ sort: 0 })
			.where(and(eq(account.accountId, accountId), eq(account.userId, userId)))
			.run();
	},

	async setAsTop(c, params, userId) {
		const { accountId } = params;
		const userRow = await userService.selectById(c, userId);
		const mainAccountRow = await accountService.selectByEmailIncludeDel(c, userRow.email);
		let mainSort = mainAccountRow.sort === 0 ? 2 : mainAccountRow.sort + 1;
		await orm(c).update(account).set({ sort: mainSort }).where(eq(account.email, userRow.email )).run();
		await orm(c).update(account).set({ sort: mainSort - 1 }).where(and(eq(account.accountId, accountId),eq(account.userId,userId))).run();
	}
};

export default accountService;
