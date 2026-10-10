import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';
import sessionService from '../service/session-service';

app.get('/my/loginUserInfo', async (c) => {
	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	return c.json(result.ok(user));
});

app.put('/my/resetPassword', async (c) => {
	await userService.changeOwnPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/my/delete', async (c) => {
	await userService.delete(c, userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/my/lang', async (c) => {
	const { lang } = await c.req.json();
	if (lang && (lang === 'zh' || lang === 'en')) {
		await userService.updateLang(c, userContext.getUserId(c), lang);
	}
	return c.json(result.ok());
});

app.get('/my/sessions', async (c) => {
	const list = await sessionService.list(c, userContext.getUserId(c), userContext.getToken(c));
	return c.json(result.ok(list));
});

app.delete('/my/sessions/others', async (c) => {
	await sessionService.revokeOthers(c, userContext.getUserId(c), userContext.getToken(c));
	return c.json(result.ok());
});

app.delete('/my/sessions', async (c) => {
	const { sid } = c.req.query();
	if (sid) {
		await sessionService.revokeBySid(c, userContext.getUserId(c), sid);
	}
	return c.json(result.ok());
});
