<template>
  <div class="mail-reading-body">
    <div v-if="open" class="mail-translation-toolbar" :aria-label="$t('mailTranslation')">
      <Icon icon="mingcute:translate-2-line" width="17" height="17" class="translation-toolbar-icon"/>
      <span class="mail-source-language">{{ $t('mailLanguageAutomatic') }}</span>
      <Icon class="mail-source-arrow" icon="mingcute:arrow-right-line" width="14" height="14"/>
      <el-select v-model="target" filterable :filter-method="value=>targetQuery=value" :aria-label="$t('mailTranslationTarget')" :disabled="loading" popper-class="mail-language-popper" @visible-change="targetQuery=''" @change="changeTarget">
        <el-option v-for="item in filteredLanguages" :key="item.id" :label="item.name" :value="item.id"><span class="mail-language-option"><LanguageMark :language="item" :size="20"/><span>{{ item.name }}</span><small>{{ item.label }}</small></span></el-option>
      </el-select>
      <el-button v-if="!ready||translatedTarget!==target||error" :loading="loading" @click="translate">{{ $t('mailTranslateAction') }}</el-button>
      <button v-if="ready&&translatedTarget===target" type="button" class="mail-original-link" @click="showOriginal=!showOriginal">{{ $t(showOriginal?'mailShowTranslation':'mailShowOriginal') }}</button>
      <button type="button" class="xi-icon-button mail-translation-close" :aria-label="$t('close')" @click="$emit('close')"><Icon icon="mingcute:close-line" width="18" height="18"/></button>
    </div>
    <p v-if="open&&error" class="mail-translation-error" role="alert">{{ $t('mailTranslationFailed') }}</p>
    <div v-if="open&&ready&&!showOriginal" class="translated-mail-body" :lang="translatedTarget" aria-live="polite">
      <ShadowHtml v-if="translatedHtml" :html="formatHtml(translatedHtml)"/>
      <pre v-else class="translated-mail-text" dir="auto">{{ text }}</pre>
    </div>
    <slot v-else/>
  </div>
</template>
<script setup>
import {computed,onBeforeUnmount,ref,watch} from 'vue';
import {Icon} from '@iconify/vue';
import {translateMail} from '@/request/translation.js';
import {supportedLanguages} from '@/i18n/language.js';
import LanguageMark from '@/components/LanguageMark.vue';
import ShadowHtml from '@/components/shadow-html/index.vue';
import {useSettingStore} from '@/store/setting.js';
import {matchLanguage} from '@/i18n/preference.js';
const props=defineProps({emailId:{type:Number,required:true},open:Boolean,formatHtml:{type:Function,default:html=>html}});defineEmits(['close']);
const languages=computed(supportedLanguages),target=ref('zh'),translatedTarget=ref(''),text=ref(''),translatedHtml=ref(''),loading=ref(false),error=ref(false),ready=ref(false),showOriginal=ref(false);
const setting=useSettingStore(),manualTarget=ref(false);
const targetQuery=ref('');
const filteredLanguages=computed(()=>{const query=targetQuery.value.toLocaleLowerCase().trim();return languages.value.filter(item=>!query||[item.name,item.label,item.id].some(value=>value.toLocaleLowerCase().includes(query)));});
let disposed=false,requestId=0;
function defaultTarget(){target.value=matchLanguage(setting.lang,languages.value)||'zh';if(ready.value)showOriginal.value=translatedTarget.value!==target.value;}
function changeTarget(){manualTarget.value=true;error.value=false;showOriginal.value=true;}
watch([()=>setting.lang,languages],()=>{
  if(!languages.value.some(item=>item.id===target.value))manualTarget.value=false;
  if(!manualTarget.value)defaultTarget();
},{immediate:true});
watch(()=>props.open,open=>{
  if(!open)return;
  manualTarget.value=false;defaultTarget();
},{immediate:true});
watch(()=>props.emailId,()=>{requestId++;ready.value=false;text.value='';translatedHtml.value='';showOriginal.value=false;loading.value=false;error.value=false;manualTarget.value=false;defaultTarget();});
onBeforeUnmount(()=>{disposed=true;requestId++;});
async function translate(){
  if(loading.value)return;loading.value=true;error.value=false;const current=++requestId;
  try{
    const response=await translateMail(props.emailId,target.value);
    if(disposed||current!==requestId)return;
    text.value=response.text;translatedHtml.value=response.html||'';translatedTarget.value=response.target;ready.value=true;showOriginal.value=target.value!==response.target;
  }catch{if(!disposed&&current===requestId)error.value=true;}
  finally{if(!disposed&&current===requestId)loading.value=false;}
}
</script>
<style scoped>
.mail-translation-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:9px;min-height:32px;padding:8px 0;margin-bottom:18px;border-bottom:1px solid var(--el-border-color-lighter);color:var(--el-text-color-secondary);font-size:13px}
.translation-toolbar-icon{flex-shrink:0}.mail-source-language{white-space:nowrap}.mail-translation-toolbar .el-select{width:146px}.mail-original-link{border:0;background:none;color:var(--el-color-primary);font:inherit;padding:7px 4px;cursor:pointer;white-space:nowrap}.mail-original-link:hover{text-decoration:underline}.mail-original-link:focus-visible{outline:2px solid var(--el-color-primary-light-5);border-radius:4px}.mail-translation-close{margin-left:auto}.mail-translation-error{color:var(--el-color-danger);font-size:13px;margin:-8px 0 16px}.translated-mail-text{font-family:inherit;font-size:14px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;color:var(--el-text-color-primary)}
@media(max-width:600px){.mail-translation-toolbar{gap:6px;margin-bottom:14px}.mail-source-language,.mail-source-arrow{display:none}.mail-translation-toolbar .el-select{width:126px;min-width:100px;flex:1;max-width:155px}.mail-original-link{font-size:12px;padding:7px 2px}.translation-toolbar-icon{display:none}}
</style>
<style>.mail-language-option{display:flex;align-items:center;gap:9px}.mail-language-option small{font-size:12px;margin-left:auto;color:var(--el-text-color-secondary)}.mail-language-popper{max-width:calc(100vw - 24px)}</style>
