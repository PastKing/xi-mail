import BizError from '../error/biz-error';

const TOKEN_KEY = 'integration:sendflare:tokens';
const sendflareService = {
	async tokens(c) {
		return (await c.env.kv.get(TOKEN_KEY, { type: 'json' })) || {};
	},
	async saveTokens(c, input) {
		if (!input || Array.isArray(input) || typeof input !== 'object') throw new BizError('Invalid SendFlare configuration', 400);
		const tokens = { ...(await this.tokens(c)) };
		for (const [domain, value] of Object.entries(input)) {
			if (
				!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(domain) ||
				typeof value !== 'string' ||
				value.length > 2048 ||
				/[\r\n]/.test(value)
			)
				throw new BizError('Invalid SendFlare configuration', 400);
			if (value.endsWith('******')) continue;
			if (value.trim()) tokens[domain] = value.trim();
			else delete tokens[domain];
		}
		await c.env.kv.put(TOKEN_KEY, JSON.stringify(tokens));
		return tokens;
	},
	async send(token, form) {
		const batch = form.to.length > 1;
		const body = {
			from: form.from,
			to: batch ? form.to : form.to[0],
			subject: form.subject,
			body: form.html || form.text || ' ',
			replyTo: [form.from],
		};
		if (form.inReplyTo) body.header = { 'In-Reply-To': form.inReplyTo, References: form.inReplyTo };
		if (form.attachments?.length)
			body.attachments = form.attachments.map((item) => ({
				filename: item.filename,
				content: item.content,
				contentType: item.type || item.contentType,
				...(item.contentId ? { contentId: item.contentId, disposition: 'inline' } : { disposition: 'attachment' }),
			}));
		let response, result;
		try {
			response = await fetch(`https://api.sendflare.com/v1/${batch ? 'batchSend' : 'send'}`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(15000),
				redirect: 'error',
			});
			result = await response.json();
		} catch {
			throw new BizError('SendFlare: delivery result unknown; check the provider before retrying', 502);
		}
		const ids = Array.isArray(result.data)
			? result.data.filter((id) => typeof id === 'string' && id)
			: [result.data?.emailId || result.data?.emilId].filter((id) => typeof id === 'string' && id);
		if (!response.ok || result.success !== true || !ids.length)
			throw new BizError('SendFlare: sending failed; check the provider dashboard', 502);
		return ids.join(',');
	},
};
export default sendflareService;
