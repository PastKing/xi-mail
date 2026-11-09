import app from '../hono/hono';
import result from '../model/result';
import translation from '../service/translation-service';
import userContext from '../security/user-context';
import catalog from '../service/language-catalog-service';

app.get('/translation/config',async c=>c.json(result.ok(await translation.management(c))));
app.post('/translation/save',async c=>c.json(result.ok(await translation.save(c,await c.req.json()))));
app.post('/translation/generate',async c=>c.json(result.ok(await translation.generate(c,(await c.req.json()).language))));
app.get('/translation/targets',async c=>c.json(result.ok((await translation.publicConfig(c)).languages)));
app.post('/translation/catalog/refresh',async c=>c.json(result.ok(await catalog.refresh(c))));
app.post('/translation/register',async c=>c.json(result.ok(await catalog.register(c,await c.req.json()))));
app.get('/translation/pack',async c=>{
  c.header('Cache-Control','no-store');
  return c.json(result.ok(await translation.pack(c,c.req.query('language'))));
});
app.post('/email/translate',async c=>{
  c.header('Cache-Control','no-store');
  return c.json(result.ok(await translation.mail(c,await c.req.json(),userContext.getUserId(c))));
});
