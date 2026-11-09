import i18n from './index.js';
import {useSettingStore} from '@/store/setting.js';
import {useServerStore} from '@/store/server.js';
import {languagePack} from '@/request/translation.js';
import {reactive} from 'vue';

let sequence=0;
const cache=new Map();
const publicCopies=reactive(new Map());
function cacheKey(id){return `${useServerStore().activeServerId||'local'}:${id}`;}
export function supportedLanguages() {return useSettingStore().settings.translation?.languages || [{id:'zh',name:'简体中文',label:'中文',flag:'cn'}];}
export function clearLanguageCache(id) {
  const key=cacheKey(id);cache.delete(key);publicCopies.delete(key);
}
export function registrationHint(source) {
  const lang=useSettingStore().lang;
  if(lang==='zh')return source;
  const copy=publicCopies.get(cacheKey(lang));
  return copy?.regKeyHintSource===source&&typeof copy.regKeyHint==='string'?copy.regKeyHint:source;
}
export async function activateLanguage(requested='zh',{persist=true}={}) {
  const token=++sequence, setting=useSettingStore();
  const id=supportedLanguages().some(item=>item.id===requested)?requested:'zh';
  if(id!=='zh') {
    const key=cacheKey(id);
    let pack=cache.get(key);
    if(!pack) {pack=await languagePack(id);cache.set(key,pack);}
    if(token!==sequence)return;
    i18n.global.setLocaleMessage(id,pack.messages);
    publicCopies.set(key,pack.publicCopy||{});
  }
  if(token!==sequence)return;
  setting.lang=id;i18n.global.locale.value=id;
  document.documentElement.lang=id==='zh'?'zh-CN':id;
  if(persist)try{localStorage.setItem('xi-mail:language',id);}catch{}
  return id;
}
