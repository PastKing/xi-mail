import BizError from '../error/biz-error';

const ready = new WeakMap();
export async function ensureStorageColumns(c) {
  const db=c.env.db;
  if(!ready.has(db)) ready.set(db,(async()=>{
    const {results}=await db.prepare('PRAGMA table_info(setting)').all();
    const names=new Set(results.map(row=>row.name));
    for(const [name,value] of [['s3_prefix',"''"],['attachment_storage',"'auto'"]]) {
      if(names.has(name))continue;
      try{await db.prepare(`ALTER TABLE setting ADD COLUMN ${name} TEXT NOT NULL DEFAULT ${value}`).run();}
      catch(error){const check=await db.prepare('PRAGMA table_info(setting)').all();if(!check.results.some(row=>row.name===name))throw error;}
    }
  })().catch(error=>{ready.delete(db);throw error}));
  await ready.get(db);
}

export function normalizeStoragePrefix(value='') {
  if(typeof value!=='string'||value.length>512||/[\x00-\x1f\x7f\\]/.test(value))throw new BizError('路径前缀格式不正确',400);
  const parts=value.trim().split('/').filter(Boolean);
  if(parts.some(part=>part==='.'||part==='..'))throw new BizError('路径前缀不能包含 . 或 ..',400);
  return parts.length?parts.join('/')+'/':'';
}
export function hasS3Config(setting) {return !!(setting.bucket&&setting.endpoint&&setting.s3AccessKey&&setting.s3SecretKey)}
export function validateS3Config(setting) {
  if(!hasS3Config(setting))throw new BizError('请填写存储桶、服务地址和访问密钥',400);
  for(const key of ['bucket','endpoint','s3AccessKey','s3SecretKey'])if(typeof setting[key]!=='string'||setting[key].length>4096||/[\x00-\x1f\x7f]/.test(setting[key]))throw new BizError('S3 配置格式不正确',400);
  if(typeof setting.bucket!=='string'||setting.bucket.length>255||/[\s/\\]/.test(setting.bucket))throw new BizError('存储桶名称格式不正确',400);
  try{
    const url=new URL(setting.endpoint);
    if(!['https:','http:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.search||url.hash)throw new Error();
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host.endsWith('.localhost')||/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)||host.includes(':'))throw new Error();
  }catch{throw new BizError('请填写可公开访问的完整 S3 地址，包含 https://（自建服务可用 http://）',400)}
  if(![0,1].includes(setting.forcePathStyle))throw new BizError('请选择有效的 S3 寻址方式',400);
  if(typeof(setting.region||'')!=='string'||(setting.region&&!/^[a-zA-Z0-9-]{1,64}$/.test(setting.region)))throw new BizError('S3 区域代码格式不正确',400);
  normalizeStoragePrefix(setting.s3Prefix||'');
}
export function storageKey(setting,key) {return normalizeStoragePrefix(setting.s3Prefix||'')+key;}
export function objectProxyBase(c,setting) {return c.req?.url?new URL(c.req.url).origin:'';}
