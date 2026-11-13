<template>
  <div class="rule-list-editor">
    <div class="rule-list-toolbar"><el-input v-model="query" :aria-label="t('ruleListSearch')+' '+label" :placeholder="t('ruleListSearch')" clearable><template #prefix><Icon icon="mingcute:search-line" width="16" /></template></el-input><span>{{ t('ruleListCount',{count:modelValue.length}) }}</span></div>
    <div v-if="pageItems.length" class="rule-list-items">
      <div v-for="(value,index) in pageItems" :key="(page-1)*20+index" class="rule-list-item"><span :title="value">{{ value }}</span><el-tooltip :content="t('delete')" :trigger-keys="[]"><button type="button" class="xi-icon-button" :aria-label="t('delete')+' '+value" :disabled="disabled" @click="remove(value)"><Icon icon="mingcute:close-line" width="16" /></button></el-tooltip></div>
    </div>
    <p v-else class="rule-list-hint">{{ t(query?'ruleListNoMatch':'ruleListEmpty') }}</p>
    <el-pagination v-if="filtered.length>20" size="small" layout="prev, pager, next" :pager-count="5" :current-page="page" :page-size="20" :total="filtered.length" @current-change="page=$event" />
    <div class="rule-list-add"><el-input v-model="pending" type="textarea" :autosize="{minRows:1,maxRows:3}" :aria-label="label" :placeholder="placeholder" :disabled="disabled" @keydown.ctrl.enter.prevent="commitPending" /><el-tooltip :content="t('add')" :trigger-keys="[]"><button type="button" class="xi-icon-button" :aria-label="t('add')+' '+label" :disabled="disabled||!pending.trim()" @click="commitPending"><Icon icon="mingcute:add-line" width="18" /></button></el-tooltip></div>
    <p class="rule-list-hint">{{ t('ruleListBatchHint') }}</p>
  </div>
</template>
<script setup>
import {computed,ref,watch} from 'vue';
import {Icon} from '@iconify/vue';
import {useI18n} from 'vue-i18n';
const props=defineProps({modelValue:{type:Array,default:()=>[]},label:String,placeholder:String,kind:{type:String,default:'text'},disabled:Boolean});
const emit=defineEmits(['update:modelValue']);
const {t}=useI18n();
const query=ref(''),pending=ref(''),page=ref(1);
const filtered=computed(()=>props.modelValue.filter(value=>String(value).toLowerCase().includes(query.value.trim().toLowerCase())));
const pageItems=computed(()=>filtered.value.slice((page.value-1)*20,page.value*20));
watch(query,()=>page.value=1);
watch(()=>filtered.value.length,()=>page.value=Math.max(1,Math.min(page.value,Math.ceil(filtered.value.length/20))));
function commitPending(){
  if(!pending.value.trim())return true;
  if(props.disabled)return false;
  const normalize=value=>props.kind==='domain'?String(value).trim().replace(/^@/,'').replace(/\.$/,'').toLowerCase():String(value).trim();
  const added=pending.value.split(/[\r\n,，;；]+/).map(value=>value.trim()).filter(Boolean).map(normalize);
  if(added.some(value=>value.length>(props.kind==='domain'?320:512)||(props.kind==='domain'&&!/^(?:[a-z0-9!#$%&'*+=?^_`{}~.-]{1,64}@)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/i.test(value)))){
    ElMessage.error(t('ruleListInvalid'));return false;
  }
  const seen=new Set(props.modelValue.map(value=>normalize(value).toLowerCase())),values=[...props.modelValue];
  for(const value of added)if(!seen.has(value.toLowerCase())){seen.add(value.toLowerCase());values.push(value)}
  if(values.length>5000){ElMessage.error(t('ruleListLimit'));return false}
  emit('update:modelValue',values);pending.value='';return true;
}
function remove(value){emit('update:modelValue',props.modelValue.filter(item=>item!==value))}
defineExpose({commitPending,hasPending:()=>!!pending.value.trim(),resetPending:()=>{pending.value='';query.value='';page.value=1}});
</script>
<style scoped>
.rule-list-editor { display:flex; flex-direction:column; gap:8px; min-width:0; }
.rule-list-toolbar { display:flex; align-items:center; gap:12px; }
.rule-list-toolbar .el-input { flex:1; min-width:0; }
.rule-list-toolbar > span { flex-shrink:0; font-size:12px; color:var(--el-text-color-secondary); }
.rule-list-add { display:flex; align-items:flex-start; gap:4px; padding:3px; border:1px solid var(--el-border-color); border-radius:6px; transition:border-color .15s; }
.rule-list-add:focus-within { border-color:var(--el-color-primary); }
.rule-list-add .el-textarea { flex:1; min-width:0; }
.rule-list-add :deep(.el-textarea__inner) { box-shadow:none!important; background:transparent; padding:4px 7px; resize:none; min-height:28px!important; }
.rule-list-add .xi-icon-button { flex-shrink:0; }
.rule-list-hint { margin:0!important; font-size:12px; line-height:1.6; color:var(--el-text-color-secondary); }
.rule-list-items { display:flex; flex-wrap:wrap; align-content:flex-start; gap:6px; max-height:200px; overflow:auto; overscroll-behavior:contain; padding:2px; }
.rule-list-item { display:inline-flex; align-items:center; gap:4px; max-width:100%; min-height:28px; padding:0 3px 0 9px; border:1px solid var(--el-border-color-extra-light); border-radius:5px; background:var(--el-fill-color-light); box-sizing:border-box; }
.rule-list-item > span { min-width:0; overflow-wrap:anywhere; color:var(--el-text-color-regular); font-size:13px; line-height:1.5; }
.rule-list-item .xi-icon-button { width:24px; height:26px; min-width:24px; flex-shrink:0; }
.rule-list-item .xi-icon-button:hover { color:var(--el-color-danger); }
.rule-list-editor :deep(.el-pagination) { align-self:flex-end; max-width:100%; }
@media(max-width:680px),(pointer:coarse) { .rule-list-item { min-height:34px; } .rule-list-item .xi-icon-button { width:30px; height:32px; min-width:30px; } }
</style>
