<template>
 <div class="mail-search-control">
  <el-popover v-model:visible="opened" :width="360" trigger="click" placement="bottom-start" popper-class="personal-mail-search-popover" @show="keywordInput?.focus()">
   <template #reference><button type="button" class="xi-icon-button mail-search-toggle" :class="{'is-active': hasSearch}" :aria-label="$t('mailSearchOpen')" :aria-expanded="opened"><Icon icon="mingcute:search-line" width="18" height="18" /><span v-if="hasSearch" class="filter-dot" /></button></template>
   <form class="personal-mail-filter-form" @submit.prevent="apply">
    <h3>{{ $t('mailSearchOpen') }}</h3>
    <el-input ref="keywordInput" v-model="draft.keyword" :placeholder="$t('mailSearchPlaceholder')" :aria-label="$t('mailSearchPlaceholder')" maxlength="512" clearable />
    <label>{{ $t('mailSearchField') }}<el-select v-model="draft.searchType" :aria-label="$t('mailSearchField')"><el-option v-for="item in fields" :key="item.value" :label="$t(item.label)" :value="item.value" /></el-select></label>
    <div class="mail-filter-dates">
     <label>{{ $t('adminStartDate') }}<el-date-picker v-model="startDate" type="date" :aria-label="$t('adminStartDate')" popper-class="personal-mail-date" /></label>
     <label>{{ $t('adminEndDate') }}<el-date-picker v-model="endDate" type="date" :aria-label="$t('adminEndDate')" popper-class="personal-mail-date" /></label>
    </div>
    <label v-if="showUnread">{{ $t('adminReadFilter') }}<el-select v-model="draft.unread" :empty-values="[null,undefined]" :aria-label="$t('adminReadFilter')"><el-option :label="$t('all')" value="" /><el-option :label="$t('adminUnread')" value="0" /><el-option :label="$t('adminRead')" value="1" /></el-select></label>
    <label>{{ $t('adminCodeFilter') }}<el-select v-model="draft.hasCode" :empty-values="[null,undefined]" :aria-label="$t('adminCodeFilter')"><el-option :label="$t('all')" value="" /><el-option :label="$t('adminWithCode')" value="1" /><el-option :label="$t('adminWithoutCode')" value="0" /></el-select></label>
    <div class="search-filter-actions"><el-button @click="reset">{{ $t('oauthReset') }}</el-button><el-button native-type="submit" type="primary">{{ $t('searchAction') }}</el-button></div>
   </form>
  </el-popover>
  <button v-if="hasSearch" type="button" class="mail-search-summary" :aria-label="$t('mailSearchClear')" @click="reset"><span>{{ filters.keyword || $t('mailSearchFiltersActive') }}</span><Icon icon="mingcute:close-line" width="13" height="13" /></button>
 </div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
const filters = defineModel({ type: Object, default: () => ({}) });
const props = defineProps({ showUnread: { type: Boolean, default: true } });
const emit = defineEmits(['search']);
const { t } = useI18n();
const draft = reactive({ keyword: '', searchType: 'all', unread: '', hasCode: '' });
const startDate = ref(null), endDate = ref(null), opened = ref(false), keywordInput = ref(null);
const fields = [{value:'all',label:'mailSearchAll'},{value:'subject',label:'mailSearchSubject'},{value:'sender',label:'mailSearchSender'},{value:'recipient',label:'mailSearchRecipient'},{value:'content',label:'mailSearchContent'}];
const hasSearch = computed(() => !!(filters.value.keyword || filters.value.startTime || filters.value.endTime || filters.value.unread !== undefined || filters.value.hasCode !== undefined));
const utc = d => d.toISOString().slice(0,19).replace('T',' ');
watch(opened, value => {
 if (!value) return;
 Object.assign(draft,{keyword:filters.value.keyword || '',searchType:filters.value.searchType || 'all',unread:filters.value.unread ?? '',hasCode:filters.value.hasCode ?? ''});
 startDate.value = filters.value.startTime ? new Date(filters.value.startTime.replace(' ','T')+'Z') : null;
 endDate.value = filters.value.endTime ? new Date(filters.value.endTime.replace(' ','T')+'Z') : null;
 if (endDate.value) endDate.value.setDate(endDate.value.getDate()-1);
});
function apply() {
 if (startDate.value && endDate.value && startDate.value > endDate.value) { ElMessage.warning(t('mailSearchDateInvalid')); return; }
 const next = { keyword: draft.keyword.trim(), searchType: draft.searchType };
 if (props.showUnread && draft.unread !== '') next.unread = draft.unread;
 if (draft.hasCode !== '') next.hasCode = draft.hasCode;
 if (startDate.value) next.startTime = utc(startDate.value);
 if (endDate.value) { const end = new Date(endDate.value); end.setDate(end.getDate()+1); next.endTime = utc(end); }
 filters.value = next; opened.value = false; emit('search');
}
function reset() { Object.assign(draft,{ keyword:'',searchType:'all',unread:'',hasCode:'' }); startDate.value = null; endDate.value = null; apply(); }
</script>
<style scoped>
.mail-search-control { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.mail-search-toggle { position: relative; flex-shrink: 0; }
.mail-search-toggle.is-active { color: var(--el-color-primary); }
.filter-dot { position: absolute; width: 5px; height: 5px; right: 3px; top: 3px; border-radius: 50%; background: var(--el-color-primary); }
.mail-search-summary { display: inline-flex; align-items: center; gap: 5px; max-width: 150px; min-width: 0; border: 0; border-radius: 5px; padding: 4px 6px; font-size: 12px; background: var(--el-fill-color-light); color: var(--el-text-color-regular); cursor: pointer; }
.mail-search-summary span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mail-search-summary svg { flex-shrink: 0; }
.personal-mail-filter-form { display: grid; gap: 12px; }
.personal-mail-filter-form h3 { font-size: 14px; font-weight: 500; margin: 0; }
.personal-mail-filter-form label { display: grid; gap: 6px; min-width: 0; font-size: 12px; color: var(--el-text-color-secondary); }
.mail-filter-dates { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px; }
.mail-filter-dates :deep(.el-date-editor) { width: 100%; min-width: 0; }
.search-filter-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 767px) { .mail-search-summary { display: none; } }
</style>
<style>
.personal-mail-page { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.personal-mail-page > .email-container { flex: 1; min-height: 0; height: auto; }
.personal-mail-search-popover { max-width: calc(100vw - 24px); box-sizing: border-box; }
.personal-mail-date .el-date-picker, .personal-mail-date .el-picker-panel__body-wrapper { max-width: calc(100vw - 24px); }
</style>
