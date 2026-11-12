import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
let DatabaseSync;
try { ({ DatabaseSync } = await import('node:sqlite')); } catch {}
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import user from '../../src/entity/user';
import account from '../../src/entity/account';
import email from '../../src/entity/email';
import { att } from '../../src/entity/att';
import { oauthBinding } from '../../src/entity/oauth-binding';
import userService from '../../src/service/user-service';
import emailService from '../../src/service/email-service';
import roleService from '../../src/service/role-service';
import subWorkerService from '../../src/service/sub-worker-service';
import bindingService from '../../src/service/oauth-binding-service';
import attService from '../../src/service/att-service';
import {senderStatistics} from '../../src/service/sender-statistics-service';

function d1(db) {
  const prepare = (sql, values = []) => ({
    bind: (...params) => prepare(sql, params),
    run: async () => ({ success: true, meta: db.prepare(sql).run(...values) }),
    all: async () => ({ success: true, results: db.prepare(sql).all(...values) }),
    raw: async () => { const statement = db.prepare(sql); statement.setReturnArrays(true); return statement.all(...values); },
  });
  return { prepare, batch: async statements => Promise.all(statements.map(statement => statement.run())) };
}
let sql, c;
function insert(table, row) {
  const keys = Object.keys(row);
  sql.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
}
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  for (const table of [user, account, email, att, oauthBinding]) {
    const config = getTableConfig(table);
    sql.exec(`CREATE TABLE ${config.name} (${config.columns.map(column => `${column.name} ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`).join(',')})`);
  }
  c = { env: { db: d1(sql), admin: 'admin@example.com' } };
  vi.spyOn(bindingService, 'ensure').mockResolvedValue(undefined);
  vi.spyOn(roleService, 'selectByIdsHasPermKey').mockResolvedValue([]);
  vi.spyOn(subWorkerService, 'syncAll').mockResolvedValue(undefined);
  vi.spyOn(attService, 'selectByEmailIds').mockResolvedValue([]);
  for (const row of [
    { user_id: 1, email: 'admin@example.com', type: 2, status: 0, is_del: 0 },
    { user_id: 2, email: 'active@example.com', type: 2, status: 0, is_del: 0 },
    { user_id: 3, email: 'banned@example.com', type: 3, status: 1, is_del: 0 },
    { user_id: 4, email: 'deleted@example.com', type: 2, status: 0, is_del: 1 },
    { user_id: 5, email: 'other@example.com', type: 3, status: 0, is_del: 0 },
  ]) insert('user', { ...row, password: 'private-password-hash', salt: 'private-salt' });
  insert('account', { account_id: 1, user_id: 2, email: 'alias@example.com', is_del: 0 });
  let bindingId = 0;
  for (const provider of ['linuxdo', 'nodeloc', 'telegram']) insert('oauth_binding', { binding_id: ++bindingId, user_id: 2, provider, provider_user_id: 'private-id-' + provider, display_name: 'linked-' + provider, create_time: '2026-11-01 00:00:00' });
  insert('oauth_binding', { binding_id: ++bindingId, user_id: 3, provider: 'telegram', provider_user_id: 'private-id-3', display_name: 'banned-tg', create_time: '2026-11-02 00:00:00' });
  for (let id = 1; id <= 5; id++) insert('email', { email_id: id, user_id: id === 5 ? 3 : 2, account_id: 1, type: id === 4 ? 1 : 0, status: id === 3 ? 6 : id === 4 ? 3 : 0,
    is_del: 0, unread: id === 2 ? 1 : 0, code: [1, 2, 3].includes(id) ? '123456' : '', send_email: id === 5 ? 'elsewhere@example.org' : 'sender@example.org',
    to_email: 'alias@example.com', subject: id === 5 ? 'Other mail' : 'Test mail', name: 'Sender', create_time: id === 2 ? '2026-11-03 09:00:00' : '2026-11-01 09:00:00' });
  insert('attachments', { att_id: 1, email_id: 1, type: 0, content_id: null });
  insert('attachments', { att_id: 2, email_id: 1, type: 0, content_id: null });
  insert('attachments', { att_id: 3, email_id: 2, type: 1, content_id: 'inline-image' });
});
afterEach(() => { vi.restoreAllMocks(); sql.close(); });
const users = params => userService.list(c, { num: 1, size: 15, status: -1, ...params });
const mails = params => emailService.allList(c, { emailId: 0, size: 20, timeSort: 0, type: 'all', ...params });

