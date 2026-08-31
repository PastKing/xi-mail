import emailUtils from '../utils/email-utils';
import { settingConst } from '../const/entity-const';

const CODE_MAX_LEN = 8;

const aiService = {

	// 从邮件中提取验证码，AI 不可用或未开启时回退正则
	async extractCode(c, email, options = {}) {
		if (!this.shouldExtractCode(options.aiCode, options.aiCodeFilter, email)) {
			return '';
		}

		const subject = email.subject || '';
		const text = emailUtils.formatText(email.text || '');
		const htmlText = emailUtils.htmlToText(email.html || '');
		const body = (htmlText || text).slice(0, 6000);

		if (!subject && !body) {
			return '';
		}

		// 正则先行：零成本零延迟，覆盖大多数场景
		const regexCode = this.extractCodeByRegex(subject, body);
		if (regexCode) {
			return regexCode;
		}

		// 正则未命中且有 AI binding 时用模型兜底
		if (!c.env.ai) {
			return '';
		}

		try {
			const result = await c.env.ai.run(c.env.ai_model || '@cf/meta/llama-3.1-8b-instruct-fast', {
				messages: [
					{
						role: 'system',
						content: 'You extract verification codes from emails. Return only JSON like {"code":"12345678"} or {"code":""}. The code must be 8 characters or fewer and must not contain spaces. If there is no verification code, return {"code":""}. Do not explain.'
					},
					{
						role: 'user',
						content: `Subject: ${subject}\n\n${body}`
					}
				],
				temperature: 0,
				max_tokens: 32
			});

			const content = typeof result === 'string' ? result : result?.response || '';
			const json = typeof content === 'string' ? JSON.parse(content) : content;

			if (typeof json.code !== 'string') {
				return '';
			}

			if (!json.code || json.code.length > CODE_MAX_LEN || /\s/.test(json.code)) {
				return '';
			}

			return json.code;
		} catch (e) {
			console.error('AI 验证码提取失败: ', e);
			return '';
		}
	},

	// 常见验证码格式：4-8 位数字，或紧跟关键词的 4-8 位字母数字
	extractCodeByRegex(subject, body) {
		const text = `${subject}\n${body}`;

		const keywordPattern = /(?:验证码|校验码|动态码|verification code|security code|one[- ]time (?:passcode|password|code)|otp|auth code|login code|access code|confirmation code|pin)\D{0,20}?([A-Za-z0-9]{4,8})\b/i;
		const keywordMatch = text.match(keywordPattern);
		if (keywordMatch && /\d/.test(keywordMatch[1])) {
			return keywordMatch[1];
		}

		// 前置关键词形式：如 "123456 is your verification code"
		const leadingPattern = /\b(\d{4,8})\s+(?:is|为)[^\n]{0,30}(?:验证码|code)/i;
		const leadingMatch = text.match(leadingPattern);
		if (leadingMatch) {
			return leadingMatch[1];
		}

		// 仅当邮件明显是验证码类邮件时，才取独立成段的纯数字
		if (/验证码|verification|one[- ]time|\botp\b|security code/i.test(text)) {
			const standaloneMatch = text.match(/(?:^|\n)\s*(\d{4,8})\s*(?:\n|$)/);
			if (standaloneMatch) {
				return standaloneMatch[1];
			}
		}

		return '';
	},

	shouldExtractCode(aiCode, aiCodeFilterStr, email) {
		// 未写入过该字段时默认开启；只有明确关闭才跳过
		if (aiCode === settingConst.aiCode.CLOSE) {
			return false;
		}

		const filterList = aiCodeFilterStr
			? aiCodeFilterStr.split(/[,，]/).map(item => item.trim().toLowerCase()).filter(Boolean)
			: [];

		if (filterList.length === 0) {
			return true;
		}

		const fromEmail = (email.from?.address || '').trim().toLowerCase();
		const fromDomain = emailUtils.getDomain(fromEmail).toLowerCase();

		return filterList.some(item => item === fromEmail || item === fromDomain);
	}
};

export default aiService;
