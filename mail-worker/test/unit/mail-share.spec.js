import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import shares from '../../src/service/mail-share-service';
import permService from '../../src/service/perm-service';
import worker from '../../src/index';
import jwt from '../../src/utils/jwt-utils';
import sessionService from '../../src/service/session-service';
import r2Service from '../../src/service/r2-service';

let db, c, perms, store;
function adapter(db) {
 const prepare = (sql, args = []) => ({
  bind: (...values) => prepare(sql, values),
  run: async () => ({ meta: db.prepare(sql).run(...args) }),
  first: async () => db.prepare(sql).get(...args) || null,
  all: async () => ({ results: db.prepare(sql).all(...args) }),
  execute: () => /\bRETURNING\b|^SELECT/i.test(sql) ? { results: db.prepare(sql).all(...args) } : { meta: db.prepare(sql).run(...args) },
 });
 return { prepare, batch: async statements => {
  db.exec('BEGIN');
  try { const results = statements.map(s => s.execute()); db.exec('COMMIT'); return results; }
  catch(e) { db.exec('ROLLBACK'); throw e; }
 } };
}
beforeEach(() => {
 db = new DatabaseSync(':memory:'); perms = ['account:share']; store = new Map();
 db.exec(`CREATE TABLE account(account_id INTEGER PRIMARY KEY,user_id INTEGER,email TEXT,is_del INTEGER DEFAULT 0);
 CREATE TABLE user(user_id INTEGER PRIMARY KEY,email TEXT,status INTEGER DEFAULT 0,is_del INTEGER DEFAULT 0);
 CREATE TABLE email(email_id INTEGER PRIMARY KEY,account_id INTEGER,user_id INTEGER,name TEXT DEFAULT 'Sender',
 send_email TEXT DEFAULT 'sender@example.org',subject TEXT DEFAULT 'Code',code TEXT DEFAULT '123456',
 create_time TEXT DEFAULT CURRENT_TIMESTAMP,type INTEGER DEFAULT 0,is_del INTEGER DEFAULT 0,content TEXT DEFAULT 'PRIVATE BODY',text TEXT DEFAULT 'Preview text');
 CREATE TABLE attachments(att_id INTEGER PRIMARY KEY,email_id INTEGER,account_id INTEGER,user_id INTEGER,
 key TEXT,filename TEXT,size INTEGER,mime_type TEXT,content_id TEXT,type INTEGER DEFAULT 0);
 INSERT INTO user(user_id,email) VALUES(1,'owner@example.com'),(2,'other@example.com');
 INSERT INTO account(account_id,user_id,email) VALUES(10,1,'box@example.com'),(20,2,'other@example.com');
 INSERT INTO email(email_id,account_id,user_id) VALUES(1,10,1);`);
 c = { env: { db: adapter(db), admin: 'admin@example.com', jwt_secret: 'local-test-signing-key-0123456789-AbCdEfGhIjKlMnOpQrStUv',
  kv: { get: async (key, options) => store.has(key) ? options?.type === 'json' ? JSON.parse(store.get(key)) : store.get(key) : null,
   put: async (key,value) => store.set(key,value), delete: async key => store.delete(key) } },
  req: { header: () => '127.0.0.1' }, get: () => undefined };
 vi.spyOn(permService, 'userPermKeys').mockImplementation(async () => perms);
});
afterEach(() => { vi.restoreAllMocks(); db.close(); });
const create = () => shares.create(c, { accountId: 10, hours: 1 }, 1);
const receive = (sql = '') => db.exec(`INSERT INTO email(email_id,account_id,user_id) VALUES(2,10,1);${sql}`);
async function api(path, method = 'GET', body, auth = false) {
 const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' };
 if (auth) {
  const info = { tokens: [], sessions: {}, user: { userId: 1, email: 'owner@example.com' }, refreshTime: new Date().toISOString() };
  sessionService.add(c, info, 'test-session', 'password');
  await sessionService.save(c, 1, info);
  headers.Authorization = await jwt.generateToken(c, { userId: 1, token: 'test-session' });
 }
 return worker.fetch(new Request('https://local.example/api' + path,
  { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }), c.env, {});
}
describe('Mailbox sharing capabilities', () => {
 it('stores only a random capability digest and scopes results to all new incoming mail', async () => {
  const link = await create();
  expect(link.token).toMatch(/^[a-f0-9]{64}$/);
  expect(link.expiresAt - link.createdAt).toBe(3600000);
  const stored = db.prepare('SELECT * FROM mail_share').get();
  expect(stored.token_hash).not.toBe(link.token);
  expect(JSON.stringify(stored)).not.toContain(link.token);
  receive(`INSERT INTO email(email_id,account_id,user_id,type) VALUES(3,10,1,1);
   INSERT INTO email(email_id,account_id,user_id,code) VALUES(4,10,1,'');
   INSERT INTO email(email_id,account_id,user_id) VALUES(5,20,2);
   INSERT INTO email(email_id,account_id,user_id,is_del) VALUES(6,10,1,1);`);
  const result = await shares.read(c, link.token);
  expect(result.email).toBe('box@example.com');
  expect(result.messages).toHaveLength(2);
  expect(result.messages.map(item=>item.emailId)).toEqual([4,2]);
  expect(result.messages[0].code).toBe('');
  expect(Object.keys(result.messages[0]).sort()).toEqual(['emailId','preview','code','createTime','name','sendEmail','subject'].sort());
  expect(JSON.stringify(result)).not.toContain('PRIVATE BODY');
  const listed = await shares.list(c, 10, 1);
  expect(listed).toHaveLength(1);
  expect(listed[0]).not.toHaveProperty('token');
  expect(listed[0]).not.toHaveProperty('token_hash');
 });
 it.each([0, 169, -1, 1.5, '2', null])('rejects invalid expiry %s', async hours => {
  await expect(shares.create(c, { accountId: 10, hours }, 1)).rejects.toMatchObject({ code: 400 });
 });
 it('accepts the seven-day maximum and caps active links atomically', async () => {
  await shares.create(c, { accountId: 10, hours: 168 }, 1);
  const results = await Promise.allSettled(Array.from({length: 11}, () => create()));
  expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(9);
  expect(db.prepare('SELECT COUNT(*) AS n FROM mail_share').get().n).toBe(10);
 });
 it.each([20, 999, 'abc', 0])('does not create or list a foreign/missing mailbox %s', async accountId => {
  await expect(shares.create(c, { accountId, hours: 1 }, 1)).rejects.toMatchObject({ code: 404 });
  await expect(shares.list(c, accountId, 1)).rejects.toMatchObject({ code: 404 });
 });
 it('only the owner can revoke; revoked and expired links fail uniformly', async () => {
  const link = await create();
  await shares.revoke(c, link.shareId, 2);
  expect(await shares.read(c, link.token)).toHaveProperty('email');
  await shares.revoke(c, link.shareId, 1);
  await expect(shares.read(c, link.token)).rejects.toMatchObject({ code: 404 });
  const expired = await create();
  db.prepare('UPDATE mail_share SET expires_at=? WHERE share_id=?').run(Date.now()-1,expired.shareId);
  await expect(shares.read(c, expired.token)).rejects.toMatchObject({ code: 404 });
  expect(await shares.list(c, 10, 1)).toEqual([]);
 });
 it.each([
  'UPDATE account SET user_id=2 WHERE account_id=10; UPDATE account SET user_id=1 WHERE account_id=10;',
  'UPDATE account SET is_del=1 WHERE account_id=10; UPDATE account SET is_del=0 WHERE account_id=10;',
  'UPDATE user SET status=1 WHERE user_id=1; UPDATE user SET status=0 WHERE user_id=1;',
  'UPDATE user SET is_del=1 WHERE user_id=1; UPDATE user SET is_del=0 WHERE user_id=1;',
 ])('permanently invalidates on ownership/deletion/disable transitions: %s', async sql => {
  const link = await create(); db.exec(sql);
  await expect(shares.read(c, link.token)).rejects.toMatchObject({ code: 404 });
 });
 it('revoking the role permission stops existing public links', async () => {
  const link = await create(); perms = [];
  await expect(shares.read(c, link.token)).rejects.toMatchObject({ code: 404 });
 });
 it('cleans expired records without deleting active capabilities', async () => {
  const keep = await create(), old = await create();
  db.prepare('UPDATE mail_share SET expires_at=? WHERE share_id=?').run(Date.now()-86400001, old.shareId);
  await shares.cleanup(c);
  expect(db.prepare('SELECT COUNT(*) AS n FROM mail_share').get().n).toBe(1);
  expect(await shares.read(c, keep.token)).toHaveProperty('email');
 });
 it('paginates all incoming mail beyond 20 messages without exposing earlier history', async () => {
  const link = await create();
  for (let n=2;n<30;n++) db.prepare('INSERT INTO email(email_id,account_id,user_id,code) VALUES(?,10,1,?)').run(n,String(n));
  const result = await shares.read(c, link.token);
  expect(result.messages).toHaveLength(20); expect(result.messages[0].code).toBe('29');
  expect(result.hasMore).toBe(true); expect(result.nextCursor).toBe(10);
  const next = await shares.read(c, link.token, result.nextCursor);
  expect(next.messages.map(item=>item.emailId)).toEqual([9,8,7,6,5,4,3,2]);
  expect(next.hasMore).toBe(false); expect(next.nextCursor).toBeNull();
  await expect(shares.read(c,link.token,'invalid')).rejects.toMatchObject({code:404});
 });
 it('reads HTML login links and plain text without requiring an extracted verification code', async () => {
  const link=await create(); receive();
  db.prepare(`UPDATE email SET code='',content=?,text=? WHERE email_id=2`).run('<p><a href="https://login.example/verify?token=one">Sign in</a></p>','Sign in: https://login.example/verify?token=one');
  const response=await api('/mail-share/content','POST',{token:link.token,emailId:2});
  const message=(await response.json()).data;
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(message.content).toContain('https://login.example/verify?token=one');
  expect(message.text).toContain('Sign in:');
  expect(message.attachments).toEqual([]);
  for(const emailId of [1,999,0,'invalid']) await expect(shares.content(c,{token:link.token,emailId})).rejects.toMatchObject({code:404});
 });
 it('checks message ownership, mailbox scope, receive type and deletion on every body/attachment read', async () => {
  const link=await create(); receive(`INSERT INTO email(email_id,account_id,user_id) VALUES(3,20,2);
   INSERT INTO email(email_id,account_id,user_id,type) VALUES(4,10,1,1);
   INSERT INTO email(email_id,account_id,user_id,is_del) VALUES(5,10,1,1);
   INSERT INTO account(account_id,user_id,email) VALUES(30,1,'another@example.com');
   INSERT INTO email(email_id,account_id,user_id) VALUES(6,30,1);`);
  for(const emailId of [1,3,4,5,6]) {
   await expect(shares.content(c,{token:link.token,emailId})).rejects.toMatchObject({code:404});
   await expect(shares.attachment(c,{token:link.token,emailId,attId:1})).rejects.toMatchObject({code:404});
  }
  await shares.revoke(c,link.shareId,1);
  await expect(shares.content(c,{token:link.token,emailId:2})).rejects.toMatchObject({code:404});
  await expect(shares.attachment(c,{token:link.token,emailId:2,attId:1})).rejects.toMatchObject({code:404});
 });
 it('hides permanent storage keys, rewrites embedded images and authorizes safe attachment downloads', async () => {
  const link=await create();receive();
  db.exec(`INSERT INTO attachments(att_id,email_id,account_id,user_id,key,filename,size,mime_type,content_id,type)
   VALUES(1,2,10,1,'attachments/private.png','logo.png',20,'image/png','<logo>',1),
   (2,2,10,1,'attachments/private.html','invoice.html',20,'text/html',NULL,0),
   (3,2,20,2,'attachments/foreign.txt','foreign.txt',10,'text/plain',NULL,0);
   UPDATE email SET content='<img src="{{domain}}attachments/private.png"><p>Message</p>' WHERE email_id=2;`);
  const content=await shares.content(c,{token:link.token,emailId:2});
  expect(content.content).toContain('cid:share-1');
  expect(JSON.stringify(content)).not.toContain('private.png');
  expect(content.attachments.map(att=>att.attId)).toEqual([1,2]);
  expect(content.attachments[0].inline).toBe(true);
  expect(content.attachments[1].inline).toBe(false);
  vi.spyOn(r2Service,'getObj').mockResolvedValue({buff:new TextEncoder().encode('<script>alert(1)</script>'),contentType:'text/html'});
  const response=await api('/mail-share/attachment','POST',{token:link.token,emailId:2,attId:2});
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('content-type')).toBe('application/octet-stream');
  expect(response.headers.get('content-disposition')).toContain('attachment;');
  expect(response.headers.get('content-security-policy')).toContain('sandbox');
  expect(r2Service.getObj).toHaveBeenCalledWith(expect.anything(),'attachments/private.html');
  await expect(shares.attachment(c,{token:link.token,emailId:2,attId:3})).rejects.toMatchObject({code:404});
 });
 it('supports an unauthenticated read while all management APIs require login and permission', async () => {
  const link = await create(); receive();
  const response = await api('/mail-share/read', 'POST', { token: link.token });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await response.json()).data.messages).toHaveLength(1);
  for (const [path,method] of [['/mail-share/list?accountId=10','GET'],['/mail-share/create','POST'],['/mail-share/revoke?shareId=x','DELETE']]) {
   expect((await (await api(path,method,method==='POST'?{}:undefined)).json()).code).toBe(401);
   perms = [];
   expect((await (await api(path,method,method==='POST'?{}:undefined,true)).json()).code).toBe(403);
  }
  perms = ['account:share'];
  expect((await (await api('/mail-share/create','POST',{accountId:10,hours:2},true)).json()).code).toBe(200);
 });
 it('does not exempt lookalike paths or accept legacy JWT/invalid capability values', async () => {
  for (const token of ['abc','a'.repeat(64),'eyJhbGciOiJIUzI1NiJ9.test.jwt',null]) {
   expect((await (await api('/mail-share/read','POST',{token})).json()).code).toBe(404);
  }
  expect((await (await api('/mail-share/read/more','POST',{})).json()).code).toBe(401);
  for(const path of ['content','attachment']) {
   expect((await (await api('/mail-share/'+path,'POST',{token:'invalid',emailId:2,attId:1})).json()).code).toBe(404);
   expect((await (await api('/mail-share/'+path+'/extra','POST',{})).json()).code).toBe(401);
  }
 });
 it('rate limits invalid public requests with real atomic database buckets and HTTP 429', async () => {
  for(let n=0;n<120;n++) await api('/mail-share/read','POST',{token:'invalid'});
  const response = await api('/mail-share/read','POST',{token:'invalid'});
  expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBeTruthy();
  expect((await response.json()).code).toBe(429);
 });
});
