import {TRANSLATION_LANGUAGES,LANGUAGE_FLAGS,translationLanguage,normalizeLanguageCode} from '../const/translation-languages';
import provider from './translation-provider';
import BizError from '../error/biz-error';
import rate from './security-rate-limit-service';

const CACHE='translation:catalog:v1',CUSTOM='translation:custom-languages';
function cleanName(value) {return typeof value==='string'&&value.trim().length>0&&value.length<=80&&!/[\x00-\x1f\x7f<>]/.test(value)?value.trim():null;}
function cleanLanguage(value) {
  if(!value||typeof value!=='object')return null;
  const id=normalizeLanguageCode(value.id),serviceId=normalizeLanguageCode(value.serviceId);
  const name=cleanName(value.name),label=cleanName(value.label);
  if(!id||!serviceId||!name||!label)return null;
  return {id,name,label,serviceId:translationLanguage(serviceId)?.serviceId||serviceId,flag:LANGUAGE_FLAGS.includes(value.flag)?value.flag:''};
}
export default {
  async list(c) {
    const existing=c.get?.('translationCatalog');if(Array.isArray(existing))return existing;
    const [cached,custom]=await Promise.all([c.env.kv.get(CACHE,{type:'json'}),c.env.kv.get(CUSTOM,{type:'json'})]);
    const map=new Map(TRANSLATION_LANGUAGES.map(item=>[item.id,item]));
    for(const candidate of [...(Array.isArray(cached?.languages)?cached.languages:[]),...(Array.isArray(custom)?custom:[])]){
      const item=cleanLanguage(candidate);if(item)map.set(item.id,item);
    }
    const result=[...map.values()];c.set?.('translationCatalog',result);return result;
  },
  async resolve(c,id) {
    const code=normalizeLanguageCode(id);
    const item=code&&(await this.list(c)).find(item=>item.id===code);
    if(!item)throw new BizError('未找到这个语言代码，请先在语言目录中添加。',400);
    return item;
  },
  async refresh(c) {
    await rate.consume(c,'translation-catalog-refresh',String(c.get('user')?.userId||''),10,300);
    let data;
    try {
      const response=await fetch('https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation',{
        headers:{'Accept-Language':'zh-Hans'},redirect:'manual',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Unavailable');data=await response.json();
    }catch{throw new BizError('暂时无法刷新语言目录，已有语言仍可使用。',503);}
    if(!data?.translation||typeof data.translation!=='object'||Array.isArray(data.translation))throw new BizError('语言目录返回格式不正确。',503);
    const languages=Object.entries(data.translation).map(([serviceId,value])=>{
      const known=translationLanguage(serviceId);return cleanLanguage(known||{id:serviceId,serviceId,name:value.nativeName,label:value.name,flag:''});
    }).filter(Boolean);
    if(!languages.length)throw new BizError('语言目录为空，已有语言仍可使用。',503);
    await c.env.kv.put(CACHE,JSON.stringify({languages,updatedAt:new Date().toISOString()}));
    c.set?.('translationCatalog',null);
    return this.list(c);
  },
  async register(c,input) {
    const code=normalizeLanguageCode(input.code);
    if(!code)throw new BizError('请填写有效的语言代码，例如 fr-CA。',400);
    const catalog=await this.list(c),known=catalog.find(item=>item.id===code);
    if(known)return known;
    const name=cleanName(input.name)||code;
    if(input.name&&!cleanName(input.name))throw new BizError('语言显示名称不正确。',400);
    await rate.consume(c,'translation-register',String(c.get('user')?.userId||''),12,300);
    // Confirm new codes against the actual translation channel using public text only.
    try{await provider.translate(['语言'],code,'zh-Hans');}
    catch(error){if(error?.code===503)throw new BizError('翻译服务暂未接受这个语言代码，请检查代码或稍后重试。',400);throw error;}
    const region=code.split('-').find(part=>/^[A-Z]{2}$/.test(part))?.toLowerCase();
    const item={id:code,serviceId:code,name,label:name,flag:LANGUAGE_FLAGS.includes(region)?region:''};
    const previous=await c.env.kv.get(CUSTOM,{type:'json'});
    const items=Array.isArray(previous)?previous:[];
    if(items.length>=100)throw new BizError('自定义语言数量已达上限。',400);
    await c.env.kv.put(CUSTOM,JSON.stringify([...items.filter(value=>value.id!==code),item]));
    c.set?.('translationCatalog',null);
    return item;
  },
};
