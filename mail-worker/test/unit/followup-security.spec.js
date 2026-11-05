import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import mailLinkService, { MAIL_LINK_TTL } from '../../src/service/mail-link-service';
import telegramService from '../../src/service/telegram-service';
import jwtUtils from '../../src/utils/jwt-utils';
import { isSecureSecret } from '../../src/utils/secret-policy';
import regKeyService from '../../src/service/reg-key-service';
import loginService from '../../src/service/login-service';
import { dbInit } from '../../src/init/init';
import { authenticatedSender, firstAuthenticationResult, managedSender } from '../../src/utils/sender-auth';
import starService from '../../src/service/star-service';
import starSchemaService from '../../src/service/star-schema-service';
import emailService from '../../src/service/email-service';
import attService from '../../src/service/att-service';
import settingService from '../../src/service/setting-service';
import accountService from '../../src/service/account-service';
import subWorkerService from '../../src/service/sub-worker-service';
import { email as receiveEmail } from '../../src/email/email';
import subWorker from '../../../mail-worker-sub/src/index';
import email from '../../src/entity/email';
import user from '../../src/entity/user';
import account from '../../src/entity/account';
import regKey from '../../src/entity/reg-key';

const SECRET = 'test-signing-key-with-256-bit-variety-A1b2C3d4';
let db, c, records;
function adapter(db) {
  const prepare = (text, args = []) => ({
    bind: (...values) => prepare(text, values),
    run: async () => ({ success: true, meta: db.prepare(text).run(...args) }),
    first: async () => db.prepare(text).get(...args) || null,
    all: async () => ({ results: db.prepare(text).all(...args) }),
    raw: async () => { const query = db.prepare(text); query.setReturnArrays(true); return query.all(...args); },
    execute: () => ({ results: /\bRETURNING\b|^SELECT/i.test(text) ? db.prepare(text).all(...args) : (db.prepare(text).run(...args), []) }),
  });
  return { prepare, batch: async statements => {
    db.exec('BEGIN');
    try { const result = statements.map(statement => statement.execute()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
}
beforeEach(() => {
  db = new DatabaseSync(':memory:'); records = new Map();
  for (const entity of [email, user, account, regKey]) {
    const table = getTableConfig(entity);
    db.exec(`CREATE TABLE ${table.name} (${table.columns.map(column => `${column.name} ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}${table.name === 'reg_key' && column.name === 'code' ? ' COLLATE NOCASE' : ''}`).join(',')})`);
  }
  db.exec(`CREATE TABLE star(star_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, email_id INTEGER NOT NULL, create_time TEXT DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO user(user_id,email,status,is_del) VALUES(10,'owner@owned.example',0,0),(20,'other@owned.example',0,0);
    INSERT INTO account(account_id,user_id,email,is_del,all_receive) VALUES(1,10,'owner@owned.example',0,0);
    INSERT INTO email(email_id,user_id,account_id,content,text,is_del,status,type,unread,recipient,create_time)
      VALUES(1,10,1,'<p>Private owner mail</p>','Private owner mail',0,0,0,0,'[]',CURRENT_TIMESTAMP);`);
  c = { env: { db: adapter(db), jwt_secret: SECRET, kv: {
    put: vi.fn(async (key, value) => { records.set(key, JSON.parse(value)); }),
    get: vi.fn(async key => records.get(key) || null),
  } } };
  vi.spyOn(attService, 'selectByEmailIds').mockResolvedValue([]);
  vi.spyOn(subWorkerService, 'syncAll').mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); db.close(); });

describe('Telegram mail capabilities', () => {
  it('rejects a valid login JWT and all legacy emailId JWTs before accessing mail', async () => {
    const token = await jwtUtils.generateToken(c, { userId: 10, token: 'known-session-id' });
    const prepare = vi.spyOn(c.env.db, 'prepare');
    for (const value of [token, signed({ emailId: 1, iat: Date.now() / 1000 }), 'invalid', 'a'.repeat(64)]) {
      expect(await mailLinkService.read(c, value)).toBeNull();
      expect(await telegramService.getEmailContent(c, { token: value })).toContain('Access denied');
    }
    expect(prepare).not.toHaveBeenCalled();
  });
  it('issues a random scoped token and stores only its digest with a 24-hour TTL', async () => {
    const token = await mailLinkService.issue(c, { emailId: 1, userId: 10, accountId: 1 });
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const [key, value, options] = c.env.kv.put.mock.calls[0];
    expect(key).not.toContain(token); expect(options.expirationTtl).toBe(MAIL_LINK_TTL);
    expect(JSON.parse(value)).toMatchObject({ purpose: 'telegram-mail', emailId: 1, userId: 10, accountId: 1 });
    expect(await mailLinkService.read(c, token)).toMatchObject({ text: 'Private owner mail' });
    vi.spyOn(settingService, 'query').mockResolvedValue({ r2Domain: '' });
    expect(await telegramService.getEmailContent(c, { token })).toContain('Private owner mail');
    expect(await mailLinkService.issue(c, { emailId: 1, userId: 0, accountId: 0 })).toBeNull();
  });
  it.each(['expired', 'wrong-purpose', 'foreign-mail', 'foreign-account', 'transferred', 'deleted-mail', 'deleted-account', 'deleted-user', 'banned-user'])('fails closed for %s capabilities', async failure => {
    const token = await mailLinkService.issue(c, { emailId: 1, userId: 10, accountId: 1 });
    const record = [...records.values()][0];
    if (failure === 'expired') record.expiresAt = Date.now() - 1;
    if (failure === 'wrong-purpose') record.purpose = 'session';
    if (failure === 'foreign-mail') record.userId = 20;
    if (failure === 'foreign-account') record.accountId = 2;
    if (failure === 'transferred') db.exec('UPDATE account SET user_id=20 WHERE account_id=1');
    if (failure === 'deleted-mail') db.exec('UPDATE email SET is_del=1 WHERE email_id=1');
    if (failure === 'deleted-account') db.exec('UPDATE account SET is_del=1 WHERE account_id=1');
    if (failure === 'deleted-user') db.exec('UPDATE user SET is_del=1 WHERE user_id=10');
    if (failure === 'banned-user') db.exec('UPDATE user SET status=1 WHERE user_id=10');
    expect(await mailLinkService.read(c, token)).toBeNull();
  });
});

function signed(payload, header = { alg: 'HS256', typ: 'JWT' }) {
  const parts = [header, payload].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  return parts + '.' + createHmac('sha256', SECRET).update(parts).digest('base64url');
}
describe('Signing and initialization boundaries', () => {
  it.each(['short', '<YOUR_JWT_SECRET_MIN_32_CHARS>', 'public-example-value-with-${JWT_SECRET}-placeholder', 'a'.repeat(64)])('rejects unsafe signing configuration: %s', secret => {
    expect(isSecureSecret(secret)).toBe(false);
  });
  it('requires expiration, session purpose, expected algorithm and correct user claims', async () => {
    const token = await jwtUtils.generateToken(c, { userId: 10, token: 'known-session-id' });
    expect(await jwtUtils.verifyToken(c, token)).toMatchObject({ purpose: 'session', userId: 10, aud: 'xi-mail' });
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
    expect(payload.exp - payload.iat).toBe(2592000);
    for (const changes of [{ exp: undefined }, { exp: Math.floor(Date.now() / 1000) }, { purpose: 'telegram-mail' }, { userId: -1 }, { token: undefined }, { aud: 'other' }])
      expect(await jwtUtils.verifyToken(c, signed({ ...payload, ...changes }))).toBeNull();
    expect(await jwtUtils.verifyToken(c, signed(payload, { alg: 'none', typ: 'JWT' }))).toBeNull();
    expect(await jwtUtils.verifyToken({ env: { jwt_secret: SECRET + '-rotated' } }, token)).toBeNull();
  });
  it('never accepts the JWT signing key as the initialization credential', async () => {
    const context = { env: { jwt_secret: SECRET, init_secret: SECRET + '-separate-init' }, req: { param: () => SECRET }, notFound: vi.fn(() => 'denied') };
    expect(await dbInit.init(context)).toBe('denied');
    expect(context.notFound).toHaveBeenCalledOnce();
    context.env.init_secret = undefined;
    expect(await dbInit.init(context)).toBe('denied');
  });
});

describe('Intentional public demo invitations', () => {
  it.each(['viewUser', 'VIEWUSER', 'ViewUser', ' viewUser '])('uses the configured demo role for %s without a hardcoded blacklist', async code => {
    db.exec("INSERT INTO reg_key(rege_key_id,code,count,role_id,expire_time) VALUES(1,'viewUser',10,6,'2099-12-31 23:59:59')");
    expect(await regKeyService.selectByCode(c, code)).toMatchObject({ roleId: 6, count: 10 });
    expect(await loginService.handleOpenRegKey(c, 0, code)).toEqual({ type: 6, regKeyId: 1 });
    expect(await loginService.handleOpenOptional(c, 0, code)).toEqual({ type: 6, regKeyId: 1 });
  });
  it.each(['exhausted', 'expired', 'missing'])('still enforces %s demo invitations', async state => {
    if (state !== 'missing') db.prepare('INSERT INTO reg_key(rege_key_id,code,count,role_id,expire_time) VALUES(1,?,?,6,?)')
      .run('viewUser', state === 'exhausted' ? 0 : 10, state === 'expired' ? '2000-01-01 00:00:00' : '2099-12-31 23:59:59');
    await expect(loginService.handleOpenRegKey(c, 0, 'viewUser')).rejects.toMatchObject({ name: 'BizError' });
    expect(await loginService.handleOpenOptional(c, 0, 'viewUser')).toBeNull();
  });
});

describe('Trusted inbound sender authentication', () => {
  it.each([
    'mx.cloudflare.net; dmarc=pass header.from=owned.example',
    'mx.cloudflare.net; dmarc=none; dkim=pass header.d=owned.example',
    'mx.cloudflare.net; spf=pass smtp.mailfrom=bounce@send.owned.example; dmarc=none',
    'mx.cloudflare.net;\r\n\tdkim=pass header.d="owned.example"',
  ])('accepts authenticated aligned identity: %s', header => {
    expect(authenticatedSender('security@owned.example', header)).toBe(true);
  });
  it.each([
    '', 'attacker.example; dmarc=pass header.from=owned.example',
    'mx.cloudflare.net.evil; dmarc=pass header.from=owned.example',
    'mx.cloudflare.net; dmarc=fail; dkim=none; spf=softfail',
    'mx.cloudflare.net; spf=pass smtp.mailfrom=owned.example; dmarc=fail',
    'mx.cloudflare.net; dmarc=none; spf=pass smtp.mailfrom=attacker@example.invalid',
    'mx.cloudflare.net; dkim=pass header.d=owned.example.evil',
    'mx.cloudflare.net; dmarc=pass header.from=other.example',
    'mx.cloudflare.net; dmarc=pass header.from="other.example"',
    'mx.cloudflare.net; dmarc=fail, mx.cloudflare.net; dmarc=pass header.from=owned.example',
    'mx.cloudflare.net; dmarc=fail (forged ; dmarc=pass)',
    'mx.cloudflare.net; dmarc=fail reason="; dmarc=pass"',
  ])('rejects spoofed/untrusted authentication: %s', header => {
    expect(authenticatedSender('security@owned.example', header)).toBe(false);
  });
  it('recognizes managed subdomains without confusing an attacker suffix', () => {
    expect(managedSender('admin@sub.owned.example', ['@owned.example'])).toBe(true);
    expect(managedSender('admin@owned.example.evil', ['owned.example'])).toBe(false);
    expect(firstAuthenticationResult('mx.cloudflare.net; spf=fail, evil; dmarc=pass')).toBe('mx.cloudflare.net; spf=fail');
  });
  it('rejects a forged managed From before mailbox/AI/database work, ignoring sender-supplied raw auth headers', async () => {
    vi.spyOn(settingService, 'query').mockResolvedValue({ receive: 0, domainList: ['@owned.example'], domainMapping: {} });
    const lookup = vi.spyOn(accountService, 'selectByEmailIncludeDel');
    const message = { to: 'owner@owned.example', from: 'attacker@example.invalid', headers: new Headers({ 'Authentication-Results': 'mx.cloudflare.net; spf=fail; dkim=none; dmarc=none' }),
      raw: new Response('From: Security <security@owned.example>\r\nTo: owner@owned.example\r\nAuthentication-Results: mx.cloudflare.net; dmarc=pass\r\nSubject: probe\r\n\r\nTest').body, setReject: vi.fn() };
    await receiveEmail(message, c.env, {});
    expect(message.setReject).toHaveBeenCalledWith('Sender authentication failed');
    expect(lookup).not.toHaveBeenCalled();
    expect(await subWorkerService.resolveTarget(c, { send_email: 'security@owned.example' }, { domainList: ['@owned.example'] })).toBeNull();
  });
  it('accepts external senders without requiring a hosted suffix or adding reserved-domain policy', async () => {
    const incoming = { to: 'owner@owned.mail-test.net', from: 'notice@external.invalid',
      headers: new Headers({ 'Authentication-Results': 'mx.cloudflare.net; spf=none; dmarc=none' }),
      raw: new Response('From: Notice <notice@external.invalid>\r\nTo: owner@owned.mail-test.net\r\nSubject: external probe\r\n\r\nTest').body,
      setReject: vi.fn() };
    await subWorker.email(incoming, { db: c.env.db, domain: ['owned.mail-test.net'] }, {});
    expect(incoming.setReject).not.toHaveBeenCalled();
    expect(db.prepare("SELECT send_email FROM email WHERE subject='external probe'").get().send_email).toBe('notice@external.invalid');
    expect(await subWorkerService.resolveTarget(c, { send_email: 'notice@external.invalid', to_email: 'unassigned@owned.example' },
      { domainList: ['@owned.example'] })).not.toBeNull();
  });
  it('persists the trusted MX result in the sub Worker and rejects a forged managed sender before writing', async () => {
    const env = { db: c.env.db, domain: ['owned.mail-test.net'] };
    const incoming = result => ({ to: 'owner@owned.mail-test.net', from: 'attacker@example.invalid',
      headers: new Headers({ 'Authentication-Results': result }),
      raw: new Response('From: Security <security@owned.mail-test.net>\r\nTo: owner@owned.mail-test.net\r\nSubject: sub probe\r\n\r\nTest').body, setReject: vi.fn() });
    const rejected = incoming('mx.cloudflare.net; spf=fail; dmarc=none');
    await subWorker.email(rejected, env, {});
    expect(rejected.setReject).toHaveBeenCalledWith('Sender authentication failed');
    const accepted = incoming('mx.cloudflare.net; dmarc=pass header.from=owned.mail-test.net');
    await subWorker.email(accepted, env, {});
    expect(accepted.setReject).not.toHaveBeenCalled();
    expect(db.prepare("SELECT auth_result FROM email WHERE subject='sub probe'").get().auth_result).toContain('dmarc=pass');
  });
});

describe('Atomic stars and historical duplicates', () => {
  it('consolidates old duplicates and installs the database uniqueness constraint atomically', async () => {
    db.exec('INSERT INTO star(user_id,email_id) VALUES(10,1),(10,1),(10,1),(20,1)');
    await Promise.all([starSchemaService.ensure(c), starSchemaService.ensure(c)]);
    expect(db.prepare('SELECT user_id,email_id,star_id FROM star ORDER BY star_id').all()).toEqual([
      { user_id: 10, email_id: 1, star_id: 1 }, { user_id: 20, email_id: 1, star_id: 4 },
    ]);
    expect(() => db.exec('INSERT INTO star(user_id,email_id) VALUES(10,1)')).toThrow(/UNIQUE/);
  });
  it('makes concurrent adds idempotent and keeps both mail and star lists/counts unique', async () => {
    await Promise.all(Array.from({ length: 20 }, () => starService.add(c, { emailId: 1 }, 10)));
    expect(db.prepare('SELECT COUNT(*) AS count FROM star').get().count).toBe(1);
    expect((await starService.list(c, { size: 50 }, 10)).list).toHaveLength(1);
    const inbox = await emailService.list(c, { size: 50, accountId: 1, type: 0, timeSort: 0, allReceive: 0 }, 10);
    expect(inbox.total).toBe(1); expect(inbox.list).toHaveLength(1);
    await expect(starService.add(c, { emailId: 1 }, 20)).rejects.toMatchObject({ name: 'BizError' });
    await starService.cancel(c, { emailId: 1 }, 10);
    expect(db.prepare('SELECT COUNT(*) AS count FROM star').get().count).toBe(0);
  });
});
