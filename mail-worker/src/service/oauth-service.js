import BizError from '../error/biz-error';
import orm from '../entity/orm';
import { oauth } from '../entity/oauth';
import { eq, inArray } from 'drizzle-orm';
import userService from './user-service';
import loginService from './login-service';
import oauthConfigService, { requireProvider } from './oauth-config-service';
import oauthBindingService from './oauth-binding-service';
import { OAUTH_PROVIDERS } from '../const/oauth-providers';
import { verifyTelegramIdentity } from './telegram-identity-service';
import { verifyGoogleIdentity } from './google-identity-service';

const stateKey = (provider, state) => `oauth:${provider}:state:${state}`;
const validNonce = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function nonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
}

const oauthService = {
  async authorize(c, intent = 'login', providerId = 'linuxdo') {
    const provider = requireProvider(providerId);
    const config = await oauthConfigService.require(c, providerId);
    const userId = intent === 'bind' ? c.get('user')?.userId : null;
    if (intent === 'bind' && !userId) throw new BizError('请先使用邮箱登录，再绑定第三方账号', 401);
    const state = nonce();
    const verifier = provider.pkce ? nonce() : undefined;
    const oidcNonce = provider.oidc || providerId === 'telegram' ? nonce() : undefined;
    await c.env.kv.put(stateKey(providerId, state), JSON.stringify({ provider: providerId, clientId: config.clientId, callbackUrl: config.callbackUrl,
      intent, userId, verifier, nonce: oidcNonce, session: intent === 'bind' ? c.get('token') : null }), { expirationTtl: 600 });
    const url = new URL(provider.authorizeUrl);
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callbackUrl,
      response_type: 'code', state }).toString();
    if (provider.scope) url.searchParams.set('scope', provider.scope);
    if (verifier) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }
    if (oidcNonce) url.searchParams.set('nonce', oidcNonce);
    return { state, authorizationUrl: url.href };
  },

  async finish(c, params, intent = 'login', providerId = 'linuxdo') {
    const provider = requireProvider(providerId);
    const config = await oauthConfigService.require(c, providerId);
    const { code, state } = params;
    if (typeof code !== 'string' || !code || code.length > 4096 || !validNonce(state))
      throw new BizError(`授权信息无效，请重新点击 ${provider.name} 登录`, 400);
    const pending = await c.env.kv.get(stateKey(providerId, state), { type: 'json' });
    if (!pending || pending.provider !== providerId || pending.clientId !== config.clientId || pending.callbackUrl !== config.callbackUrl || pending.intent !== intent)
      throw new BizError('授权已过期或操作不匹配，请重新授权', 400);
    if (intent === 'bind' && (pending.userId !== c.get('user')?.userId || pending.session !== c.get('token')))
      throw new BizError('登录账号已变化，请回到个人设置重新绑定', 403);
    await c.env.kv.delete(stateKey(providerId, state));
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    const body = new URLSearchParams({ code, redirect_uri: config.callbackUrl, grant_type: 'authorization_code' });
    if (provider.basicAuth) headers.Authorization = 'Basic ' + btoa(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`);
    else { body.set('client_id', config.clientId); body.set('client_secret', config.clientSecret); }
    if (provider.pkce) { body.set('client_id', config.clientId); body.set('code_verifier', pending.verifier); }
    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST', headers, body,
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenRes.ok) throw new BizError(`${provider.name} 授权失败，请重新登录`, 400);
    const token = await tokenRes.json();
    let info;
    if (providerId === 'telegram') info = await verifyTelegramIdentity(token.id_token, config.clientId, pending.nonce);
    else if (providerId === 'google') info = await verifyGoogleIdentity(token.id_token, config.clientId, pending.nonce);
    else {
      if (typeof token.access_token !== 'string' || !token.access_token) throw new BizError(`${provider.name} 未返回有效授权`, 400);
      const userRes = await fetch(provider.userInfoUrl, {
        headers: { Authorization: 'Bearer ' + token.access_token,
          ...(providerId === 'github' ? { 'User-Agent': 'Xi-Mail', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } : {}) }, signal: AbortSignal.timeout(15000),
      });
      if (!userRes.ok) throw new BizError(`无法获取 ${provider.name} 用户信息`, 400);
      info = await userRes.json();
    }
    const validIdentity = providerId === 'google' ? typeof info.id === 'string' && /^[A-Za-z0-9_-]{1,255}$/.test(info.id)
      : /^\d{1,30}$/.test(String(info.id || '')) && (typeof info.id !== 'number' || Number.isSafeInteger(info.id));
    if (!validIdentity || info.active === false || info.silenced === true)
      throw new BizError(`此 ${provider.name} 账号无法用于登录`, 403);
    if (provider.trustLevel && (Number(info.trust_level) || 0) < (config.minTrustLevel ?? 0))
      throw new BizError(`${provider.name} 信任级别未达到站点要求`, 403);
    const identity = String(info.id);
    if (intent === 'bind') {
      await oauthBindingService.bind(c, pending.userId, providerId, identity, String(info.username || info.login || info.name || '').slice(0, 255));
      return { bound: true };
    }
    const binding = await oauthBindingService.findIdentity(c, providerId, identity);
    if (!binding) throw new BizError(`此 ${provider.name} 账号尚未绑定邮箱，请先使用邮箱登录，在个人设置中绑定`, 403);
    const user = await userService.selectByIdIncludeDel(c, binding.userId);
    if (!user) throw new BizError('绑定的邮箱已不存在，请联系管理员', 403);
    return { token: await loginService.login(c, { email: user.email }, true) };
  },

  async list(c, userId) {
    const [configs, bindings] = await Promise.all([
      Promise.all(OAUTH_PROVIDERS.map(provider => oauthConfigService.get(c, provider.id))), oauthBindingService.list(c, userId),
    ]);
    return OAUTH_PROVIDERS.map((provider, index) => {
      const bound = bindings.find(row => row.provider === provider.id);
      return { provider: provider.id, name: provider.name, enabled: configs[index].enabled && configs[index].ready,
        binding: bound ? { displayName: bound.displayName, createTime: bound.createTime } : null };
    });
  },
  async remove(c, userId, provider) {
    requireProvider(provider);
    await oauthBindingService.remove(c, userId, provider);
  },
  async deleteByUserId(c, id) { await this.deleteByUserIds(c, [id]); },
  async deleteByUserIds(c, ids) {
    await oauthBindingService.deleteByUserIds(c, ids);
    await orm(c).delete(oauth).where(inArray(oauth.userId, ids)).run();
  },
  async clearNoBindOathUser(c) { await orm(c).delete(oauth).where(eq(oauth.userId, 0)).run(); },
};
export default oauthService;
