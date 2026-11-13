import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {getTableColumns} from 'drizzle-orm';
import settingEntity from '../../src/entity/setting';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand,DeleteObjectsCommand} from '@aws-sdk/client-s3';
import s3 from '../../src/service/s3-service';
import storage from '../../src/service/r2-service';
import settings from '../../src/service/setting-service';
import locations from '../../src/service/object-location-service';
import {normalizeStoragePrefix,validateS3Config,ensureStorageColumns,objectProxyBase} from '../../src/service/storage-config-service';
let db,c,config,r2,remote,kv,fail;
const bytes=new TextEncoder().encode('test object');
beforeEach(()=>{
 db=new DatabaseSync(':memory:');db.exec('CREATE TABLE setting (bucket TEXT);INSERT INTO setting VALUES(\'\')');
 const statement=(sql,args=[])=>({bind:(...values)=>statement(sql,values),run:async()=>({meta:db.prepare(sql).run(...args)}),all:async()=>({results:db.prepare(sql).all(...args)}),first:async()=>db.prepare(sql).get(...args)||null,raw:async()=>{const statement=db.prepare(sql);statement.setReturnArrays(true);return statement.all(...args)}});
 r2=new Map();remote=new Map();kv=new Map();fail=null;
 c={env:{db:{prepare:statement},r2:{put:vi.fn(async(key,content,options)=>r2.set(key,{content,metadata:options.httpMetadata})),get:vi.fn(async key=>{const item=r2.get(key);return item?{arrayBuffer:async()=>item.content,httpMetadata:item.metadata}:null}),delete:vi.fn(async keys=>{for(const key of Array.isArray(keys)?keys:[keys])r2.delete(key)})},kv:{put:async(key,value,options)=>kv.set(key,{value,metadata:options?.metadata}),getWithMetadata:async key=>kv.get(key)||{value:null},delete:async key=>kv.delete(key)}}};
 config={bucket:'test-bucket',endpoint:'https://s3.example.test',region:'us-west-4',s3AccessKey:'local-key',s3SecretKey:'local-secret',forcePathStyle:0,s3Prefix:'xi-mail/',attachmentStorage:'R2'};
 vi.spyOn(settings,'query').mockImplementation(async()=>({...config}));
 vi.spyOn(S3Client.prototype,'send').mockImplementation(async command=>{
  if(fail){const error=fail(command);if(error)throw error;}
  const data=command.input;
  if(command instanceof PutObjectCommand){remote.set(data.Key,{content:data.Body,metadata:{contentType:data.ContentType,contentDisposition:data.ContentDisposition,cacheControl:data.CacheControl}});return{};}
  if(command instanceof GetObjectCommand){const item=remote.get(data.Key);if(!item)throw Object.assign(new Error('missing'),{name:'NoSuchKey',$metadata:{httpStatusCode:404}});return{Body:{transformToByteArray:async()=>new Uint8Array(item.content)},ContentType:item.metadata.contentType,ContentDisposition:item.metadata.contentDisposition,CacheControl:item.metadata.cacheControl};}
  if(command instanceof DeleteObjectCommand){remote.delete(data.Key);return{};}
  if(command instanceof DeleteObjectsCommand){for(const item of data.Delete.Objects)remote.delete(item.Key);return{};}
  throw new Error('Unexpected command');
 });
});
afterEach(()=>{vi.restoreAllMocks();db.close()});
describe('S3 configuration and connection probe',()=>{
 it.each([['',''],['/',''],[' /xi-mail//assets/ ','xi-mail/assets/']])('normalizes %j', (input,expected)=>expect(normalizeStoragePrefix(input)).toBe(expected));
 it.each(['../mail','mail/../files','mail\\files','mail\nfiles'])('rejects ambiguous prefix %j',input=>expect(()=>normalizeStoragePrefix(input)).toThrow());
 it.each(['s3.example.test','https://user:pass@s3.example.test','https://127.0.0.1','http://169.254.169.254','ftp://example.test','https://example.test?secret=x'])('rejects invalid endpoint %s',endpoint=>expect(()=>validateS3Config({...config,endpoint})).toThrow());
 it('migrates setting options once, preserving the original storage selection',async()=>{
  await Promise.all([ensureStorageColumns(c),ensureStorageColumns(c)]);
  expect(db.prepare('SELECT * FROM setting').get()).toEqual({bucket:'',s3_prefix:'',attachment_storage:'auto'});
 });
 it('tests draft path-style credentials without saving configuration or leaving test data',async()=>{
  expect(await s3.testConnection(c,{...config,s3Prefix:'/draft-folder/'})).toEqual({write:true,read:true,delete:true});
  const calls=S3Client.prototype.send.mock.calls.map(([command])=>command);
  expect(calls.map(command=>command.constructor.name)).toEqual(['PutObjectCommand','GetObjectCommand','DeleteObjectCommand']);
  expect(calls[0].input.Key).toMatch(/^draft-folder\/\.xi-mail-test\//);
  expect(remote.size).toBe(0);expect(db.prepare('SELECT * FROM setting').get()).toEqual({bucket:''});
 });
 it('deletes the exact probe version in versioned buckets',async()=>{
  const send=S3Client.prototype.send.getMockImplementation();
  S3Client.prototype.send.mockImplementationOnce(async command=>{await send(command);return{VersionId:'probe-version'}});
  await s3.testConnection(c,config);
  for(const [command] of S3Client.prototype.send.mock.calls.slice(1))expect(command.input.VersionId).toBe('probe-version');
  expect(remote.size).toBe(0);
 });
 it.each([PutObjectCommand,DeleteObjectCommand])('reports missing write/delete permissions for %s',async Command=>{
  fail=command=>command instanceof Command?Object.assign(new Error('provider-private-details'),{name:'AccessDenied'}):null;
  await expect(s3.testConnection(c,config)).rejects.toMatchObject({code:502});
 });
 it('uses existing secrets for empty draft fields and supports either addressing style',async()=>{
  expect(await s3.testConnection(c,{...config,s3AccessKey:'',s3SecretKey:'',forcePathStyle:1})).toEqual({write:true,read:true,delete:true});
  const virtual=await s3.client(c,{...config,forcePathStyle:1});expect(virtual.config.forcePathStyle).toBe(false);virtual.destroy();
  const path=await s3.client(c,{...config,forcePathStyle:0});expect(path.config.forcePathStyle).toBe(true);path.destroy();
 });
 it('cleans up after a failed read and does not expose provider secret-bearing errors',async()=>{
  fail=command=>command instanceof GetObjectCommand?Object.assign(new Error('secret=do-not-expose'),{name:'AccessDenied'}):null;
  const error=await s3.testConnection(c,config).catch(error=>error);
  expect(error.code).toBe(502);expect(error.message).not.toContain('do-not-expose');expect(remote.size).toBe(0);
 });
 it('rejects malformed input before contacting the provider',async()=>{
  await expect(s3.testConnection(c,{bucket:{},endpoint:config.endpoint})).rejects.toMatchObject({code:400});
  expect(S3Client.prototype.send).not.toHaveBeenCalled();
 });
 it('routes object links through the application when S3 is configured',()=>{
  expect(objectProxyBase({req:{url:'https://mail.example/api/setting/query'}},config)).toBe('https://mail.example');
  expect(objectProxyBase({req:{url:'https://mail.example/api'}},{})).toBe('');
 });
 it('saves prefix and credentials atomically without activating S3',async()=>{
  db.exec('DROP TABLE setting');
  db.exec('CREATE TABLE setting('+Object.values(getTableColumns(settingEntity)).map(column=>`"${column.name}" ${column.dataType==='number'?'INTEGER':'TEXT'}`).join(',')+');INSERT INTO setting DEFAULT VALUES');
  vi.spyOn(settings,'refresh').mockResolvedValue(undefined);
  await settings.set(c,{bucket:config.bucket,endpoint:config.endpoint,region:config.region,s3AccessKey:config.s3AccessKey,s3SecretKey:config.s3SecretKey,forcePathStyle:0,s3Prefix:'/xi-mail/',attachmentStorage:'R2'});
  expect(db.prepare('SELECT attachment_storage,s3_prefix,bucket FROM setting').get()).toEqual({attachment_storage:'R2',s3_prefix:'xi-mail/',bucket:config.bucket});
 });
 it('refuses activation of an incomplete S3 connection before updating settings',async()=>{
  config.s3AccessKey='';
  await expect(settings.set(c,{attachmentStorage:'S3'})).rejects.toMatchObject({code:400});
  expect(db.prepare('SELECT attachment_storage FROM setting').get().attachment_storage).toBe('auto');
 });
});
describe('Attachments across R2 and S3 selections',()=>{
 it('keeps untracked historical R2 attachments readable after selecting S3',async()=>{
  r2.set('attachments/old.txt',{content:bytes,metadata:{contentType:'text/plain'}});config.attachmentStorage='S3';
  expect((await storage.getObj(c,'attachments/old.txt')).buff).toEqual(bytes);
  expect(S3Client.prototype.send).not.toHaveBeenCalled();
 });
 it('writes new attachments only to the chosen backend and retains old prefixes',async()=>{
  await storage.putObj(c,'attachments/one.txt',bytes,{contentType:'text/plain'});expect(r2.has('attachments/one.txt')).toBe(true);expect(remote.size).toBe(0);
  config.attachmentStorage='S3';await storage.putObj(c,'attachments/two.txt',bytes,{contentType:'text/plain'});
  expect(remote.has('xi-mail/attachments/two.txt')).toBe(true);expect(r2.has('attachments/two.txt')).toBe(false);
  config.s3Prefix='new-prefix/';config.attachmentStorage='R2';
  expect((await storage.getObj(c,'attachments/two.txt')).buff).toEqual(bytes);
  expect((await locations.list(c,'attachments/two.txt'))[0]).toEqual({backend:'S3',physicalKey:'xi-mail/attachments/two.txt'});
  await storage.putObj(c,'attachments/three.txt',bytes,{});expect(r2.has('attachments/three.txt')).toBe(true);
 });
 it('reads legacy S3 root objects while a new prefix is configured',async()=>{
  remote.set('attachments/root.txt',{content:bytes,metadata:{}});config.attachmentStorage='S3';
  expect((await storage.getObj(c,'attachments/root.txt')).buff).toEqual(bytes);
 });
 it('prefers the latest selected destination for identical content uploaded again',async()=>{
  await storage.putObj(c,'attachments/reused.txt',bytes,{});
  config.attachmentStorage='S3';await storage.putObj(c,'attachments/reused.txt',bytes,{});
  config.attachmentStorage='R2';await storage.putObj(c,'attachments/reused.txt',bytes,{});
  expect((await locations.list(c,'attachments/reused.txt'))[0].backend).toBe('R2');
  S3Client.prototype.send.mockClear();expect((await storage.getObj(c,'attachments/reused.txt')).buff).toEqual(bytes);
  expect(S3Client.prototype.send).not.toHaveBeenCalled();
 });
 it('retains multiple locations for shared content and removes all copies on cleanup',async()=>{
  await storage.putObj(c,'attachments/shared.txt',bytes,{});
  config.attachmentStorage='S3';await storage.putObj(c,'attachments/shared.txt',bytes,{});
  config.s3Prefix='other/';await storage.putObj(c,'attachments/shared.txt',bytes,{});
  expect(await locations.list(c,'attachments/shared.txt')).toHaveLength(3);
  config.attachmentStorage='R2';await storage.delete(c,['attachments/shared.txt']);
  expect(remote.size).toBe(0);expect(r2.size).toBe(0);expect(await locations.list(c,'attachments/shared.txt')).toHaveLength(0);
 });
 it('does not turn authentication or network errors into missing files',async()=>{
  config.attachmentStorage='S3';await storage.putObj(c,'attachments/fail.txt',bytes,{});
  fail=command=>command instanceof GetObjectCommand?Object.assign(new Error('denied'),{name:'AccessDenied'}):null;
  await expect(storage.getObj(c,'attachments/fail.txt')).rejects.toMatchObject({name:'AccessDenied'});
 });
 it('returns not found only after available legacy locations are checked',async()=>expect(await storage.getObj(c,'attachments/absent')).toBe(null));
 it('preserves legacy automatic selection and refuses an unavailable explicit backend',async()=>{
  config.attachmentStorage='auto';expect(await storage.storageType(c)).toBe('S3');
  config.s3AccessKey='';expect(await storage.storageType(c)).toBe('R2');
  config.attachmentStorage='S3';await expect(storage.storageType(c)).rejects.toThrow();
 });
 it('batches location lookup and removal when cleaning hundreds of attachments',async()=>{
  await locations.ensure(c);const keys=Array.from({length:501},(_,i)=>'attachments/bulk'+i);
  for(const key of keys)db.prepare('INSERT INTO object_storage_locations VALUES(?,?,?)').run(key,'R2',key);
  const prepare=vi.spyOn(c.env.db,'prepare');await storage.delete(c,keys);
  expect(prepare.mock.calls.filter(([sql])=>sql.includes('object_storage_locations')).length).toBeLessThan(20);
  expect(db.prepare('SELECT COUNT(*) AS count FROM object_storage_locations').get().count).toBe(0);
 });
});
