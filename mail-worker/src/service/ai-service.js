import emailUtils from '../utils/email-utils';
import { settingConst } from '../const/entity-const';
import { resolveAiModel } from '../const/ai-models';

const CODE_MAX_LEN = 8;

const aiService = {

	// 有 Workers AI 时模型优先；调用失败或未绑定时才回退正则
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

		if (c.env.ai) {
			const aiCode = await this.extractCodeByAi(c, subject, body, options.aiModel);
			if (aiCode) {
				return aiCode;
			}
		}

		return this.extractCodeByRegex(subject, body);
	},

	async extractCodeByAi(c, subject, body, modelId) {
		try {
			const model = resolveAiModel(modelId, c.env.ai_model);
			const result = await c.env.ai.run(model, {
				messages: [
					{
						role: 'system',
						content: 'You extract the login/verification code from an email. Return only JSON like {"code":"123456"} or {"code":""}. The code must be 4 to 8 characters, contain at least one digit, and must not contain spaces. Prefer the code next to 验证码 / verification code / OTP. Ignore order numbers, tracking numbers and dates. If there is no verification code, return {"code":""}. Do not explain.'
					},
					{
						role: 'user',
						content: `Subject: ${subject}\n\n${body}`
					}
				],
				temperature: 0,
				max_tokens: 48
			});

			return this.parseAiCode(result);
		} catch (e) {
			console.error('AI 验证码提取失败: ', e);
			return '';
		}
	},

	parseAiCode(result) {
		const raw = typeof result === 'string'
			? result
			: result?.response || result?.result || '';

		let parsed = raw;
		if (typeof parsed === 'string') {
			const jsonMatch = parsed.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				return '';
			}
			try {
				parsed = JSON.parse(jsonMatch[0]);
			} catch (e) {
				return '';
			}
		}

		if (!parsed || typeof parsed.code !== 'string') {
			return '';
		}

		return this.normalizeCode(parsed.code);
	},

	normalizeCode(code) {
		const value = String(code || '').trim();
		if (!value || value.length < 4 || value.length > CODE_MAX_LEN) {
			return '';
		}
		if (/\s/.test(value) || !/^[A-Za-z0-9]+$/.test(value) || !/\d/.test(value)) {
			return '';
		}
		return value;
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
