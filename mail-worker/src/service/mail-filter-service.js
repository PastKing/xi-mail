import { and, eq, exists, notExists, isNull, ne, or, sql, gte, lt } from 'drizzle-orm';
import email from '../entity/email';
import user from '../entity/user';
import { att } from '../entity/att';
import orm from '../entity/orm';
import { attConst, emailConst, isDel } from '../const/entity-const';
import BizError from '../error/biz-error';

function flag(params, key) {
  const value = params[key];
  if (value === undefined || value === null || value === '') return null;
  if (!['0', '1'].includes(String(value))) throw new BizError('Invalid mail filter', 400);
  return Number(value);
}
function date(value) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) throw new BizError('Invalid date filter', 400);
  const parsed = new Date(value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 19).replace('T', ' ') !== value) throw new BizError('Invalid date filter', 400);
  return value;
}

// Shared by the initial list, pagination, count and live updates.
export function mailFilterConditions(c, params) {
  const conditions = [ne(email.status, emailConst.status.SAVING)];
  if (params.type === 'send') conditions.push(eq(email.type, emailConst.type.SEND));
  if (params.type === 'receive') conditions.push(eq(email.type, emailConst.type.RECEIVE));
  if (params.type === 'delete') conditions.push(eq(email.isDel, isDel.DELETE));
  if (params.type === 'noone') conditions.push(eq(email.status, emailConst.status.NOONE));
  if (params.senderExact) {
    if (typeof params.senderExact !== 'string' || params.senderExact.length > 320) throw new BizError('发件地址无效',400);
    conditions.push(sql`lower(trim(${email.sendEmail})) = ${params.senderExact.trim().toLowerCase()}`);
  }
  for (const [key, column] of [['userEmail', user.email], ['name', email.name], ['subject', email.subject], ['sendEmail', email.sendEmail], ['toEmail', email.toEmail]]) {
    if (params[key]) conditions.push(sql`${column} COLLATE NOCASE LIKE ${'%' + String(params[key]).slice(0, 512) + '%'}`);
  }
  if (params.accountEmail) conditions.push(or(
    sql`${email.toEmail} COLLATE NOCASE LIKE ${'%' + String(params.accountEmail).slice(0, 512) + '%'}`,
    sql`${email.sendEmail} COLLATE NOCASE LIKE ${'%' + String(params.accountEmail).slice(0, 512) + '%'}`));
  if (params.deliveryStatus != null && params.deliveryStatus !== '') {
    const status = Number(params.deliveryStatus);
    if (![0, 1, 2, 3, 4, 5, 7, 8].includes(status)) throw new BizError('Invalid delivery status', 400);
    conditions.push(eq(email.status, status));
  }
  const unread = flag(params, 'unread'), code = flag(params, 'hasCode'), attachments = flag(params, 'hasAttachments');
  if (unread !== null) conditions.push(eq(email.unread, unread));
  if (code !== null) conditions.push(code ? sql`coalesce(trim(${email.code}), '') <> ''` : sql`coalesce(trim(${email.code}), '') = ''`);
  if (attachments !== null) {
    const attached = orm(c).select({ one: sql`1` }).from(att).where(and(eq(att.emailId, email.emailId), eq(att.type, attConst.type.ATT), isNull(att.contentId)));
    conditions.push(attachments ? exists(attached) : notExists(attached));
  }
  if (params.startTime) conditions.push(gte(email.createTime, date(params.startTime)));
  if (params.endTime) conditions.push(lt(email.createTime, date(params.endTime)));
  if (params.startTime && params.endTime && params.startTime >= params.endTime) throw new BizError('Invalid date range', 400);
  return conditions;
}

export function personalMailConditions(c, params, userId) {
  const type = params.type == null ? 0 : Number(params.type);
  if (![0, 1].includes(type)) throw new BizError('Invalid mail type', 400);
  const conditions = [eq(email.userId, userId), eq(email.isDel, 0), eq(email.type, type), ne(email.status, emailConst.status.SAVING)];
  if (!Number(params.allReceive)) conditions.push(eq(email.accountId, Number(params.accountId)));
  const keyword = String(params.keyword || '').trim();
  if (keyword.length > 512) throw new BizError('Search text too long', 400);
  const searchType = params.searchType || 'all';
  if (!['all','subject','sender','recipient','content'].includes(searchType)) throw new BizError('Invalid search type', 400);
  if (keyword) {
    const pattern = '%' + keyword.replace(/[!%_]/g, '!$&') + '%';
    const matches = column => sql`${column} COLLATE NOCASE LIKE ${pattern} ESCAPE '!'`;
    const fields = { subject: [email.subject], sender: [email.name,email.sendEmail], recipient: [email.toEmail,email.toName], content: [email.text,email.content] };
    conditions.push(or(...(searchType === 'all' ? [email.subject,email.name,email.sendEmail,email.toEmail,email.text,email.content] : fields[searchType]).map(matches)));
  }
  for (const key of ['unread','hasCode']) {
    const value = flag(params,key);
    if (value !== null) conditions.push(key === 'unread' ? eq(email.unread,value) : value ? sql`trim(coalesce(${email.code},''))<>''` : sql`trim(coalesce(${email.code},''))=''`);
  }
  if (params.startTime) conditions.push(gte(email.createTime, date(params.startTime)));
  if (params.endTime) conditions.push(lt(email.createTime, date(params.endTime)));
  if (params.startTime && params.endTime && params.startTime >= params.endTime) throw new BizError('Invalid date range', 400);
  return conditions;
}
