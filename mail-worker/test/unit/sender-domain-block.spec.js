import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import settingService from '../../src/service/setting-service';
import {blockSenderDomain,normalizeBlockedDomain} from '../../src/service/sender-domain-block-service';
let db,c,race;
beforeEach(()=>{
 db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE setting(sender_domain_blacklist TEXT,sender_filter_mode INTEGER,email_keyword_blacklist TEXT,sender_domain_whitelist TEXT);INSERT INTO setting VALUES('old.example',0,'keepword','safe.example')");
 const prepare=(text,args=[])=>({bind:(...values)=>prepare(text,values),first:async()=>{
  if(race&&text.startsWith('UPDATE')){race=false;db.exec('UPDATE setting SET sender_filter_mode=1');}
  return db.prepare(text).get(...args)||null;
 }});
 c={env:{db:{prepare}}};race=false;
 vi.spyOn(settingService,'refresh').mockResolvedValue(undefined);
});
afterEach(()=>{vi.restoreAllMocks();db.close()});
describe('Add a sender domain to the shared block list',()=>{
 it('normalizes domains without accepting URLs or email addresses',()=>{
  expect(normalizeBlockedDomain(' @New.Example. ')).toBe('new.example');
 });
 it.each([null,'','a@example.com','https://example.com','example.com/path','example.com?x=1','example.com:443','*.example.com','a'.repeat(254)+'.example'])('rejects invalid domain %j',async domain=>{
  await expect(blockSenderDomain(c,domain)).rejects.toMatchObject({code:400});
  expect(db.prepare('SELECT sender_domain_blacklist FROM setting').get().sender_domain_blacklist).toBe('old.example');
 });
 it('persists the new domain while leaving other rules and mode intact',async()=>{
  expect(await blockSenderDomain(c,'NEW.EXAMPLE')).toMatchObject({domain:'new.example',alreadyBlocked:false,senderDomainBlacklist:['old.example','new.example'],senderFilterMode:0});
  expect(db.prepare('SELECT * FROM setting').get()).toEqual({sender_domain_blacklist:'old.example,new.example',sender_filter_mode:0,email_keyword_blacklist:'keepword',sender_domain_whitelist:'safe.example'});
  expect(settingService.refresh).toHaveBeenCalledOnce();
 });
 it('is idempotent for existing domains and covered subdomains',async()=>{
  expect(await blockSenderDomain(c,'OLD.EXAMPLE')).toMatchObject({alreadyBlocked:true});
  expect(await blockSenderDomain(c,'news.old.example')).toMatchObject({alreadyBlocked:true});
  expect(db.prepare('SELECT sender_domain_blacklist FROM setting').get().sender_domain_blacklist).toBe('old.example');
 });
 it('preserves concurrent additions without replacing the previous list',async()=>{
  const results=await Promise.all(Array.from({length:6},(_,i)=>blockSenderDomain(c,`sender${i}.example`)));
  expect(results).toHaveLength(6);
  const list=db.prepare('SELECT sender_domain_blacklist FROM setting').get().sender_domain_blacklist.split(',');
  expect(new Set(list)).toEqual(new Set(['old.example',...Array.from({length:6},(_,i)=>`sender${i}.example`)]));
 });
 it('does not change the site policy when whitelist mode is enabled',async()=>{
  db.exec('UPDATE setting SET sender_filter_mode=1');
  await expect(blockSenderDomain(c,'new.example')).rejects.toMatchObject({code:409});
  expect(db.prepare('SELECT sender_domain_blacklist FROM setting').get().sender_domain_blacklist).toBe('old.example');
  expect(settingService.refresh).not.toHaveBeenCalled();
 });
 it('rechecks a concurrent mode change before persisting',async()=>{
  race=true;
  await expect(blockSenderDomain(c,'new.example')).rejects.toMatchObject({code:409});
  expect(db.prepare('SELECT sender_domain_blacklist FROM setting').get().sender_domain_blacklist).toBe('old.example');
 });
 it('enforces the list bound without discarding existing rules',async()=>{
  const original=Array.from({length:5000},(_,i)=>`sender${i}.example`).join(',');
  db.prepare('UPDATE setting SET sender_domain_blacklist=?').run(original);
  await expect(blockSenderDomain(c,'extra.example')).rejects.toMatchObject({code:400});
  expect(db.prepare('SELECT sender_domain_blacklist FROM setting').get().sender_domain_blacklist).toBe(original);
 });
});
