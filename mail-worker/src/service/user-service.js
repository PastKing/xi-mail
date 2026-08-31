import BizError from '../error/biz-error';
import accountService from './account-service';
import accountEntity from '../entity/account';
import settingService from './setting-service';
import orm from '../entity/orm';
import user from '../entity/user';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { emailConst, isDel, roleConst, userConst } from '../const/entity-const';
import kvConst from '../const/kv-const';
import KvConst from '../const/kv-const';
import cryptoUtils from '../utils/crypto-utils';
import emailService from './email-service';
import dayjs from 'dayjs';
import permService from './perm-service';
import roleService from './role-service';
import emailUtils from '../utils/email-utils';
import saltHashUtils from '../utils/crypto-utils';
import constant from '../const/constant';
import { t } from '../i18n/i18n'
import reqUtils from '../utils/req-utils';
import {oauth} from "../entity/oauth";
import oauthService from "./oauth-service";
import accountTransfer from '../entity/account-transfer';

let ensureUserLangColumnPromise;

async function ensureUserLangColumn(c) {
	if (!ensureUserLangColumnPromise) {
		ensureUserLangColumnPromise = c.env.db
			.prepare(`ALTER TABLE user ADD COLUMN lang TEXT NOT NULL DEFAULT '';`)
			.run()
			.catch((e) => {
				const message = String(e?.message || e);
				if (message.includes('duplicate column name')) {
					return;
				}
				ensureUserLangColumnPromise = undefined;
				throw e;
			});
	}

	await ensureUserLangColumnPromise;
}

