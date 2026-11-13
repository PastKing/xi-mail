import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import worker from '../../src/index';
import access,{signAttachment,verifyAttachment,rewriteAttachmentImages} from '../../src/service/attachment-access-service';
import session from '../../src/service/session-service';
import jwt from '../../src/utils/jwt-utils';
import perm from '../../src/service/perm-service';
import r2 from '../../src/service/r2-service';
import outbound from '../../src/service/outbound-image-service';
import mailLink from '../../src/service/mail-link-service';
import attService from '../../src/service/att-service';
let db,env,values,permissions;
const sid='private-test-session',secret='attachment-access-test-secret-with-strong-length';
function adapter(sql) {
 const prepare=(query,args=[])=>({bind:(...args)=>prepare(query,args),first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)})});
 return {prepare};
}
const ctx=(id=1)=>({env,req:{url:'https://local.test/api/email/content'},get:k=>k==='token'?sid:k==='user'?{userId:id}:undefined});
beforeEach(async()=>{
 db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE user(user_id INTEGER,email TEXT,status INTEGER,is_del INTEGER);CREATE TABLE account(account_id INTEGER,user_id INTEGER,is_del INTEGER);CREATE TABLE email(email_id INTEGER,user_id INTEGER,account_id INTEGER,type INTEGER,is_del INTEGER);CREATE TABLE attachments(att_id INTEGER,key TEXT,email_id INTEGER,user_id INTEGER,account_id INTEGER);
 INSERT INTO account VALUES(100,1,0),(200,2,0);
 INSERT INTO user VALUES(1,'one@example.test',0,0),(2,'two@example.test',0,0),(3,'admin@example.test',0,0);
 INSERT INTO email VALUES(10,1,100,0,0),(20,2,200,0,0),(30,1,100,1,0);
 INSERT INTO attachments VALUES(1,'attachments/one.png',10,1,100),(2,'attachments/two.png',20,2,200),(3,'attachments/shared.png',10,1,100),(4,'attachments/shared.png',20,2,200),(5,'attachments/bad-owner.png',20,1,200),(6,'attachments/sent.png',30,1,100);`);
 values=new Map();permissions=[];
 env={admin:'admin@example.test',jwt_secret:secret,db:adapter(db),kv:{get:async(k,o)=>values.has(k)?o?.type==='json'?JSON.parse(values.get(k)):values.get(k):null,put:async(k,v)=>values.set(k,v)}};
 vi.spyOn(perm,'userPermKeys').mockImplementation(async()=>permissions);
 vi.spyOn(r2,'toObjResp').mockImplementation(async()=>new Response('image',{headers:{'Content-Type':'image/png','Cache-Control':'public,max-age=86400'}}));
 for(const id of [1,2,3]) await session.save(ctx(id),id,{tokens:[sid],sessions:{[sid]:{activeTime:new Date().toISOString(),expireTime:new Date(Date.now()+86400000).toISOString()}},user:{userId:id,email:id===3?env.admin:'test@example.test'},refreshTime:new Date().toISOString()});
});
afterEach(()=>{vi.restoreAllMocks();db.close()});
async function request(path,id) {
 const headers=id?{Authorization:await jwt.generateToken(ctx(id),{userId:id,token:sid})}:{};
 return worker.fetch(new Request('https://local.test'+path,{headers}),env,{});
}
describe('Private attachment ownership and session boundaries',()=>{
 it.each(['/attachments/one.png','/api/oss/attachments/one.png','/api/oss/setting:'])('rejects anonymous %s before storage',async path=>{
  expect((await request(path)).status).toBe(401);expect(r2.toObjResp).not.toHaveBeenCalled();
 });
 it('allows the owner, denies another user and inconsistent attachment ownership',async()=>{
  expect((await request('/api/oss/attachments/one.png',1)).status).toBe(200);
  expect((await request('/attachments/two.png',1)).status).toBe(404);
  expect((await request('/api/oss/attachments/bad-owner.png',1)).status).toBe(404);
  expect((await request('/attachments/shared.png',1)).status).toBe(200);
  expect((await request('/attachments/shared.png',2)).status).toBe(200);
 });
 it('requires all-mail permission for cross-user reads and checks it on every read',async()=>{
  expect(await access.find(ctx(),'attachments/two.png',1)).toBe(null);
  permissions=['all-email:query'];expect(await access.find(ctx(),'attachments/two.png',1)).toMatchObject({emailId:20});
  permissions=['all-email:delete'];expect(await access.find(ctx(),'attachments/two.png',1)).toBe(null);
  expect(await access.find(ctx(),'attachments/two.png',3)).toMatchObject({emailId:20});
 });
 it('issues only current-message references and rewrites known inline images',async()=>{
  const result=await access.prepare(ctx(),{emailId:10,userId:1},1);
  expect(Object.keys(result.attachmentUrls).sort()).toEqual(['attachments/one.png','attachments/shared.png']);
  const html=rewriteAttachmentImages('<img src="{{domain}}attachments/one.png"><img src="https://external.test/a.png">',result.attachmentUrls);
  expect(html).toContain('/api/attachment/view?access=');expect(html).toContain('https://external.test/a.png');expect(html).not.toContain('{{domain}}attachments/one.png');
 });
 it('validates signed key/message/session scope and uses no-store',async()=>{
  const result=await access.prepare(ctx(),{emailId:10,userId:1},1);
  const url=new URL(result.attachmentUrls['attachments/one.png']);
  const response=await request(url.pathname+url.search);
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await request(url.pathname+url.search+'x')).status).toBe(404);
  const ticket=url.searchParams.get('access');
  expect(await jwt.verifyToken(ctx(),ticket)).toBe(null);
  await session.revokeToken(ctx(),1,sid);
  expect((await request(url.pathname+url.search)).status).toBe(404);
 });
 it('invalidates links after transfer, role removal, account ban or signing-key change',async()=>{
  const prepared=await access.prepare(ctx(),{emailId:20,userId:2},1);
  const url=new URL(prepared.attachmentUrls['attachments/two.png']);
  permissions=['all-email:query'];expect((await request(url.pathname+url.search)).status).toBe(200);
  permissions=[];expect((await request(url.pathname+url.search)).status).toBe(404);
  permissions=['all-email:query'];db.exec('UPDATE user SET status=1 WHERE user_id=1');
  expect((await request(url.pathname+url.search)).status).toBe(404);
  db.exec('UPDATE user SET status=0 WHERE user_id=1; UPDATE email SET user_id=1 WHERE email_id=20; UPDATE attachments SET user_id=1 WHERE email_id=20');
  expect((await request(url.pathname+url.search)).status).toBe(404);
  env.jwt_secret='another-strong-test-signing-key-for-attachment';
  expect(await verifyAttachment(ctx(),url.searchParams.get('access'))).toBe(null);
 });
 it('refuses expired links and cannot turn a valid signature into KV access',async()=>{
  const ticket=await signAttachment(ctx(),{key:'setting:',userId:1,ownerId:1,emailId:10,sid});
  expect(await verifyAttachment(ctx(),ticket)).toBe(null);
  const prepared=await access.prepare(ctx(),{emailId:10,userId:1},1),url=new URL(prepared.attachmentUrls['attachments/one.png']);
  vi.spyOn(Date,'now').mockReturnValue(Date.now()+3601000);
  expect(await verifyAttachment(ctx(),url.searchParams.get('access'))).toBe(null);
 });
 it('revokes owner access to deleted mailboxes and messages',async()=>{
  db.exec('UPDATE email SET is_del=1 WHERE email_id=10');
  expect((await request('/attachments/one.png',1)).status).toBe(404);
  db.exec('UPDATE email SET is_del=0 WHERE email_id=10; UPDATE account SET is_del=1 WHERE account_id=100');
  expect((await request('/attachments/one.png',1)).status).toBe(404);
 });
 it('keeps Telegram attachments limited to the mail capability scope',async()=>{
  vi.spyOn(mailLink,'read').mockResolvedValue({emailId:10,userId:1,accountId:100});
  expect((await request('/api/telegram/attachment/valid?key=attachments/one.png')).status).toBe(200);
  expect((await request('/api/telegram/attachment/valid?key=attachments/two.png')).status).toBe(404);
  expect((await request('/api/telegram/attachment/valid?key=setting:')).status).toBe(404);
  vi.mocked(mailLink.read).mockResolvedValue(null);
  expect((await request('/api/telegram/attachment/valid?key=attachments/one.png')).status).toBe(404);
 });
 it('does not exfiltrate another user image by referencing it when sending mail',async()=>{
  const get=vi.spyOn(r2,'getObj');
  const c=ctx();
  const setting=(await import('../../src/service/setting-service')).default;
  vi.spyOn(setting,'query').mockResolvedValue({r2Domain:'https://objects.example.test'});
  await expect(attService.toImageUrlHtml(c,'<img src="https://objects.example.test/attachments/two.png">')).rejects.toMatchObject({code:404});
  expect(get).not.toHaveBeenCalled();
 });
 it('publishes external-send images through a separate single-file capability',async()=>{
  const url=new URL(await outbound.issue(ctx(),'attachments/sent.png',1));
  expect((await request(url.pathname)).status).toBe(200);
  const other=new URL(await outbound.issue(ctx(),'attachments/two.png',1));
  expect((await request(other.pathname)).status).toBe(404);
  db.exec('UPDATE email SET is_del=1 WHERE email_id=30');
  expect((await request(url.pathname)).status).toBe(404);
 });
});
