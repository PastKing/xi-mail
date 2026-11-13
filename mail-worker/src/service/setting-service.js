import KvConst from '../const/kv-const';
import setting from '../entity/setting';
import orm from '../entity/orm';
import {verifyRecordType} from '../const/entity-const';
import fileUtils from '../utils/file-utils';
import r2Service from './r2-service';
import constant from '../const/constant';
import BizError from '../error/biz-error';
import {t} from '../i18n/i18n'
import verifyRecordService from './verify-record-service';
import { AI_CODE_MODELS, resolveAiModel } from '../const/ai-models';
import subWorkerService from './sub-worker-service';
import { normalizeLoginTemplate } from '../const/login-templates';
import oauthConfigService from './oauth-config-service';
import { OAUTH_PROVIDERS } from '../const/oauth-providers';
import webhookConfig from './resend-webhook-config-service';
import sendflareService from './sendflare-service';
import translationService from './translation-service';
import {ensureStorageColumns,normalizeStoragePrefix,validateS3Config,objectProxyBase} from './storage-config-service';

const SEND_PROVIDERS = ['resend', 'queensmtp', 'sendflare'];

function generateToken(len = 32) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const arr = new Uint8Array(len);
	crypto.getRandomValues(arr);
	return Array.from(arr, b => chars[b % chars.length]).join('');
}

