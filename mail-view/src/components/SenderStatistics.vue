<template>
  <el-drawer :model-value="modelValue" :title="t('senderStatistics')" size="min(620px, 100%)" class="sender-statistics-drawer" @update:model-value="emit('update:modelValue',$event)">
    <div class="sender-statistics">
      <p class="stats-hint">{{ t('senderStatisticsHint') }}</p>
      <span class="stats-hint">{{ t('senderStatisticsScope',{type:scopeLabel}) }}</span>
      <form class="stats-search" @submit.prevent="search">
        <el-input v-model="searchValue" :placeholder="t('senderStatisticsSearch')" :aria-label="t('senderStatisticsSearch')" clearable @clear="search" />
        <el-tooltip :content="t('searchAction')" :trigger-keys="[]"><button type="submit" class="xi-icon-button" :aria-label="t('searchAction')"><Icon icon="mingcute:search-line" width="18" /></button></el-tooltip>
        <el-tooltip :content="t('refresh')" :trigger-keys="[]"><button type="button" class="xi-icon-button" :aria-label="t('refresh')" :disabled="loading" @click="load"><Icon icon="mingcute:refresh-2-line" width="18" /></button></el-tooltip>
      </form>
      <div v-if="loading" class="stats-state" role="status" aria-live="polite"><Icon icon="mingcute:loading-line" width="22" class="stats-spinner" />{{ t('senderStatisticsLoading') }}</div>
      <div v-else-if="error" class="stats-state" role="alert"><span>{{ t('senderStatisticsError') }}</span><el-button @click="load">{{ t('refresh') }}</el-button></div>
      <template v-else>
        <div class="stats-summary">
          <div><strong>{{ number(data.totalMessages) }}</strong><span>{{ t('senderStatisticsMessages') }}</span></div>
          <div><strong>{{ number(data.senderCount) }}</strong><span>{{ t('senderStatisticsSenders') }}</span></div>
        </div>
        <p v-if="data.missingAddress" class="stats-hint">{{ t('senderStatisticsMissing',{count:data.missingAddress}) }}</p>
        <el-empty v-if="!data.list.length" :image-size="64" :description="t('noMessagesFound')" />
        <div v-else class="stats-rows">
          <div v-for="row in data.list" :key="row.address" class="stats-row">
            <button type="button" class="stats-row-main" :title="t('senderStatisticsView')" @click="emit('select',row.address)">
            <span class="stats-address">{{ row.address }}</span>
            <span class="stats-row-meta"><strong>{{ t('senderStatisticsCount',{count:number(row.total)}) }}</strong><span>{{ percentage(row.total) }}%</span><span class="stats-last">{{ t('senderStatisticsLast') }} {{ time(row.lastTime) }}</span></span>
            <span class="stats-track" aria-hidden="true"><span :style="{width:percentage(row.total)+'%'}" /></span>
            </button>
            <el-tooltip :content="t('copy')" :trigger-keys="[]"><button type="button" class="xi-icon-button stats-copy" :aria-label="t('copy')+' '+row.address" @click.stop="copyAddress(row.address)"><Icon icon="mingcute:copy-line" width="16" /></button></el-tooltip>
          </div>
        </div>
        <el-pagination v-if="data.senderCount > 20" class="stats-pagination" size="small" layout="prev, pager, next" :pager-count="5" :current-page="page" :page-size="20" :total="data.senderCount" @current-change="changePage" />
      </template>
    </div>
  </el-drawer>
