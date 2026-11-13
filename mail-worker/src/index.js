import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import r2Service from './service/r2-service';
import oauthService from "./service/oauth-service";
import subWorkerService from './service/sub-worker-service';
import securityRateLimit from './service/security-rate-limit-service';
import mailShare from './service/mail-share-service';

const SUB_SYNC_CRON = '* * * * *';
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (url.pathname.startsWith('/attachments/')) {
			url.pathname='/oss'+url.pathname;
			return app.fetch(new Request(url.toString(),req),env,ctx);
		 }
		 if (url.pathname.startsWith('/static/')) {
			 return await r2Service.toObjResp( { env }, url.pathname.substring(1));
		 }

		if (env.assets) return env.assets.fetch(req);
		return new Response('Xi-Mail API is running. Frontend is deployed separately.', {
			status: 200, headers: { 'Content-Type': 'text/plain' }
		});
	},
	email: email,
	async scheduled(c, env, ctx) {
		await subWorkerService.syncAll({ env })
		// 每分钟的 cron 只用于同步子 Worker 邮件，其余清理任务只在每日 cron 执行
		if (c.cron === SUB_SYNC_CRON) return;
		await securityRateLimit.cleanup({ env });
		await mailShare.cleanup({ env });

		await verifyRecordService.clearRecord({ env })
		await userService.resetDaySendCount({ env })
		await emailService.completeReceiveAll({ env })
		await emailService.autoClean({ env })
		await oauthService.clearNoBindOathUser({ env })
		await userService.autoBanInactiveUsers({ env })
	},
};
