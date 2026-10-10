import { Resend } from 'resend';
import KvConst from '../const/kv-const';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const cloudflareErrors = {
	E_SENDER_NOT_VERIFIED: 'cloudflareDomainNotReady',
	E_SENDER_DOMAIN_NOT_AVAILABLE: 'cloudflareDomainNotReady',
	E_RECIPIENT_NOT_ALLOWED: 'cloudflareRecipientNotAllowed',
	E_RECIPIENT_SUPPRESSED: 'cloudflareRecipientSuppressed',
	E_TOO_MANY_RECIPIENTS: 'cloudflareRecipientLimit',
	E_CONTENT_TOO_LARGE: 'cloudflareContentLimit',
	E_RATE_LIMIT_EXCEEDED: 'cloudflareRateLimit',
	E_DAILY_LIMIT_EXCEEDED: 'cloudflareDailyLimit',
	E_VALIDATION_ERROR: 'cloudflareInvalidEmail',
	E_DELIVERY_FAILED: 'cloudflareDeliveryFailed',
};

const sendChannelService = {
	async query(c) {
		return await c.env.kv.get(KvConst.SEND_CHANNELS, { type: 'json' }) || {};
	},

	validate(channels, domainList, hasBinding) {
		if (!channels || typeof channels !== 'object' || Array.isArray(channels)) {
			throw new BizError(t('invalidSendChannel'));
		}
		const domains = domainList.map(domain => domain.replace(/^@/, ''));
		const normalized = {};
		for (const [domain, channel] of Object.entries(channels)) {
			if (!domains.includes(domain) || !['resend', 'cloudflare'].includes(channel)) {
				throw new BizError(t('invalidSendChannel'));
			}
			if (channel === 'cloudflare' && !hasBinding) {
				throw new BizError(t('cloudflareEmailNotBound'));
			}
			normalized[domain] = channel;
		}
		return normalized;
	},

	async send(c, domain, token, form, sender) {
		const channels = await this.query(c);
		const channel = Object.hasOwn(channels, domain) ? channels[domain] : 'resend';
		if (channel === 'resend') {
			if (!token) throw new BizError(t('noResendToken'));
			const { data, error } = await new Resend(token).emails.send(form);
			if (error) throw new BizError(error.message);
			return data?.id;
		}
		if (channel !== 'cloudflare') throw new BizError(t('invalidSendChannel'));
		if (!c.env.EMAIL?.send) throw new BizError(t('cloudflareEmailNotBound'));
		if (form.to.length > 50) throw new BizError(t('cloudflareRecipientLimit'));
		const message = {
			from: sender,
			to: form.to,
			subject: form.subject,
			text: form.text,
			html: form.html,
			...(form.headers ? { headers: form.headers } : {}),
			attachments: form.attachments.map(att => ({
				filename: att.filename,
				content: att.content,
				type: att.mimeType || att.contentType || att.type || 'application/octet-stream',
				disposition: att.contentId ? 'inline' : 'attachment',
				...(att.contentId ? { contentId: att.contentId } : {}),
			})),
		};
		try {
			const response = await c.env.EMAIL.send(message);
			if (!response?.messageId) throw new Error('Missing Cloudflare message ID');
			// ponytail: record acceptance; add event subscriptions when final delivery needs to sync into Xi-Mail.
			// Keep historical Resend IDs unchanged; namespace Cloudflare IDs in the existing tracking column.
			return `cloudflare:${response.messageId}`;
		} catch (error) {
			// Never retry through another provider: an ambiguous error can follow an accepted send.
			throw new BizError(t(cloudflareErrors[error.code] || 'cloudflareSendFailed'));
		}
	},
};

export default sendChannelService;