describe.skipIf(!DatabaseSync)('Admin sender address statistics',()=>{
  const statistics = params => senderStatistics(c,{type:'receive',...params});
  it('groups full sender addresses without merging display names, excluding drafts',async()=>{
    const result=await statistics({});
    expect(result).toMatchObject({totalMessages:3,senderCount:2,missingAddress:0,page:1,size:20});
    expect(result.list).toEqual([
      {address:'sender@example.org',total:2,lastTime:'2026-11-03 09:00:00'},
      {address:'elsewhere@example.org',total:1,lastTime:'2026-11-01 09:00:00'},
    ]);
  });
  it('normalizes surrounding spaces and letter case and accounts for missing addresses',async()=>{
    sql.exec("UPDATE email SET send_email=' SENDER@EXAMPLE.ORG ' WHERE email_id=2");
    insert('email',{email_id:6,type:0,status:0,send_email:' ',create_time:'2026-11-04 00:00:00'});
    insert('email',{email_id:7,type:0,status:0,send_email:null,create_time:'2026-11-04 00:00:00'});
    const result=await statistics({});
    expect(result).toMatchObject({totalMessages:5,senderCount:2,missingAddress:2});
    expect(result.list[0]).toMatchObject({address:'sender@example.org',total:2});
    expect(result.list.reduce((sum,row)=>sum+row.total,0)+result.missingAddress).toBe(result.totalMessages);
  });
  it('shares date, code, attachments, state and user filters with the list',async()=>{
    const filters={userEmail:'active',hasCode:'1',hasAttachments:'0',unread:'1',startTime:'2026-11-03 00:00:00',endTime:'2026-11-04 00:00:00'};
    const result=await statistics(filters),list=await mails({...filters,type:'receive'});
    expect(result.totalMessages).toBe(list.total);
    expect(result).toMatchObject({totalMessages:1,senderCount:1});
  });
  it('matches the list deletion scope and can count sent mail independently',async()=>{
    sql.exec('UPDATE email SET is_del=1 WHERE email_id=1');
    expect((await statistics({})).totalMessages).toBe(3);
    expect(await statistics({type:'delete'})).toMatchObject({totalMessages:1,senderCount:1});
    expect(await statistics({type:'send'})).toMatchObject({totalMessages:1,senderCount:1});
  });
  it('paginates address groups with a denominator independent of page size',async()=>{
    const first=await statistics({size:'1',page:'1'}),second=await statistics({size:'1',page:'2'});
    expect(first.totalMessages).toBe(3);expect(second.totalMessages).toBe(3);
    expect(first.senderCount).toBe(2);expect(second.senderCount).toBe(2);
    expect(first.list[0].address).not.toBe(second.list[0].address);
  });
  it('searches literal wildcards and parameterizes untrusted values',async()=>{
    sql.exec("UPDATE email SET send_email='percent%_tag@example.org' WHERE email_id=1");
    expect(await statistics({senderKeyword:'%_'})).toMatchObject({totalMessages:1,senderCount:1});
    expect(await statistics({senderKeyword:"' OR 1=1 --"})).toMatchObject({totalMessages:0,senderCount:0,list:[]});
  });
  it('filters an exact address consistently in list, statistics and polling',async()=>{
    sql.exec("UPDATE email SET send_email='sender@example.org.evil' WHERE email_id=5");
    const filters={type:'receive',senderExact:'SENDER@example.org'};
    const result=await statistics(filters),list=await mails(filters);
    const updates=await emailService.allEmailLatest(c,{...filters,emailId:0});
    expect(result.totalMessages).toBe(2);expect(list.total).toBe(2);
    expect(updates.map(row=>row.emailId).sort()).toEqual([1,2]);
  });
  it('only reads aggregation fields and skips the user join unless needed',async()=>{
    const prepare=vi.spyOn(c.env.db,'prepare');
    const result=await statistics({});
    const queries=prepare.mock.calls.map(([text])=>text).filter(text=>text.startsWith('select'));
    expect(queries).toHaveLength(2);
    expect(queries.every(text=>!text.includes('join "user"'))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('content');
    expect(JSON.stringify(result)).not.toContain('subject');
    expect(queries.every(text=>!text.includes('"email"."content"'))).toBe(true);
  });
  it.each([{page:0},{page:'bad'},{size:51},{type:'bad'},{senderKeyword:'x'.repeat(321)},{startTime:'bad'}])('rejects invalid statistics filters %j',async params=>{
    await expect(statistics(params)).rejects.toMatchObject({code:400});
  });
});

describe.skipIf(!DatabaseSync)('Admin user filters and connection metadata', () => {
  it('returns one user per row with ordered, sanitized provider metadata', async () => {
    const result = await users({});
    expect(result.total).toBe(5); expect(result.list).toHaveLength(5);
    const bound = result.list.find(row => row.userId === 2);
    expect(bound.oauthBindings.map(row => row.provider)).toEqual(['nodeloc', 'telegram', 'linuxdo']);
    expect(JSON.stringify(result)).not.toContain('private-');
    expect(bound).not.toHaveProperty('password'); expect(bound).not.toHaveProperty('salt');
  });
  it('combines state, role and provider filters on the server', async () => {
    expect((await users({ status: 0, roleId: 2, provider: 'nodeloc' })).list.map(row => row.userId)).toEqual([2]);
    expect((await users({ status: 1, roleId: 3, provider: 'telegram' })).list.map(row => row.userId)).toEqual([3]);
    expect((await users({ status: -2, roleId: 2, provider: 'unbound' })).list.map(row => row.userId)).toEqual([4]);
    expect((await users({ provider: 'bound' })).total).toBe(2);
  });
  it('recognizes the configured administrator independently of its physical role ID', async () => {
    expect((await users({ roleId: 0 })).list.map(row => row.userId)).toEqual([1]);
    expect((await users({ roleId: 2 })).list.map(row => row.userId).sort()).toEqual([2, 4]);
  });
  it('keeps pagination totals accurate with multiple bindings and supports mailbox alias search', async () => {
    const first = await users({ provider: 'bound', size: 1 }), second = await users({ provider: 'bound', size: 1, num: 2 });
    expect(first.total).toBe(2); expect(second.total).toBe(2);
    expect(first.list[0].userId).not.toBe(second.list[0].userId);
    expect((await users({ email: 'alias@', provider: 'telegram' })).list.map(row => row.userId)).toEqual([2]);
  });
  it('rejects unsupported provider or role values', async () => {
    await expect(users({ provider: 'unknown' })).rejects.toMatchObject({ code: 400 });
    await expect(users({ roleId: 'bad' })).rejects.toMatchObject({ code: 400 });
  });
});

describe.skipIf(!DatabaseSync)('Admin mail filters', () => {
  it('combines attachment, code, read state and date range without counting inline images as attachments', async () => {
    const attached = await mails({ type: 'receive', hasAttachments: '1', hasCode: '1', unread: '0' });
    expect(attached.list.map(row => row.emailId)).toEqual([1]); expect(attached.total).toBe(1);
    const plain = await mails({ type: 'receive', hasAttachments: '0', hasCode: '1', unread: '1', startTime: '2026-11-03 00:00:00', endTime: '2026-11-04 00:00:00' });
    expect(plain.list.map(row => row.emailId)).toEqual([2]); expect(plain.total).toBe(1);
  });
  it('applies the same conditions to live updates and excludes saving messages', async () => {
    const params = { type: 'receive', hasAttachments: '1', hasCode: '1', deliveryStatus: '0' };
    expect((await mails(params)).list.map(row => row.emailId)).toEqual([1]);
    expect((await emailService.allEmailLatest(c, { emailId: 0, ...params })).map(row => row.emailId)).toEqual([1]);
  });
  it('preserves total counts across cursors and combines sender, recipient and delivery status', async () => {
    const result = await mails({ type: 'send', deliveryStatus: '3', sendEmail: 'sender@', toEmail: 'alias@' });
    expect(result.total).toBe(1); expect(result.list.map(row => row.emailId)).toEqual([4]);
    const page = await mails({ size: 1, hasCode: '1' });
    const next = await mails({ size: 1, hasCode: '1', emailId: page.list[0].emailId });
    expect(page.total).toBe(2); expect(next.total).toBe(2);
    expect(page.list[0].emailId).not.toBe(next.list[0].emailId);
  });
  it.each([{ hasCode: 'yes' }, { deliveryStatus: '6' }, { startTime: '2026-02-30 00:00:00' }, { startTime: '2026-11-03 00:00:00', endTime: '2026-11-01 00:00:00' }])('rejects invalid filter values %j', async params => {
    await expect(mails(params)).rejects.toMatchObject({ code: 400 });
  });
});
