import {and,asc,desc,count,eq,max,sql} from 'drizzle-orm';
import orm from '../entity/orm';
import email from '../entity/email';
import user from '../entity/user';
import BizError from '../error/biz-error';
import {mailFilterConditions} from './mail-filter-service';
import {ensureMailIndexes} from './mail-index-service';

const address = sql`lower(trim(${email.sendEmail}))`;

export async function senderStatistics(c, params) {
  const page = Number(params.page ?? 1), size = Number(params.size ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isInteger(size) || size < 1 || size > 50)
    throw new BizError('统计分页参数无效',400);
  if (params.type && !['all','receive','send','delete','noone'].includes(params.type))
    throw new BizError('邮件类型无效',400);
  const keyword = String(params.senderKeyword || '').trim();
  if (keyword.length > 320) throw new BizError('发件地址搜索内容过长',400);
  const conditions = mailFilterConditions(c,params);
  if (keyword) conditions.push(sql`instr(${address},${keyword.toLowerCase()}) > 0`);
  await ensureMailIndexes(c);
  const db = orm(c);
  const summaryQuery = db.select({
    totalMessages: count(),
    senderCount: sql`count(distinct nullif(${address},''))`.mapWith(Number),
    missingAddress: sql`coalesce(sum(case when ${address} is null or ${address}='' then 1 else 0 end),0)`.mapWith(Number),
  }).from(email);
  const rowsQuery = db.select({address:address.as('address'),total:count(),lastTime:max(email.createTime)})
    .from(email);
  // Only a user-address search needs the users table. Never load mail bodies.
  if (params.userEmail) {
    summaryQuery.leftJoin(user,eq(user.userId,email.userId));
    rowsQuery.leftJoin(user,eq(user.userId,email.userId));
  }
  const [summary,list] = await Promise.all([
    summaryQuery.where(and(...conditions)).get(),
    rowsQuery.where(and(...conditions,sql`${address} is not null and ${address}<>''`))
      .groupBy(address).orderBy(desc(count()),asc(address)).limit(size).offset((page-1)*size).all(),
  ]);
  return { ...summary, list, page, size };
}
