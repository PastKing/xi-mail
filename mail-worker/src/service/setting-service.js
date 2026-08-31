import KvConst from '../const/kv-const';
import setting from '../entity/setting';
import subWorker from '../entity/sub-worker';
import orm from '../entity/orm';
import {verifyRecordType} from '../const/entity-const';
import { eq } from 'drizzle-orm';
import fileUtils from '../utils/file-utils';
import r2Service from './r2-service';
import constant from '../const/constant';
import BizError from '../error/biz-error';
import {t} from '../i18n/i18n'
import verifyRecordService from './verify-record-service';

function generateToken(len = 32) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const arr = new Uint8Array(len);
	crypto.getRandomValues(arr);
	return Array.from(arr, b => chars[b % chars.length]).join('');
}

const settingService = {

	async refresh(c) {
		const settingRow = await orm(c).select().from(setting).get();
		settingRow.resendTokens = JSON.parse(settingRow.resendTokens);
		c.set('setting', settingRow);
		await c.env.kv.put(KvConst.SETTING, JSON.stringify(settingRow));
	},

	async query(c) {

		if (c.get?.('setting')) {
			return c.get('setting')
		}

		const settingRow = await c.env.kv.get(KvConst.SETTING, { type: 'json' });

		if (!settingRow) {
			throw new BizError('数据库未初始化 Database not initialized.');
		}

		// 一次性将验证码识别改为默认开启（v4.2 曾默认关闭）
		if (settingRow.aiCode === 1 && !await c.env.kv.get('v4_3_ai_code_default')) {
			try {
				settingRow.aiCode = 0;
				await orm(c).update(setting).set({ aiCode: 0 }).run();
				await c.env.kv.put('v4_3_ai_code_default', '1');
				await this.refresh(c);
			} catch (e) {}
		}

		// Parse managed domains (web-configured), fall back to env domain
		let managedDomains = [];
		if (settingRow.managedDomains) {
			try { managedDomains = JSON.parse(settingRow.managedDomains); } catch (e) { managedDomains = []; }
		}
		settingRow.managedDomains = managedDomains;

		let domainList;
		if (managedDomains.length > 0) {
			domainList = managedDomains.filter(d => d.enabled !== false).map(d => '@' + d.domain);
		} else {
			let envDomain = c.env.domain;
			if (typeof envDomain === 'string') {
				try { envDomain = JSON.parse(envDomain); } catch (error) { envDomain = []; }
			}
			domainList = envDomain ? envDomain.map(item => '@' + item) : [];
		}
		settingRow.domainList = domainList;

		let linuxdoSwitch = c.env.linuxdo_switch;

		if (typeof linuxdoSwitch === 'string' && linuxdoSwitch === 'true') {
			linuxdoSwitch = true
		} else if (linuxdoSwitch === true) {
			linuxdoSwitch = true
		} else {
			linuxdoSwitch = false
		}

		settingRow.linuxdoClientId = c.env.linuxdo_client_id;
		settingRow.linuxdoCallbackUrl = c.env.linuxdo_callback_url;
		settingRow.linuxdoSwitch = linuxdoSwitch;

		settingRow.emailPrefixFilter = settingRow.emailPrefixFilter.split(",").filter(Boolean);
		settingRow.emailKeywordBlacklist = (settingRow.emailKeywordBlacklist || '').split(",").filter(Boolean);
		settingRow.senderDomainBlacklist = (settingRow.senderDomainBlacklist || '').split(",").filter(Boolean);
		settingRow.senderDomainWhitelist = (settingRow.senderDomainWhitelist || '').split(",").filter(Boolean);
		settingRow.senderFilterMode = settingRow.senderFilterMode || 0;
		if (typeof settingRow.domainMapping === 'string') {
			settingRow.domainMapping = JSON.parse(settingRow.domainMapping || '{}');
		}

		c.set?.('setting', settingRow);
		return settingRow;
	},

	async get(c, showSiteKey = false) {

		const [settingRow, recordList] = await Promise.all([
			await this.query(c),
			verifyRecordService.selectListByIP(c)
		]);


		if (!showSiteKey) {
			settingRow.siteKey = settingRow.siteKey ? `${settingRow.siteKey.slice(0, 6)}******` : null;
		}

		settingRow.secretKey = settingRow.secretKey ? `${settingRow.secretKey.slice(0, 6)}******` : null;

		Object.keys(settingRow.resendTokens).forEach(key => {
			settingRow.resendTokens[key] = `${settingRow.resendTokens[key].slice(0, 12)}******`;
		});

		settingRow.s3AccessKey = settingRow.s3AccessKey ? `${settingRow.s3AccessKey.slice(0, 12)}******` : null;
		settingRow.s3SecretKey = settingRow.s3SecretKey ? `${settingRow.s3SecretKey.slice(0, 12)}******` : null;
		settingRow.hasR2 = !!c.env.r2
		settingRow.hasAi = !!c.env.ai
		settingRow.aiModel = c.env.ai_model || '@cf/meta/llama-3.1-8b-instruct-fast'

		let regVerifyOpen = false
		let addVerifyOpen = false

		recordList.forEach(row => {
			if (row.type === verifyRecordType.REG) {
				regVerifyOpen = row.count >= settingRow.regVerifyCount
			}
			if (row.type === verifyRecordType.ADD) {
				addVerifyOpen = row.count >= settingRow.addVerifyCount
			}
		})

		settingRow.regVerifyOpen = regVerifyOpen
		settingRow.addVerifyOpen = addVerifyOpen

		settingRow.storageType = await r2Service.storageType(c);

		return settingRow;
	},

	async set(c, params) {
		const settingData = await this.query(c);
		let resendTokens = { ...settingData.resendTokens, ...params.resendTokens };
		Object.keys(resendTokens).forEach(domain => {
			if (!resendTokens[domain]) delete resendTokens[domain];
		});

		if (Array.isArray(params.emailPrefixFilter)) {
			params.emailPrefixFilter = params.emailPrefixFilter + '';
		}

		if (Array.isArray(params.emailKeywordBlacklist)) {
			params.emailKeywordBlacklist = params.emailKeywordBlacklist + '';
		}

		if (Array.isArray(params.senderDomainBlacklist)) {
			params.senderDomainBlacklist = params.senderDomainBlacklist + '';
		}

		if (Array.isArray(params.senderDomainWhitelist)) {
			params.senderDomainWhitelist = params.senderDomainWhitelist + '';
		}

		if (params.domainMapping && typeof params.domainMapping === 'object') {
			params.domainMapping = JSON.stringify(params.domainMapping);
		}

		if (Array.isArray(params.managedDomains)) {
			params.managedDomains = JSON.stringify(params.managedDomains);
		}

		params.resendTokens = JSON.stringify(resendTokens);
		await orm(c).update(setting).set({ ...params }).returning().get();
		await this.refresh(c);
	},

	async deleteBackground(c) {

		const { background } = await this.query(c);
		if (!background) return

		if (background.startsWith('http')) {
			await orm(c).update(setting).set({ background: '' }).run();
			await this.refresh(c)
			return;
		}

		if (background) {
			await r2Service.delete(c,background)
			await orm(c).update(setting).set({ background: '' }).run();
			await this.refresh(c)
		}
	},

	async setBackground(c, params) {

		let { background } = params

		await this.deleteBackground(c);

		if (background && !background.startsWith('http')) {

			const file = fileUtils.base64ToFile(background)

			const arrayBuffer = await file.arrayBuffer();
			background = constant.BACKGROUND_PREFIX + await fileUtils.getBuffHash(arrayBuffer) + fileUtils.getExtFileName(file.name);


			await r2Service.putObj(c, background, arrayBuffer, {
				contentType: file.type,
				cacheControl: `public, max-age=31536000, immutable`,
				contentDisposition: `inline; filename="${file.name}"`
			});

		}

		await orm(c).update(setting).set({ background }).run();
		await this.refresh(c);
		return background;
	},

	async getGlobalToken(c) {
		const token   = await c.env.kv.get(KvConst.GLOBAL_TOKEN) || '';
		const enabled = (await c.env.kv.get(KvConst.GLOBAL_TOKEN_ENABLED)) === '1';
		return { token, enabled };
	},

	async setGlobalTokenEnabled(c, enabled) {
		await c.env.kv.put(KvConst.GLOBAL_TOKEN_ENABLED, enabled ? '1' : '0');
	},

	async generateGlobalToken(c) {
		const token = generateToken(32);
		await c.env.kv.put(KvConst.GLOBAL_TOKEN, token);
		return token;
	},

	async websiteConfig(c) {

		const settingRow = await this.get(c, true);

		return {
			register: settingRow.register,
			title: settingRow.title,
			manyEmail: settingRow.manyEmail,
			addEmail: settingRow.addEmail,
			autoRefresh: settingRow.autoRefresh,
			addEmailVerify: settingRow.addEmailVerify,
			registerVerify: settingRow.registerVerify,
			send: settingRow.send,
			r2Domain: settingRow.r2Domain,
			siteKey: settingRow.siteKey,
			domainList: settingRow.domainList,
			regKey: settingRow.regKey,
			regVerifyOpen: settingRow.regVerifyOpen,
			addVerifyOpen: settingRow.addVerifyOpen,
			noticeTitle: settingRow.noticeTitle,
			noticeContent: settingRow.noticeContent,
			noticeType: settingRow.noticeType,
			noticeDuration: settingRow.noticeDuration,
			noticePosition: settingRow.noticePosition,
			noticeWidth: settingRow.noticeWidth,
			noticeOffset: settingRow.noticeOffset,
			notice: settingRow.notice,
			loginDomain: settingRow.loginDomain,
			linuxdoClientId: settingRow.linuxdoClientId,
			linuxdoCallbackUrl: settingRow.linuxdoCallbackUrl,
			linuxdoSwitch: settingRow.linuxdoSwitch,
			minEmailPrefix: settingRow.minEmailPrefix,
			randomPrefixLength: settingRow.randomPrefixLength,
		emailKeywordBlacklist: settingRow.emailKeywordBlacklist || [],
		domainMapping: settingRow.domainMapping || {},
		regKeyHint: settingRow.regKeyHint || '',
		regKeyHintEn: settingRow.regKeyHintEn || '',
		regKeyLink: settingRow.regKeyLink || '',
		managedDomains: settingRow.managedDomains || [],
		colorTheme: settingRow.colorTheme || 'indigo',
		loginTemplate: settingRow.loginTemplate || 'gradient',
		layoutMode: settingRow.layoutMode || 'default',
		newEmailNotify: settingRow.newEmailNotify ?? 0,
		subWorkers: await this.getSubWorkersSafe(c),
		};
	},

	getValidDomains(setting) {
		return (setting.domainList || []).map(d => d.replace(/^@/, ''));
	},

	isDomainValid(setting, domain) {
		const validDomains = this.getValidDomains(setting);
		if (validDomains.length === 0) return true;
		return validDomains.includes(domain);
	},

	async getSubWorkersSafe(c) {
		try {
			const rows = await orm(c).select({
				id: subWorker.id,
				name: subWorker.name,
				domains: subWorker.domains,
				status: subWorker.status,
			}).from(subWorker).where(eq(subWorker.status, 1)).all();
			return rows.map(r => ({
				...r,
				domains: (() => { try { return JSON.parse(r.domains); } catch { return []; } })(),
			}));
		} catch {
			return [];
		}
	}
};

export default settingService;
