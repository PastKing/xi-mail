import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import r2Service from './service/r2-service';
import oauthService from "./service/oauth-service";
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (['/static/','/attachments/'].some(p => url.pathname.startsWith(p))) {
			 return await r2Service.toObjResp( { env }, url.pathname.substring(1));
		 }

		if (env.assets) return env.assets.fetch(req);
		return new Response('Xi-Mail API is running. Frontend is deployed separately.', {
			status: 200, headers: { 'Content-Type': 'text/plain' }
		});
	},
	email: email,
	async scheduled(c, env, ctx) {
		await verifyRecordService.clearRecord({ env })
		await userService.resetDaySendCount({ env })
		await emailService.completeReceiveAll({ env })
		await emailService.autoClean({ env })
		await oauthService.clearNoBindOathUser({ env })
		await userService.autoBanInactiveUsers({ env })
	},
};