const userService = {

	async loginUserInfo(c, userId) {

		const userRow = await userService.selectById(c, userId);

		if (!userRow) {
			throw new BizError(t('authExpired'), 401);
		}

		let [account, roleRow, permKeys] = await Promise.all([
			accountService.selectByEmailIncludeDel(c, userRow.email),
			roleService.selectById(c, userRow.type),
			userRow.email === c.env.admin ? Promise.resolve(['*']) : permService.userPermKeys(c, userId)
		]);

		// Auto-create primary account for users who don't have one (e.g. migrated users)
		if (!account) {
			try {
				account = await orm(c).insert(accountEntity)
					.values({
						email: userRow.email,
						userId: userRow.userId,
						name: emailUtils.getName(userRow.email),
						isDel: isDel.NORMAL,
					})
					.returning()
					.get();
			} catch (e) {
				// Insert failed (duplicate etc.), try selecting again
				account = await accountService.selectByEmailIncludeDel(c, userRow.email);
			}
		}

		const user = {};
		user.userId = userRow.userId;
		user.displayId = userRow.displayId;
		user.sendCount = userRow.sendCount;
		user.email = userRow.email;
		user.account = account ?? {};
		user.name = account?.name ?? userRow.email;
		user.permKeys = permKeys;
		user.role = roleRow;
		user.type = userRow.type;
		user.lang = userRow.lang || '';

		if (c.env.admin === userRow.email) {
			user.role = constant.ADMIN_ROLE
			user.type = 0;
		}

		return user;
	},


	async updateLang(c, userId, lang) {
		await ensureUserLangColumn(c);
		await orm(c).update(user).set({ lang }).where(eq(user.userId, userId)).run();
	},

	async resetPassword(c, params, userId) {
		await ensureUserLangColumn(c);

		const { password } = params;

		if (password < 6) {
			throw new BizError(t('pwdMinLength'));
		}
		const { salt, hash } = await cryptoUtils.hashPassword(password);
		await orm(c).update(user).set({ password: hash, salt: salt }).where(eq(user.userId, userId)).run();
	},

	async selectByEmail(c, email) {
		await ensureUserLangColumn(c);
		return orm(c).select().from(user).where(
			and(
				eq(user.email, email),
				eq(user.isDel, isDel.NORMAL)))
			.get();
	},

	generateDisplayId() {
		const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
		const gen = n => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
		return `${gen(4)}-${gen(4)}-${gen(4)}`;
	},

	async insert(c, params) {
		await ensureUserLangColumn(c);
		if (!params.displayId) {
			params.displayId = this.generateDisplayId();
		}
		const { userId } = await orm(c).insert(user).values({ ...params }).returning().get();
		return userId;
	},

	async selectByEmailIncludeDel(c, email) {
		await ensureUserLangColumn(c);
		return orm(c).select().from(user).where(sql`${user.email} COLLATE NOCASE = ${email}`).get();
	},

	async selectByIdIncludeDel(c, userId) {
		await ensureUserLangColumn(c);
		return orm(c).select().from(user).where(eq(user.userId, userId)).get();
	},

	async selectById(c, userId) {
		await ensureUserLangColumn(c);
		return orm(c).select().from(user).where(
			and(
				eq(user.userId, userId),
				eq(user.isDel, isDel.NORMAL)))
			.get();
	},

	async selectByDisplayId(c, displayId) {
		await ensureUserLangColumn(c);
		return orm(c).select().from(user).where(
			and(
				eq(user.displayId, String(displayId)),
				eq(user.isDel, isDel.NORMAL)
			)
		).get();
	},

	async delete(c, userId) {
		await ensureUserLangColumn(c);
		await orm(c).update(user).set({ isDel: isDel.DELETE }).where(eq(user.userId, userId)).run();
		await c.env.kv.delete(kvConst.AUTH_INFO + userId)
	},

	async physicsDelete(c, params) {
		await ensureUserLangColumn(c);
		let { userIds } = params;
		userIds = userIds.split(',').map(Number);
		await accountService.physicsDeleteByUserIds(c, userIds);
		await oauthService.deleteByUserIds(c, userIds);
		await orm(c).delete(user).where(inArray(user.userId, userIds)).run();
	},

	async list(c, params) {
		await ensureUserLangColumn(c);

		let { num, size, email, timeSort, loginSort, status } = params;

		size = Number(size);
		num = Number(num);
		timeSort = Number(timeSort);
		loginSort = Number(loginSort);
		params.isDel = Number(params.isDel);
		if (size > 50) {
			size = 50;
		}

		num = (num - 1) * size;

		const conditions = [];

		if (status > -1) {
			conditions.push(eq(user.status, status));
			conditions.push(eq(user.isDel, isDel.NORMAL));
		}


		if (email) {
			// Search by primary email OR by any sub-account email they own
			const accountMatches = await orm(c)
				.select({ userId: accountEntity.userId })
				.from(accountEntity)
				.where(sql`${accountEntity.email} COLLATE NOCASE LIKE ${'%' + email + '%'}`)
				.all();
			const accountUserIds = [...new Set(accountMatches.map(a => a.userId))];
			if (accountUserIds.length > 0) {
				conditions.push(
					sql`(${user.email} COLLATE NOCASE LIKE ${'%' + email + '%'} OR ${user.userId} IN (${sql.raw(accountUserIds.join(','))}))`
				);
			} else {
				conditions.push(sql`${user.email} COLLATE NOCASE LIKE ${'%' + email + '%'}`);
			}
		}


		if (params.isDel) {
			conditions.push(eq(user.isDel, params.isDel));
		}


		const query = orm(c).select({
			...user,
			username: oauth.username,
			trustLevel: oauth.trustLevel,
			avatar: oauth.avatar,
			name: oauth.name
		}).from(user).leftJoin(oauth, eq(oauth.userId, user.userId))
			.where(and(...conditions));


		if (loginSort === 1) {
			query.orderBy(asc(user.activeTime));
		} else if (loginSort === 2) {
			query.orderBy(desc(user.activeTime));
		} else if (timeSort) {
			query.orderBy(asc(user.userId));
		} else {
			query.orderBy(desc(user.userId));
		}

		const list = await query.limit(size).offset(num);

		const { total } = await orm(c)
			.select({ total: count() })
			.from(user)
			.where(and(...conditions)).get();
		const userIds = list.map(user => user.userId);

		const types = [...new Set(list.map(user => user.type))];

		const [emailCounts, delEmailCounts, sendCounts, delSendCounts, accountCounts, delAccountCounts, roleList] = await Promise.all([
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.RECEIVE),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.RECEIVE, isDel.DELETE),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.SEND),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.SEND, isDel.DELETE),
			accountService.selectUserAccountCountList(c, userIds),
			accountService.selectUserAccountCountList(c, userIds, isDel.DELETE),
			roleService.selectByIdsHasPermKey(c, types,'email:send')
		]);

		const receiveMap = Object.fromEntries(emailCounts.map(item => [item.userId, item.count]));
		const sendMap = Object.fromEntries(sendCounts.map(item => [item.userId, item.count]));
		const accountMap = Object.fromEntries(accountCounts.map(item => [item.userId, item.count]));

		const delReceiveMap = Object.fromEntries(delEmailCounts.map(item => [item.userId, item.count]));
		const delSendMap = Object.fromEntries(delSendCounts.map(item => [item.userId, item.count]));
		const delAccountMap = Object.fromEntries(delAccountCounts.map(item => [item.userId, item.count]));

		for (const user of list) {

			const userId = user.userId;

			user.receiveEmailCount = receiveMap[userId] || 0;
			user.sendEmailCount = sendMap[userId] || 0;
			user.accountCount = accountMap[userId] || 0;

			user.delReceiveEmailCount = delReceiveMap[userId] || 0;
			user.delSendEmailCount = delSendMap[userId] || 0;
			user.delAccountCount = delAccountMap[userId] || 0;

			const roleIndex = roleList.findIndex(roleRow => user.type === roleRow.roleId);
			let sendAction = {};

			if (roleIndex > -1) {
				sendAction.sendType = roleList[roleIndex].sendType;
				sendAction.sendCount = roleList[roleIndex].sendCount;
				sendAction.hasPerm = true;
			} else {
				sendAction.hasPerm = false;
			}

			if (user.email === c.env.admin) {
				sendAction.sendType = constant.ADMIN_ROLE.sendType;
				sendAction.sendCount = constant.ADMIN_ROLE.sendCount;
				sendAction.hasPerm = true;
				user.type = 0
			}

			user.sendAction = sendAction;
		}

		return { list, total };
	},

	async updateUserInfo(c, userId, recordCreateIp = false) {
		await ensureUserLangColumn(c);



		const activeIp = reqUtils.getIp(c);

		const {os, browser, device} = reqUtils.getUserAgent(c);

		const params = {
			os,
			browser,
			device,
			activeIp,
			activeTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
		};

		if (recordCreateIp) {
			params.createIp = activeIp;
		}

		await orm(c)
			.update(user)
			.set(params)
			.where(eq(user.userId, userId))
			.run();
	},

	async setPwd(c, params) {

		const { password, userId } = params;
		await this.resetPassword(c, { password }, userId);
		await c.env.kv.delete(KvConst.AUTH_INFO + userId);
	},

	async setStatus(c, params) {
		await ensureUserLangColumn(c);

		const { status, userId } = params;

		await orm(c)
			.update(user)
			.set({ status })
			.where(eq(user.userId, userId))
			.run();

		if (status === userConst.status.BAN) {
			await c.env.kv.delete(KvConst.AUTH_INFO + userId);
		}
	},

	async batchSetStatus(c, params) {
		await ensureUserLangColumn(c);
		const { userIds, status } = params;
		const ids = (typeof userIds === 'string' ? userIds.split(',') : userIds).map(Number);
		await orm(c).update(user).set({ status }).where(inArray(user.userId, ids)).run();
		if (status === userConst.status.BAN) {
			await Promise.all(ids.map(uid => c.env.kv.delete(KvConst.AUTH_INFO + uid)));
		}
	},

	async batchRestore(c, params) {
		await ensureUserLangColumn(c);
		const { userIds } = params;
		const ids = (typeof userIds === 'string' ? userIds.split(',') : userIds).map(Number);
		await orm(c).update(user).set({ isDel: isDel.NORMAL, status: 0 }).where(inArray(user.userId, ids)).run();
	},

	async setType(c, params) {
		await ensureUserLangColumn(c);

		const { type, userId } = params;

		const roleRow = await roleService.selectById(c, type);

		if (!roleRow) {
			throw new BizError(t('roleNotExist'));
		}

		await orm(c)
			.update(user)
			.set({ type })
			.where(eq(user.userId, userId))
			.run();

	},

	async incrUserSendCount(c, quantity, userId) {
		await ensureUserLangColumn(c);
		await orm(c).update(user).set({
			sendCount: sql`${user.sendCount}
	  +
	  ${quantity}`
		}).where(eq(user.userId, userId)).run();
	},

	async updateAllUserType(c, type, curType) {
		await ensureUserLangColumn(c);
		await orm(c)
			.update(user)
			.set({ type })
			.where(eq(user.type, curType))
			.run();
	},

	async add(c, params) {

		const { email, type, password } = params;

		const setting = await settingService.query(c);
		if (!settingService.isDomainValid(setting, emailUtils.getDomain(email))) {
			throw new BizError(t('notEmailDomain'));
		}

		if (password.length < 6) {
			throw new BizError(t('pwdMinLength'));
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}

		const role = roleService.selectById(c, type);

		if (!role) {
			throw new BizError(t('roleNotExist'));
		}

		const { salt, hash } = await saltHashUtils.hashPassword(password);

		const userId = await userService.insert(c, { email, password: hash, salt, type });

		await userService.updateUserInfo(c, userId, true);

		await accountService.insert(c, { userId: userId, email, type, name: emailUtils.getName(email) });
	},

	async resetDaySendCount(c) {
		await ensureUserLangColumn(c);
		const roleList = await roleService.selectByIdsAndSendType(c, 'email:send', roleConst.sendType.DAY);
		const roleIds = roleList.map(action => action.roleId);
		await orm(c).update(user).set({ sendCount: 0 }).where(inArray(user.type, roleIds)).run();
	},

	async resetSendCount(c, params) {
		await ensureUserLangColumn(c);
		await orm(c).update(user).set({ sendCount: 0 }).where(eq(user.userId, params.userId)).run();
	},

	async restore(c, params) {
		await ensureUserLangColumn(c);
		const { userId, type } = params
		await orm(c)
			.update(user)
			.set({ isDel: isDel.NORMAL })
			.where(eq(user.userId, userId))
			.run();
		const userRow = await this.selectById(c, userId);
		await accountService.restoreByEmail(c, userRow.email);

		if (type) {
			await emailService.restoreByUserId(c, userId);
			await accountService.restoreByUserId(c, userId);
		}

	},

	async listByRegKeyId(c, regKeyId) {
		await ensureUserLangColumn(c);
		return orm(c)
			.select({email: user.email,createTime: user.createTime})
			.from(user)
			.where(eq(user.regKeyId, regKeyId))
			.orderBy(desc(user.userId))
			.all();
	},

	async autoBanInactiveUsers(c) {
		await ensureUserLangColumn(c);
		const settings = await settingService.query(c);
		if (!settings.autoBanMonths || settings.autoBanMonths <= 0) return;

		const cutoffDate = dayjs().subtract(settings.autoBanMonths, 'month').format('YYYY-MM-DD HH:mm:ss');
		await orm(c).update(user).set({ status: userConst.status.BAN })
			.where(and(
				eq(user.status, userConst.status.NORMAL),
				eq(user.isDel, isDel.NORMAL),
				sql`${user.activeTime} IS NOT NULL AND ${user.activeTime} < ${cutoffDate}`
			)).run();
	}
};

export default userService;
