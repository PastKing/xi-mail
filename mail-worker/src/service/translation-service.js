import zh from '../../../mail-view/src/i18n/zh';
import {normalizeLanguageCode} from '../const/translation-languages';
import catalogService from './language-catalog-service';
import provider from './translation-provider';
import BizError from '../error/biz-error';
import rate from './security-rate-limit-service';
import emailService from './email-service';
import {mailTranslationDocument} from './mail-translation-document';

const CONFIG = 'translation:config';
const PACK = 'translation:pack:';
const generating = new Map();
const publicCopyJobs = new WeakMap();
const sourceEntries = Object.entries(zh).filter(([,text]) => typeof text === 'string');
const sources = Object.fromEntries(sourceEntries);
let revision;
async function version() {
  if (!revision) revision = crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(sources)))
    .then(bytes => [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2,'0')).join(''));
  return revision;
}
function protect(text) {
  const tokens=[];
  return {text:text.replace(/\{[^{}]*\}/g,value => {tokens.push(value);return `XIMAILVAR${tokens.length-1}X`;}),tokens};
}
function restore(text,tokens) {
  for (let i=0;i<tokens.length;i++) {
    const marker=`XIMAILVAR${i}X`;
    if (text.split(marker).length !== 2) throw new BizError('译文未能保留界面变量，请重新生成。',503);
    text=text.replace(marker,tokens[i]);
  }
  return text;
}

