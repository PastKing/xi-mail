import app from '../hono/hono';
import result from '../model/result';
import settingService from '../service/setting-service';

app.put('/setting/set', async (c) => {
	await settingService.set(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/setting/query', async (c) => {
	const setting = await settingService.get(c);
	return c.json(result.ok(setting));
});

app.get('/setting/websiteConfig', async (c) => {
	const setting = await settingService.websiteConfig(c);
	return c.json(result.ok(setting));
})

app.put('/setting/setBackground', async (c) => {
	const key = await settingService.setBackground(c, await c.req.json());
	return c.json(result.ok(key));
});

app.delete('/setting/deleteBackground', async (c) => {
	await settingService.deleteBackground(c);
	return c.json(result.ok());
});

app.get('/setting/globalToken', async (c) => {
	const data = await settingService.getGlobalToken(c);
	return c.json(result.ok(data));
});

app.put('/setting/globalToken/enabled', async (c) => {
	const { enabled } = await c.req.json();
	await settingService.setGlobalTokenEnabled(c, !!enabled);
	return c.json(result.ok());
});

app.post('/setting/globalToken/generate', async (c) => {
	const token = await settingService.generateGlobalToken(c);
	return c.json(result.ok({ token }));
});

