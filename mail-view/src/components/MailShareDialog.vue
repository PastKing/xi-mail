<template>
 <el-dialog v-model="visible" :title="$t('shareTitle')" width="min(480px, calc(100vw - 32px))" class="mail-share-dialog" append-to-body @closed="clear">
  <div class="share-manager" v-loading="loading">
   <strong class="share-address">{{ account?.email }}</strong>
   <p>{{ $t('shareScope') }}</p>
   <div class="share-create">
    <label for="share-hours">{{ $t('shareHours') }}</label>
    <el-input-number id="share-hours" v-model="hours" :min="1" :max="168" :precision="0" controls-position="right" />
    <el-button type="primary" :loading="creating" @click="create">{{ $t('shareCreate') }}</el-button>
   </div>
   <div v-if="link" class="share-result" role="status">
    <el-input :model-value="link" readonly :aria-label="$t('shareLink')" />
    <el-button @click="copy(link)">{{ $t('copy') }}</el-button>
    <small>{{ $t('shareKeepLink') }}</small>
   </div>
   <h3>{{ $t('shareActive') }} <span>{{ links.length }}</span></h3>
   <div v-if="!links.length" class="share-empty">{{ $t('shareNoLinks') }}</div>
   <div v-for="item in links" :key="item.shareId" class="share-row">
    <div><span>{{ $t('shareExpires') }}</span><time>{{ formatTime(item.expiresAt) }}</time></div>
    <el-button type="danger" plain :loading="revoking === item.shareId" @click="revoke(item)">{{ $t('shareRevoke') }}</el-button>
   </div>
  </div>
 </el-dialog>
</template>
<script setup>
import { ref, watch } from 'vue';
import http from '@/axios/index.js';
import { useServerStore } from '@/store/server.js';
import { useI18n } from 'vue-i18n';
const props = defineProps({ account: Object });
const visible = defineModel({ type: Boolean });
const { t } = useI18n();
const hours = ref(1), links = ref([]), link = ref(''), createdId = ref('');
const loading = ref(false), creating = ref(false), revoking = ref('');
const formatTime = n => new Date(n).toLocaleString();
let generation = 0;
function clear() { generation++; link.value = ''; createdId.value = ''; links.value = []; }
watch(visible, async value => {
 if (!value) { clear(); return; }
 clear(); hours.value = 1; loading.value = true;
 const run = generation;
 try {
  const list = await http.get('/mail-share/list', { params: { accountId: props.account.accountId } });
  if (run === generation) links.value = list;
 } catch { /* Request interceptor displays the error. */ }
 finally { if (run === generation) loading.value = false; }
});
async function create() {
 creating.value = true;
 const run = generation;
 try {
  const data = await http.post('/mail-share/create', { accountId: props.account.accountId, hours: hours.value });
  if (run !== generation) return;
  const base = new URL(useServerStore().getActiveBaseURL(), location.origin);
  link.value = base.origin + '/share#' + data.token;
  createdId.value = data.shareId;
  links.value.unshift(data);
 } catch { /* Request interceptor displays the error. */ }
 finally { creating.value = false; }
}
async function copy(value) {
 try { await navigator.clipboard.writeText(value); ElMessage.success(t('copySuccess')); }
 catch { ElMessage.warning(t('shareCopyManual')); }
}
async function revoke(item) {
 try { await ElMessageBox.confirm(t('shareRevokeConfirm'), t('shareRevoke'), { type: 'warning' }); } catch { return; }
 revoking.value = item.shareId;
 try {
  await http.delete('/mail-share/revoke', { params: { shareId: item.shareId } });
  links.value = links.value.filter(row => row.shareId !== item.shareId);
  if (createdId.value === item.shareId) link.value = '';
 } catch { /* Request interceptor displays the error. */ }
 finally { revoking.value = ''; }
}
</script>
<style scoped>
.share-manager { display: grid; gap: 16px; padding-bottom: 8px; font-size: 14px; }
.share-address { overflow-wrap: anywhere; }
p, small, .share-empty { color: var(--el-text-color-secondary); line-height: 1.6; margin: 0; }
.share-create { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.share-create .el-input-number { width: 112px; }
.share-result { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; }
.share-result small { grid-column: 1/-1; }
h3 { display: flex; justify-content: space-between; font-size: 14px; margin: 8px 0 0; }
h3 span { color: var(--el-text-color-secondary); font-weight: normal; }
.share-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid var(--el-border-color-lighter); padding-top: 12px; }
.share-row div { display: grid; gap: 5px; }
.share-row span { font-size: 12px; color: var(--el-text-color-secondary); }
@media (max-width: 600px), (pointer: coarse) {
 .share-manager { --el-component-size: 36px; }
 .share-manager :deep(.el-button) { min-height: 36px; }
}
</style>
