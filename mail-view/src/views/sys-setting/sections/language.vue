<template>
  <div class="sys-setting-section" v-loading="loading">
    <section class="settings-card language-settings">
      <div class="language-page-heading"><div><h2>{{ $t('languageSettings') }}</h2><p>{{ $t('languageManageIntro') }}</p></div><div v-if="canEdit" class="language-page-actions"><el-button :disabled="!!busy||!pendingLanguages.length" :loading="busy==='batch'" @click="regenerateAll">{{ $t('languageUpdateAll') }}</el-button><el-button :disabled="!!busy" @click="pickerOpen=!pickerOpen"><Icon :icon="pickerOpen?'mingcute:check-line':'mingcute:add-line'" width="16" height="16"/>{{ $t(pickerOpen?'languageDone':'languageAdd') }}</el-button></div></div>

      <section v-if="pickerOpen&&canEdit" class="language-picker" :aria-label="$t('languageAdd')">
        <div class="language-picker-search"><el-input v-model="search" clearable :placeholder="$t('languageSearch')" :aria-label="$t('languageSearch')"><template #prefix><Icon icon="mingcute:search-line" width="16" height="16"/></template></el-input><el-tooltip :content="$t('languageRefreshCatalog')" :trigger-keys="[]"><button type="button" class="xi-icon-button" :aria-label="$t('languageRefreshCatalog')" :disabled="!!busy" @click="refreshCatalog"><Icon icon="mingcute:refresh-2-line" width="18" height="18" :class="{'is-loading':busy==='catalog'}"/></button></el-tooltip></div>
        <div class="language-catalog-results">
          <button v-for="option in matching" :key="option.id" type="button" class="language-candidate" :disabled="!!busy" :aria-label="$t('languageAdd')+' '+option.name" @click="add(option.id)"><LanguageMark :language="option"/><span><b>{{ option.name }}</b><small>{{ option.label }} · {{ option.id }}</small></span><Icon :icon="busy===option.id?'mingcute:loading-line':'mingcute:add-line'" width="16" height="16" :class="{'is-loading':busy===option.id}"/></button>
          <p v-if="!matching.length" class="language-no-results">{{ $t('languageNoResults') }}</p>
        </div>
        <div class="language-picker-footer"><span>{{ $t('languageCatalogCount',{count:catalog.length}) }}</span><button type="button" class="language-text-button" :disabled="!!busy" @click="customOpen=!customOpen">{{ $t('languageCustom') }}</button></div>
        <form v-if="customOpen" class="custom-language-form" @submit.prevent="addCustom"><el-input v-model="custom.code" maxlength="35" :placeholder="$t('languageCodePlaceholder')" :aria-label="$t('languageCode')" :disabled="!!busy"/><el-input v-model="custom.name" maxlength="80" :placeholder="$t('languageNameOptional')" :aria-label="$t('languageNameOptional')" :disabled="!!busy"/><el-button native-type="submit" :disabled="!custom.code.trim()||!!busy" :loading="busy==='custom'">{{ $t('languageValidateAdd') }}</el-button><p>{{ $t('languageCodeNote') }}</p></form>
      </section>

      <div class="language-list-heading"><span>{{ $t('interfaceLanguages') }}</span><small>{{ $t('languageEnabledCount',{count:config.languages.length}) }}</small></div>
      <div class="configured-languages">
        <div v-for="id in config.languages" :key="id" class="configured-language">
          <LanguageMark :language="item(id)" :size="24"/>
          <div class="language-copy"><span>{{ item(id).name }}</span><small>{{ !id.startsWith('zh')&&item(id).name!==item(id).label?item(id).label+' · ':'' }}{{ id }}</small></div>
          <span v-if="id==='zh'" class="language-state is-default">{{ $t('languageDefault') }}</span>
          <span v-else class="language-state" :class="{'needs-update':!config.packs[id]?.current,'update-failed':failedLanguages.includes(id)}">{{ $t(failedLanguages.includes(id)?'languageUpdateFailed':config.packs[id]?.current?'languageReady':'languageNeedsUpdate') }}</span>
          <el-dropdown v-if="id!=='zh'&&canEdit" trigger="click" popper-class="sys-setting-popper" @command="command=>command==='update'?regenerate(id):remove(id)"><button type="button" class="xi-icon-button" :aria-label="$t('languageActions')+' '+item(id).name" :disabled="!!busy"><Icon icon="mingcute:more-1-line" width="18" height="18"/></button><template #dropdown><el-dropdown-menu><el-dropdown-item command="update">{{ $t('languageRegenerate') }}</el-dropdown-item><el-dropdown-item command="remove">{{ $t('languageRemove') }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        </div>
      </div>
      <p v-if="busy" class="language-operation-status" role="status"><Icon icon="mingcute:loading-line" width="14" height="14" class="is-loading"/>{{ operation }}</p>
      <p v-else-if="batchResult" class="language-batch-result" :class="{'has-failures':failedLanguages.length}" role="status">{{ batchResult }}</p>
      <div class="language-mail-row"><div><div>{{ $t('mailTranslationSetting') }}</div><p>{{ $t('mailTranslationIndependent') }}</p></div><el-switch :model-value="config.mailTranslation" :disabled="!!busy||!canEdit" :aria-label="$t('mailTranslation')" @change="toggleMail"/></div>
    </section>
  </div>
