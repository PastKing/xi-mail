<template>
 <main class="share-page">
  <header class="share-topbar">
   <div class="share-topbar-inner">
    <div class="share-brand"><BrandMark :size="26" /><span>{{ siteName }}</span><span class="brand-divider" /><span class="share-page-label">{{ $t('shareTitle') }}</span></div>
    <span class="connection-state" :class="{ 'is-connected': data, 'is-unavailable': failed }"><span class="status-dot" />{{ $t(failed ? 'shareConnectionEnded' : data ? 'shareConnected' : 'shareConnecting') }}</span>
   </div>
  </header>
  <div class="shared-mail">
   <section v-if="failed" class="share-state result-state" role="alert">
    <span class="state-symbol"><Icon :icon="retryable ? 'mingcute:refresh-2-line' : 'mingcute:unlink-line'" width="32" height="32" /></span>
    <span class="section-label">{{ $t('shareTitle') }}</span>
    <h1>{{ $t(retryable ? 'shareLoadFailed' : 'shareUnavailable') }}</h1>
    <p>{{ $t(retryable ? 'shareTryAgain' : 'shareUnavailableHint') }}</p>
    <el-button v-if="retryable" class="retry-button" @click="refresh"><Icon icon="mingcute:refresh-2-line" width="17" height="17" />{{ $t('refresh') }}</el-button>
   </section>
   <section v-else-if="!data" class="share-state result-state" aria-live="polite" aria-busy="true">
    <span class="state-symbol loading-symbol"><Icon icon="mingcute:mail-line" width="32" height="32" /></span>
    <h1>{{ $t('shareLoading') }}</h1><p>{{ $t('shareLoadingHint') }}</p>
    <div class="loading-track" aria-hidden="true"><span /></div>
   </section>
   <template v-else>
    <section class="share-heading">
     <div class="mailbox-heading">
      <span class="section-label">{{ $t('shareMailbox') }}</span>
      <div class="mailbox-address"><h1>{{ data.email }}</h1><button type="button" class="address-copy xi-icon-button" :aria-label="$t('shareCopyAddress')" @click="copy(data.email, 'address')"><Icon :icon="copied === 'address' ? 'mingcute:check-line' : 'mingcute:copy-2-line'" width="18" height="18" /></button></div>
      <p>{{ $t('shareMailboxHint') }}</p>
     </div>
     <div class="share-actions">
      <div class="mobile-expiry"><span>{{ $t('shareTimeRemaining') }}</span><time :datetime="remainingDuration">{{ remainingTime }}</time></div>
      <el-button class="refresh-button" :loading="loading" @click="refresh"><Icon icon="mingcute:refresh-2-line" width="17" height="17" />{{ $t('refresh') }}</el-button>
     </div>
    </section>
    <div class="share-workspace">
     <section class="code-inbox" :aria-label="$t('shareCodeInbox')">
      <div class="inbox-heading"><h2>{{ $t('shareCodeInbox') }}<span class="message-count">{{ data.messages.length }}</span></h2><span>{{ $t('shareUpdatedAt', { time: updatedTime }) }}</span></div>
      <div v-if="!data.messages.length" class="share-state waiting-state">
       <span class="state-symbol"><Icon icon="mingcute:inbox-line" width="32" height="32" /></span>
       <h2>{{ $t('shareWaiting') }}</h2><p>{{ $t('shareWaitingHint') }}</p>
       <span class="waiting-indicator"><span class="status-dot" />{{ $t('shareAutoRefresh') }}</span>
      </div>
      <div v-else class="share-messages" aria-live="polite" aria-relevant="additions text">
       <template v-for="(item,index) in data.messages" :key="item.emailId">
        <h3 v-if="index === 1" class="previous-heading">{{ $t('sharePreviousCodes') }}</h3>
        <article :class="{ 'latest-message': index === 0 }">
         <div v-if="index === 0" class="latest-label"><span class="status-dot" />{{ $t('shareLatestCode') }}</div>
         <div class="message-heading">
          <span class="sender-icon" aria-hidden="true"><Icon icon="mingcute:mail-line" width="18" height="18" /></span>
          <div class="sender-info"><strong>{{ item.name || item.sendEmail }}</strong><span v-if="item.name" class="sender-address">{{ item.sendEmail }}</span></div>
          <time>{{ formatTime(item.createTime) }}</time>
         </div>
         <h3 class="message-subject"><button type="button" @click="openMessage(item)">{{ item.subject || $t('shareReadMail') }}</button></h3>
         <button v-if="item.code?.trim()" class="code-button" :class="{ 'is-copied': copied === item.emailId }" type="button" :aria-label="$t('shareCopyCode') + ' ' + item.code" @click="copy(item.code, item.emailId)">
          <span class="code-value">{{ item.code }}</span>
          <span class="code-copy-label"><Icon :icon="copied === item.emailId ? 'mingcute:check-line' : 'mingcute:copy-2-line'" width="18" height="18" /><span>{{ $t(copied === item.emailId ? 'copySuccess' : 'shareCopyCode') }}</span></span>
         </button>
         <p v-else-if="item.preview" class="message-preview">{{ item.preview }}</p>
         <div class="message-actions"><el-button text @click="openMessage(item)">{{ $t('shareReadMail') }}<Icon icon="mingcute:arrow-right-line" width="16" height="16" /></el-button></div>
        </article>
       </template>
      </div>
      <el-button v-if="data.hasMore" class="load-more" :loading="loadingMore" @click="loadMore">{{ $t('shareLoadMore') }}</el-button>
     </section>
     <aside class="share-details" :aria-label="$t('shareLinkDetails')">
      <section class="expiry-panel">
       <div class="details-label"><Icon icon="mingcute:time-line" width="17" height="17" /><h2>{{ $t('shareTimeRemaining') }}</h2></div>
       <time class="expiry-countdown" :datetime="remainingDuration">{{ remainingTime }}</time>
       <div class="expiry-deadline"><span>{{ $t('shareExpires') }}</span><time :datetime="new Date(data.expiresAt).toISOString()">{{ new Date(data.expiresAt).toLocaleString() }}</time></div>
      </section>
      <section class="scope-panel">
       <div class="details-label"><Icon icon="mingcute:information-line" width="17" height="17" /><h2>{{ $t('shareLinkDetails') }}</h2></div>
       <p>{{ $t('shareScopeShort') }}</p>
       <div class="refresh-note"><Icon icon="mingcute:refresh-2-line" width="15" height="15" /><span>{{ $t('shareAutoRefresh') }}</span></div>
       <p class="share-holder-note">{{ $t('shareHolderNote') }}</p>
      </section>
     </aside>
    </div>
    <footer>{{ $t('shareRecentLimit') }}</footer>
    <SharedMailReader v-if="selectedMessage" v-model="readerVisible" :message="selectedMessage" :token="token" @closed="selectedMessage = null" />
   </template>
  </div>
 </main>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useSettingStore } from '@/store/setting.js';
