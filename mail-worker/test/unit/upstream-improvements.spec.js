import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import email from '../../src/entity/email';
import account from '../../src/entity/account';
import user from '../../src/entity/user';
import regKey from '../../src/entity/reg-key';
import { star } from '../../src/entity/star';
import { att } from '../../src/entity/att';
import emailService from '../../src/service/email-service';
import attService from '../../src/service/att-service';
import subWorkerService from '../../src/service/sub-worker-service';
import starSchema from '../../src/service/star-schema-service';
import permService from '../../src/service/perm-service';
import settingService from '../../src/service/setting-service';
import analysis from '../../src/dao/analysis-dao';
import { createRegistration } from '../../src/service/registration-service';

let db,c,seen;
function adapter(db) {
 const prepare=(text,args=[])=>{
  const run=()=>{seen.push({text,args});return {meta:db.prepare(text).run(...args)};};
  const all=()=>{seen.push({text,args});return {results:db.prepare(text).all(...args)};};
  return {bind:(...values)=>prepare(text,values),run:async()=>run(),all:async()=>all(),
   first:async()=>{seen.push({text,args});return db.prepare(text).get(...args)||null;},
   raw:async()=>{seen.push({text,args});const q=db.prepare(text);q.setReturnArrays(true);return q.all(...args);},
   execute:()=>/\bRETURNING\b|^SELECT/i.test(text)?all():run()};
 };
 return {prepare,batch:async statements=>{db.exec('BEGIN');try{const out=statements.map(s=>s.execute());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
function insert(table,row) {
 const keys=Object.keys(row);db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`).run(...Object.values(row));
}
function message(id,extra={}) {
 insert('email',{email_id:id,user_id:1,account_id:10,type:0,status:0,is_del:0,unread:0,name:'Sender',send_email:'sender@example.test',
  to_email:'own@example.test',subject:'Login request',text:'Your account sign-in',content:'<p>Full mail</p>',code:'123456',create_time:'2026-11-01 10:00:00',...extra});
}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');seen=[];
 for(const entity of [email,account,user,regKey,star,att]) {
  const cfg=getTableConfig(entity);
  db.exec(`CREATE TABLE ${cfg.name}(${cfg.columns.map(col=>`${col.name} ${col.getSQLType()}${col.primary?' PRIMARY KEY':''}${['is_del','status','sort','all_receive','reg_key_id'].includes(col.name)?' DEFAULT 0':col.name==='create_time'?' DEFAULT CURRENT_TIMESTAMP':''}`).join(',')})`);
 }
 insert('user',{user_id:1,email:'own@example.test',type:2,is_del:0,status:0});
 insert('user',{user_id:2,email:'foreign@example.test',type:2,is_del:0,status:0});
 insert('account',{account_id:10,user_id:1,email:'own@example.test',all_receive:0,is_del:0});
 insert('account',{account_id:20,user_id:2,email:'foreign@example.test',all_receive:0,is_del:0});
 c={env:{db:adapter(db),admin:'admin@example.test'},get:()=>({userId:1,email:'own@example.test'})};
 vi.spyOn(subWorkerService,'syncAll').mockResolvedValue();
 vi.spyOn(starSchema,'ensure').mockResolvedValue();
 vi.spyOn(attService,'selectByEmailIds').mockResolvedValue([]);
 vi.spyOn(permService,'userPermKeys').mockResolvedValue([]);
});
afterEach(()=>{vi.restoreAllMocks();db.close();});
const list=(params={})=>emailService.list(c,{accountId:10,allReceive:0,type:0,size:20,timeSort:0,...params},1);

describe('Indexed mailbox queries and safe list previews',()=>{
 it('searches subject, sender, recipient and body without crossing mailbox ownership',async()=>{
  message(1);message(2,{subject:'100% verified',send_email:'other@example.test',text:'A plain body'});
  message(3,{user_id:2,account_id:20,subject:'Foreign login'});
  expect((await list({keyword:'login',searchType:'subject',allReceive:1})).list.map(m=>m.emailId)).toEqual([1]);
  expect((await list({keyword:'sender@',searchType:'sender'})).total).toBe(1);
  expect((await list({keyword:'own@',searchType:'recipient'})).total).toBe(2);
  expect((await list({keyword:'plain body',searchType:'content'})).list[0].emailId).toBe(2);
  expect((await list({keyword:'100%',searchType:'subject'})).list.map(m=>m.emailId)).toEqual([2]);
  expect((await list({keyword:"' OR 1=1 --"})).total).toBe(0);
 });
 it('combines read state, codes and UTC ranges consistently across count, pagination and polling',async()=>{
  message(1);message(2,{unread:1});message(3,{code:''});message(4,{create_time:'2026-11-04 00:00:00'});message(5,{status:6});
  const filters={unread:'0',hasCode:'1',startTime:'2026-11-01 00:00:00',endTime:'2026-11-02 00:00:00'};
  const first=await list(filters);expect(first.total).toBe(1);expect(first.list.map(m=>m.emailId)).toEqual([1]);
  expect((await list({...filters,emailId:2})).list.map(m=>m.emailId)).toEqual([1]);
  expect((await emailService.latest(c,{...filters,accountId:10,allReceive:0,emailId:0},1)).map(m=>m.emailId)).toEqual([1]);
 });
 it('keeps foreign and deleted mailboxes out of list/count/latest',async()=>{
  message(1);insert('account',{account_id:11,user_id:1,email:'deleted@example.test',is_del:1});message(2,{account_id:11});
  expect((await list({allReceive:1})).total).toBe(1);
  expect((await list({accountId:20})).list).toEqual([]);
  expect((await emailService.latest(c,{accountId:20,emailId:0},1))).toEqual([]);
 });
 it('omits HTML from lists while retaining a readable 300-character preview and lazy full body',async()=>{
  const body='<style>private CSS</style><script>private JS</script><p>Readable HTML '+ 'x'.repeat(100000)+'</p>';
  message(1,{text:'',content:body});
  const result=await list();expect(result.list[0].content).toBeNull();
  expect(result.list[0].text).toHaveLength(300);expect(result.list[0].text).toContain('Readable HTML');
  expect(result.list[0].text).not.toContain('private CSS');expect(JSON.stringify(result).length).toBeLessThan(2000);
  expect((await emailService.content(c,{emailId:1},1)).content).toBe(body);
 });
 it('skips repeated total and watermark queries on scrolling while retaining legacy response defaults',async()=>{
  for(let n=1;n<=6;n++)message(n);
  await list();seen=[];
  const next=await list({emailId:5,size:2,skipStats:'1'});
  expect(next.list.map(m=>m.emailId)).toEqual([4,3]);expect(next.total).toBeNull();expect(next.latestEmail).toBeNull();
  expect(seen.some(q=>/count\(\*\)/i.test(q.text))).toBe(false);
  const legacy=await list({emailId:5,size:2});expect(legacy.total).toBe(6);expect(legacy.latestEmail.emailId).toBe(6);
 });
 it.each([{searchType:'invalid'},{unread:'yes'},{hasCode:'3'},{keyword:'x'.repeat(513)},{startTime:'2026-02-30 00:00:00'}])('rejects invalid filters %j',async filters=>{
  await expect(list(filters)).rejects.toMatchObject({code:400});
 });
});

describe('Atomic registration and invitation consumption',()=>{
 const data=(email='new@example.test',displayId='registration-one')=>({email,displayId,type:2,regKeyId:1,password:'local-hash',salt:'local-salt',name:'New'});
 const invitation={code:'limited-code',todayStart:'2026-11-05 16:00:00'};
 function invite(extra={}) {insert('reg_key',{rege_key_id:1,code:'limited-code',count:1,role_id:2,expire_time:null,...extra});}
 it('allows exactly one concurrent registration for a one-use code, without orphan accounts or negative counts',async()=>{
  invite();const results=await Promise.all(Array.from({length:15},(_,n)=>createRegistration(c,data(`new${n}@example.test`,'reg-'+n),invitation)));
  expect(results.filter(Boolean)).toHaveLength(1);expect(db.prepare('SELECT count FROM reg_key').get().count).toBe(0);
  expect(db.prepare('SELECT COUNT(*) AS n FROM user WHERE reg_key_id=1').get().n).toBe(1);
  expect(db.prepare('SELECT COUNT(*) AS n FROM account').get().n).toBe(3);
 });
 it('rolls back the user and invitation if primary mailbox creation fails',async()=>{
  invite();db.exec("CREATE TRIGGER reject_primary BEFORE INSERT ON account BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  await expect(createRegistration(c,data(),invitation)).rejects.toThrow('test failure');
  expect(db.prepare('SELECT COUNT(*) AS n FROM user').get().n).toBe(2);
  expect(db.prepare('SELECT count FROM reg_key').get().count).toBe(1);
 });
 it.each([{count:0},{role_id:3},{expire_time:'2026-11-04 00:00:00'}])('rechecks invitation state inside the write transaction: %j',async changes=>{
  invite(changes);expect(await createRegistration(c,data(),invitation)).toBeNull();
  expect(db.prepare('SELECT COUNT(*) AS n FROM user').get().n).toBe(2);
 });
 it('handles same-day expiry and case-insensitive code matching, and prevents duplicate mailbox claims',async()=>{
  invite({code:'Limited-Code',expire_time:'2026-11-05 23:59:00',count:2});
  expect(await createRegistration(c,data(),invitation)).toBeTruthy();
  expect(await createRegistration(c,data('NEW@example.test','other-id'),invitation)).toBeNull();
  expect(db.prepare('SELECT count FROM reg_key').get().count).toBe(1);
 });
 it('creates ordinary registrations atomically without consuming an invitation',async()=>{
  expect(await createRegistration(c,{...data(),regKeyId:0})).toBeTruthy();
  expect(db.prepare('SELECT COUNT(*) AS n FROM account').get().n).toBe(3);
 });
});

describe('Indexed daily analytics',()=>{
 it.each([8,-5,5.5])('preserves daily counts and uses a timestamp range for offset %s',async hours=>{
  for(let n=1;n<=100;n++) {
   const time=db.prepare("SELECT datetime('now',?) AS t").get('-'+n+' days').t;message(n,{create_time:time,type:n%2});
  }
  const actual=await analysis.receiveDayCount(c,hours);
  const mod=`${hours>=0?'+':''}${hours} hours`;
  const reference=db.prepare(`SELECT DATE(create_time,?) AS date,COUNT(*) AS total FROM email WHERE DATE(create_time,?)
   BETWEEN DATE('now','-15 days',?) AND DATE('now','-1 day',?) AND type=0 GROUP BY date ORDER BY date`).all(mod,mod,mod,mod);
  expect(actual.map(row=>({...row}))).toEqual(reference.map(row=>({...row})));
  const query=seen.find(q=>q.text.startsWith('SELECT DATE(create_time'));
  const plan=db.prepare('EXPLAIN QUERY PLAN '+query.text).all(...query.args);
  expect(plan.some(row=>row.detail.includes('idx_email_type_time')&&row.detail.includes('create_time>'))).toBe(true);
  expect(query.text).not.toMatch(/WHERE\s+DATE\(create_time/i);
 });
});

describe('Hidden public domain lists',()=>{
 it('hides suffixes in the anonymous configuration even when a caller supplies a fabricated Authorization header',async()=>{
  vi.spyOn(settingService,'get').mockResolvedValue({loginDomain:1,domainList:['@private.example'],loginTemplate:'minimal'});
  c.req={header:()=> 'fabricated-session'};
  expect((await settingService.websiteConfig(c)).domainList).toEqual([]);
 });
});
