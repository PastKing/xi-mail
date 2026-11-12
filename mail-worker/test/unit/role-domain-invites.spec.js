import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {getTableConfig} from 'drizzle-orm/sqlite-core';
import role from '../../src/entity/role';
import perm from '../../src/entity/perm';
import rolePerm from '../../src/entity/role-perm';
import regKey from '../../src/entity/reg-key';
import roleService from '../../src/service/role-service';
import regKeyService,{normalizeInviteInput} from '../../src/service/reg-key-service';
import userService from '../../src/service/user-service';
import {orderPermissionGroups} from '../../src/service/perm-service';
import {readRoleDomainPolicy,writeRoleDomainPolicy} from '../../src/service/role-domain-policy';

let db,c;
beforeEach(()=>{
 db=new DatabaseSync(':memory:');
 for(const table of [role,perm,rolePerm,regKey]){
  const config=getTableConfig(table);
  db.exec(`CREATE TABLE ${config.name} (${config.columns.map(col=>`${col.name} ${col.getSQLType()}${col.primary?' PRIMARY KEY':''}`).join(',')})`);
 }
 const prepare=(sql,args=[])=>({
  bind:(...values)=>prepare(sql,values),
  run:async()=>({meta:db.prepare(sql).run(...args)}),
  all:async()=>({results:db.prepare(sql).all(...args)}),
  raw:async()=>{const s=db.prepare(sql);s.setReturnArrays(true);return s.all(...args)},
  first:async()=>db.prepare(sql).get(...args)||null,
 });
 c={env:{db:{prepare},admin:'admin@example.com'}};
});
afterEach(()=>{db.close();vi.restoreAllMocks();vi.useRealTimers()});
const form=()=>({name:'Basic',key:'basic',banEmail:[],availDomain:['blocked.example'],availDomainMode:'blacklist',permIds:[],sort:0,level:1});

describe('Role domain policy across existing enforcement paths',()=>{
 it('preserves old whitelist and empty unrestricted behavior',()=>{
  expect(roleService.hasAvailDomainPerm('example.com,other.example','a@EXAMPLE.com')).toBe(true);
  expect(roleService.hasAvailDomainPerm('example.com','a@new.example')).toBe(false);
  expect(roleService.hasAvailDomainPerm('','a@new.example')).toBe(true);
 });
 it('excludes only exact blacklist domains and automatically permits newly enabled domains',()=>{
  const raw=writeRoleDomainPolicy(['@Blocked.example','blocked.example'],'blacklist');
  expect(readRoleDomainPolicy(raw).domains).toEqual(['blocked.example']);
  expect(roleService.hasAvailDomainPerm(raw,'a@BLOCKED.example')).toBe(false);
  expect(roleService.hasAvailDomainPerm(raw,'a@newly-added.example')).toBe(true);
  expect(roleService.hasAvailDomainPerm(raw,'a@sub.blocked.example')).toBe(true);
  expect(roleService.hasAvailDomainPerm(raw,'a@notblocked.example')).toBe(true);
 });
 it('retains blacklist mode even with an empty selection',()=>{
  const raw=writeRoleDomainPolicy([],'blacklist');
  expect(readRoleDomainPolicy(raw)).toMatchObject({mode:'blacklist',domains:[],valid:true});
  expect(roleService.hasAvailDomainPerm(raw,'a@example.com')).toBe(true);
 });
 it.each(['{broken','{"version":1,"mode":"unknown","domains":[]}','{"version":1,"mode":"blacklist","domains":["bad"]}'])('fails closed for malformed policy %s',raw=>{
  expect(roleService.hasAvailDomainPerm(raw,'a@example.com')).toBe(false);
 });
 it.each([['bad mode',[], 'bad'],['non-list','example.com','blacklist'],['invalid host',['https://example.com'],'blacklist']])('rejects invalid admin input: %s',(_,domains,mode)=>{
  expect(()=>writeRoleDomainPolicy(domains,mode)).toThrow();
 });
 it('round trips create/edit/list with the real schema and retains old roles',async()=>{
  await roleService.add(c,form(),1);
  const stored=db.prepare('SELECT * FROM role').get();
  expect(roleService.hasAvailDomainPerm(stored.avail_domain,'a@blocked.example')).toBe(false);
  const [listed]=await roleService.roleList(c);
  expect(listed).toMatchObject({availDomainMode:'blacklist',availDomain:['blocked.example']});
  await roleService.setRole(c,{...form(),roleId:stored.role_id,availDomainMode:'whitelist',availDomain:['allowed.example']});
  expect((await roleService.selectById(c,stored.role_id)).availDomain).toBe('allowed.example');
  expect((await roleService.roleList(c))[0].availDomainMode).toBe('whitelist');
 });
 it('orders transfer and sharing immediately after mail without changing IDs/children',()=>{
  const groups=['邮件','邮箱侧栏','个人设置','邮箱分享','邮箱转移'].map((name,i)=>({name,permId:i,children:[{permId:100+i}]}));
  const ordered=orderPermissionGroups(groups);
  expect(ordered.map(x=>x.name)).toEqual(['邮件','邮箱转移','邮箱分享','邮箱侧栏','个人设置']);
  expect(ordered[1]).toBe(groups[4]);
 });
});

