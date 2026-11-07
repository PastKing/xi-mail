import BizError from '../error/biz-error';
import userService from './user-service';
import emailUtils from '../utils/email-utils';
import { isDel, settingConst, userConst } from '../const/entity-const';
import JwtUtils from '../utils/jwt-utils';
import { v4 as uuidv4 } from 'uuid';
import KvConst from '../const/kv-const';
import constant from '../const/constant';
import userContext from '../security/user-context';
import verifyUtils from '../utils/verify-utils';
import accountService from './account-service';
import settingService from './setting-service';
import saltHashUtils from '../utils/crypto-utils';
import cryptoUtils from '../utils/crypto-utils';
import turnstileService from './turnstile-service';
import roleService from './role-service';
import regKeyService from './reg-key-service';
import dayjs from 'dayjs';
import { toUtc } from '../utils/date-uitil';
import { t } from '../i18n/i18n.js';
import verifyRecordService from './verify-record-service';
import sessionService from './session-service';
import securityRateLimit from './security-rate-limit-service';

const loginService = {

	async register(c, params) {

		const { email, password, token, code } = params || {};

		let { regKey, register, registerVerify, regVerifyCount, minEmailPrefix, emailPrefixFilter, emailKeywordBlacklist } = await settingService.query(c)

		if (register === settingConst.register.CLOSE) {
			throw new BizError(t('regDisabled'));
		}
		await securityRateLimit.consume(c, 'register-ip', c.req?.header('CF-Connecting-IP') || 'unknown', 20, 300);

		if (typeof email !== 'string' || email.length > 320 || !verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}
		if (typeof password !== 'string' || password.length < 6) throw new BizError(t('pwdMinLength'));
		if (password.length > 30) throw new BizError(t('pwdLengthLimit'));

		// Registration is anonymous: claiming the admin address must not bypass CAPTCHA.
		// Verify before policy, invitation or address lookups to avoid unverified probing.
		let regVerifyOpen = registerVerify === settingConst.registerVerify.OPEN;
		if (registerVerify === settingConst.registerVerify.COUNT) {
			regVerifyOpen = await verifyRecordService.isOpenRegVerify(c, regVerifyCount);
		}
		if (regVerifyOpen) await turnstileService.verify(c, token);

		if (emailUtils.getName(email).length < minEmailPrefix) {
			throw new BizError(t('minEmailPrefix', { msg: minEmailPrefix } ));
		}

		if (emailPrefixFilter.some(content => emailUtils.getName(email).includes(content)))  {
			throw new BizError(t('banEmailPrefix'));
		}

		if (emailKeywordBlacklist.length > 0 && emailKeywordBlacklist.some(kw => emailUtils.getName(email).toLowerCase().includes(kw.toLowerCase()))) {
			throw new BizError(t('emailKeywordBlocked'));
		}

		if (emailUtils.getName(email).length > 64) {
			throw new BizError(t('emailLengthLimit'));
		}

		const isAdmin = email === c.env.admin;
		const setting = await settingService.query(c);
		if (!isAdmin && !settingService.isDomainValid(setting, emailUtils.getDomain(email))) {
			throw new BizError(t('notEmailDomain'));
		}

		let type = null;
		let regKeyId = 0

		if (regKey === settingConst.regKey.OPEN) {
			const result = await this.handleOpenRegKey(c, regKey, code)
			type = result?.type
			regKeyId = result?.regKeyId
		}

		if (regKey === settingConst.regKey.OPTIONAL) {
			const result = await this.handleOpenOptional(c, regKey, code)
			type = result?.type
			regKeyId = result?.regKeyId
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}

		let defType = null

		if (!type) {
			const roleRow = await roleService.selectDefaultRole(c);
			defType = roleRow.roleId
		}


		const roleRow = await roleService.selectById(c, type || defType);

		if(!roleService.hasAvailDomainPerm(roleRow.availDomain, email)) {

			if (type) {
				throw new BizError(t('noDomainPermRegKey'),403)
			}

			if (defType) {
				throw new BizError(t('noDomainPermReg'),403)
			}

		}

		const { salt, hash } = await saltHashUtils.hashPassword(password);

		const userId = await userService.insert(c, { email, regKeyId,password: hash, salt, type: type || defType });

		await accountService.insert(c, { userId: userId, email, name: emailUtils.getName(email) });

		await userService.updateUserInfo(c, userId, true);

		if (regKey !== settingConst.regKey.CLOSE && type) {
			await regKeyService.reduceCount(c, code, 1);
		}

		if (registerVerify === settingConst.registerVerify.COUNT && !regVerifyOpen) {
			const row = await verifyRecordService.increaseRegCount(c);
			return {regVerifyOpen: row.count >= regVerifyCount}
		}

		return {regVerifyOpen}

	},

	async registerVerify() {

	},

	async handleOpenRegKey(c, regKey, code) {

		if (!code) {
			throw new BizError(t('emptyRegKey'));
		}

		const regKeyRow = await regKeyService.selectByCode(c, code);

		if (!regKeyRow) {
			throw new BizError(t('notExistRegKey'));
		}

		if (regKeyRow.count <= 0) {
			throw new BizError(t('noRegKeyTotal'));
		}

		const today = toUtc().tz('Asia/Shanghai').startOf('day')
		const expireTime = toUtc(regKeyRow.expireTime).tz('Asia/Shanghai').startOf('day');

		if (expireTime.isBefore(today)) {
			throw new BizError(t('regKeyExpire'));
		}

		return { type: regKeyRow.roleId, regKeyId: regKeyRow.regKeyId };
	},

	async handleOpenOptional(c, regKey, code) {

		if (!code) {
			return null
		}

		const regKeyRow = await regKeyService.selectByCode(c, code);

		if (!regKeyRow) {
			return null
		}

		const today = toUtc().tz('Asia/Shanghai').startOf('day')
		const expireTime = toUtc(regKeyRow.expireTime).tz('Asia/Shanghai').startOf('day');

		if (regKeyRow.count <= 0 || expireTime.isBefore(today)) {
			return null
		}

		return { type: regKeyRow.roleId, regKeyId: regKeyRow.regKeyId };
	},

	async login(c, params, noVerifyPwd = false) {

		const email = typeof params?.email === 'string' ? params.email.trim().toLowerCase() : '';
		const password = params?.password;
		if (!email || email.length > 320 || (!noVerifyPwd && (typeof password !== 'string' || !password || password.length > 256)))
			throw new BizError(t('invalidCredentials'));
		if (!noVerifyPwd) await securityRateLimit.login(c, email);

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		// Hash even for unknown accounts, and use one response for unknown/deleted/wrong-password logins.
		const validPassword = noVerifyPwd || await cryptoUtils.verifyPassword(password,
			userRow?.salt || 'xi-mail-login-dummy-salt', userRow?.password || 'unmatchable-dummy-hash');
		if (!userRow || userRow.isDel === isDel.DELETE || !validPassword)
			throw new BizError(t('invalidCredentials'));

		if(userRow.status === userConst.status.BAN) {
			const settings = await settingService.query(c);
			const banMsg = settings.banMessage || t('isBanUser');
			throw new BizError(banMsg);
		}

		if (!noVerifyPwd) await securityRateLimit.loginSuccess(c, email);

		const uuid = uuidv4();
		const jwt = await JwtUtils.generateToken(c,{ userId: userRow.userId, token: uuid });

		let authInfo = await sessionService.get(c, userRow.userId);

		if (!authInfo || authInfo.user.email !== userRow.email) {
			authInfo = {
				tokens: [],
				sessions: {},
				user: userRow,
				refreshTime: dayjs().toISOString()
			};
		}

		sessionService.add(c, authInfo, uuid, noVerifyPwd ? 'oauth' : 'password');

		await userService.updateUserInfo(c, userRow.userId);

		await sessionService.save(c, userRow.userId, authInfo);
		return jwt;
	},

	async logout(c, userId) {
		await sessionService.revokeToken(c, userId, userContext.getToken(c));
	}

};

export default loginService;
