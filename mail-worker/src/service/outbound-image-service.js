import {isObjectKey} from '../utils/object-key-policy';
const TTL=365*86400;
async function digest(token) {
  return 'outbound-image:v1:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
}
export default {
  async issue(c,key,userId) {
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
    await c.env.kv.put(await digest(token),JSON.stringify({key,userId,expiresAt:Date.now()+TTL*1000}),{expirationTtl:TTL});
    return new URL(c.req.url).origin+'/api/attachment/sent/'+token;
  },
  async read(c,token) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
    const scope=await c.env.kv.get(await digest(token),{type:'json'});
    if (!scope || scope.expiresAt<=Date.now() || !isObjectKey(scope.key) || !scope.key.startsWith('attachments/')) return null;
    const row=await c.env.db.prepare('SELECT 1 FROM attachments a JOIN email e ON e.email_id=a.email_id AND a.user_id=e.user_id AND a.account_id=e.account_id WHERE a.key=? AND e.user_id=? AND e.type=1 AND e.is_del=0 LIMIT 1').bind(scope.key,scope.userId).first();
    return row?scope.key:null;
  },
};
