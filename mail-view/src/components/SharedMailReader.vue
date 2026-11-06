<template>
 <el-dialog v-model="visible" :title="message.subject || $t('shareReadMail')" width="min(920px, calc(100vw - 32px))" top="6vh" class="shared-reader" append-to-body destroy-on-close @closed="$emit('closed')">
  <div class="reader-meta"><div><strong>{{ message.name || message.sendEmail }}</strong><span>{{ message.sendEmail }}</span></div><time>{{ new Date(message.createTime.replace(' ', 'T') + 'Z').toLocaleString() }}</time></div>
  <div v-if="pending" class="reader-loading"><el-skeleton :rows="5" animated /></div>
  <el-alert v-else-if="failed" :title="$t('shareMessageUnavailable')" type="warning" :closable="false" show-icon />
  <template v-else>
   <div class="reader-body"><ShadowHtml :html="bodyHtml" /></div>
   <section v-if="files.length" class="reader-attachments">
    <h3>{{ $t('attachments') }} · {{ files.length }}</h3>
    <button v-for="att in files" :key="att.attId" class="reader-file" type="button" :disabled="!!downloading" @click="download(att)">
     <Icon icon="mingcute:attachment-line" width="18" height="18" /><span>{{ att.filename || 'download' }}</span><small>{{ formatBytes(att.size || 0) }}</small><Icon :icon="downloading === att.attId ? 'mingcute:loading-line' : 'mingcute:download-2-line'" width="18" height="18" />
    </button>
   </section>
  </template>
 </el-dialog>
</template>
<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import ShadowHtml from '@/components/shadow-html/index.vue';
import { emailDocument } from '@/utils/email-html';
import { useSettingStore } from '@/store/setting.js';
import { useServerStore } from '@/store/server.js';
import { formatBytes } from '@/utils/file-utils';
import { useI18n } from 'vue-i18n';
const props = defineProps({ message: { type: Object, required: true }, token: { type: String, required: true } });
const visible = defineModel({ type: Boolean });
defineEmits(['closed']);
const { t } = useI18n();
const pending = ref(true), failed = ref(false), bodyHtml = ref(''), attachments = ref([]), downloading = ref(null);
const files = computed(() => attachments.value.filter(att => !att.inline));
const controller = new AbortController(), urls = new Set();
let disposed = false;
async function request(path, extra = {}) {
 const response = await fetch(useServerStore().getActiveBaseURL().replace(/\/$/, '') + '/mail-share/' + path, {
  method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal,
  headers: { 'Content-Type': 'application/json', 'accept-language': useSettingStore().lang },
  body: JSON.stringify({ token: props.token, emailId: props.message.emailId, ...extra }),
 });
 if (!response.ok) throw new Error('unavailable');
 return response;
}
function plainHtml(text) {
 const pre = document.createElement('pre');
 pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:0';
 const source = String(text || '');
 let offset = 0;
 for (const match of source.matchAll(/https?:\/\/[^\s<>"']+/g)) {
  const url = match[0].replace(/[.,!?;:，。！？；：]+$/, '');
  pre.append(document.createTextNode(source.slice(offset, match.index)));
  const a = document.createElement('a'); a.href = url; a.textContent = url; pre.append(a);
  offset = match.index + url.length;
 }
 pre.append(document.createTextNode(source.slice(offset)));
 return pre.outerHTML;
}
async function attachmentBlob(att) {
 const response = await request('attachment', { attId: att.attId });
 if (response.headers.get('Content-Type')?.includes('application/json')) throw new Error('unavailable');
 return response.blob();
}
function objectUrl(blob) { const url = URL.createObjectURL(blob); urls.add(url); return url; }
async function load() {
 try {
  const result = await (await request('content')).json();
  if (disposed) return;
  if (result.code !== 200) throw new Error('unavailable');
  attachments.value = result.data.attachments || [];
  const doc = new DOMParser().parseFromString(emailDocument(result.data.content || plainHtml(result.data.text)), 'text/html');
  const images = [...doc.querySelectorAll('img')];
  const inline = attachments.value.map(att => ({ att, images: images.filter(img => img.getAttribute('src') === 'cid:share-' + att.attId) })).filter(item => item.images.length);
  for (const item of inline) for (const image of item.images) image.removeAttribute('src');
  bodyHtml.value = doc.documentElement.outerHTML;
  pending.value = false;
  await Promise.allSettled(inline.map(async ({att,images}) => {
   const blob = await attachmentBlob(att);
   if (disposed || !blob.type.startsWith('image/')) return;
   const url = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
   });
   if (!disposed) for (const image of images) image.src = url;
  }));
  if (!disposed && inline.length) bodyHtml.value = doc.documentElement.outerHTML;
 } catch {
  if (!disposed) { failed.value = true; pending.value = false; }
 }
}
async function download(att) {
 if (downloading.value) return;
 downloading.value = att.attId;
 try {
  const blob = await attachmentBlob(att);
  if (disposed) return;
  const url = objectUrl(blob), a = document.createElement('a');
  a.href = url; a.download = att.filename || 'download'; a.click();
 } catch { if (!disposed) ElMessage.warning(t('shareMessageUnavailable')); }
 finally { downloading.value = null; }
}
load();
watch(visible, value => { if (!value) controller.abort(); });
onUnmounted(() => { disposed = true; controller.abort(); for (const url of urls) URL.revokeObjectURL(url); });
</script>
<style scoped>
.reader-meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--el-border-color-lighter); font-size: 12px; }
.reader-meta > div { min-width: 0; display: grid; gap: 5px; overflow-wrap: anywhere; }
.reader-meta span, .reader-meta time { color: var(--el-text-color-secondary); }
.reader-meta time { flex-shrink: 0; }
.reader-loading { padding: 16px 0 32px; }
.reader-body { background: #fff; padding: 16px; border-radius: 8px; border: 1px solid var(--el-border-color-lighter); }
.reader-attachments { margin-top: 24px; }
.reader-attachments h3 { font-size: 13px; font-weight: 500; margin: 0 0 12px; }
.reader-file { display: flex; align-items: center; width: 100%; gap: 10px; text-align: left; padding: 12px; margin-top: 8px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; cursor: pointer; color: var(--el-text-color-primary); }
.reader-file span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.reader-file svg, .reader-file small { flex-shrink: 0; color: var(--el-text-color-secondary); }
.reader-file:hover { border-color: var(--el-color-primary); }
.reader-file:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
@media (max-width: 600px) { .reader-meta { flex-direction: column; gap: 10px; } .reader-body { padding: 12px; } .reader-file { flex-wrap: wrap; } }
</style>
<style>
.shared-reader .el-dialog__title { display: block; padding-right: 20px; overflow-wrap: anywhere; }
.shared-reader .el-dialog__body { max-height: 78vh; overflow-y: auto; }
</style>
