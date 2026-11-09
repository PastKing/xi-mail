import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
let DatabaseSync;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch {}
import worker from '../../src/index';
import accountService from '../../src/service/account-service';
import emailService from '../../src/service/email-service';
import attService from '../../src/service/att-service';
import queenSmtpService from '../../src/service/queen-smtp-service';
import { Resend } from 'resend';
import loginService from '../../src/service/login-service';
import userService from '../../src/service/user-service';
import roleService from '../../src/service/role-service';
import settingService from '../../src/service/setting-service';
import sessionService from '../../src/service/session-service';
import permService from '../../src/service/perm-service';
import subWorkerService from '../../src/service/sub-worker-service';
import turnstileService from '../../src/service/turnstile-service';
import rateLimit from '../../src/service/security-rate-limit-service';
import resendService from '../../src/service/resend-service';
import webhookConfig from '../../src/service/resend-webhook-config-service';
import cryptoUtils from '../../src/utils/crypto-utils';
import jwtUtils from '../../src/utils/jwt-utils';
import { email as emailTable } from '../../src/entity/email';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

function d1(db) {
  const prepare = (sql, params = []) => ({
    bind: (...values) => prepare(sql, values),
    run: async () => ({ success: true, meta: db.prepare(sql).run(...params) }),
    all: async () => ({ success: true, results: db.prepare(sql).all(...params) }),
    first: async () => db.prepare(sql).get(...params) || null,
    raw: async () => { const stmt = db.prepare(sql); stmt.setReturnArrays(true); return stmt.all(...params); },
    execute: () => /\bRETURNING\b|^SELECT/i.test(sql) ? { success: true, results: db.prepare(sql).all(...params) } : { success: true, meta: db.prepare(sql).run(...params) },
  });
  return { prepare, batch: async statements => {
    db.exec('BEGIN');
    try { const result = statements.map(statement => statement.execute()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
}
let sql, c, settings, values, role, currentUser;
function context(userId = 10, ip = '192.0.2.10') {
  return { env: c.env, req: { header: name => name.toLowerCase() === 'cf-connecting-ip' ? ip : undefined },
    get: key => key === 'user' ? { userId, email: `user${userId}@allowed.example` } : undefined };
}
function mailbox(id, userId, email, deleted = 0) {
  sql.prepare('INSERT INTO account(account_id, user_id, email, is_del) VALUES (?, ?, ?, ?)').run(id, userId, email, deleted);
}
function mail(id, accountId, userId, deleted = 0) {
  sql.prepare('INSERT INTO email(email_id, account_id, user_id, content, text, is_del, status, resend_email_id) VALUES (?, ?, ?, ?, ?, ?, 1, ?)')
    .run(id, accountId, userId, '<p>private</p>', 'private', deleted, 're-' + id);
}
const signingSecret = 'whsec_' + Buffer.from('local-signature-test-key-32-bytes!').toString('base64');
function signed(payload, seconds = Math.floor(Date.now() / 1000)) {
  const id = 'msg_fixture', timestamp = String(seconds);
  return { id, timestamp, signature: 'v1,' + createHmac('sha256', Buffer.from(signingSecret.slice(6), 'base64')).update(`${id}.${timestamp}.${payload}`).digest('base64') };
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:'); values = new Map();
  sql.exec(`CREATE TABLE account (account_id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL DEFAULT '', status INTEGER NOT NULL DEFAULT 0, latest_email_time TEXT, create_time TEXT DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL, all_receive INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, is_del INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE attachments(att_id INTEGER PRIMARY KEY, account_id INTEGER, user_id INTEGER);`);
  // Real entity column names ensure queries fail if a fix uses an incomplete or incorrect schema.
  const columns = getTableConfig(emailTable).columns.map(column => `${column.name} ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`);
  sql.exec('CREATE TABLE email (' + columns.join(',') + ')');
  const db = d1(sql);
  c = { env: { db, admin: 'admin@allowed.example', jwt_secret: 'security-test-key-with-sufficient-length', kv: {
    get: async (key, options) => { const value = values.get(key); return value === undefined ? null : options?.type === 'json' ? JSON.parse(value) : value; },
    put: async (key, value) => { values.set(key, value); }, delete: async key => { values.delete(key); },
  } } };
  c = context();
  settings = { addEmail: 0, manyEmail: 0, addEmailVerify: 1, addVerifyCount: 3, minEmailPrefix: 3,
    emailPrefixFilter: [], emailKeywordBlacklist: [], domainList: ['@allowed.example', '@blocked.example'] };
  role = { accountCount: 10, availDomain: 'allowed.example' };
  currentUser = { userId: 10, email: 'user10@allowed.example', type: 2, status: 0, isDel: 0 };
  vi.spyOn(settingService, 'query').mockImplementation(async () => settings);
  vi.spyOn(userService, 'selectById').mockImplementation(async () => currentUser);
  vi.spyOn(userService, 'selectByEmailIncludeDel').mockResolvedValue(undefined);
  vi.spyOn(roleService, 'selectById').mockImplementation(async () => role);
  vi.spyOn(permService, 'userPermKeys').mockResolvedValue([]);
  vi.spyOn(subWorkerService, 'syncAll').mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); sql.close(); });

describe.skipIf(!DatabaseSync)('Outbound sender identity', () => {
  let render, deliver;
  const params = () => ({ accountId: 1, name: 'Sender', receiveEmail: ['recipient@external.example'],
    text: 'test', content: '<p>test</p>', subject: 'test', attachments: [],
    from: 'forged@outside.invalid', sendEmail: 'forged@outside.invalid' });
  beforeEach(() => {
    settings.send = 0;
    settings.domainList = ['@allowed.example'];
    settings.queenTokens = { 'allowed.example': 'local-test-token' };
    settings.resendTokens = {};
    role.sendType = 'count'; role.sendCount = 0; currentUser.sendCount = 0;
    c.req.url = 'https://local.example/api/email/send';
    render = vi.spyOn(attService, 'toImageUrlHtml').mockResolvedValue({ imageDataList: [], html: '<p>test</p>' });
    vi.spyOn(attService, 'selectByEmailIds').mockResolvedValue([]);
    deliver = vi.spyOn(queenSmtpService, 'send').mockResolvedValue({ ids: ['local-test'], failed: [] });
  });
  it.each(['foreign', 'missing', 'deleted', 'removed-domain'])('rejects %s sender before processing or delivery', async kind => {
    role.availDomain = '';
    if (kind !== 'missing') mailbox(1, kind === 'foreign' ? 20 : 10,
      kind === 'removed-domain' ? 'sender@removed.example' : 'sender@allowed.example', kind === 'deleted' ? 1 : 0);
    await expect(emailService.send(c, params(), 10)).rejects.toMatchObject({ name: 'BizError' });
    expect(render).not.toHaveBeenCalled(); expect(deliver).not.toHaveBeenCalled();
    expect(sql.prepare('SELECT COUNT(*) AS count FROM email').get().count).toBe(0);
  });
  it('still enforces the role domain permission', async () => {
    mailbox(1, 10, 'sender@allowed.example'); role.availDomain = 'different.example';
    await expect(emailService.send(c, params(), 10)).rejects.toMatchObject({ code: 403 });
    expect(deliver).not.toHaveBeenCalled();
  });
  it('ignores supplied From addresses and strips display-name control characters', async () => {
    mailbox(1, 10, 'sender@allowed.example');
    await emailService.send(c, { ...params(), name: 'Sender\r\nBcc: other\u0000' }, 10);
    expect(deliver).toHaveBeenCalledWith('local-test-token', expect.objectContaining({
      from: 'sender@allowed.example', fromName: 'Sender  Bcc: other',
    }));
    expect(sql.prepare('SELECT send_email FROM email').get().send_email).toBe('sender@allowed.example');
  });
  it('quotes and escapes Resend display names while retaining the owned sender', async () => {
    mailbox(1, 10, 'sender@allowed.example'); settings.queenTokens = {};
    settings.resendTokens = { 'allowed.example': 're_local_test' };
    const send = vi.spyOn(Resend.prototype, 'post').mockResolvedValue({ data: { id: 'local-test' }, error: null });
    await emailService.send(c, { ...params(), name: 'Example "Team" \\ <forged@outside.invalid>\r\n' }, 10);
    expect(send).toHaveBeenCalledWith('/emails', expect.objectContaining({
      from: '"Example \\"Team\\" \\\\ <forged@outside.invalid>" <sender@allowed.example>',
    }), expect.anything());
    expect(deliver).not.toHaveBeenCalled();
    expect(sql.prepare('SELECT send_email FROM email').get().send_email).toBe('sender@allowed.example');
  });
  it('uses SendFlare with the owned sender and persists a provider-specific delivery ID', async () => {
    mailbox(1, 10, 'sender@allowed.example'); settings.queenTokens = {};
    settings.sendflareTokens = { 'allowed.example': 'local-flare-token' };
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true, data: { emilId: 'flare-one' } }));
    await emailService.send(c, params(), 10);
    expect(JSON.parse(request.mock.calls[0][1].body).from).toBe('sender@allowed.example');
    expect(sql.prepare('SELECT send_email,resend_email_id FROM email').get()).toEqual({send_email:'sender@allowed.example',resend_email_id:'sendflare:flare-one'});
    expect(deliver).not.toHaveBeenCalled();
  });
  it.each([
    [{ success: true, code: 0, data: [{ emailId: 'first' }, { emailId: 'second' }] }, 'sendflare:first,second'],
    [{ success: true, code: 0, requestId: 'batch-receipt', data: null }, 'sendflare:request:batch-receipt'],
  ])('persists an accepted two-recipient send exactly once, including a request receipt: %j', async (response, expectedId) => {
    mailbox(1, 10, 'sender@allowed.example'); settings.queenTokens = {};
    settings.sendflareTokens = { 'allowed.example': 'local-flare-token' };
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(response));
    const recipients = ['first@external.example', 'second@external.example'];
    const result = await emailService.send(c, { ...params(), receiveEmail: recipients }, 10);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toBe('https://api.sendflare.com/v1/batchSend');
    expect(JSON.parse(request.mock.calls[0][1].body).to).toEqual(recipients);
    const row = sql.prepare('SELECT send_email,resend_email_id,recipient,status FROM email').get();
    expect(row.send_email).toBe('sender@allowed.example');
    expect(row.resend_email_id).toBe(expectedId);
    expect(JSON.parse(row.recipient).map(item => item.address)).toEqual(recipients);
    expect(row.status).toBe(1);
    expect(result).toHaveLength(1);
    expect(sql.prepare('SELECT COUNT(*) AS count FROM email').get().count).toBe(1);
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe.skipIf(!DatabaseSync)('Mailbox ownership and availability', () => {
  it.each(['new', 'restore', 'reclaim', 'mixed'])('atomically enforces the last quota slot for concurrent %s writes', async mode => {
    for (let id = 1; id <= 9; id++) mailbox(id, 10, `existing${id}@allowed.example`);
    const candidates = Array.from({ length: 6 }, (_, index) => {
      const kind = mode === 'mixed' ? ['new', 'restore', 'reclaim'][index % 3] : mode;
      const address = `quota${index}@allowed.example`;
      if (kind !== 'new') mailbox(100 + index, kind === 'restore' ? 10 : 20, address, 1);
      return { email: address };
    });
    // Force every request past the old COUNT check before ANY request can write.
    // This deterministically reproduces the TOCTOU interleaving from the report.
    const lookup = accountService.selectByEmailIncludeDel.bind(accountService);
    let entered = 0, release;
    const barrier = new Promise(resolve => { release = resolve; });
    vi.spyOn(accountService, 'selectByEmailIncludeDel').mockImplementation(async (...args) => {
      const row = await lookup(...args);
      if (++entered === candidates.length) release();
      await barrier;
      return row;
    });
    const results = await Promise.allSettled(candidates.map(params => accountService.add(c, params, 10)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter(result => result.status === 'rejected');
    expect(rejected).toHaveLength(5);
    for (const result of rejected) expect(result.reason.code).toBe(403);
    expect(await accountService.countUserAccount(c, 10)).toBe(10);
    // A denied reclaim must leave the old owner's deleted address untouched.
    for (let index = 0; index < results.length; index++) {
      if (results[index].status === 'rejected') {
        const old = sql.prepare('SELECT email, is_del FROM account WHERE account_id = ?').get(100 + index);
        if (old) expect(old).toEqual({ email: candidates[index].email, is_del: 1 });
      }
    }
  });
  it.each(['admin', 'unlimited'])('retains %s quota exemptions in atomic writes', async mode => {
    role.accountCount = mode === 'unlimited' ? 0 : 1;
    if (mode === 'admin') currentUser.email = c.env.admin;
    mailbox(1, 10, 'existing@allowed.example');
    const results = await Promise.all([2, 3, 4].map(id => accountService.add(c, { email: `unlimited${id}@allowed.example` }, 10)));
    expect(results).toHaveLength(3);
    expect(await accountService.countUserAccount(c, 10)).toBe(4);
  });
  it('creates an independent mailbox when another user reclaims a deleted address, preserving old mail and attachments', async () => {
    mailbox(1, 20, 'reused@allowed.example', 1); mail(1, 1, 20); mail(2, 1, 20, 1);
    sql.prepare('INSERT INTO attachments VALUES (1, 1, 20)').run();
    const fresh = await accountService.add(c, { email: 'reused@allowed.example' }, 10);
    expect(fresh.accountId).not.toBe(1); expect(fresh.userId).toBe(10);
    expect(sql.prepare('SELECT user_id, is_del FROM email ORDER BY email_id').all()).toEqual([{ user_id: 20, is_del: 0 }, { user_id: 20, is_del: 1 }]);
    expect(sql.prepare('SELECT user_id, account_id FROM attachments').get()).toEqual({ user_id: 20, account_id: 1 });
    await expect(emailService.content(c, { emailId: 1 }, 10)).rejects.toMatchObject({ code: 404 });
    expect(await emailService.content(context(20), { emailId: 1 }, 20)).toMatchObject({ text: 'private' });
  });
  it('restores the original owner without resurrecting individually deleted mail', async () => {
    mailbox(1, 10, 'restore@allowed.example', 1); mail(1, 1, 10, 1);
    expect((await accountService.add(c, { email: 'restore@allowed.example' }, 10)).accountId).toBe(1);
    expect(sql.prepare('SELECT is_del FROM email').get().is_del).toBe(1);
  });
  it('never reassigns another user primary login identity, even after deletion', async () => {
    mailbox(1, 20, 'primary@allowed.example', 1); mail(1, 1, 20);
    userService.selectByEmailIncludeDel.mockResolvedValue({ userId: 20, email: 'primary@allowed.example', isDel: 1 });
    await expect(accountService.add(c, { email: 'primary@allowed.example' }, 10)).rejects.toMatchObject({ name: 'BizError' });
    expect(sql.prepare('SELECT email, user_id FROM account').get()).toEqual({ email: 'primary@allowed.example', user_id: 20 });
  });
  it.each([0, 1])('enforces domain permission before examining existing/deleted records (deleted=%i)', async deleted => {
    mailbox(1, 20, 'blocked@blocked.example', deleted);
    const lookup = vi.spyOn(accountService, 'selectByEmailIncludeDel');
    await expect(accountService.add(c, { email: 'blocked@blocked.example' }, 10)).rejects.toMatchObject({ code: 403 });
    expect(lookup).not.toHaveBeenCalled();
    expect(sql.prepare('SELECT user_id, is_del FROM account').get()).toEqual({ user_id: 20, is_del: deleted });
  });
  it('enforces quota and CAPTCHA before restoring a deleted address', async () => {
    mailbox(1, 10, 'active@allowed.example'); mailbox(2, 20, 'reused@allowed.example', 1);
    role.accountCount = 1;
    await expect(accountService.add(c, { email: 'reused@allowed.example' }, 10)).rejects.toMatchObject({ code: 403 });
    role.accountCount = 10; settings.addEmailVerify = 0;
    vi.spyOn(turnstileService, 'verify').mockRejectedValue(new Error('captcha-required'));
    await expect(accountService.add(c, { email: 'reused@allowed.example' }, 10)).rejects.toThrow('captcha-required');
    expect(sql.prepare('SELECT user_id FROM account WHERE account_id=2').get().user_id).toBe(20);
  });
  it('permits only one successful claimant during competing address reuse', async () => {
    mailbox(1, 20, 'race@allowed.example', 1);
    const results = await Promise.allSettled([accountService.add(c, { email: 'race@allowed.example' }, 10), accountService.add(context(11), { email: 'race@allowed.example' }, 11)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(sql.prepare("SELECT count(*) AS count FROM account WHERE email='race@allowed.example' AND is_del=0").get().count).toBe(1);
  });
  it('does not restore an archived address when the old owner races a new claimant', async () => {
    mailbox(1, 20, 'race@allowed.example', 1); mail(1, 1, 20);
    const results = await Promise.allSettled([accountService.add(c, { email: 'race@allowed.example' }, 10), accountService.add(context(20), { email: 'race@allowed.example' }, 20)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(sql.prepare("SELECT count(*) AS count FROM account WHERE email LIKE 'retired:%' AND is_del=0").get().count).toBe(0);
    expect(sql.prepare('SELECT user_id FROM email').get().user_id).toBe(20);
  });
  it('returns the same content error and empty latest response for foreign and missing IDs', async () => {
    mailbox(1, 20, 'foreign@allowed.example'); mail(1, 1, 20);
    const errors = [];
    for (const emailId of [1, 999999]) { try { await emailService.content(c, { emailId }, 10); } catch (error) { errors.push({ code: error.code, message: error.message }); } }
    expect(errors[0]).toEqual(errors[1]);
    for (const accountId of [1, 999999]) {
      expect(await emailService.latest(c, { accountId, emailId: 0, allReceive: 1 }, 10)).toEqual([]);
      expect(await accountService.setAllReceive(c, { accountId }, 10)).toBeUndefined();
    }
    expect(subWorkerService.syncAll).not.toHaveBeenCalled();
    expect(sql.prepare('SELECT all_receive FROM account').get().all_receive).toBe(0);
  });
  it('still allows owners to toggle their default receiving mailbox', async () => {
    mailbox(1, 10, 'own@allowed.example');
    await accountService.setAllReceive(c, { accountId: 1 }, 10);
    expect(sql.prepare('SELECT all_receive FROM account').get().all_receive).toBe(1);
  });
  it('filters foreign mail in the query while preserving explicit all-mail permission', async () => {
    mailbox(1, 20, 'foreign@allowed.example'); mail(1, 1, 20);
    await expect(emailService.content(c, { emailId: 1 }, 10)).rejects.toMatchObject({ code: 404 });
    permService.userPermKeys.mockResolvedValue(['all-email:query']);
    expect(await emailService.content(c, { emailId: 1 }, 10)).toMatchObject({ text: 'private' });
  });
  it('does not disclose foreign versus missing accounts through list or deletion', async () => {
    mailbox(1, 20, 'foreign@allowed.example');
    for (const accountId of [1, 99999]) {
      expect(await emailService.list(c, { accountId, size: 20, type: 0 }, 10)).toMatchObject({ list: [], total: 0 });
      await expect(accountService.delete(c, { accountId }, 10)).rejects.toMatchObject({ code: 404 });
    }
  });
});

describe.skipIf(!DatabaseSync)('Atomic login throttling and credential responses', () => {
  it('enforces limits atomically across concurrent requests and resets an expired window', async () => {
    const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => rateLimit.consume(c, 'test', 'same-subject', 8, 60)));
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(8);
    expect(attempts.filter(result => result.status === 'rejected')).toHaveLength(12);
    const key = await rateLimit.key('test', 'same-subject');
    sql.prepare('UPDATE security_rate_limit SET expires_at=0 WHERE bucket=?').run(key);
    await expect(rateLimit.consume(c, 'test', 'same-subject', 8, 60)).resolves.toBeUndefined();
  });
  it('does not leak whether an account is missing, deleted or has an incorrect password', async () => {
    const { salt, hash } = await cryptoUtils.hashPassword('right-password');
    const lookup = vi.spyOn(userService, 'selectByEmailIncludeDel');
    const hashes = vi.spyOn(cryptoUtils, 'verifyPassword');
    const errors = [];
    for (const record of [undefined, { ...currentUser, salt, password: hash }, { ...currentUser, isDel: 1, salt, password: hash }]) {
      lookup.mockResolvedValue(record);
      try { await loginService.login(c, { email: 'target@allowed.example', password: 'incorrect' }); }
      catch (error) { errors.push({ code: error.code, message: error.message }); }
    }
    expect(errors).toHaveLength(3); expect(errors[0]).toEqual(errors[1]); expect(errors[1]).toEqual(errors[2]);
    expect(hashes).toHaveBeenCalledTimes(3);
  });
  it('returns real HTTP 429 with Retry-After before another password lookup', async () => {
    const lookup = vi.spyOn(userService, 'selectByEmailIncludeDel').mockResolvedValue(undefined);
    let response;
    for (let attempt = 0; attempt < 9; attempt++) response = await worker.fetch(new Request('https://local.test/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.100' },
      body: JSON.stringify({ email: 'target@allowed.example', password: 'wrong' }),
    }), c.env, {});
    expect(response.status).toBe(429); expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await response.json()).code).toBe(429); expect(lookup).toHaveBeenCalledTimes(8);
  });
  it('a successful password login clears account failures but retains the IP spray counter', async () => {
    const { salt, hash } = await cryptoUtils.hashPassword('right-password');
    vi.spyOn(userService, 'selectByEmailIncludeDel').mockResolvedValue({ ...currentUser, salt, password: hash });
    vi.spyOn(jwtUtils, 'generateToken').mockResolvedValue('local-session-token');
    vi.spyOn(sessionService, 'get').mockResolvedValue(null);
    vi.spyOn(sessionService, 'add').mockImplementation(() => {});
    vi.spyOn(userService, 'updateUserInfo').mockResolvedValue(undefined);
    expect(await loginService.login(c, { email: 'user10@allowed.example', password: 'right-password' })).toBe('local-session-token');
    const count = sql.prepare('SELECT count(*) AS n FROM security_rate_limit').get().n;
    expect(count).toBe(1);
  });
  it('does not exempt lookalike public route prefixes from authentication', async () => {
    for (const path of ['/login-anything', '/setting/websiteConfig-private', '/webhooks-extra', '/public/genToken-extra']) {
      const response = await worker.fetch(new Request('https://local.test/api' + path), c.env, {});
      expect((await response.json()).code).toBe(401);
    }
  });
});

describe.skipIf(!DatabaseSync)('Resend signed webhook boundary', () => {
  const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 're-1' } });
  it('rejects unsigned callbacks before they can write to the database', async () => {
    const update = vi.spyOn(emailService, 'updateEmailStatus');
    await expect(resendService.webhooks(c, payload, {})).rejects.toMatchObject({ code: 401 });
    expect(update).not.toHaveBeenCalled();
  });
  it('fails closed until an administrator configures a signing secret', async () => {
    await expect(resendService.webhooks(c, payload, signed(payload))).rejects.toMatchObject({ code: 503 });
  });
  it.each(['tampered', 'expired', 'future', 'forged'])('rejects %s webhook requests', async kind => {
    await webhookConfig.save(c, { resendWebhookSecret: signingSecret });
    let headers = signed(payload), body = payload;
    if (kind === 'tampered') body = payload.replace('delivered', 'bounced');
    if (kind === 'expired') headers = signed(payload, Math.floor(Date.now() / 1000) - 601);
    if (kind === 'future') headers = signed(payload, Math.floor(Date.now() / 1000) + 601);
    if (kind === 'forged') headers.signature = 'v1,' + Buffer.alloc(32).toString('base64');
    const update = vi.spyOn(emailService, 'updateEmailStatus');
    await expect(resendService.webhooks(c, body, headers)).rejects.toMatchObject({ code: 401 });
    expect(update).not.toHaveBeenCalled();
  });
  it('accepts a valid signature over the raw body and updates only the matching Resend email', async () => {
    mailbox(1, 10, 'own@allowed.example'); mail(1, 1, 10); mail(2, 1, 10);
    await webhookConfig.save(c, { resendWebhookSecret: signingSecret });
    const headers = signed(payload);
    const response = await worker.fetch(new Request('https://local.test/api/webhooks', { method: 'POST', body: payload,
      headers: { 'svix-id': headers.id, 'svix-timestamp': headers.timestamp, 'svix-signature': headers.signature } }), c.env, {});
    expect(response.status).toBe(200);
    expect(sql.prepare('SELECT status FROM email WHERE email_id=1').get().status).toBe(2);
    expect(sql.prepare('SELECT status FROM email WHERE email_id=2').get().status).toBe(1);
  });
  it('keeps secrets when saved blank and supports rotating signing keys', async () => {
    await webhookConfig.save(c, { resendWebhookSecret: signingSecret });
    await webhookConfig.save(c, { resendWebhookSecret: '' });
    expect(await webhookConfig.get(c)).toEqual([signingSecret]);
    await webhookConfig.save(c, { resendWebhookSecret: 'whsec_' + Buffer.alloc(32).toString('base64') + ',' + signingSecret });
    vi.spyOn(emailService, 'updateEmailStatus').mockResolvedValue(undefined);
    await expect(resendService.webhooks(c, payload, signed(payload))).resolves.toBeUndefined();
  });
  it('exposes only the configured flag in settings and no signing secret in public config', async () => {
    await webhookConfig.save(c, { resendWebhookSecret: signingSecret });
    settingService.query.mockRestore();
    values.set('setting:', JSON.stringify({ aiCode: 0, aiModel: 'test', queenTokens: {}, sendProviders: {},
      emailPrefixFilter: '', subWorkerDomains: [], managedDomains: '[]' }));
    const queried = await settingService.query(c);
    expect(queried.hasResendWebhookSecret).toBe(true);
    expect(JSON.stringify(queried)).not.toContain(signingSecret);
    vi.spyOn(settingService, 'get').mockResolvedValue({ ...queried, title: 'Xi-Mail', siteKey: 'public-turnstile-site-key',
      domainList: ['@allowed.example'], secretKey: 'private-turnstile-secret', resendWebhookSecret: signingSecret, linuxdoClientSecret: 'private-client-secret' });
    const publicConfig = await settingService.websiteConfig(c);
    expect(publicConfig.siteKey).toBe('public-turnstile-site-key');
    expect(publicConfig.domainList).toEqual(['@allowed.example']);
    expect(JSON.stringify(publicConfig)).not.toContain('private-');
    expect(JSON.stringify(publicConfig)).not.toContain(signingSecret);
    expect(publicConfig.hasResendWebhookSecret).toBeUndefined();
  });
  it('acknowledges valid unrelated events without exposing whether an email exists', async () => {
    await webhookConfig.save(c, { resendWebhookSecret: signingSecret });
    await expect(resendService.webhooks(c, payload, signed(payload))).resolves.toBeUndefined();
    const unknown = JSON.stringify({ type: 'domain.updated', data: {} });
    const update = vi.spyOn(emailService, 'updateEmailStatus');
    await expect(resendService.webhooks(c, unknown, signed(unknown))).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });
});
