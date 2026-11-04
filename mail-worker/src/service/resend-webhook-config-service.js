import BizError from '../error/biz-error';
const KEY = 'integration:resend:webhook-secret';
const config = {
  async get(c) {
    const value = await c.env.kv.get(KEY) || c.env.resend_webhook_secret || '';
    return String(value).split(/[\s,]+/).filter(Boolean);
  },
  async save(c, params) {
    if (!Object.hasOwn(params, 'resendWebhookSecret')) return;
    const value = params.resendWebhookSecret;
    if (typeof value !== 'string' || value.length > 8192) throw new BizError('Invalid Resend signing secret', 400);
    if (!value.trim()) return;
    const secrets = value.trim().split(/[\s,]+/).filter(Boolean);
    if (secrets.length > 10 || secrets.some(secret => !/^whsec_[A-Za-z0-9+/=_-]{16,}$/.test(secret)))
      throw new BizError('请填写 Resend Webhooks 页面提供的 Signing Secret（whsec_ 开头）', 400);
    await c.env.kv.put(KEY, secrets.join(','));
  },
};
export default config;
