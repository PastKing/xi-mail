import app from '../hono/hono';
import result from "../model/result";
import oauthService from "../service/oauth-service";
import { OAUTH_PROVIDERS } from '../const/oauth-providers';

for (const provider of OAUTH_PROVIDERS) {
  app.post(`/oauth/${provider.apiId}/authorize`, async c => c.json(result.ok(await oauthService.authorize(c, 'login', provider.id))));
  app.post(`/oauth/${provider.apiId}/login`, async c => c.json(result.ok(await oauthService.finish(c, await c.req.json(), 'login', provider.id))));
}
