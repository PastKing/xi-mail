<template>
  <el-popover v-model:visible="visible" trigger="hover" :trigger-keys="[]" :show-after="100" :hide-after="220" :width="many?384:268" :placement="floating?'top-end':'bottom-end'" :show-arrow="false" :popper-options="popperOptions" popper-class="language-menu" transition="language-menu-fade" :teleported="true">
    <template #reference>
      <button ref="trigger" type="button" class="language-trigger xi-icon-button" :class="{'is-floating':floating,'is-open':visible}" :aria-label="$t('languageChoose')" aria-haspopup="menu" :aria-expanded="visible" @click="visible=true" @keydown.down.prevent="openWithKeyboard">
        <Icon icon="mingcute:translate-2-line" width="18" height="18"/>
      </button>
    </template>
    <div class="language-menu-content" :aria-busy="loading" @keydown.esc.stop.prevent="closeWithKeyboard">
      <div class="language-menu-heading"><span>{{ $t('languageChoose') }}</span><small>{{ languages.length }}</small></div>
      <el-input v-if="many" v-model="query" class="language-menu-search" :placeholder="$t('languageSearch')" :aria-label="$t('languageSearch')" clearable @keydown.down.prevent="focusLanguage()"><template #prefix><Icon icon="mingcute:search-line" width="15" height="15"/></template></el-input>
      <div ref="list" class="language-menu-list" :class="{'is-many':many}" role="menu" :aria-label="$t('languageChoose')" @keydown="navigate">
        <button v-for="item in filtered" :key="item.id" type="button" role="menuitemradio" :aria-label="item.name" :aria-checked="setting.lang===item.id" :title="`${item.name} · ${item.label||item.id} (${item.id})`" :disabled="loading" @click="choose(item.id)">
          <LanguageMark :language="item" :size="24"/>
          <span class="language-menu-copy"><span dir="auto">{{ item.name }}</span><small>{{ item.label&&item.label!==item.name?item.label:item.id }}</small></span>
          <span class="language-selected" :class="{'is-selected':setting.lang===item.id}"><Icon v-if="setting.lang===item.id" icon="mingcute:check-line" width="13" height="13"/></span>
        </button>
      </div>
      <p v-if="!filtered.length" class="language-menu-empty">{{ $t('languageNoResults') }}</p>
      <div v-if="loading" class="language-menu-note" role="status">{{ $t('languageSwitching') }}</div>
    </div>
  </el-popover>
