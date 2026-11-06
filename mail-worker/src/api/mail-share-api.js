import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import shares from '../service/mail-share-service';

app.use('/mail-share/*', async (c, next) => {
 c.header('Cache-Control', 'no-store');
 c.header('Referrer-Policy', 'no-referrer');
 c.header('X-Content-Type-Options', 'nosniff');
 return next();
});
app.get('/mail-share/list', async c => c.json(result.ok(await shares.list(c, c.req.query('accountId'), userContext.getUserId(c)))));
app.post('/mail-share/create', async c => c.json(result.ok(await shares.create(c, await c.req.json(), userContext.getUserId(c)))));
app.delete('/mail-share/revoke', async c => {
 await shares.revoke(c, c.req.query('shareId'), userContext.getUserId(c));
 return c.json(result.ok());
});
app.post('/mail-share/read', async c => {
 const { token, before } = await c.req.json();
 return c.json(result.ok(await shares.read(c, token, before)));
});
app.post('/mail-share/content', async c => c.json(result.ok(await shares.content(c, await c.req.json()))));
app.post('/mail-share/attachment', async c => shares.attachment(c, await c.req.json()));
