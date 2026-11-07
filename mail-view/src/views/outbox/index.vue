<template>
 <div class="personal-mail-page">
  <emailScroll ref="scroll" :get-email-list="getEmailList" :email-delete="deleteItems" :star-add="starAdd" :star-cancel="starCancel" :star-success="addStar" :cancel-success="cancelStar" :time-sort="timeSort" show-status type="outbox" @jump="openItem">
   <template #first><button class="xi-icon-button" :aria-label="$t('sortByTime')" @click="changeSort"><Icon :icon="timeSort ? 'mingcute:sort-ascending-line' : 'mingcute:sort-descending-line'" width="18" height="18" /></button></template>
   <template #tools><MailSearchBar v-model="searchFilters" :show-unread="false" @search="refresh" /></template>
   <template #name="{email}">{{ email.isDraft ? email.name || '('+$t('noRecipient')+')' : email.name }}</template>
   <template #subject="{email}"><span v-if="email.isDraft" class="outbox-draft-label">{{ $t('draftLabel') }}</span>{{ email.subject || '('+$t('noSubject')+')' }}</template>
  </emailScroll>
 </div>
</template>
<script setup>
import { markRaw, onMounted, onUnmounted, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useRouter } from 'vue-router';
import emailScroll from '@/components/email-scroll/index.vue';
import MailSearchBar from '@/components/MailSearchBar.vue';
import { emailList, emailDelete } from '@/request/email.js';
import { starAdd, starCancel } from '@/request/star.js';
import { useAccountStore } from '@/store/account.js';
import { useEmailStore } from '@/store/email.js';
import { userDraftStore } from '@/store/draft.js';
import { useUiStore } from '@/store/ui.js';
import db from '@/db/db.js';
import { createOutboxFeed } from '@/utils/outbox-feed.js';
defineOptions({name:'send'});
const router = useRouter(), accountStore = useAccountStore(), emailStore = useEmailStore(), draftStore = userDraftStore(), ui = useUiStore();
const scroll = ref(), searchFilters = ref({}), timeSort = ref(0);
const feed = createOutboxFeed({ getDrafts:() => db.value.draft.toArray(), getSent:(cursor,size,scope) => emailList(scope.accountId,scope.allReceive,cursor,scope.timeSort,size,1,scope.filters) });
function getEmailList(cursor,size) { return feed(cursor,size,{accountId:accountStore.currentAccountId,allReceive:accountStore.currentAccount?.allReceive,timeSort:timeSort.value,filters:{...searchFilters.value}}); }
function refresh() { scroll.value?.refreshList(); }
function changeSort() { timeSort.value = timeSort.value ? 0 : 1; refresh(); }
watch(() => accountStore.currentAccountId,refresh);
watch(() => draftStore.refreshList,refresh);
// Sending must refresh the merged feed so active filters and draft removal still apply.
const sendActions = markRaw({ addItem:refresh,refreshList:refresh });
onMounted(() => { emailStore.sendScroll = sendActions; });
onUnmounted(() => { if (emailStore.sendScroll === sendActions) emailStore.sendScroll = null; });
async function openItem(email) {
 if (email.isDraft) {
  const stored = await db.value.draft.get(email.draftId);
  if (!stored) return refresh();
  const attachments = (await db.value.att.get(email.draftId))?.attachments || [];
  ui.writerRef.openDraft({...stored,attachments}); return;
 }
 Object.assign(emailStore.contentData,{email,delType:'logic',showStar:true,showReply:true});
 router.push('/message');
}
async function deleteItems(ids) {
 const sent = ids.filter(id => typeof id === 'number');
 const drafts = ids.filter(id => typeof id === 'string' && id.startsWith('draft:')).map(id => Number(id.slice(6)));
 if (sent.length) await emailDelete(sent);
 if (drafts.length) await db.value.transaction('rw',db.value.draft,db.value.att,async () => { await db.value.draft.bulkDelete(drafts);await db.value.att.bulkDelete(drafts); });
 refresh();
}
function addStar(email) { emailStore.starScroll?.addItem(email); }
function cancelStar(email) { emailStore.starScroll?.deleteEmail([email.emailId]); }
</script>
<style scoped>
.outbox-draft-label { color: var(--el-color-warning-dark-2); margin-right: 7px; font-size: 12px; font-weight: 500; }
</style>