</template>
<script setup>
import {computed,nextTick,ref,watch} from 'vue';
import {Icon} from '@iconify/vue';
import {ElMessage} from 'element-plus';
import {useSettingStore} from '@/store/setting.js';
import {useServerStore} from '@/store/server.js';
import {activateLanguage,supportedLanguages} from '@/i18n/language.js';
import {saveLang} from '@/request/my.js';
import {useI18n} from 'vue-i18n';
import LanguageMark from '@/components/LanguageMark.vue';
const props=defineProps({floating:Boolean});
const setting=useSettingStore(),server=useServerStore(),visible=ref(false),loading=ref(false),query=ref(''),{t}=useI18n();
const trigger=ref(),list=ref();
const languages=computed(supportedLanguages),many=computed(()=>languages.value.length>8);
const filtered=computed(()=>{const text=query.value.trim().toLocaleLowerCase();return languages.value.filter(item=>!text||[item.name,item.label,item.id,item.serviceId].some(value=>String(value||'').toLocaleLowerCase().includes(text)));});
const popperOptions=computed(()=>({strategy:'fixed',modifiers:[
  {name:'computeStyles',options:{adaptive:false,gpuAcceleration:false}},
  {name:'preventOverflow',options:{padding:12,altAxis:true,boundary:'clippingParents',rootBoundary:'viewport'}},
  {name:'flip',options:{padding:12,rootBoundary:'viewport',fallbackPlacements:props.floating?['top-start']:['bottom-start','top-end']}},
]}));
watch(visible,open=>{if(open)query.value='';});
function focusLanguage(index){
  const items=[...(list.value?.querySelectorAll('button:not(:disabled)')||[])];
  const target=index===undefined?items.find(item=>item.getAttribute('aria-checked')==='true')||items[0]:items[(index+items.length)%items.length];
  target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest',inline:'nearest'});
}
async function openWithKeyboard(){visible.value=true;await nextTick();focusLanguage();}
function closeWithKeyboard(){visible.value=false;trigger.value?.focus({preventScroll:true});}
function navigate(event){
  if(!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  const items=[...list.value.querySelectorAll('button:not(:disabled)')];if(!items.length)return;
  event.preventDefault();const current=items.indexOf(event.target.closest('button'));
  const columns=getComputedStyle(list.value).gridTemplateColumns.split(' ').length;
  const step={ArrowDown:columns,ArrowUp:-columns,ArrowRight:1,ArrowLeft:-1};
  focusLanguage(event.key==='Home'?0:event.key==='End'?items.length-1:current+step[event.key]);
}
async function choose(id){
  if(loading.value)return;
  loading.value=true;
  try{await activateLanguage(id);visible.value=false;if(server.getToken())saveLang(id).catch(()=>{});}
  catch{ElMessage.error(t('languageSwitchFailed'));}
  finally{loading.value=false;}
}
</script>
<style scoped>
.language-trigger{width:36px;height:36px;border-radius:var(--xi-radius,8px);transition:background-color .18s,color .18s}
.language-trigger:hover,.language-trigger:focus-visible,.language-trigger.is-open{color:var(--el-color-primary);background:var(--base-fill,var(--el-fill-color-light))}
.language-trigger.is-floating{position:fixed;bottom:18px;right:18px;z-index:20;border:1px solid var(--el-border-color-lighter);background:var(--el-bg-color);border-radius:11px;box-shadow:0 2px 10px rgb(0 0 0 / .05)}
</style>
<style>
.language-menu.el-popover{box-sizing:border-box!important;max-width:calc(100vw - 24px)!important;max-width:calc(100dvw - 24px)!important;max-height:min(430px,calc(100vh - 96px));max-height:min(430px,calc(100dvh - 96px));padding:8px;border-radius:16px;border:1px solid var(--el-border-color-extra-light);box-shadow:0 8px 28px rgb(0 0 0 / .10),0 2px 6px rgb(0 0 0 / .025);background:var(--el-bg-color-overlay);overflow:hidden;display:flex;flex-direction:column}
.language-menu-content{min-width:0;min-height:0;width:100%;display:flex;flex-direction:column;overflow:hidden}
.language-menu-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 7px 10px;font-size:13px;font-weight:500;color:var(--el-text-color-primary);flex-shrink:0}.language-menu-heading small{font-size:11px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--el-text-color-secondary);background:var(--el-fill-color-light);padding:2px 7px;border-radius:10px;line-height:16px}
.language-menu-search{margin:0 0 7px;flex-shrink:0}.language-menu-search .el-input__wrapper{border-radius:10px;min-height:34px;box-sizing:border-box;background:var(--el-fill-color-light);box-shadow:none;padding:0 10px}.language-menu-search .el-input__wrapper.is-focus{box-shadow:0 0 0 1px var(--el-color-primary-light-5) inset}.language-menu-search .el-input__inner{font-size:12px}
.language-menu-list{min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;display:grid;grid-template-columns:minmax(0,1fr);gap:3px;padding:1px;max-height:340px}
.language-menu-list.is-many{grid-template-columns:repeat(2,minmax(0,1fr))}
.language-menu-list button{box-sizing:border-box;display:flex;align-items:center;gap:9px;min-width:0;min-height:46px;padding:7px 8px;border:0;border-radius:10px;background:transparent;color:var(--el-text-color-primary);font:inherit;text-align:start;cursor:pointer;transition:background-color .16s,color .16s}
.language-menu-list button:hover{color:var(--el-color-primary);background:var(--el-fill-color-light)}.language-menu-list button:focus-visible{color:var(--el-color-primary);background:var(--el-fill-color-light);outline:1px solid var(--el-color-primary-light-5);outline-offset:-1px}
.language-menu-list button[aria-checked=true]{color:var(--el-color-primary);background:var(--el-color-primary-light-9)}
.language-menu-copy{flex:1;min-width:0;display:grid;gap:2px;line-height:1.3}.language-menu-copy>span{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.language-menu-copy small{font-size:10px;color:var(--el-text-color-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.language-selected{flex-shrink:0;width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:var(--el-color-primary)}.language-selected.is-selected{background:var(--el-color-primary-light-8)}
.language-menu-note,.language-menu-empty{font-size:12px;padding:8px;margin:0;color:var(--el-text-color-secondary);flex-shrink:0}.language-menu-empty{padding:15px 8px}
.language-menu-fade-enter-active,.language-menu-fade-leave-active{transition:opacity .14s ease}.language-menu-fade-enter-from,.language-menu-fade-leave-to{opacity:0}
@media(max-width:599px){.language-menu-list.is-many{grid-template-columns:minmax(0,1fr)}.language-menu-list button{min-height:44px}.language-menu-list{max-height:310px}.language-menu-search .el-input__wrapper{min-height:36px}}
@media(prefers-reduced-motion:reduce){.language-menu-list button,.language-menu-fade-enter-active,.language-menu-fade-leave-active{transition:none}}
</style>
