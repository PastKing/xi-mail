import { and, eq, inArray } from 'drizzle-orm';
import orm from '../entity/orm';
import { oauthBinding } from '../entity/oauth-binding';
import { oauth } from '../entity/oauth';
import BizError from '../error/biz-error';

const READY = 'oauth:bindings:ready:v1';
const oauthBindingService = {
  async ensure(c) {
    if (c.get?.('oauthBindingsReady')) return;
    if (await c.env.kv.get(READY) !== '1') {
      await c.env.db.prepare(`CREATE TABLE IF NOT EXISTS oauth_binding (
        binding_id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL, user_id INTEGER NOT NULL,
        display_name TEXT NOT NULL DEFAULT '', create_time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_user_id), UNIQUE(user_id, provider))`).run();
      // Preserve LinuxDo bindings created by previous releases.
      await c.env.db.prepare(`INSERT OR IGNORE INTO oauth_binding (provider, provider_user_id, user_id, display_name)
        SELECT 'linuxdo', oauth_user_id, user_id, coalesce(nullif(username, ''), name, '')
        FROM oauth WHERE user_id > 0 AND oauth_user_id IS NOT NULL ORDER BY oauth_id`).run();
      await c.env.kv.put(READY, '1');
    }
    c.set?.('oauthBindingsReady', true);
  },
  async list(c, userId) {
    await this.ensure(c);
    return orm(c).select().from(oauthBinding).where(eq(oauthBinding.userId, userId)).all();
  },
  async listByUserIds(c, ids) {
    if (!ids.length) return [];
    await this.ensure(c);
    return orm(c).select({ userId: oauthBinding.userId, provider: oauthBinding.provider,
      displayName: oauthBinding.displayName, createTime: oauthBinding.createTime })
      .from(oauthBinding).where(inArray(oauthBinding.userId, ids)).all();
  },
  async findIdentity(c, provider, identity) {
    await this.ensure(c);
    return orm(c).select().from(oauthBinding).where(and(eq(oauthBinding.provider, provider), eq(oauthBinding.providerUserId, identity))).get();
  },
  async bind(c, userId, provider, identity, displayName) {
    await this.ensure(c);
    await orm(c).insert(oauthBinding).values({ userId, provider, providerUserId: identity, displayName })
      .onConflictDoNothing().run();
    const bound = await this.findIdentity(c, provider, identity);
    if (bound?.userId !== userId) {
      const own = (await this.list(c, userId)).find(row => row.provider === provider);
      if (own) throw new BizError('请先解绑已有的第三方账号，再绑定新的账号', 409);
      throw new BizError('此第三方账号已绑定其他邮箱', 409);
    }
  },
  async remove(c, userId, provider) {
    await this.ensure(c);
    // Clear the legacy association too, so it can never be reimported later.
    if (provider === 'linuxdo') await orm(c).update(oauth).set({ userId: 0 }).where(eq(oauth.userId, userId)).run();
    await orm(c).delete(oauthBinding).where(and(eq(oauthBinding.userId, userId), eq(oauthBinding.provider, provider))).run();
  },
  async deleteByUserIds(c, ids) {
    await this.ensure(c);
    await orm(c).delete(oauthBinding).where(inArray(oauthBinding.userId, ids)).run();
  },
};
export default oauthBindingService;
