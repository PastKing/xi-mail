import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {getTableConfig} from 'drizzle-orm/sqlite-core';
import setting from '../../src/entity/setting';
import settingService from '../../src/service/setting-service';
import KvConst from '../../src/const/kv-const';

let db,c,values;
function adapter(db){
 const prepare=(text,args=[])=>({bind:(...p)=>prepare(text,p),
  run:async()=>({meta:db.prepare(text).run(...args)}),
  raw:async()=>{const q=db.prepare(text);q.setReturnArrays(true);return q.all(...args);},
  all:async()=>({results:db.prepare(text).all(...args)})});
 return {prepare};
}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');
 const schema=getTableConfig(setting);
 db.exec(`CREATE TABLE setting(${schema.columns.map(col=>`${col.name} ${col.getSQLType()}`).join(',')})`);
 db.prepare('INSERT INTO setting(title) VALUES (?)').run('TempMail');
 values=new Map([[KvConst.SETTING,JSON.stringify({title:'TempMail',aiCode:0,aiModel:'test',queenTokens:{},resendTokens:{},sendProviders:{},emailPrefixFilter:'',subWorkerDomains:[],managedDomains:'[]'})]]);
 const cached=new Map();
 c={env:{db:adapter(db),domain:['example.test'],kv:{
  get:async(key,opts)=>opts?.type==='json'?JSON.parse(values.get(key)||'null'):values.get(key)||null,
  put:async(key,value)=>values.set(key,value),
 }},get:key=>cached.get(key),set:(key,value)=>cached.set(key,value)};
 vi.spyOn(settingService,'refresh').mockResolvedValue();
});
afterEach(()=>{vi.restoreAllMocks();db.close();});
describe('Website subtitle',()=>{
 it('defaults to an empty subtitle for existing sites',async()=>{
  expect((await settingService.query(c)).subtitle).toBe('');
 });
 it('saves a trimmed subtitle independently of the short title',async()=>{
  await settingService.set(c,{subtitle:'  Secure temporary email  '});
  expect(values.get(KvConst.WEBSITE_SUBTITLE)).toBe('Secure temporary email');
  expect(db.prepare('SELECT title FROM setting').get().title).toBe('TempMail');
 });
 it('preserves the subtitle when changing another setting and supports explicitly clearing it',async()=>{
  values.set(KvConst.WEBSITE_SUBTITLE,'Temporary email');
  await settingService.set(c,{title:'New name'});
  expect(values.get(KvConst.WEBSITE_SUBTITLE)).toBe('Temporary email');
  await settingService.set(c,{subtitle:''});
  expect(values.get(KvConst.WEBSITE_SUBTITLE)).toBe('');
 });
 it.each([null,42,{},'x'.repeat(101),'line\nbreak'])('rejects invalid subtitle values before persisting: %j',async subtitle=>{
  await expect(settingService.set(c,{subtitle})).rejects.toMatchObject({code:400});
  expect(values.has(KvConst.WEBSITE_SUBTITLE)).toBe(false);
 });
 it('exposes the short title and subtitle as separate public fields',async()=>{
  values.set(KvConst.WEBSITE_SUBTITLE,'Temporary email');
  const row=await settingService.query(c);
  vi.spyOn(settingService,'get').mockResolvedValue(row);
  const publicConfig=await settingService.websiteConfig(c);
  expect(publicConfig.title).toBe('TempMail');expect(publicConfig.subtitle).toBe('Temporary email');
 });
});
