import BizError from '../error/biz-error';
import { findOAuthProvider } from '../const/oauth-providers';

const enabled = value => value === true || value === 'true';
export function requireProvider(id) {
  const provider = findOAuthProvider(id);
  if (!provider) throw new BizError('不支持的第三方登录方式', 400);
  return provider;
}
const suffixes = ['Switch', 'ClientId', 'CallbackUrl', 'ClientSecret', 'MinTrustLevel'];
function validateCallback(value, id) {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash && url.pathname === `/oauth/${id}` &&
    (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
}

const oauthConfigService = {
  async get(c, id) {
    requireProvider(id);
    const stored = await c.env.kv.get(`integration:oauth:${id}`, { type: 'json' });
    const config = stored || {
      enabled: enabled(c.env[`${id}_switch`]), clientId: c.env[`${id}_client_id`] || '',
      clientSecret: c.env[`${id}_client_secret`] || '', callbackUrl: c.env[`${id}_callback_url`] || '', minTrustLevel: 0,
    };
    let validCallback = false;
    try { validCallback = validateCallback(config.callbackUrl, id); } catch {}
    return { ...config, ready: !!(config.clientId && config.clientSecret && validCallback) };
  },
  async require(c, id) {
    const provider = requireProvider(id);
    const config = await this.get(c, id);
    if (!config.enabled || !config.ready) throw new BizError(`${provider.name} 登录未启用或配置不完整`, 403);
    return config;
  },
  async save(c, params, id) {
    const provider = requireProvider(id);
    const fields = suffixes.map(suffix => id + suffix);
    if (!fields.some(key => Object.hasOwn(params, key))) return;
    const old = await this.get(c, id);
    if (Object.hasOwn(params, id + 'Switch') && typeof params[id + 'Switch'] !== 'boolean')
      throw new BizError(`${provider.name} 开关格式不正确`, 400);
    for (const key of fields.slice(1, 4)) {
      if (Object.hasOwn(params, key) && (typeof params[key] !== 'string' || params[key].length > 4096))
        throw new BizError(`${provider.name} 配置格式不正确`, 400);
    }
    const config = {
      enabled: params[id + 'Switch'] ?? old.enabled,
      clientId: (params[id + 'ClientId'] ?? old.clientId).trim(),
      clientSecret: params[id + 'ClientSecret']?.trim() || old.clientSecret,
      callbackUrl: (params[id + 'CallbackUrl'] ?? old.callbackUrl).trim(),
      minTrustLevel: provider.trustLevel ? (params[id + 'MinTrustLevel'] ?? old.minTrustLevel ?? 0) : 0,
    };
    if (!Number.isInteger(config.minTrustLevel) || config.minTrustLevel < 0 || config.minTrustLevel > 4)
      throw new BizError(`${provider.name} 最低信任级别必须为 0—4 的整数`, 400);
    if (config.callbackUrl) {
      let valid = false;
      try { valid = validateCallback(config.callbackUrl, id); } catch {}
      if (!valid) throw new BizError('请使用 OAuth 集成页面自动生成的 HTTPS 回调地址', 400);
    }
    if (id === 'telegram' && config.clientId && !/^\d{1,30}$/.test(config.clientId))
      throw new BizError('Telegram Client ID 应为 BotFather 提供的数字 ID', 400);
    if (config.enabled && (!config.clientId || !config.clientSecret || !config.callbackUrl))
      throw new BizError(`启用 ${provider.name} 前请填写 Client ID、Client Secret 和回调地址`, 400);
    await c.env.kv.put(`integration:oauth:${id}`, JSON.stringify(config));
  },
};
export default oauthConfigService;