</template>
<script setup>
import {computed,onBeforeUnmount,onMounted,reactive,ref} from 'vue';
import {Icon} from '@iconify/vue';
import {ElMessage} from 'element-plus';
import {useI18n} from 'vue-i18n';
import {translationConfig,saveTranslationConfig,generateLanguage,refreshLanguageCatalog,registerLanguage} from '@/request/translation.js';
import {useSettingStore} from '@/store/setting.js';
import {TRANSLATION_LANGUAGES} from '@/config/languages.js';
import {activateLanguage,clearLanguageCache} from '@/i18n/language.js';
import {hasPerm} from '@/perm/perm.js';
import LanguageMark from '@/components/LanguageMark.vue';
const {t}=useI18n(),setting=useSettingStore(),loading=ref(true),busy=ref(''),operation=ref(''),pickerOpen=ref(false),search=ref(''),customOpen=ref(false),custom=reactive({code:'',name:''});
const config=ref({languages:['zh'],mailTranslation:true,packs:{},catalog:TRANSLATION_LANGUAGES});
const failedLanguages=ref([]),batchResult=ref('');
const pendingLanguages=computed(()=>config.value.languages.filter(id=>id!=='zh'&&!config.value.packs[id]?.current));
let disposed=false;
onBeforeUnmount(()=>{disposed=true;});
const canEdit=computed(()=>hasPerm('setting:set'));
const catalog=computed(()=>config.value.catalog||TRANSLATION_LANGUAGES);
const item=id=>catalog.value.find(item=>item.id===id)||{id,name:id,label:id,flag:''};
const matching=computed(()=>{const query=search.value.trim().toLocaleLowerCase();return catalog.value.filter(item=>!config.value.languages.includes(item.id)&&(!query||[item.id,item.name,item.label,item.serviceId].some(value=>value.toLocaleLowerCase().includes(query))));});
onMounted(async()=>{try{config.value=await translationConfig();}catch{}finally{loading.value=false;}});
async function save(languages=config.value.languages,mailTranslation=config.value.mailTranslation){
  config.value=await saveTranslationConfig({languages,mailTranslation});
  setting.settings.translation={languages:config.value.languages.map(item),mailTranslation};
  if(!languages.includes(setting.lang))await activateLanguage('zh');
}
async function enable(id){await generateLanguage(id);await save([...new Set([...config.value.languages,id])]);search.value='';ElMessage.success(t('languageAdded'));}
async function add(id){if(busy.value)return;busy.value=id;operation.value=t('languageEnabling',{name:item(id).name});try{await enable(id);}catch{}finally{busy.value='';}}
async function addCustom(){if(busy.value)return;busy.value='custom';operation.value=t('languageValidating');try{const added=await registerLanguage({...custom});if(!catalog.value.some(item=>item.id===added.id))config.value.catalog=[...catalog.value,added];await enable(added.id);custom.code='';custom.name='';customOpen.value=false;}catch{}finally{busy.value='';}}
async function refreshCatalog(){if(busy.value)return;busy.value='catalog';operation.value=t('languageRefreshing');try{config.value.catalog=await refreshLanguageCatalog();}catch{}finally{busy.value='';}}
async function remove(id){if(busy.value)return;busy.value='remove:'+id;operation.value=t('languageRemoving');try{await save(config.value.languages.filter(value=>value!==id));}catch{}finally{busy.value='';}}
async function regenerate(id){if(busy.value)return;busy.value='update:'+id;operation.value=t('languageEnabling',{name:item(id).name});try{await generateLanguage(id);clearLanguageCache(id);failedLanguages.value=failedLanguages.value.filter(value=>value!==id);batchResult.value='';config.value=await translationConfig();if(setting.lang===id)await activateLanguage(id,{persist:false});ElMessage.success(t('languageUpdated'));}catch{}finally{busy.value='';}}
async function regenerateAll(){
  if(busy.value||!canEdit.value)return;
  const languages=[...pendingLanguages.value];if(!languages.length)return;
  busy.value='batch';batchResult.value='';failedLanguages.value=[];
  const updated=[];
  try{
    for(const [index,id]of languages.entries()){
      if(disposed)break;
      operation.value=t('languageBatchProgress',{current:index+1,total:languages.length,name:item(id).name});
      try{
        const result=await generateLanguage(id,{noMsg:true});
        clearLanguageCache(id);updated.push(id);
        config.value.packs[id]={updatedAt:result.updatedAt,current:true};
      }catch(error){
        failedLanguages.value.push(id);
        if([401,403].includes(error?.code||error?.response?.data?.code))break;
      }
    }
    if(disposed)return;
    try{config.value=await translationConfig();}catch{}
    if(updated.includes(setting.lang))try{await activateLanguage(setting.lang,{persist:false});}catch{}
    batchResult.value=t(updated.length===languages.length?'languageBatchUpdated':'languageBatchPartial',{count:updated.length,failed:languages.length-updated.length});
  }finally{if(!disposed)busy.value='';}
}
async function toggleMail(value){if(busy.value)return;busy.value='mail';operation.value=t('settingsSaving');try{await save(config.value.languages,value);}catch{}finally{busy.value='';}}
</script>
<style scoped>
.language-settings{padding:20px}.language-page-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}.language-page-heading h2{font-size:16px;font-weight:600;margin:0}.language-page-heading p,.language-mail-row p{font-size:12px;line-height:1.6;color:var(--el-text-color-secondary);margin:5px 0 0}.language-page-heading .el-button{gap:5px;flex-shrink:0}.language-page-actions{display:flex;flex-wrap:wrap;gap:8px}.language-page-actions .el-button+.el-button{margin-left:0}.language-batch-result{font-size:12px;line-height:1.6;color:var(--el-text-color-secondary);margin:12px 0 0}.language-batch-result.has-failures,.language-state.update-failed{color:var(--el-color-warning)}.language-list-heading{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;margin:24px 0 8px}.language-list-heading small{font-weight:400;color:var(--el-text-color-secondary);font-size:12px}
.configured-languages{border-top:1px solid var(--el-border-color-lighter)}.configured-language{display:flex;align-items:center;gap:12px;min-height:60px;border-bottom:1px solid var(--el-border-color-lighter)}.language-copy{min-width:0;flex:1;display:grid;gap:1px;font-size:14px}.language-copy small{font-size:12px;color:var(--el-text-color-secondary)}.language-state{font-size:12px;color:var(--el-text-color-secondary)}.language-state.is-default{padding:2px 7px;border-radius:4px;background:var(--el-fill-color-light)}.language-state.needs-update{color:var(--el-color-warning)}
.language-picker{margin:18px 0 20px;padding:12px;background:var(--el-fill-color-extra-light);border:1px solid var(--el-border-color-lighter);border-radius:8px}.language-picker-search{display:flex;align-items:center;gap:8px}.language-picker-search .el-input{flex:1}.language-catalog-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:4px;max-height:280px;overflow:auto;margin:10px 0}.language-candidate{display:flex;align-items:center;gap:10px;padding:10px;border:0;border-radius:5px;background:transparent;color:var(--el-text-color-primary);font:inherit;text-align:start;cursor:pointer;min-width:0}.language-candidate:hover,.language-candidate:focus-visible{background:var(--el-fill-color-light)}.language-candidate>span{flex:1;display:grid;min-width:0;gap:2px}.language-candidate b{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.language-candidate small{font-size:11px;color:var(--el-text-color-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.language-candidate:disabled{cursor:wait;opacity:.6}.language-picker-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid var(--el-border-color-lighter);padding-top:8px;font-size:12px;color:var(--el-text-color-secondary)}.language-text-button{font:inherit;border:0;padding:4px 0;background:none;color:var(--el-color-primary);cursor:pointer;white-space:nowrap}.language-no-results{font-size:13px;grid-column:1/-1;color:var(--el-text-color-secondary);padding:12px 2px}.custom-language-form{display:grid;grid-template-columns:160px minmax(0,1fr) auto;gap:8px;padding-top:12px}.custom-language-form p{grid-column:1/-1;margin:0;font-size:12px;color:var(--el-text-color-secondary);line-height:1.6}.language-operation-status{display:flex;align-items:center;gap:6px;margin:12px 0 0;font-size:12px;color:var(--el-color-primary)}
.language-mail-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding-top:18px;margin-top:18px;font-size:14px}.language-mail-row .el-switch{flex-shrink:0}
@media(max-width:600px){.language-settings{padding:14px}.language-page-heading{align-items:flex-start;gap:10px}.language-page-heading p{max-width:215px}.configured-language{gap:9px;min-height:56px}.language-picker{padding:8px}.language-catalog-results{grid-template-columns:1fr;max-height:260px}.custom-language-form{grid-template-columns:minmax(0,1fr)}.custom-language-form p{grid-column:1}.custom-language-form .el-button{justify-self:start}.language-picker-footer{gap:8px}.language-state{max-width:80px;text-align:right}}
</style>
