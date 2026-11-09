import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';
import sessionService from '../service/session-service';
import oauthService from '../service/oauth-service';
import { OAUTH_PROVIDERS } from '../const/oauth-providers';
import translationService from '../service/translation-service';

app.get('/my/oauth', async c => c.json(result.ok(await oauthService.list(c, userContext.getUserId(c)))));
for (const provider of OAUTH_PROVIDERS) {
  app.post(`/my/oauth/${provider.apiId}/authorize`, async c => c.json(result.ok(await oauthService.authorize(c, 'bind', provider.id))));
  app.post(`/my/oauth/${provider.apiId}/callback`, async c => c.json(result.ok(await oauthService.finish(c, await c.req.json(), 'bind', provider.id))));
}
app.delete('/my/oauth', async c => {
	await oauthService.remove(c, userContext.getUserId(c), c.req.query('provider'));
	return c.json(result.ok());
});

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
	if ((await translationService.config(c)).languages.includes(lang)) {
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
