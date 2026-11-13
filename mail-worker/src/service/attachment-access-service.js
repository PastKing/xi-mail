import { parseHTML } from 'linkedom';
import sessionService from './session-service';
import permService from './perm-service';
import { isObjectKey } from '../utils/object-key-policy';
import { isSecureSecret } from '../utils/secret-policy';

const TTL = 3600;
const encoder = new TextEncoder();
const encode = value => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function signingKey(c) {
  if (!isSecureSecret(c.env.jwt_secret)) throw new Error('A strong signing secret is required');
  return crypto.subtle.importKey('raw', encoder.encode('xi-mail:private-attachment:v1:' + c.env.jwt_secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}
export async function signAttachment(c, data) {
  const payload = encode(encoder.encode(JSON.stringify({...data, exp:Math.floor(Date.now()/1000)+TTL})));
  return payload + '.' + encode(await crypto.subtle.sign('HMAC', await signingKey(c), encoder.encode(payload)));
}
export async function verifyAttachment(c, ticket) {
  if (typeof ticket !== 'string' || ticket.length > 4096 || !/^[\w-]+\.[\w-]+$/.test(ticket)) return null;
  try {
    const [payload, signature] = ticket.split('.');
    if (!await crypto.subtle.verify('HMAC', await signingKey(c), decode(signature), encoder.encode(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (!Number.isFinite(data.exp) || data.exp<=Date.now()/1000 || data.exp>Date.now()/1000+TTL+60
        || !Number.isSafeInteger(data.userId) || data.userId<=0 || !Number.isSafeInteger(data.emailId)
        || !Number.isSafeInteger(data.ownerId) || typeof data.sid!=='string' || !data.sid
        || !isObjectKey(data.key) || !data.key.startsWith('attachments/')) return null;
    const session = await sessionService.get(c, data.userId);
    if (!session?.tokens?.includes(data.sid) || sessionService.isExpired(session,data.sid)) return null;
    return data;
  } catch { return null; }
}

// This extracts only a file identifier, never authentication. The caller MUST
// subsequently enforce current ownership, even for an expired draft reference.
export function attachmentKeyFromUrl(src,origin) {
  try {
    const url=new URL(src,origin);
    if (url.origin!==new URL(origin).origin || url.pathname!=='/api/attachment/view') return null;
    const data=JSON.parse(new TextDecoder().decode(decode((url.searchParams.get('access')||'').split('.')[0])));
    return isObjectKey(data.key)&&data.key.startsWith('attachments/')?data.key:null;
  } catch {return null;}
}

const attachmentAccess = {
  async canReadAll(c,userId) {
    const requester = await c.env.db.prepare('SELECT email,status,is_del FROM user WHERE user_id=?').bind(userId).first();
    if (!requester || requester.status!==0 || requester.is_del!==0) return null;
    if (requester.email.toLowerCase()===c.env.admin.toLowerCase()) return true;
    const permissions=await permService.userPermKeys(c,userId);
    return permissions.includes('all-email:query') || permissions.includes('*');
  },
  async find(c,key,userId,scope) {
    if (!isObjectKey(key) || !key.startsWith('attachments/')) return null;
    const all=await this.canReadAll(c,userId);
    if (all===null) return null;
    const clauses=['a.key=?','a.user_id=e.user_id','a.account_id=e.account_id'];
    const params=[key];
    if (!all) { clauses.push('e.user_id=?','e.is_del=0','mailbox.user_id=e.user_id','mailbox.is_del=0'); params.push(userId); }
    if (scope) { clauses.push('e.email_id=?','e.user_id=?'); params.push(scope.emailId,scope.ownerId); }
    return c.env.db.prepare(`SELECT a.key,e.email_id AS emailId,e.user_id AS ownerId FROM attachments a JOIN email e ON e.email_id=a.email_id LEFT JOIN account mailbox ON mailbox.account_id=e.account_id WHERE ${clauses.join(' AND ')} LIMIT 1`).bind(...params).first();
  },
  async prepare(c,message,userId) {
    const rows=(await c.env.db.prepare('SELECT a.key FROM attachments a JOIN email e ON e.email_id=a.email_id AND a.user_id=e.user_id AND a.account_id=e.account_id WHERE e.email_id=? AND e.user_id=?').bind(message.emailId,message.userId).all()).results;
    const urls={};
    for (const {key} of rows) {
      if (!isObjectKey(key) || !key.startsWith('attachments/') || urls[key]) continue;
      const ticket=await signAttachment(c,{key,userId,ownerId:message.userId,emailId:message.emailId,sid:c.get('token')});
      urls[key]=new URL(c.req.url).origin+'/api/attachment/view?access='+ticket;
    }
    return {attachmentUrls:urls, attachmentUrlsExpireAt:Date.now()+TTL*1000};
  },
};

// Only rewrite known attachment references. Other external images remain external.
export function rewriteAttachmentImages(html, urls) {
  if (!html || !Object.keys(urls).length) return html;
  const {document}=parseHTML(html);
  for (const element of document.querySelectorAll('img')) {
    const src=element.getAttribute('src') || '';
    const key=src.startsWith('{{domain}}')?src.slice(10):(()=>{try {const path=new URL(src,'https://local.invalid').pathname;return decodeURIComponent(path).replace(/^\/(?:api\/oss\/)?/,'');}catch{return '';}})();
    if (Object.hasOwn(urls,key)) element.setAttribute('src',urls[key]);
  }
  return document.toString();
}
export default attachmentAccess;
