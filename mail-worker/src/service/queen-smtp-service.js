import BizError from '../error/biz-error';

const BASE_URL = 'https://queensmtp.com/v1';
const TIMEOUT_MS = 15000;

const queenSmtpService = {

	// QueenSMTP 每个请求只能有一个收件人，多个收件人逐个发送；返回成功的消息 id 和失败列表
	async send(token, form) {
		const { from, fromName, to, subject, html, text, inReplyTo } = form;

		const ids = [];
		const failed = [];

		for (const recipient of to) {
			const body = {
				from,
				to: recipient,
				subject,
				isBulk: false,
			};

			if (fromName) body.fromName = fromName.slice(0, 78);
			if (html) body.html = html;
			if (text) body.text = text;
			if (!html && !text) body.text = ' ';

			if (inReplyTo) {
				body.headers = { 'In-Reply-To': inReplyTo, 'References': inReplyTo };
			}

			let result;
			try {
				const res = await fetch(`${BASE_URL}/send`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
					signal: AbortSignal.timeout(TIMEOUT_MS),
				});
				result = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
			} catch (e) {
				result = { success: false, error: e.message };
			}

			if (result?.success && result.data?.id) {
				ids.push(result.data.id);
			} else {
				failed.push({ to: recipient, error: result?.error || 'unknown error', code: result?.code || '' });
			}
		}

		if (ids.length === 0) {
			const first = failed[0] || {};
			throw new BizError(`QueenSMTP: ${first.error}${first.code ? ` (${first.code})` : ''}`);
		}

		return { ids, failed };
	},
};

export default queenSmtpService;
