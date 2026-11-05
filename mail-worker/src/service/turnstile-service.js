import BizError from '../error/biz-error';
import settingService from './setting-service';
import { t } from '../i18n/i18n'

const turnstileService = {

	async verify(c, token) {

		if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
			throw new BizError(t('emptyBotToken'),400);
		}

		const settingRow = await settingService.query(c)

		if (!settingRow.secretKey) throw new BizError(t('botVerifyFail'), 503);
		let result;
		try {
			const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					secret: settingRow.secretKey,
					response: token,
					remoteip: c.req.header('cf-connecting-ip') || ''
				}),
				signal: AbortSignal.timeout(10000)
			});
			if (!res.ok) throw new Error('Verification service unavailable');
			result = await res.json();
		} catch {
			throw new BizError(t('botVerifyFail'), 503);
		}

		if (result?.success !== true) {
			throw new BizError(t('botVerifyFail'),400)
		}
	}
};

export default turnstileService;