</template>
<script setup>
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import {Icon} from '@iconify/vue';
import {allEmailSenderStatistics} from '@/request/all-email';
import {tzDayjs} from '@/utils/day';
const props=defineProps({modelValue:Boolean,filters:{type:Object,default:()=>({})}});
const emit=defineEmits(['update:modelValue','select']);
const {t,locale}=useI18n();
const data=ref({list:[],totalMessages:0,senderCount:0,missingAddress:0});
const loading=ref(false),error=ref(false),searchValue=ref(''),keyword=ref(''),page=ref(1);
let requestId=0;
const scopeLabel=computed(()=>t(({all:'all',receive:'received',send:'sent',delete:'selectDeleted',noone:'noRecipientTitle'})[props.filters.type]||'all'));
const number=value=>new Intl.NumberFormat(locale.value).format(Number(value)||0);
const percentage=total=>Math.min(100,Number(((Number(total)||0)*100/(data.value.totalMessages||1)).toFixed(1)));
const time=value=>value?tzDayjs(value).format('YYYY-MM-DD HH:mm'):'—';
async function copyAddress(address){
  try{await navigator.clipboard.writeText(address);ElMessage({message:t('copySuccessMsg'),type:'success',plain:true});}
  catch{ElMessage({message:t('copyFailMsg'),type:'error',plain:true});}
}
async function load(){
  const id=++requestId;loading.value=true;error.value=false;
  try{
    const result=await allEmailSenderStatistics({...props.filters,senderKeyword:keyword.value,page:page.value,size:20});
    if(id===requestId&&props.modelValue)data.value=result;
  }catch{if(id===requestId)error.value=true;}
  finally{if(id===requestId)loading.value=false;}
}
function search(){keyword.value=searchValue.value.trim();page.value=1;load();}
function changePage(value){page.value=value;load();}
watch(()=>props.modelValue,open=>{
  if(open){searchValue.value='';keyword.value='';page.value=1;load();}
  else{++requestId;loading.value=false;}
});
onBeforeUnmount(()=>++requestId);
</script>
<style scoped>
.sender-statistics { display:flex; flex-direction:column; gap:12px; min-width:0; }
.stats-hint { margin:0; color:var(--el-text-color-secondary); font-size:12px; line-height:1.6; }
.stats-search { display:flex; align-items:center; gap:8px; }
.stats-search .el-input { flex:1; min-width:0; }
.stats-summary { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px 0; border-block:1px solid var(--el-border-color-lighter); }
.stats-summary > div { display:flex; flex-direction:column; gap:4px; }
.stats-summary strong { font-size:24px; font-weight:600; color:var(--el-text-color-primary); }
.stats-summary span { font-size:12px; color:var(--el-text-color-secondary); }
.stats-rows { display:flex; flex-direction:column; }
.stats-row { position:relative; min-width:0; border-bottom:1px solid var(--el-border-color-extra-light); border-radius:4px; }
.stats-row-main { display:flex; flex-direction:column; gap:8px; padding:13px 8px; min-width:0; width:100%; border:0; background:transparent; color:var(--el-text-color-primary); font:inherit; text-align:left; cursor:pointer; border-radius:4px; }
.stats-copy { position:absolute; top:9px; right:4px; }
.stats-row:hover { background:var(--el-fill-color-light); }
.stats-row-main:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:-2px; }
.stats-address { padding-right:32px; overflow-wrap:anywhere; font-size:14px; line-height:1.5; }
.stats-address svg { flex-shrink:0; align-self:center; color:var(--el-text-color-secondary); }
.stats-row-meta { display:flex; align-items:center; flex-wrap:wrap; gap:8px 12px; color:var(--el-text-color-secondary); font-size:12px; }
.stats-row-meta strong { font-weight:500; color:var(--el-text-color-regular); }
.stats-last { margin-left:auto; }
.stats-track { height:3px; overflow:hidden; border-radius:3px; background:var(--el-fill-color-light); }
.stats-track > span { display:block; height:100%; background:var(--el-color-primary-light-3); }
.stats-pagination { justify-content:center; margin-top:8px; }
.stats-state { min-height:180px; display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap; color:var(--el-text-color-secondary); font-size:14px; }
.stats-spinner { animation:stats-spin 1s linear infinite; }
@keyframes stats-spin { to {transform:rotate(360deg)} }
@media(max-width:480px){ .stats-last { margin-left:0; flex-basis:100%; } }
@media(max-width:767px),(pointer:coarse){ .stats-copy { top:5px; } .stats-address { padding-right:40px; } }
:global(.sender-statistics-drawer .el-drawer__header) { margin-bottom:0; padding:18px 20px; border-bottom:1px solid var(--el-border-color-lighter); }
:global(.sender-statistics-drawer .el-drawer__body) { padding:16px 20px; }
</style>
