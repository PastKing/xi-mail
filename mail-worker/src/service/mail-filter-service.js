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
