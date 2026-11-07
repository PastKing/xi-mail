import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import permService from './perm-service';
import rate from './security-rate-limit-service';
import r2Service from './r2-service';
import { attachmentDisposition } from '../utils/object-policy';

const ready = new WeakMap();
const active = `s.revoked_at IS NULL AND s.expires_at > ? AND a.is_del=0
 AND a.user_id=s.user_id AND u.is_del=0 AND u.status=0`;
const joins = `FROM mail_share s JOIN account a ON a.account_id=s.account_id
 JOIN user u ON u.user_id=s.user_id`;
const hash = async token => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
 new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
const invalid = () => new BizError(t('shareUnavailable'), 404);
const id = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const mailScope = `e.email_id>s.cutoff_email_id AND e.is_del=0 AND e.type=0`;
const mailJoins = `${joins} JOIN email e ON e.account_id=s.account_id AND e.user_id=s.user_id`;

const mailShare = {
 async ensure(c) {
  const db = c.env.db;
  if (!ready.has(db)) {
   const statements = [
    `CREATE TABLE IF NOT EXISTS mail_share (share_id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL,
     account_id INTEGER NOT NULL, user_id INTEGER NOT NULL, created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL, cutoff_email_id INTEGER NOT NULL, revoked_at INTEGER)`,
    'CREATE INDEX IF NOT EXISTS idx_mail_share_owner ON mail_share(user_id,account_id,expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_mail_share_expiry ON mail_share(expires_at)',
    `CREATE TRIGGER IF NOT EXISTS mail_share_account_changed AFTER UPDATE OF user_id,is_del ON account
     WHEN NEW.user_id<>OLD.user_id OR NEW.is_del<>0 BEGIN
     UPDATE mail_share SET revoked_at=unixepoch()*1000 WHERE account_id=OLD.account_id AND revoked_at IS NULL; END`,
    `CREATE TRIGGER IF NOT EXISTS mail_share_user_disabled AFTER UPDATE OF status,is_del ON user
     WHEN NEW.status<>0 OR NEW.is_del<>0 BEGIN
     UPDATE mail_share SET revoked_at=unixepoch()*1000 WHERE user_id=OLD.user_id AND revoked_at IS NULL; END`,
   ];
   ready.set(db, db.batch(statements.map(sql => db.prepare(sql))).catch(e => { ready.delete(db); throw e; }));
  }
  await ready.get(db);
 },
 async owned(c, accountId, userId) {
  if (!id(accountId)) throw invalid();
  const row = await c.env.db.prepare(`SELECT a.email FROM account a JOIN user u ON u.user_id=a.user_id
   WHERE a.account_id=? AND a.user_id=? AND a.is_del=0 AND u.is_del=0 AND u.status=0`)
   .bind(Number(accountId), userId).first();
  if (!row) throw invalid();
  return row;
 },
 async create(c, { accountId, hours }, userId) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw new BizError(t('shareHoursInvalid'), 400);
  await this.owned(c, accountId, userId);
  await rate.consume(c, 'mail-share-create', String(userId), 20, 3600);
  await this.ensure(c);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const shareId = crypto.randomUUID(), now = Date.now(), expiresAt = now + hours * 3600000;
  const row = await c.env.db.prepare(`INSERT INTO mail_share
   (share_id,token_hash,account_id,user_id,created_at,expires_at,cutoff_email_id)
   SELECT ?,?,a.account_id,a.user_id,?,?,COALESCE((SELECT MAX(email_id) FROM email),0)
   FROM account a JOIN user u ON u.user_id=a.user_id
   WHERE a.account_id=? AND a.user_id=? AND a.is_del=0 AND u.is_del=0 AND u.status=0
   AND (SELECT COUNT(*) FROM mail_share WHERE user_id=? AND expires_at>? AND revoked_at IS NULL)<10
   RETURNING share_id`).bind(shareId, await hash(token), now, expiresAt, Number(accountId), userId, userId, now).first();
  if (!row) throw new BizError(t('shareLimit'), 400);
  // Plain capability is returned once and never stored. The fragment keeps it out of HTTP URLs/referrers.
  return { shareId, token, createdAt: now, expiresAt };
 },
 async list(c, accountId, userId) {
  await this.owned(c, accountId, userId);
  await this.ensure(c);
  return (await c.env.db.prepare(`SELECT share_id AS shareId,created_at AS createdAt,expires_at AS expiresAt
   FROM mail_share WHERE account_id=? AND user_id=? AND revoked_at IS NULL AND expires_at>?
   ORDER BY created_at DESC LIMIT 10`).bind(Number(accountId), userId, Date.now()).all()).results;
 },
 async cleanup(c) {
  await this.ensure(c);
  await c.env.db.prepare('DELETE FROM mail_share WHERE expires_at<=?').bind(Date.now() - 86400000).run();
 },
 async revoke(c, shareId, userId) {
  await this.ensure(c);
  if (typeof shareId !== 'string' || shareId.length > 64) throw invalid();
  await c.env.db.prepare('UPDATE mail_share SET revoked_at=? WHERE share_id=? AND user_id=?')
   .bind(Date.now(), shareId, userId).run();
 },
 async authorize(c, token) {
  await rate.consume(c, 'mail-share-read-ip', c.req.header('CF-Connecting-IP') || 'unknown', 120, 60);
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
  await this.ensure(c);
  const digest = await hash(token);
  const link = await c.env.db.prepare(`SELECT s.share_id,a.email,u.email AS ownerEmail,s.user_id,s.expires_at
   ${joins} WHERE s.token_hash=? AND ${active}`).bind(digest, Date.now()).first();
  if (!link) throw invalid();
  if (link.ownerEmail !== c.env.admin) {
   const perms = await permService.userPermKeys(c, link.user_id);
   if (!perms.includes('account:share') && !perms.includes('*')) throw invalid();
  }
  return { link, digest };
 },
 async read(c, token, before) {
  const { link, digest } = await this.authorize(c, token);
  if (before != null && !id(before)) throw invalid();
  // Recheck capability/ownership in every query, including when revocation races with this request.
  const messages = (await c.env.db.prepare(`SELECT e.email_id AS emailId,e.name,e.send_email AS sendEmail,
   e.subject,e.code,e.create_time AS createTime,substr(COALESCE(e.text,''),1,180) AS preview
   ${mailJoins} WHERE s.token_hash=? AND ${active} AND ${mailScope}
   AND e.email_id<? ORDER BY e.email_id DESC LIMIT 21`)
   .bind(digest, Date.now(), before == null ? Number.MAX_SAFE_INTEGER : Number(before)).all()).results;
  const hasMore = messages.length > 20;
  if (hasMore) messages.pop();
  return { email: link.email, expiresAt: link.expires_at, messages, hasMore,
   nextCursor: hasMore ? messages[messages.length - 1].emailId : null };
 },
 async content(c, { token, emailId }) {
  const { digest } = await this.authorize(c, token);
  if (!id(emailId)) throw invalid();
  const message = await c.env.db.prepare(`SELECT e.email_id AS emailId,e.content,e.text
   ${mailJoins} WHERE s.token_hash=? AND ${active} AND ${mailScope} AND e.email_id=?`)
   .bind(digest, Date.now(), Number(emailId)).first();
  if (!message) throw invalid();
  const attachments = (await c.env.db.prepare(`SELECT att.att_id AS attId,att.filename,att.size,att.mime_type AS mimeType,
   att.content_id AS contentId,att.type,att.key
   ${mailJoins} JOIN attachments att ON att.email_id=e.email_id AND att.account_id=e.account_id AND att.user_id=e.user_id
   WHERE s.token_hash=? AND ${active} AND ${mailScope} AND e.email_id=? ORDER BY att.att_id`)
   .bind(digest, Date.now(), Number(emailId)).all()).results;
  for (const att of attachments) {
   // Do not publish permanent storage URLs for embedded images through the temporary share.
   message.content = (message.content || '').split('{{domain}}' + att.key).join('cid:share-' + att.attId);
  }
  return { ...message, attachments: attachments.map(({ key, contentId, type, ...att }) => ({ ...att, inline: !!contentId || type === 1 })) };
 },
 async attachment(c, { token, emailId, attId }) {
  const { digest } = await this.authorize(c, token);
  if (!id(emailId) || !id(attId)) throw invalid();
  const att = await c.env.db.prepare(`SELECT att.key,att.filename ${mailJoins}
   JOIN attachments att ON att.email_id=e.email_id AND att.account_id=e.account_id AND att.user_id=e.user_id
   WHERE s.token_hash=? AND ${active} AND ${mailScope} AND e.email_id=? AND att.att_id=?`)
   .bind(digest, Date.now(), Number(emailId), Number(attId)).first();
  if (!att) throw invalid();
  const response = await r2Service.toObjResp(c, att.key);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Content-Disposition', attachmentDisposition(att.filename));
  return response;
 },
};
export default mailShare;
