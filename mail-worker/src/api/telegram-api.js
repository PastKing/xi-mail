import app from '../hono/hono';
import telegramService from '../service/telegram-service';
import { EMAIL_VIEWER_CSP } from '../template/email-viewer';

app.get('/telegram/getEmail/:token', async (c) => {
	const content = await telegramService.getEmailContent(c, c.req.param());
	c.header('Cache-Control', 'no-store');
	c.header('Content-Security-Policy', EMAIL_VIEWER_CSP);
	c.header('Referrer-Policy', 'no-referrer');
	c.header('X-Content-Type-Options', 'nosniff');
	return c.html(content)
});

