import app from '../hono/hono';
import result from "../model/result";
import oauthService from "../service/oauth-service";
import { OAUTH_PROVIDERS } from '../const/oauth-providers';
import rateLimit from '../service/security-rate-limit-service';

for (const provider of OAUTH_PROVIDERS) {
  app.post(`/oauth/${provider.apiId}/authorize`, async c => {
    c.header('Cache-Control', 'no-store');
    await rateLimit.consume(c, 'oauth-authorize-ip', c.req.header('CF-Connecting-IP') || 'unknown', 10, 300);
    return c.json(result.ok(await oauthService.authorize(c, 'login', provider.id)));
  });
  app.post(`/oauth/${provider.apiId}/login`, async c => {
    c.header('Cache-Control', 'no-store');
    return c.json(result.ok(await oauthService.finish(c, await c.req.json(), 'login', provider.id)));
  });
}