async function registrationCopy(c,language) {
  // This is the one explicitly public, administrator-authored registration
  // hint. Never scan other setting values, user information or mail contents.
  const settings=await c.env.kv.get('setting:',{type:'json'});
  const hint=typeof settings?.regKeyHint==='string'?settings.regKeyHint:'';
  const original={regKeyHintSource:hint,regKeyHint:hint};
  if(!hint.trim()||language.id==='zh'||hint.length>12000)return original;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hint));
  const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
  const key=`translation:registration-copy:${language.id}:${hash}`;
  const cached=await c.env.kv.get(key,{type:'json'});
  if(cached?.regKeyHintSource===hint&&typeof cached.regKeyHint==='string')return cached;
  let jobs=publicCopyJobs.get(c.env.kv);if(!jobs){jobs=new Map();publicCopyJobs.set(c.env.kv,jobs);}
  if(jobs.has(key))return jobs.get(key);
  const task=(async()=>{
    try{
      await rate.consume(c,'translation-public-hint',language.id+':'+hash,8,300);
      const [translated]=await provider.translate([hint],language.serviceId);
      const copy={regKeyHintSource:hint,regKeyHint:translated};
      await c.env.kv.put(key,JSON.stringify(copy),{expirationTtl:60*60*24*30});
      return copy;
    }catch{return original;}
  })().finally(()=>{jobs.delete(key);if(!jobs.size)publicCopyJobs.delete(c.env.kv);});
  jobs.set(key,task);return task;
}
const translationService = {
  async config(c,catalog) {
    const stored=await c.env.kv.get(CONFIG,{type:'json'});
    catalog=catalog||await catalogService.list(c);
    const known=new Set(catalog.map(item=>item.id));
    const languages=['zh',...new Set((Array.isArray(stored?.languages)?stored.languages:[]).map(normalizeLanguageCode).filter(id=>id!=='zh'&&known.has(id)))];
    return {languages,mailTranslation:stored?.mailTranslation!==false};
  },
  async publicConfig(c) {
    const catalog=await catalogService.list(c),config=await this.config(c,catalog);
    return {...config,languages:config.languages.map(id=>catalog.find(item=>item.id===id))};
  },
  async management(c) {
    const catalog=await catalogService.list(c),config=await this.config(c,catalog), current=await version();
    const packs=await Promise.all(config.languages.filter(id=>id!=='zh').map(async id=> {
      const pack=await c.env.kv.get(PACK+id,{type:'json'});
      return [id,{updatedAt:pack?.updatedAt||null,current:pack?.version===current}];
    }));
    return {...config,catalog,packs:Object.fromEntries(packs)};
  },
  async save(c,params) {
    if (!Array.isArray(params.languages) || params.languages.length>256 || typeof params.mailTranslation!=='boolean')
      throw new BizError('语言配置不正确。',400);
    const catalog=await catalogService.list(c),known=new Set(catalog.map(item=>item.id));
    const requested=params.languages.map(normalizeLanguageCode);
    if(requested.some(id=>!known.has(id)))throw new BizError('请先添加有效的语言代码。',400);
    const languages=['zh',...new Set(requested.filter(id=>id!=='zh'))];
    for (const id of languages) {
      if (id!=='zh' && !(await c.env.kv.get(PACK+id,{type:'json'}))?.messages) throw new BizError('请先生成该语言的界面译文。',400);
    }
    await c.env.kv.put(CONFIG,JSON.stringify({languages,mailTranslation:params.mailTranslation}));
    return this.management(c);
  },
  async pack(c,id) {
    const language=await catalogService.resolve(c,id);id=language.id;
    const config=await this.config(c);
    if (!config.languages.includes(id)) throw new BizError('站点未启用这种语言。',404);
    if (id==='zh') return {language:id,messages:sources,version:await version()};
    const pack=await c.env.kv.get(PACK+id,{type:'json'});
    if (!pack?.messages) throw new BizError('该语言的界面译文尚未准备好。',404);
    return {language:id,messages:pack.messages,version:pack.version,publicCopy:await registrationCopy(c,language)};
  },
  async generate(c,id) {
    const language=await catalogService.resolve(c,id);id=language.id;
    if (id==='zh') return {language:id,updatedAt:null};
    await rate.consume(c,'translation-generate',`${c.get('user')?.userId||''}:${id}`,8,300);
    const key=c.env.kv; let pending=generating.get(key);
    if (!pending) {pending=new Map();generating.set(key,pending);}
    if (pending.has(id)) return pending.get(id);
    const task=(async()=> {
      const previous=await c.env.kv.get(PACK+id,{type:'json'});
      const entries=sourceEntries.filter(([key,text])=>/[\u3400-\u9fff]/.test(text)&&previous?.sources?.[key]!==text);
      const protectedValues=entries.map(([,text])=>protect(text));
      const translated=await provider.translate(protectedValues.map(value=>value.text),language.serviceId,'zh-Hans');
      const messages={...sources};
      for (const [key,text] of sourceEntries) if (previous?.sources?.[key]===text && typeof previous.messages?.[key]==='string') messages[key]=previous.messages[key];
      entries.forEach(([key],index)=>{messages[key]=restore(translated[index],protectedValues[index].tokens);});
      const pack={version:await version(),sources,messages,updatedAt:new Date().toISOString()};
      await c.env.kv.put(PACK+id,JSON.stringify(pack));
      await registrationCopy(c,language);
      return {language:id,updatedAt:pack.updatedAt};
    })().finally(()=>{pending.delete(id);if(!pending.size)generating.delete(key);});
    pending.set(id,task);return task;
  },
  async mail(c,params,userId) {
    const catalog=await catalogService.list(c),config=await this.config(c,catalog),language=await catalogService.resolve(c,params.target);
    if (!config.mailTranslation) throw new BizError('站点未启用邮件翻译。',403);
    if (!config.languages.includes(language.id)) throw new BizError('站点未启用这种语言。',403);
    const emailId=Number(params.emailId);
    if (!Number.isSafeInteger(emailId)||emailId<=0) throw new BizError('邮件不存在。',404);
    // Resolve the original mail through the same ownership and administrator checks as reading it.
    const mail=await emailService.content(c,{emailId},userId);
    const document=mailTranslationDocument(mail);
    if (!document.texts.length) return {emailId,target:language.id,...document.render([])};
    await rate.consume(c,'translation-mail',String(userId),12,60);
    const translated=await provider.translate(document.texts,language.serviceId);
    return {emailId,target:language.id,...document.render(translated)};
  },
};
export default translationService;
