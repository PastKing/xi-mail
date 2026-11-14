import app from '../hono/hono';
import loginService from '../service/login-service';
import result from '../model/result';
import userContext from '../security/user-context';
import twoFactor from '../service/two-factor-service';

app.post('/login', async (c) => {
	const token = await loginService.login(c, await c.req.json());
	c.header('Cache-Control', 'no-store');
	return c.json(result.ok(typeof token === 'string' ? { token } : token));
});

app.post('/login/two-factor', async c => {
	c.header('Cache-Control', 'no-store');
	return c.json(result.ok({ token: await loginService.completeTwoFactor(c, await c.req.json()) }));
});
app.get('/my/two-factor', async c => {
	c.header('Cache-Control', 'no-store');
	return c.json(result.ok(await twoFactor.status(c, userContext.getUserId(c))));
});
app.post('/my/two-factor/setup', async c => {
	c.header('Cache-Control', 'no-store');
	const { password } = await c.req.json();
	return c.json(result.ok(await twoFactor.setup(c, userContext.getUserId(c), userContext.getToken(c), password)));
});
app.post('/my/two-factor/confirm', async c => {
	c.header('Cache-Control', 'no-store');
	const { code, enrollmentId } = await c.req.json();
	return c.json(result.ok(await twoFactor.confirm(c, userContext.getUserId(c), userContext.getToken(c), code, enrollmentId)));
});
app.post('/my/two-factor/disable', async c => {
	c.header('Cache-Control', 'no-store');
	const { password, code } = await c.req.json();
	await twoFactor.disable(c, userContext.getUserId(c), userContext.getToken(c), password, code);
	return c.json(result.ok());
});

app.post('/register', async (c) => {
	const jwt = await loginService.register(c, await c.req.json());
	return c.json(result.ok(jwt));
});

app.delete('/logout', async (c) => {
	await loginService.logout(c, userContext.getUserId(c));
	return c.json(result.ok());
});

