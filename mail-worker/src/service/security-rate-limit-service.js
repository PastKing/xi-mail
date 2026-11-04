import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const ready = new WeakMap();
const securityRateLimit = {
  async ensure(c) {
    const db = c.env.db;
    if (!ready.has(db)) {
      const pending = db.prepare(`CREATE TABLE IF NOT EXISTS security_rate_limit (
        bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL)`).run()
        .then(() => db.prepare('CREATE INDEX IF NOT EXISTS idx_security_rate_expiry ON security_rate_limit(expires_at)').run())
        .catch(error => { ready.delete(db); throw error; });
      ready.set(db, pending);
    }
    await ready.get(db);
  },
  async key(scope, subject) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scope + ':' + subject));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  },
  async consume(c, scope, subject, limit, windowSeconds) {
    await this.ensure(c);
    const key = await this.key(scope, subject), now = Math.floor(Date.now() / 1000);
    // One atomic statement across Worker instances; a KV read/modify/write counter is not sufficient.
    const row = await c.env.db.prepare(`INSERT INTO security_rate_limit(bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET
        attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
        expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
      RETURNING attempts, expires_at`).bind(key, now + windowSeconds, now, now).first();
    if (row.attempts > limit) {
      const error = new BizError(t('tooManyAttempts'), 429);
      error.retryAfter = Math.max(1, row.expires_at - now);
      throw error;
    }
  },
  async clear(c, scope, subject) {
    await this.ensure(c);
    await c.env.db.prepare('DELETE FROM security_rate_limit WHERE bucket = ?').bind(await this.key(scope, subject)).run();
  },
  async login(c, email) {
    const ip = c.req?.header('CF-Connecting-IP') || 'unknown';
    await this.consume(c, 'login-ip', ip, 60, 300);
    await this.consume(c, 'login-pair', ip + ':' + email, 8, 900);
    await this.consume(c, 'login-account', email, 50, 900);
  },
  async loginSuccess(c, email) {
    const ip = c.req?.header('CF-Connecting-IP') || 'unknown';
    await this.clear(c, 'login-pair', ip + ':' + email);
    await this.clear(c, 'login-account', email);
  },
  async cleanup(c) {
    await this.ensure(c);
    await c.env.db.prepare('DELETE FROM security_rate_limit WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)).run();
  },
};
export default securityRateLimit;
