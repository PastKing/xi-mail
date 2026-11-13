import app from '../hono/hono';
import telegramService from '../service/telegram-service';
import { EMAIL_VIEWER_CSP } from '../template/email-viewer';
import mailLinkService from '../service/mail-link-service';
import r2Service from '../service/r2-service';
import {isObjectKey} from '../utils/object-key-policy';

app.get('/telegram/attachment/:token', async c=>{
	const message=await mailLinkService.read(c,c.req.param('token'),true);
	const key=c.req.query('key');
	if (!message || !isObjectKey(key) || !key.startsWith('attachments/') || !await c.env.db.prepare('SELECT 1 FROM attachments WHERE email_id=? AND user_id=? AND account_id=? AND key=? LIMIT 1').bind(message.emailId,message.userId,message.accountId,key).first()) return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
	const response=await r2Service.toObjResp(c,key);
	response.headers.set('Cache-Control','no-store');
	return response;
});

app.get('/telegram/getEmail/:token', async (c) => {
	const content = await telegramService.getEmailContent(c, c.req.param());
	c.header('Cache-Control', 'no-store');
	c.header('Content-Security-Policy', EMAIL_VIEWER_CSP);
	c.header('Referrer-Policy', 'no-referrer');
	c.header('X-Content-Type-Options', 'nosniff');
	return c.html(content)
});