describe('Invitation creation input and Beijing expiry day',()=>{
 beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-12T16:30:00Z'))});
 it('keeps a date valid throughout its Beijing calendar day',()=>{
  expect(normalizeInviteInput({code:' viewUser ',count:1,expireTime:'2026-11-13'}))
   .toEqual({code:'viewUser',count:1,expireTime:'2026-11-12 16:00:00'});
  expect(normalizeInviteInput({code:'test',count:99999,expireTime:'2026-11-13T10:00:00+08:00'}).expireTime).toBe('2026-11-12 16:00:00');
 });
 it.each([0,-1,1.5,'1',100000,null])('rejects invalid count %s',count=>{
  expect(()=>normalizeInviteInput({code:'code',count,expireTime:'2026-12-01'})).toThrow();
 });
 it.each(['2026-11-12','2027-02-29','2026-13-01','2027-02-29T00:00:00Z','not-a-date',null])('rejects invalid or expired day %s',expireTime=>{
  expect(()=>normalizeInviteInput({code:'code',count:1,expireTime})).toThrow();
 });
 it.each(['','bad code','bad\ncode','x'.repeat(129)])('rejects malformed code',code=>{
  expect(()=>normalizeInviteInput({code,count:1,expireTime:'2026-12-01'})).toThrow();
 });
 it('persists normalized values and does not duplicate codes',async()=>{
  vi.spyOn(userService,'selectById').mockResolvedValue({email:'admin@example.com'});
  await roleService.add(c,form(),1);
  const roleId=db.prepare('SELECT role_id FROM role').get().role_id;
  await regKeyService.add(c,{code:' one ',roleId,count:3,expireTime:'2026-11-13'},1);
  expect(db.prepare('SELECT code,count,expire_time FROM reg_key').get()).toEqual({code:'one',count:3,expire_time:'2026-11-12 16:00:00'});
  await expect(regKeyService.add(c,{code:'one',roleId,count:3,expireTime:'2026-11-13'},1)).rejects.toThrow();
 });
 it('creates only one code when creation requests race',async()=>{
  vi.spyOn(userService,'selectById').mockResolvedValue({email:'admin@example.com'});
  await roleService.add(c,form(),1);
  const roleId=db.prepare('SELECT role_id FROM role').get().role_id;
  const results=await Promise.allSettled(Array.from({length:10},()=>regKeyService.add(c,{code:'same',roleId,count:1,expireTime:'2026-11-13'},1)));
  expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect(db.prepare('SELECT COUNT(*) AS total FROM reg_key').get().total).toBe(1);
 });
 it('only permits invitations strictly below the creator role level',async()=>{
  await roleService.add(c,form(),1);
  await roleService.add(c,{...form(),name:'Creator',key:'creator',level:10},1);
  await roleService.add(c,{...form(),name:'Higher',key:'higher',level:100},1);
  vi.spyOn(userService,'selectById').mockResolvedValue({email:'user@example.com',type:2});
  const invite=roleId=>regKeyService.add(c,{code:'level-'+roleId,roleId,count:1,expireTime:'2026-11-13'},1);
  await expect(invite(1)).resolves.toBeUndefined();
  await expect(invite(2)).rejects.toMatchObject({code:403});
  await expect(invite(3)).rejects.toMatchObject({code:403});
  expect(db.prepare('SELECT COUNT(*) AS total FROM reg_key').get().total).toBe(1);
 });
 it.each(['missing-user','missing-role','invalid-creator-level','invalid-target-level'])('fails closed when invitation authority is unavailable: %s',async mode=>{
  await roleService.add(c,form(),1);
  await roleService.add(c,{...form(),name:'Creator',key:'creator',level:10},1);
  vi.spyOn(userService,'selectById').mockResolvedValue(mode==='missing-user'?undefined:{email:'user@example.com',type:mode==='missing-role'?999:2});
  if(mode==='invalid-creator-level')db.exec("UPDATE role SET level='invalid' WHERE role_id=2");
  if(mode==='invalid-target-level')db.exec('UPDATE role SET level=NULL WHERE role_id=1');
  await expect(regKeyService.add(c,{code:'authority',roleId:1,count:1,expireTime:'2026-11-13'},1)).rejects.toMatchObject({code:403});
  expect(db.prepare('SELECT COUNT(*) AS total FROM reg_key').get().total).toBe(0);
 });
});