const settingService = {

	async ensureSendColumns(c) {
		for (const column of ['queen_tokens', 'send_providers']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN ${column} TEXT NOT NULL DEFAULT '{}';`).run();
			} catch (e) {}
		}
	},

	async refresh(c) {
		let settingRow;
		try {
			settingRow = await orm(c).select().from(setting).get();
		} catch (e) {
			// 新增的发件服务字段还没迁移时先补列再读
			await this.ensureSendColumns(c);
			await ensureStorageColumns(c);
			settingRow = await orm(c).select().from(setting).get();
		}
		settingRow.resendTokens = JSON.parse(settingRow.resendTokens);
		settingRow.queenTokens = JSON.parse(settingRow.queenTokens || '{}');
		settingRow.sendProviders = JSON.parse(settingRow.sendProviders || '{}');
		settingRow.subWorkerDomains = await subWorkerService.domains(c, true);
		settingRow.loginTemplate = normalizeLoginTemplate(settingRow.loginTemplate);
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

		if (settingRow.aiModel === undefined || settingRow.aiModel === null) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN ai_model TEXT NOT NULL DEFAULT '@cf/meta/llama-3.1-8b-instruct-fast';`).run();
				await this.refresh(c);
			} catch (e) {}
			settingRow.aiModel = resolveAiModel('', c.env.ai_model);
		}

		if (!settingRow.queenTokens || !settingRow.sendProviders) {
			try {
				await this.ensureSendColumns(c);
				const raw = await c.env.kv.get(KvConst.SETTING, { type: 'json' });
				raw.queenTokens = raw.queenTokens || {};
				raw.sendProviders = raw.sendProviders || {};
				await c.env.kv.put(KvConst.SETTING, JSON.stringify(raw));
			} catch (e) {}
			settingRow.queenTokens = settingRow.queenTokens || {};
			settingRow.sendProviders = settingRow.sendProviders || {};
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

		// 子 Worker 的域名追加在后面，由子 Worker 收信、主站同步展示
		if (!Array.isArray(settingRow.subWorkerDomains)) {
			try {
				settingRow.subWorkerDomains = await subWorkerService.domains(c);
				const raw = await c.env.kv.get(KvConst.SETTING, { type: 'json' });
				raw.subWorkerDomains = settingRow.subWorkerDomains;
				await c.env.kv.put(KvConst.SETTING, JSON.stringify(raw));
			} catch (e) {
				settingRow.subWorkerDomains = [];
			}
		}
		for (const domain of settingRow.subWorkerDomains) {
			if (!domainList.includes('@' + domain)) {
				domainList.push('@' + domain);
			}
		}
		settingRow.domainList = domainList;

		settingRow.sendflareTokens = await sendflareService.tokens(c);
		settingRow.translation = await translationService.publicConfig(c);
		const subtitle = await c.env.kv.get(KvConst.WEBSITE_SUBTITLE);
		settingRow.subtitle = typeof subtitle === 'string' ? subtitle : '';
		const oauthConfigs = await Promise.all(OAUTH_PROVIDERS.map(provider => oauthConfigService.get(c, provider.id)));
		settingRow.hasResendWebhookSecret = (await webhookConfig.get(c)).length > 0;
		OAUTH_PROVIDERS.forEach((provider, index) => {
			const config = oauthConfigs[index], id = provider.id;
			settingRow[id + 'ClientId'] = config.clientId;
			settingRow[id + 'CallbackUrl'] = config.callbackUrl;
			settingRow[id + 'Switch'] = config.enabled && config.ready;
			settingRow[id + 'HasSecret'] = !!config.clientSecret;
			settingRow[id + 'MinTrustLevel'] = config.minTrustLevel ?? 0;
		});

		settingRow.emailPrefixFilter = settingRow.emailPrefixFilter.split(",").filter(Boolean);
		settingRow.emailKeywordBlacklist = (settingRow.emailKeywordBlacklist || '').split(",").filter(Boolean);
		settingRow.senderDomainBlacklist = (settingRow.senderDomainBlacklist || '').split(",").filter(Boolean);
		settingRow.senderDomainWhitelist = (settingRow.senderDomainWhitelist || '').split(",").filter(Boolean);
		settingRow.senderFilterMode = settingRow.senderFilterMode || 0;
		if (typeof settingRow.domainMapping === 'string') {
			settingRow.domainMapping = JSON.parse(settingRow.domainMapping || '{}');
		}

		settingRow.loginTemplate = normalizeLoginTemplate(settingRow.loginTemplate);
		c.set?.('setting', settingRow);
		return settingRow;
	},

	async get(c, showSiteKey = false) {

		const [settingRow, recordList] = await Promise.all([
			await this.query(c),
			verifyRecordService.selectListByIP(c)
		]);
		delete settingRow.regKeyHintEn;


		if (!showSiteKey) {
			settingRow.siteKey = settingRow.siteKey ? `${settingRow.siteKey.slice(0, 6)}******` : null;
		}

		settingRow.secretKey = settingRow.secretKey ? `${settingRow.secretKey.slice(0, 6)}******` : null;

		Object.keys(settingRow.resendTokens).forEach(key => {
			settingRow.resendTokens[key] = `${settingRow.resendTokens[key].slice(0, 12)}******`;
		});

		Object.keys(settingRow.queenTokens).forEach(key => {
			settingRow.queenTokens[key] = `${settingRow.queenTokens[key].slice(0, 12)}******`;
		});
		settingRow.sendflareTokens = Object.fromEntries(Object.keys(settingRow.sendflareTokens || {}).map(domain => [domain, '******']));

		settingRow.s3AccessKey = settingRow.s3AccessKey ? `${settingRow.s3AccessKey.slice(0, 12)}******` : null;
		settingRow.s3SecretKey = settingRow.s3SecretKey ? `${settingRow.s3SecretKey.slice(0, 12)}******` : null;
		settingRow.hasR2 = !!c.env.r2
		settingRow.hasAi = !!c.env.ai
		settingRow.aiModel = resolveAiModel(settingRow.aiModel, c.env.ai_model)
		settingRow.aiModels = AI_CODE_MODELS

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
		settingRow.objectProxyBase=objectProxyBase(c,settingRow);
		if(!settingRow.attachmentStorage||settingRow.attachmentStorage==='auto')settingRow.attachmentStorage=settingRow.storageType;

		return settingRow;
	},

	async set(c, params) {
		const hasSubtitle = Object.hasOwn(params, 'subtitle');
		let subtitle;
		if (hasSubtitle) {
			if (typeof params.subtitle !== 'string' || params.subtitle.length > 100 || /[\x00-\x1f\x7f]/.test(params.subtitle))
				throw new BizError('Invalid website subtitle', 400);
			subtitle = params.subtitle.trim();
			delete params.subtitle;
		}
		await webhookConfig.save(c, params);
		delete params.resendWebhookSecret;
		delete params.hasResendWebhookSecret;
		for (const provider of OAUTH_PROVIDERS) await oauthConfigService.save(c, params, provider.id);
		if (Object.hasOwn(params, 'loginTemplate')) params.loginTemplate = normalizeLoginTemplate(params.loginTemplate);
		delete params.hasAi
		delete params.hasR2
		delete params.aiModels
		delete params.domainList
		for (const provider of OAUTH_PROVIDERS) {
			for (const suffix of ['Switch', 'ClientId', 'CallbackUrl', 'ClientSecret', 'HasSecret', 'MinTrustLevel']) delete params[provider.id + suffix];
		}
		delete params.regVerifyOpen
		delete params.addVerifyOpen
		delete params.storageType
		delete params.objectProxyBase

		if (params.aiModel) {
			params.aiModel = resolveAiModel(params.aiModel);
		}

		const settingData = await this.query(c);
		if(Object.keys(params).some(key=>['s3Prefix','attachmentStorage','bucket','endpoint','region','s3AccessKey','s3SecretKey','forcePathStyle'].includes(key))){
			await ensureStorageColumns(c);
			if(Object.hasOwn(params,'s3Prefix'))params.s3Prefix=normalizeStoragePrefix(params.s3Prefix);
			if(Object.hasOwn(params,'attachmentStorage')&&!['auto','R2','S3','KV'].includes(params.attachmentStorage))throw new BizError('请选择有效的附件存储',400);
			const candidate={...settingData,...params};
			if(candidate.attachmentStorage==='R2'&&!c.env.r2)throw new BizError('当前未绑定 R2 存储',400);
			if(candidate.attachmentStorage==='S3'||(params.bucket&&params.endpoint))validateS3Config(candidate);
		}
		const sendflareInput = params.sendflareTokens;
		delete params.sendflareTokens;
		delete params.translation;
		delete params.regKeyHintEn;
		let resendTokens = { ...settingData.resendTokens, ...params.resendTokens };
		Object.keys(resendTokens).forEach(domain => {
			if (!resendTokens[domain]) delete resendTokens[domain];
		});

		const queenInput = Object.fromEntries(Object.entries(params.queenTokens || {})
			.filter(([, value]) => !String(value || '').endsWith('******')));
		let queenTokens = { ...settingData.queenTokens, ...queenInput };
		Object.keys(queenTokens).forEach(domain => {
			if (!queenTokens[domain]) delete queenTokens[domain];
		});

		// 每个域名选用的发件服务：resend / queensmtp，空值表示自动（优先 Resend）
		let sendProviders = { ...settingData.sendProviders, ...params.sendProviders };
		Object.keys(sendProviders).forEach(domain => {
			if (!SEND_PROVIDERS.includes(sendProviders[domain])) delete sendProviders[domain];
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
		params.queenTokens = JSON.stringify(queenTokens);
		params.sendProviders = JSON.stringify(sendProviders);
		await orm(c).update(setting).set({ ...params }).returning().get();
		if (hasSubtitle) await c.env.kv.put(KvConst.WEBSITE_SUBTITLE, subtitle);
		if (sendflareInput !== undefined) await sendflareService.saveTokens(c, sendflareInput);
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

	// 未登录可访问，只放登录/注册页和普通用户界面必需的字段；后台配置走 /setting/query
	async websiteConfig(c) {

		const settingRow = await this.get(c, true);

		return {
			register: settingRow.register,
			title: settingRow.title,
			subtitle: settingRow.subtitle || '',
			translation: settingRow.translation,
			manyEmail: settingRow.manyEmail,
			addEmail: settingRow.addEmail,
			autoRefresh: settingRow.autoRefresh,
			addEmailVerify: settingRow.addEmailVerify,
			registerVerify: settingRow.registerVerify,
			send: settingRow.send,
			r2Domain: settingRow.r2Domain,
			objectProxyBase: settingRow.objectProxyBase,
			siteKey: settingRow.siteKey,
			domainList: settingRow.loginDomain === 1 ? [] : settingRow.domainList,
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
			...Object.fromEntries(OAUTH_PROVIDERS.map(provider => [provider.id + 'Switch', settingRow[provider.id + 'Switch']])),
			minEmailPrefix: settingRow.minEmailPrefix,
			randomPrefixLength: settingRow.randomPrefixLength,
			regKeyHint: settingRow.regKeyHint || '',
			regKeyLink: settingRow.regKeyLink || '',
			colorTheme: settingRow.colorTheme || 'indigo',
			loginTemplate: normalizeLoginTemplate(settingRow.loginTemplate),
			layoutMode: settingRow.layoutMode || 'default',
			newEmailNotify: settingRow.newEmailNotify ?? 0,
		};
	},

	getValidDomains(setting) {
		return (setting.domainList || []).map(d => d.replace(/^@/, ''));
	},

	isDomainValid(setting, domain) {
		const validDomains = this.getValidDomains(setting);
		if (validDomains.length === 0) return true;
		return validDomains.includes(domain);
	}
};

export default settingService;
