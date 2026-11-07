import resendService from '../service/resend-service';
import app from '../hono/hono';
app.post('/webhooks',async (c) => {
	try {
		if (Number(c.req.header('content-length') || 0) > 1024 * 1024) return c.text('Payload too large', 413);
		const payload = await c.req.text();
		if (payload.length > 1024 * 1024) return c.text('Payload too large', 413);
		await resendService.webhooks(c, payload, { id: c.req.header('svix-id'), timestamp: c.req.header('svix-timestamp'), signature: c.req.header('svix-signature') });
		return c.text('success', 200)
	} catch (e) {
		if (e.name === 'BizError') return c.text(e.message, [400, 401, 503].includes(e.code) ? e.code : 400);
		console.error('Resend webhook processing failed');
		return c.text('Webhook processing failed', 500);
	}
})
