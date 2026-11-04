import emailService from './email-service';
import { emailConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import { Resend } from 'resend';
import webhookConfig from './resend-webhook-config-service';

const verifier = new Resend('webhook-verification-only');

const resendService = {

	async webhooks(c, payload, headers) {
		if (!headers?.id || !headers?.timestamp || !headers?.signature) throw new BizError('Invalid webhook signature', 401);
		const secrets = await webhookConfig.get(c);
		if (!secrets.length) throw new BizError('Webhook verification is not configured', 503);
		let body;
		for (const secret of secrets) {
			try { body = verifier.webhooks.verify({ payload, headers, webhookSecret: secret }); break; } catch {}
		}
		if (!body) throw new BizError('Invalid webhook signature', 401);
		const statuses = {
			'email.delivered': emailConst.status.DELIVERED, 'email.complained': emailConst.status.COMPLAINED,
			'email.bounced': emailConst.status.BOUNCED, 'email.delivery_delayed': emailConst.status.DELAYED,
			'email.failed': emailConst.status.FAILED, 'email.sent': emailConst.status.SENT,
		};
		if (!Object.hasOwn(statuses, body.type)) return;
		if (typeof body.data?.email_id !== 'string' || !body.data.email_id || body.data.email_id.length > 256)
			throw new BizError('Invalid webhook event', 400);

		const params = {
			resendEmailId: body.data.email_id,
			status: statuses[body.type]
		}

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED
			params.message = null
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED
			params.message = null
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data.bounce
			bounce = JSON.stringify(bounce);
			params.status = emailConst.status.BOUNCED
			params.message = bounce
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED
			params.message = null
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED
			params.message = typeof body.data.failed?.reason === 'string' ? body.data.failed.reason.slice(0, 4096) : null
		}

		// Valid events for unrelated Resend mail are acknowledged without exposing database existence.
		await emailService.updateEmailStatus(c, params);

	}
}

export default resendService
