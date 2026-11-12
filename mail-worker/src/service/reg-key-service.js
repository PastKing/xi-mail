import orm from '../entity/orm';
import regKey from '../entity/reg-key';
import { inArray, like, eq, desc, sql, or } from 'drizzle-orm';
import roleService from './role-service';
import BizError from '../error/biz-error';
import { formatDetailDate, toUtc } from '../utils/date-uitil';
import userService from './user-service';
import { t } from '../i18n/i18n.js';

export function normalizeInviteInput(params) {
	const code = typeof params.code === 'string' ? params.code.trim() : '';
	if (!code) throw new BizError(t('emptyRegKey'), 400);
	if (code.length > 128 || /[\s\x00-\x1f\x7f]/.test(code)) throw new BizError(t('invalidInviteCode'), 400);
	if (!Number.isInteger(params.count) || params.count < 1 || params.count > 99999)
		throw new BizError(t('invalidInviteCount'), 400);
	const value = params.expireTime;
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$)/.test(value))
		throw new BizError(t('invalidInviteExpiry'), 400);
	const dateOnly = value.length === 10;
	const calendarDay = toUtc(value.slice(0,10) + 'T00:00:00Z');
	if (!calendarDay.isValid() || calendarDay.format('YYYY-MM-DD') !== value.slice(0,10))
		throw new BizError(t('invalidInviteExpiry'), 400);
	const expiry = toUtc(dateOnly ? value + 'T00:00:00+08:00' : value).tz('Asia/Shanghai').startOf('day');
	if (!expiry.isValid() || (dateOnly && expiry.format('YYYY-MM-DD') !== value)
		|| expiry.isBefore(toUtc().tz('Asia/Shanghai').startOf('day')))
		throw new BizError(t('invalidInviteExpiry'), 400);
	return { code, count: params.count, expireTime: expiry.utc().format('YYYY-MM-DD HH:mm:ss') };
}

const regKeyService = {

	async add(c, params, userId) {

		const { code, count, expireTime } = normalizeInviteInput(params);
		const { roleId } = params;

		const regKeyRow = await orm(c).select().from(regKey).where(eq(regKey.code, code)).get();

		if (regKeyRow) {
			throw new BizError(t('isExistRegKye'));
		}

		const roleRow = await roleService.selectById(c, roleId);
		if (!roleRow) {
			throw new BizError(t('roleNotExist'));
		}

		const userRow = await userService.selectById(c, userId);
		if (!userRow) throw new BizError(t('unauthorized'), 403);
		if (userRow.email !== c.env.admin) {
			const userRoleRow = await roleService.selectById(c, userRow.type);
			const creatorLevel = Number(userRoleRow?.level), targetLevel = Number(roleRow.level);
			if (!userRoleRow || !Number.isFinite(creatorLevel) || creatorLevel <= 0
				|| !Number.isFinite(targetLevel) || targetLevel <= 0 || targetLevel >= creatorLevel) {
				throw new BizError(t('cannotCreateHigherRole'), 403);
			}
		}

		const inserted = await c.env.db.prepare(`INSERT INTO reg_key(code,role_id,count,user_id,expire_time)
			SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM reg_key WHERE code=?) RETURNING rege_key_id`)
			.bind(code,roleId,count,userId,expireTime,code).first();
		if (!inserted) throw new BizError(t('isExistRegKye'));
	},

	async delete(c, params) {
		let {regKeyIds} = params;
		regKeyIds = regKeyIds.split(',').map(id => Number(id));
		await orm(c).delete(regKey).where(inArray(regKey.regKeyId,regKeyIds)).run();
	},

	async clearNotUse(c) {
		let now = formatDetailDate(toUtc().tz('Asia/Shanghai').startOf('day'))
		await orm(c).delete(regKey).where(or(eq(regKey.count, 0),sql`datetime(${regKey.expireTime}, '+8 hours') < datetime(${now})`)).run();
	},

	selectByCode(c, code) {
		if (typeof code !== 'string') return null;
		// Public demo invitations are intentional; configured role, quota and expiry still apply.
		return orm(c).select().from(regKey).where(eq(regKey.code, code.trim())).get();
	},

	async list(c, params) {

		const {code} = params
		let query = orm(c).select().from(regKey)

		if (code) {
			query = query.where(like(regKey.code, `${code}%`))
		}

		const regKeyList = await query.orderBy(desc(regKey.regKeyId)).all();
		const roleList = await roleService.roleSelectUse(c);

		const today = toUtc().tz('Asia/Shanghai').startOf('day')

		regKeyList.forEach(regKeyRow => {

			const index = roleList.findIndex(roleRow => roleRow.roleId === regKeyRow.roleId)
			regKeyRow.roleName = index > -1 ? roleList[index].name : ''

			const expireTime = toUtc(regKeyRow.expireTime).tz('Asia/Shanghai').startOf('day');

			if (expireTime.isBefore(today)) {
				regKeyRow.expireTime = null
			}
		})

		return regKeyList;
	},

	async reduceCount(c, code, count) {
		await orm(c).update(regKey).set({
			count: sql`${regKey.count}
	  -
	  ${count}`
		}).where(eq(regKey.code, code)).run();
	},

	async history(c, params) {
		const { regKeyId } = params;
		return userService.listByRegKeyId(c, regKeyId);
	}
}

export default regKeyService;
