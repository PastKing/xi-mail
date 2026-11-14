import { TOTP, Secret } from 'otpauth';
import BizError from '../error/biz-error';
import rate from './security-rate-limit-service';
import cryptoUtils from '../utils/crypto-utils';
import userService from './user-service';
import sessionService from './session-service';
import { isSecureSecret } from '../utils/secret-policy';

const encoder = new TextEncoder(), ready = new WeakMap();
const invalid = () => new BizError('验证码无效、已使用或已过期，请重试', 400);
const random = (size = 32) => Array.from(crypto.getRandomValues(new Uint8Array(size)), b => b.toString(16).padStart(2, '0')).join('');
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b => b.toString(16).padStart(2, '0')).join('');
export const totpFor = secret => new TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
export function normalizeFactorCode(value) {
  if (typeof value !== 'string' || value.length > 64) return '';
  return value.normalize('NFKC').replace(/[\s-]/g, '');
}
const wrongCode = () => new BizError('验证码不正确，请核对本次绑定的认证器，并开启手机的自动日期与时间', 400);
async function key(c) {
  if (!isSecureSecret(c.env.two_factor_key)) throw new BizError('两步验证服务尚未配置加密密钥', 503);
  const base = await crypto.subtle.importKey('raw', encoder.encode(c.env.two_factor_key), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('xi-mail:2fa:v1'), info: encoder.encode('secret-encryption') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(c, userId, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(String(userId)) }, await key(c), encoder.encode(value));
  return JSON.stringify([Array.from(iv), Array.from(new Uint8Array(encrypted))]);
}
async function open(c, userId, value) {
  const [iv, data] = JSON.parse(value);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), additionalData: encoder.encode(String(userId)) }, await key(c), new Uint8Array(data)));
}
const service = {
  async ensure(c) {
    const db = c.env.db;
    if (!ready.has(db)) ready.set(db, (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS user_two_factor (user_id INTEGER PRIMARY KEY, secret TEXT NOT NULL, version TEXT NOT NULL, last_counter INTEGER NOT NULL, recovery TEXT NOT NULL)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS two_factor_pending (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL)`).run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_two_factor_expiry ON two_factor_pending(expires)').run();
    })().catch(error => { ready.delete(db); throw error; }));
    await ready.get(db);
  },
  async row(c, id) { await this.ensure(c); return c.env.db.prepare('SELECT * FROM user_two_factor WHERE user_id = ?').bind(id).first(); },
  async status(c, id) {
    const row = await this.row(c, id);
    return { enabled: !!row, recoveryRemaining: row ? JSON.parse(row.recovery).length : 0 };
  },
  async password(c, id, password) {
    await rate.consume(c, '2fa-management', String(id), 8, 900);
    const user = await userService.selectByIdIncludeDel(c, id);
    if (!user || user.isDel !== 0 || user.status !== 0 || typeof password !== 'string' || password.length > 256 || !await cryptoUtils.verifyPassword(password, user.salt, user.password)) throw new BizError('当前密码不正确', 400);
    return user;
  },
  async setup(c, id, session, password) {
    const user = await this.password(c, id, password);
    if (await this.row(c, id)) throw new BizError('已开启两步验证', 409);
    const secret = new Secret({ size: 20 }).base32;
    const enrollmentId = random();
    const payload = JSON.stringify({ secret: await seal(c, id, secret), password: await digest(user.password), session: await digest(session) });
    await c.env.db.prepare('INSERT INTO two_factor_pending VALUES (?, ?, ?, ?, ?)').bind(await digest(enrollmentId), id, 'setup', payload, Date.now() + 600000).run();
    const issuer = 'Xi-Mail (' + new URL(c.req.url).hostname + ')';
    return { secret, uri: new TOTP({ issuer, label: user.email, secret, algorithm: 'SHA1', digits: 6, period: 30 }).toString(), enrollmentId, expiresIn: 600 };
  },
  async confirm(c, id, session, code, enrollmentId) {
    await this.ensure(c);
    await rate.consume(c, '2fa-confirm', String(id), 8, 900);
    if (enrollmentId !== undefined && (typeof enrollmentId !== 'string' || !/^[a-f0-9]{64}$/.test(enrollmentId))) throw invalid();
    const pendingId = enrollmentId ? await digest(enrollmentId) : await digest('setup:' + id + ':' + session);
    const pending = await c.env.db.prepare('SELECT * FROM two_factor_pending WHERE id = ? AND kind = ? AND expires > ?').bind(pendingId, 'setup', Date.now()).first();
    if (!pending || pending.user_id !== id) throw new BizError('本次绑定已过期或已结束，请关闭窗口后重新绑定并扫描新的二维码', 400);
    const payload = JSON.parse(pending.payload), user = await userService.selectByIdIncludeDel(c, id);
    if (payload.session && payload.session !== await digest(session)) throw invalid();
    if (!user || user.isDel !== 0 || user.status !== 0 || await digest(user.password) !== payload.password) throw new BizError('账号状态或密码已变更，请重新绑定认证器', 400);
    const totp = totpFor(await open(c, id, payload.secret));
    code = normalizeFactorCode(code);
    const delta = typeof code === 'string' && /^\d{6}$/.test(code) ? totp.validate({ token: code, window: 1 }) : null;
    if (delta === null) throw wrongCode();
    const recoveryCodes = Array.from({ length: 8 }, () => random(8));
    const recovery = JSON.stringify(await Promise.all(recoveryCodes.map(value => digest('recovery:' + id + ':' + value))));
    const row = await c.env.db.prepare(`INSERT INTO user_two_factor(user_id,secret,version,last_counter,recovery)
      SELECT ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM two_factor_pending WHERE id = ? AND payload = ? AND expires > ?)
      ON CONFLICT(user_id) DO NOTHING RETURNING user_id`).bind(id, payload.secret, random(), totp.counter() + delta, recovery, pendingId, pending.payload, Date.now()).first();
    if (!row) throw invalid();
    await c.env.db.prepare('DELETE FROM two_factor_pending WHERE user_id = ?').bind(id).run();
    await sessionService.revokeOthers(c, id, session);
    return { recoveryCodes };
  },
  async consume(c, row, code) {
    await rate.consume(c, '2fa-code', String(row.user_id), 8, 300);
    code = normalizeFactorCode(code);
    if (!code || code.length > 32) throw invalid();
    let result;
    if (/^\d{6}$/.test(code)) {
      const totp = totpFor(await open(c, row.user_id, row.secret));
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) throw wrongCode();
      const counter = totp.counter() + delta;
      result = await c.env.db.prepare('UPDATE user_two_factor SET last_counter = ? WHERE user_id = ? AND version = ? AND last_counter < ? RETURNING user_id').bind(counter, row.user_id, row.version, counter).first();
    } else {
      const hash = await digest('recovery:' + row.user_id + ':' + code.toLowerCase().replace(/[-\s]/g, ''));
      const codes = JSON.parse(row.recovery);
      if (!codes.includes(hash)) throw invalid();
      result = await c.env.db.prepare('UPDATE user_two_factor SET recovery = ? WHERE user_id = ? AND version = ? AND recovery = ? RETURNING user_id').bind(JSON.stringify(codes.filter(item => item !== hash)), row.user_id, row.version, row.recovery).first();
    }
    if (!result) throw new BizError('此验证码已使用，请等待认证器显示下一个验证码，或换用未使用的恢复码', 400);
  },
  async disable(c, id, session, password, code) {
    await this.password(c, id, password);
    const row = await this.row(c, id);
    if (!row) throw invalid();
    await this.consume(c, row, code);
    await c.env.db.prepare('DELETE FROM user_two_factor WHERE user_id = ? AND version = ?').bind(id, row.version).run();
    await c.env.db.prepare('DELETE FROM two_factor_pending WHERE user_id = ?').bind(id).run();
    await sessionService.revokeOthers(c, id, session);
  },
  async challenge(c, user, method) {
    const row = await this.row(c, user.userId);
    if (!row) return null;
    await rate.consume(c, '2fa-challenge', String(user.userId), 20, 300);
    const challenge = random();
    await c.env.db.prepare('INSERT INTO two_factor_pending VALUES (?, ?, ?, ?, ?)').bind(await digest(challenge), user.userId, 'login', JSON.stringify({ version: row.version, password: await digest(user.password), method }), Date.now() + 300000).run();
    return { requiresTwoFactor: true, challenge, expiresIn: 300 };
  },
  async verifyLogin(c, challenge, code) {
    await this.ensure(c);
    await rate.consume(c, '2fa-login-ip', c.req.header('CF-Connecting-IP') || 'unknown', 40, 300);
    if (typeof challenge !== 'string' || !/^[a-f0-9]{64}$/.test(challenge)) throw invalid();
    const id = await digest(challenge);
    const pending = await c.env.db.prepare('SELECT * FROM two_factor_pending WHERE id = ? AND kind = ? AND expires > ?').bind(id, 'login', Date.now()).first();
    if (!pending) throw invalid();
    const payload = JSON.parse(pending.payload), user = await userService.selectByIdIncludeDel(c, pending.user_id), row = await this.row(c, pending.user_id);
    if (!user || user.status !== 0 || user.isDel !== 0 || !row || row.version !== payload.version || await digest(user.password) !== payload.password) throw invalid();
    await this.consume(c, row, code);
    const used = await c.env.db.prepare('DELETE FROM two_factor_pending WHERE id = ? AND expires > ? RETURNING id').bind(id, Date.now()).first();
    if (!used) throw invalid();
    return { user, method: payload.method };
  },
  async cleanup(c) { await this.ensure(c); await c.env.db.prepare('DELETE FROM two_factor_pending WHERE expires <= ?').bind(Date.now()).run(); },
};
export default service;