import { useServerStore } from '@/store/server.js';
import BrandMark from '@/components/BrandMark.vue';
import SharedMailReader from '@/components/SharedMailReader.vue';
const { t } = useI18n();
const siteName = computed(() => useSettingStore().settings.title || 'Xi-Mail');
const route = useRoute();
const token = computed(() => route.hash.slice(1));
const data = ref(null), failed = ref(false), retryable = ref(false), loading = ref(false);
const now = ref(Date.now()), updatedAt = ref(null), copied = ref(null);
const selectedMessage = ref(null), readerVisible = ref(false), loadingMore = ref(false);
let moreController;
let listEpoch = 0;
let readEpoch = 0;
let timer, clockTimer, copyTimer, disposed = false, controller;
const remainingSeconds = computed(() => Math.max(0, Math.ceil(((data.value?.expiresAt || 0) - now.value) / 1000)));
const remainingDuration = computed(() => `PT${remainingSeconds.value}S`);
const remainingTime = computed(() => {
 const seconds = remainingSeconds.value;
 return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
});
const updatedTime = computed(() => updatedAt.value ? new Date(updatedAt.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const formatTime = value => new Date(value.replace(' ', 'T') + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
async function refresh() {
 if (loading.value || disposed) return;
 clearTimeout(timer);
 if (data.value?.expiresAt <= Date.now()) { data.value = null; failed.value = true; retryable.value = false; return; }
 const epoch = ++readEpoch;
 loading.value = true;
 try {
  if (!/^[a-f0-9]{64}$/.test(token.value)) { failed.value = true; return; }
  controller = new AbortController();
  const response = await fetch(useServerStore().getActiveBaseURL().replace(/\/$/,'') + '/mail-share/read', {
   method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
   headers: { 'Content-Type': 'application/json', 'accept-language': useSettingStore().lang },
   body: JSON.stringify({ token: token.value }), signal: controller.signal,
  });
  const result = await response.json();
  if (disposed || epoch !== readEpoch) return;
  if (result.code !== 200) { data.value = null; failed.value = true; retryable.value = result.code !== 404; return; }
  const next = result.data;
  // Keep already loaded earlier pages while the newest page continues to refresh.
  const overlaps = next.messages.some(item => data.value?.messages.some(previous => previous.emailId === item.emailId));
  if (next.hasMore && data.value?.messages.length && overlaps) {
   const oldest = next.messages[next.messages.length - 1]?.emailId;
   const earlier = data.value.messages.filter(item => item.emailId < oldest);
   if (earlier.length) {
    next.messages.push(...earlier);
    next.hasMore = data.value.hasMore; next.nextCursor = data.value.nextCursor;
   }
  }
  if (data.value?.messages.length && !overlaps) { listEpoch++; moreController?.abort(); }
  data.value = next; failed.value = false; retryable.value = false;
  now.value = Date.now(); updatedAt.value = now.value;
 } catch (e) {
  if (!disposed && epoch === readEpoch) { data.value = null; failed.value = true; retryable.value = true; }
 } finally {
  if (!disposed && epoch === readEpoch) {
   loading.value = false;
   if (data.value) timer = setTimeout(refresh, Math.min(15000, Math.max(0, data.value.expiresAt - Date.now())));
  }
 }
}
function openMessage(item) { selectedMessage.value = item; readerVisible.value = true; }
async function loadMore() {
 if (loadingMore.value || !data.value?.hasMore || disposed) return;
 loadingMore.value = true;
 const cursor = data.value.nextCursor;
 const epoch = listEpoch;
 moreController = new AbortController();
 try {
  const response = await fetch(useServerStore().getActiveBaseURL().replace(/\/$/, '') + '/mail-share/read', {
   method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: moreController.signal,
   headers: { 'Content-Type': 'application/json', 'accept-language': useSettingStore().lang }, body: JSON.stringify({ token: token.value, before: cursor }),
  });
  const result = await response.json();
  if (disposed || !data.value || epoch !== listEpoch) return;
  if (result.code === 404) { data.value = null; failed.value = true; retryable.value = false; return; }
  if (result.code !== 200) throw new Error('unavailable');
  const known = new Set(data.value.messages.map(item => item.emailId));
  data.value.messages.push(...result.data.messages.filter(item => !known.has(item.emailId)));
  data.value.hasMore = result.data.hasMore; data.value.nextCursor = result.data.nextCursor;
 } catch { if (!disposed && epoch === listEpoch && data.value) ElMessage.warning(t('shareTryAgain')); }
 finally { if (epoch === listEpoch) loadingMore.value = false; }
}
watch(token, () => {
 readEpoch++; listEpoch++; controller?.abort(); moreController?.abort();
 clearTimeout(timer); clearTimeout(copyTimer);
 data.value = null; selectedMessage.value = null; readerVisible.value = false; copied.value = null;
 failed.value = false; retryable.value = false; loading.value = false; loadingMore.value = false;
 refresh();
});
watch(data, value => {
 if (!value) { selectedMessage.value = null; readerVisible.value = false; moreController?.abort(); }
});
async function copy(value, target) {
 try {
  await navigator.clipboard.writeText(value);
  copied.value = target;
  clearTimeout(copyTimer); copyTimer = setTimeout(() => { copied.value = null; }, 2000);
 }
 catch { ElMessage.warning(t('shareCopyManual')); }
}
onMounted(() => {
 const meta = document.createElement('meta'); meta.name = 'referrer'; meta.content = 'no-referrer'; meta.dataset.mailShare = '';
 document.head.appendChild(meta); refresh();
 clockTimer = setInterval(() => { now.value = Date.now(); }, 1000);
});
onUnmounted(() => {
 disposed = true; clearTimeout(timer); clearTimeout(copyTimer); clearInterval(clockTimer);
 controller?.abort(); moreController?.abort(); document.querySelector('meta[data-mail-share]')?.remove();
});
</script>
<style scoped>
.share-page {
 --share-accent-fill: color-mix(in srgb, var(--el-color-primary) 7%, var(--el-bg-color));
 --share-accent-border: color-mix(in srgb, var(--el-color-primary) 25%, var(--el-border-color-lighter));
 --share-accent-text: color-mix(in srgb, var(--el-color-primary) 80%, var(--el-text-color-primary));
 --share-success-text: color-mix(in srgb, var(--el-color-success) 70%, var(--el-text-color-primary));
 min-height: 100dvh; background: var(--el-fill-color-lighter); color: var(--el-text-color-primary); font-size: 14px;
}
.share-topbar { background: var(--el-bg-color); border-bottom: 1px solid var(--el-border-color-lighter); }
.share-topbar-inner { max-width: 1096px; min-height: 76px; margin: 0 auto; padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.share-brand { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 18px; font-weight: 650; }
.share-brand > span:not(.xi-brand-mark):not(.brand-divider) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brand-divider { height: 16px; width: 1px; margin: 0 6px; background: var(--el-border-color); flex-shrink: 0; }
.share-brand .share-page-label { color: var(--el-text-color-secondary); font-size: 13px; font-weight: 400; }
.connection-state { display: inline-flex; align-items: center; gap: 7px; color: var(--el-text-color-secondary); border: 1px solid var(--el-border-color-lighter); border-radius: 20px; background: var(--el-fill-color-lighter); padding: 5px 11px; font-size: 12px; flex-shrink: 0; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.connection-state.is-connected { color: var(--share-success-text); background: color-mix(in srgb, var(--el-color-success) 7%, var(--el-bg-color)); border-color: color-mix(in srgb, var(--el-color-success) 20%, var(--el-border-color-lighter)); }
.shared-mail { max-width: 1096px; margin: 0 auto; padding: 48px 28px 32px; }
.share-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 34px; }
.mailbox-heading { min-width: 0; }
.section-label { font-size: 12px; color: var(--el-text-color-secondary); letter-spacing: 1px; }
.mailbox-address { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
h1 { margin: 0; font-size: 28px; line-height: 1.4; font-weight: 600; letter-spacing: -.5px; overflow-wrap: anywhere; min-width: 0; }
.address-copy { flex-shrink: 0; }
.share-actions { display: flex; align-items: center; gap: 24px; flex-shrink: 0; }
.mobile-expiry { display: none; }
p { margin: 0; color: var(--el-text-color-secondary); line-height: 1.8; }
.refresh-button { min-height: 36px; padding: 8px 14px; flex-shrink: 0; }
.refresh-button :deep(span), .retry-button :deep(span) { gap: 6px; }
.share-workspace { display: grid; grid-template-columns: minmax(0,1fr) 272px; gap: 28px; align-items: start; }
.code-inbox { min-width: 0; }
.inbox-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.inbox-heading h2 { display: flex; align-items: center; gap: 9px; margin: 0; font-size: 14px; font-weight: 600; }
.message-count { font-size: 11px; font-weight: 500; line-height: 20px; min-width: 20px; text-align: center; background: var(--el-fill-color-dark); border-radius: 6px; padding: 0 5px; color: var(--el-text-color-secondary); }
.inbox-heading > span { font-size: 12px; color: var(--el-text-color-placeholder); }
.share-messages { display: grid; gap: 12px; }
article { min-width: 0; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); padding: 22px; }
article.latest-message { padding: 26px; border-color: var(--share-accent-border); border-radius: 16px; }
.latest-label { display: flex; align-items: center; gap: 7px; color: var(--share-accent-text); font-size: 12px; font-weight: 500; margin-bottom: 22px; }
.message-heading { display: flex; align-items: center; gap: 10px; }
.sender-icon { width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; color: var(--el-text-color-secondary); background: var(--el-fill-color-lighter); flex-shrink: 0; }
.sender-info { display: grid; gap: 3px; flex: 1; min-width: 0; }
.sender-info strong { font-size: 13px; font-weight: 550; overflow-wrap: anywhere; }
.sender-address { color: var(--el-text-color-secondary); font-size: 12px; overflow-wrap: anywhere; }
.message-heading > time { font-size: 11px; color: var(--el-text-color-placeholder); flex-shrink: 0; }
.message-subject { font-size: 14px; font-weight: 400; line-height: 1.6; margin: 16px 0; overflow-wrap: anywhere; }
.message-subject button { display: block; text-align: left; color: inherit; cursor: pointer; overflow-wrap: anywhere; max-width: 100%; }
.message-subject button:hover { color: var(--share-accent-text); }
.message-preview { font-size: 13px; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.message-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
.message-actions :deep(.el-button) { min-height: 36px; font-size: 12px; }
.message-actions :deep(.el-button > span) { gap: 6px; }
.load-more { width: 100%; margin-top: 16px; min-height: 36px; }
.code-button { display: flex; align-items: center; justify-content: space-between; gap: 20px; width: 100%; border: 1px solid var(--el-border-color-lighter); border-radius: 9px; background: var(--el-fill-color-lighter); color: inherit; padding: 14px 18px; cursor: pointer; text-align: left; transition: border-color .15s, background-color .15s; }
.code-value { font: 600 25px/1.3 ui-monospace,monospace; font-variant-numeric: tabular-nums; letter-spacing: 3px; overflow-wrap: anywhere; min-width: 0; }
.code-copy-label { display: flex; align-items: center; justify-content: center; gap: 7px; color: var(--el-text-color-secondary); flex-shrink: 0; font-size: 12px; }
.latest-message .code-button { background: var(--share-accent-fill); border-color: transparent; padding: 22px; }
.latest-message .code-value { font-size: 42px; letter-spacing: 5px; color: var(--share-accent-text); }
.code-button:hover, .code-button.is-copied { border-color: var(--el-color-primary-light-5); }
.code-button.is-copied .code-copy-label { color: var(--share-success-text); }
.code-button:focus-visible, .address-copy:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 3px; }
.previous-heading { margin: 14px 0 0; font-weight: 500; font-size: 12px; color: var(--el-text-color-secondary); }
.share-details { margin-top: 35px; border: 1px solid var(--el-border-color-lighter); border-radius: 14px; background: var(--el-bg-color); overflow: hidden; }
.expiry-panel, .scope-panel { padding: 22px; }
.scope-panel { border-top: 1px solid var(--el-border-color-lighter); }
.details-label { display: flex; align-items: center; gap: 7px; color: var(--el-text-color-secondary); }
.details-label h2 { margin: 0; font-size: 12px; font-weight: 500; }
.expiry-countdown { display: block; font: 500 30px/1.4 ui-monospace,monospace; font-variant-numeric: tabular-nums; letter-spacing: 1px; margin: 14px 0; }
.expiry-deadline { display: grid; gap: 4px; color: var(--el-text-color-secondary); font-size: 11px; }
.scope-panel p { font-size: 12px; margin-top: 12px; }
.refresh-note { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--el-text-color-secondary); margin-top: 15px; }
.refresh-note svg { flex-shrink: 0; }
.scope-panel .share-holder-note { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--el-border-color-lighter); color: var(--el-text-color-placeholder); }
.share-state { display: flex; flex-direction: column; align-items: center; text-align: center; }
.result-state { max-width: 560px; margin: 48px auto 80px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter); border-radius: 18px; padding: 48px 32px; }
.state-symbol { width: 76px; height: 76px; border: 1px solid var(--el-border-color-lighter); border-radius: 22px; background: var(--el-fill-color-lighter); color: var(--el-text-color-secondary); display: grid; place-items: center; margin-bottom: 26px; }
.result-state .section-label { margin-bottom: 8px; }
.result-state h1 { font-size: 23px; letter-spacing: 0; }
.result-state p { max-width: 360px; margin-top: 14px; font-size: 13px; }
.retry-button { margin-top: 26px; }
.waiting-state { min-height: 324px; justify-content: center; padding: 36px 24px; border: 1px solid var(--el-border-color-lighter); border-radius: 16px; background: var(--el-bg-color); }
.waiting-state .state-symbol { color: var(--share-accent-text); background: var(--share-accent-fill); border-color: transparent; width: 68px; height: 68px; margin-bottom: 20px; }
.waiting-state h2 { font-size: 18px; font-weight: 500; margin: 0 0 8px; }
.waiting-state p { font-size: 13px; }
.waiting-indicator { display: inline-flex; align-items: center; gap: 7px; color: var(--el-text-color-placeholder); font-size: 11px; margin-top: 24px; }
.loading-track { width: 160px; height: 3px; border-radius: 4px; overflow: hidden; background: var(--el-fill-color); margin-top: 30px; }
.loading-track span { display: block; width: 50%; height: 100%; background: var(--el-color-primary); animation: share-loading 1.4s ease-in-out infinite alternate; }
footer { font-size: 11px; line-height: 1.7; color: var(--el-text-color-placeholder); margin-top: 24px; }
@keyframes share-loading { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) { .loading-track span { animation: none; } .code-button { transition: none; } }
@media (max-width: 800px) {
 .share-workspace { grid-template-columns: minmax(0,1fr); gap: 20px; }
 .share-details { margin-top: 0; }
 .expiry-panel { display: none; }
 .scope-panel { border-top: none; }
 .mobile-expiry { display: grid; gap: 4px; }
 .mobile-expiry > span { font-size: 11px; color: var(--el-text-color-secondary); }
 .mobile-expiry > time { font: 500 22px/1.3 ui-monospace,monospace; font-variant-numeric: tabular-nums; }
}
@media (max-width: 540px) {
 .share-topbar-inner { min-height: 64px; padding: 15px 20px; gap: 10px; }
 .share-brand { font-size: 16px; gap: 8px; }
 .brand-divider, .share-page-label { display: none; }
 .connection-state { font-size: 11px; padding: 4px 9px; }
 .shared-mail { padding: 30px 20px 24px; }
 .share-heading { display: block; margin-bottom: 24px; }
 h1 { font-size: 23px; }
 .mailbox-address { gap: 6px; }
 .mailbox-heading > p { font-size: 12px; }
 .share-actions { margin-top: 20px; justify-content: space-between; }
 article, article.latest-message { padding: 20px; }
 .message-heading { flex-wrap: wrap; gap: 8px; }
 .message-heading > time { width: 100%; padding-left: 44px; }
 .latest-label { margin-bottom: 18px; }
 .latest-message .code-button { padding: 18px 14px; gap: 10px; }
 .latest-message .code-value { font-size: 32px; letter-spacing: 3px; }
 .code-copy-label > span { display: none; }
 .code-button { gap: 10px; padding: 12px 14px; }
 .scope-panel { padding: 20px; }
 .result-state { margin: 24px auto 48px; padding: 36px 22px; }
 .result-state h1 { font-size: 21px; }
}
</style>
