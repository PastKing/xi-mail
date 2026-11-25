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

describe('Telegram verification code setting', () => {
 it('defaults to enabled and persists explicit changes independently of other settings', async () => {
  expect(await settingService.telegramCodeEnabled(c)).toBe(true);

  await settingService.set(c, {tgMsgCode: false});
  await settingService.set(c, {title: 'New name'});
  expect(await settingService.telegramCodeEnabled(c)).toBe(false);
  expect(await settingService.websiteConfig(c)).not.toHaveProperty('tgMsgCode');

  await settingService.set(c, {tgMsgCode: true});
  expect(await settingService.telegramCodeEnabled(c)).toBe(true);
 });

 it('rejects a string instead of treating it as a boolean', async () => {
  await expect(settingService.set(c, {tgMsgCode: 'false'})).rejects.toMatchObject({code: 400});
  expect(values.has(KvConst.TELEGRAM_VERIFICATION_CODE)).toBe(false);
 });
});
afterEach(()=>{vi.restoreAllMocks();db.close();});

describe('Password login verification setting', () => {
 it('is opt-in, requires both Turnstile keys and preserves the public site key for registration', async () => {
  expect(await settingService.loginVerificationPolicy(c)).toEqual({loginVerify:1,loginVerifyCount:3});
  await expect(settingService.set(c, {loginVerification: true})).rejects.toMatchObject({code: 400});
  const raw = JSON.parse(values.get(KvConst.SETTING));
  values.set(KvConst.SETTING, JSON.stringify({...raw, siteKey: 'public-site-key', secretKey: ['fixture', 'secret'].join('-')}));
  c.set('setting', undefined);
  await settingService.set(c, {loginVerification: true});
  await settingService.set(c, {title: 'New name'});
  const config = await settingService.websiteConfig(c);
  expect(config).toMatchObject({loginVerification: true, siteKey: 'public-site-key'});
  expect(config).not.toHaveProperty('secretKey');
  await expect(settingService.set(c, {secretKey: ''})).rejects.toMatchObject({code: 400});
  await settingService.set(c, {loginVerification: false});
  expect(await settingService.websiteConfig(c)).toMatchObject({loginVerification: false, siteKey: 'public-site-key'});
 });

 it('reads legacy enabled values and saves the mode and threshold together', async () => {
  values.set(KvConst.LOGIN_VERIFICATION, '1');
  expect(await settingService.loginVerificationPolicy(c)).toEqual({loginVerify:0,loginVerifyCount:3});
  const raw = JSON.parse(values.get(KvConst.SETTING));
  values.set(KvConst.SETTING, JSON.stringify({...raw, siteKey:'public-site-key', secretKey:['fixture','secret'].join('-')}));
  await settingService.set(c, {loginVerify:2});
  await settingService.set(c, {loginVerifyCount:5});
  expect(await settingService.loginVerificationPolicy(c)).toEqual({loginVerify:2,loginVerifyCount:5});
  await expect(settingService.set(c, {loginVerifyCount:8})).rejects.toMatchObject({code:400});
  const publicConfig = await settingService.websiteConfig(c);
  expect(publicConfig).toMatchObject({loginVerify:2, loginVerification:false});
  expect(publicConfig).not.toHaveProperty('loginVerifyCount');
 });

 it('rejects non-boolean updates', async () => {
  await expect(settingService.set(c, {loginVerification: 'true'})).rejects.toMatchObject({code: 400});
  expect(values.has(KvConst.LOGIN_VERIFICATION)).toBe(false);
 });
});

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
