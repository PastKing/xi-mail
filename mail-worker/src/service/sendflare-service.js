import BizError from '../error/biz-error';

const TOKEN_KEY = 'integration:sendflare:tokens';

function deliveryIds(data) {
	const values = Array.isArray(data) ? data
		: data?.emailIds || data?.emilIds || data?.ids || [data];
	return [...new Set((Array.isArray(values) ? values : [values]).map(item =>
		typeof item === 'string' ? item : item?.emailId || item?.emilId || item?.id
	).filter(id => typeof id === 'string' && id.trim() && id.length <= 256 && !/[\x00-\x1f\x7f,]/.test(id)))];
}
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
				// Workers only supports follow/manual. Never forward this token to a redirect target.
				redirect: 'manual',
			});
		} catch {
			throw new BizError('SendFlare: delivery result unknown; check the provider before retrying', 502);
		}
		if (response.status >= 300 && response.status < 400) {
			await response.body?.cancel();
			throw new BizError(`SendFlare: unexpected redirect (HTTP ${response.status}); request was not repeated`, 502);
		}
		try {
			result = await response.json();
		} catch {
			throw new BizError(`SendFlare: invalid response (HTTP ${response.status}); check the provider before retrying`, 502);
		}
		if (result?.success === false || (typeof result?.code === 'number' && result.code !== 0)) {
			const message = typeof result.message === 'string'
				? result.message.replaceAll(token, '[redacted]').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 240)
				: 'request rejected';
			const code = typeof result.code === 'number' ? `, code ${result.code}` : '';
			throw new BizError(`SendFlare: ${message} (HTTP ${response.status}${code})`, 502);
		}
		if (!response.ok || result?.success !== true)
			throw new BizError(`SendFlare: delivery result unknown (HTTP ${response.status}); check the provider before retrying`, 502);
		const ids = deliveryIds(result.data);
		// A successful batch can be acknowledged without per-message IDs. Persist the
		// provider request receipt (or an explicitly local acceptance marker) instead
		// of rejecting an accepted send and inviting duplicate delivery.
		if (!ids.length && batch) {
			const requestId = typeof result.requestId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(result.requestId)
				? result.requestId : null;
			return requestId ? `request:${requestId}` : `accepted:${crypto.randomUUID()}`;
		}
		if (!ids.length)
			throw new BizError('SendFlare: response missing delivery ID; check the provider before retrying', 502);
		return ids.join(',');
	},
};
export default sendflareService;
