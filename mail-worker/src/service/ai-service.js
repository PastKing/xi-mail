import emailUtils from '../utils/email-utils';
import { settingConst } from '../const/entity-const';
import { resolveAiModel } from '../const/ai-models';

const CODE_MIN_LEN = 4;
const CODE_MAX_LEN = 12;
const BODY_MAX_LEN = 4000;

const CODE_HINT = /验证码|校验码|动态码|verification|one[- ]?time|\botp\b|passcode|\bcode\b|\bpin\b|2fa|two[- ]factor/i;

const aiService = {

	// 有 Workers AI 时模型优先；未绑定、调用失败或结果不可信时回退正则
	async extractCode(c, email, options = {}) {
		if (!this.shouldExtractCode(options.aiCode, options.aiCodeFilter, email)) {
			return '';
		}

		const source = this.buildSource(email);
		if (!source) {
			return '';
		}

		if (c.env.ai) {
			const aiCode = await this.extractCodeByAi(c, source, options.aiModel);
			if (aiCode) {
				return aiCode;
			}
		}

		return this.extractCodeByRegex(source);
	},

	buildSource(email) {
		const subject = emailUtils.formatText(email.subject || '');
		const plain = emailUtils.formatText(email.text || '');
		const htmlText = emailUtils.htmlToText(email.html || '');
		const body = (htmlText || plain).slice(0, BODY_MAX_LEN);
		return this.stripLinks(`${subject}\n${body}`).trim();
	},

	// 链接里的 authcode / token 不是给人手抄的验证码，先整段去掉再分析
	stripLinks(text) {
		return text
			.replace(/<https?:\/\/[^>]*>/gi, ' ')
			.replace(/https?:\/\/\S+/gi, ' ')
			.replace(/\bmailto:\S+/gi, ' ')
			.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ');
	},

	async extractCodeByAi(c, source, modelId) {
		try {
			const model = resolveAiModel(modelId, c.env.ai_model);
			const result = await c.env.ai.run(model, {
				messages: [
					{
						role: 'system',
						content: 'You extract the one-time verification code from an email in any language. '
							+ 'Copy the code exactly as it appears in the text: never shorten it, never drop characters, never invent one. '
							+ `A verification code is a short token the user retypes, normally ${CODE_MIN_LEN} to ${CODE_MAX_LEN} characters. It may contain only uppercase letters when explicitly identified as the code (for example, "ABCDEF is your verification code"). Do not return ordinary words. `
							+ `Return {"code":""} when the email has no such code, or when the only candidate is longer than ${CODE_MAX_LEN} characters, a UUID, an API token, a URL parameter, an order or tracking number, a date, a price or a phone number. `
							+ 'Reply with JSON only, for example {"code":"123456"} or {"code":""}.'
					},
					{
						role: 'user',
						content: source
					}
				],
				temperature: 0,
				max_tokens: 64
			});

			const code = this.parseAiCode(result);
			// 模型常把过长 token 截断成看似合法的短码，截断后就不再独立出现在原文里
			return code && this.appearsAsToken(code, source) ? code : '';
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

		if (!parsed || (typeof parsed.code !== 'string' && typeof parsed.code !== 'number')) {
			return '';
		}

		return this.normalizeCode(parsed.code, '', true);
	},

	normalizeCode(code, source = '', fromAi = false) {
		const value = String(code ?? '').trim();
		if (value.length < CODE_MIN_LEN || value.length > CODE_MAX_LEN) {
			return '';
		}
		if (!/^[A-Za-z0-9]+$/.test(value)) {
			return '';
		}
		if (!/\d/.test(value) && !(fromAi ? this.isLetterCode(value) : this.isExplicitLetterCode(value, source))) return '';
		return value;
	},

	isLetterCode(code) {
		return /^[A-Za-z]{4,12}$/.test(code)
			&& !/^(?:THIS|THAT|YOUR|CODE|ENTER|PLEASE|VERIFY|VERIFIED|CONTINUE|SECURITY|PASSWORD|CONFIRM|CONFIRMATION|VERIFICATION|GRAVATAR)$/i.test(code);
	},

	isExplicitLetterCode(code, source) {
		if (!/^[A-Z]{4,12}$/.test(code) || !this.isLetterCode(code)) return false;
		const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const label = '(?:验证码|校验码|动态码|verification (?:code|token)|security (?:code|token)|one[- ]time (?:passcode|password|code|token)|otp|auth code|login code|access code|confirmation code|passcode|\\bpin\\b|\\bcode\\b)';
		return new RegExp(`(?:${label})[^A-Za-z0-9]{0,24}${escaped}(?![A-Za-z0-9_-])`, 'i').test(source)
			|| new RegExp(`(?:^|[^A-Za-z0-9_-])${escaped}\\s+is\\s+your\\s+(?:[A-Za-z][A-Za-z .'-]{0,30}\\s+)?(?:verification code|security code|code|passcode|otp)\\b`, 'i').test(source);
	},

	// 结果必须在原文中独立成词，UUID / 长 token 的前半截会被这里挡下来
	appearsAsToken(code, source) {
		const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`(^|[^A-Za-z0-9_-])${escaped}([^A-Za-z0-9_-]|$)`).test(source);
	},

	extractCodeByRegex(source) {
		// 中英文规则只用于兜底，不作为 AI 的语言门槛。
		if (!CODE_HINT.test(source)) return '';
		const candidates = [];

		// 关键词紧邻验证码，中间只允许标点和空白
		const keywordPattern = /(?:验证码|校验码|动态码|verification (?:code|token)|security (?:code|token)|one[- ]time (?:passcode|password|code|token)|otp|auth code|login code|access code|confirmation code|\bpin\b)[^A-Za-z0-9]{0,24}([A-Za-z0-9]{4,12})/gi;
		for (const match of source.matchAll(keywordPattern)) {
			candidates.push(match[1]);
		}

		// 标签后带有简短连接词：如 "verification code is: 123456"。
		const labeledSentencePattern = /(?:验证码|校验码|动态码|verification (?:code|token)|security (?:code|token)|one[- ]time (?:passcode|password|code|token)|auth code|login code|confirmation code)\s*(?:is|为)\s*[:：-]?\s*([A-Za-z0-9]{4,12})/gi;
		for (const match of source.matchAll(labeledSentencePattern)) {
			candidates.push(match[1]);
		}

		// 前置关键词形式：如 "123456 is your verification code"
		const leadingPattern = /\b([A-Za-z0-9]{4,12})\s+(?:is|为)[^\n]{0,40}(?:验证码|code)/gi;
		for (const match of source.matchAll(leadingPattern)) {
			candidates.push(match[1]);
		}

		// 独立成行的短码
		for (const match of source.matchAll(/^[^\S\n]*([A-Za-z0-9]{4,12})[^\S\n]*$/gm)) {
			candidates.push(match[1]);
		}

		for (const candidate of candidates) {
			const code = this.normalizeCode(candidate, source);
			if (code && this.appearsAsToken(code, source)) {
				return code;
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
