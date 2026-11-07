<template>
  <div class="email-list-box">
    <emailScroll ref="sysEmailScroll"
                 :get-emailList="getEmailList"
                 :email-delete="allEmailDelete"
                 :star-add="starAdd"
                 :star-cancel="starCancel"
                 :show-star="false"
                 show-user-info
                 show-status
                 actionLeft="4px"
                 :show-account-icon="false"
                 :time-sort="params.timeSort"
                 :item-height="65"
                 @jump="jumpContent"
                 @refresh-before="refreshBefore"
                 @right-search="rightSearch"
                 :type="'all-email'"

    >
      <template #first>
<div class="mail-search-fields">
        <el-input
            v-model="searchValue"
            :placeholder="$t('searchByContent')"
            class="search-input"
            @keyup.enter="search"
        >
          <template #prefix>
            <div @click.stop="openSelect">
              <el-select
                  ref="mySelect"
                  v-model="params.searchType"
                  :placeholder="$t('select')"
                  class="select"
              >
                <el-option key="3" :label="$t('sender')" :value="'name'"/>
                <el-option key="4" :label="$t('subject')" :value="'subject'"/>
                <el-option key="1" :label="$t('user')" :value="'user'"/>
                <el-option key="2" :label="$t('selectEmail')" :value="'account'"/>
                <el-option :label="$t('sendEmailAddress')" value="sendEmail" />
                <el-option :label="$t('toEmail')" value="toEmail" />
              </el-select>
              <div class="search-type">
                <span>{{ selectTitle }}</span>
                <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-select v-model="params.type" :aria-label="$t('adminMailType')" class="status-select" @change="typeSelectChange">
          <el-option key="1" :label="$t('all')" value="all"/>
          <el-option key="3" :label="$t('received')" value="receive"/>
          <el-option key="2" :label="$t('sent')" value="send"/>
          <el-option key="4" :label="$t('selectDeleted')" value="delete"/>
          <el-option key="4" :label="$t('noRecipientTitle')" value="noone"/>
        </el-select>
        </div>
</template>
<template #tools>
<el-tooltip :content="$t('searchAction')" placement="top">
          <button type="button" class="mail-tool-button" :aria-label="$t('searchAction')" @click="search"><Icon icon="mingcute:search-line" width="18" height="18" /></button>
        </el-tooltip>
        <el-tooltip :content="$t('sortByTime')" placement="top">
          <button type="button" class="mail-tool-button" :aria-label="$t('sortByTime')" @click="changeTimeSort"><Icon :icon="params.timeSort === 0 ? 'mingcute:sort-descending-line' : 'mingcute:sort-ascending-line'" width="18" height="18" /></button>
        </el-tooltip>
        <el-popover v-model:visible="showFilters" trigger="click" placement="bottom-end" :width="330" popper-class="mail-filter-popover">
          <template #reference><button type="button" class="mail-tool-button" :class="{ 'is-active': activeFilterCount }" :aria-label="$t('adminMailFilters')" :aria-expanded="showFilters" @click="openFilters"><Icon icon="mingcute:filter-line" width="18" height="18" /><span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span></button></template>
          <div class="mail-filters">
            <strong>{{ $t('adminMailFilters') }}</strong>
            <div class="mail-filter-field"><span>{{ $t('adminDateRange') }}</span><el-date-picker v-model="filterDates" type="daterange" value-format="YYYY-MM-DD" :start-placeholder="$t('adminStartDate')" :end-placeholder="$t('adminEndDate')" :editable="false" unlink-panels /></div>
            <div class="mail-filter-field"><span>{{ $t('adminDeliveryStatus') }}</span><el-select :teleported="false" v-model="filterDraft.deliveryStatus"><el-option :label="$t('all')" value="" /><el-option v-for="status in deliveryStatuses" :key="status.value" :label="$t(status.label)" :value="status.value" /></el-select></div>
            <div class="mail-filter-grid">
              <div class="mail-filter-field"><span>{{ $t('adminAttachmentFilter') }}</span><el-select :teleported="false" v-model="filterDraft.hasAttachments"><el-option :label="$t('all')" value="" /><el-option :label="$t('adminWithAttachments')" value="1" /><el-option :label="$t('adminWithoutAttachments')" value="0" /></el-select></div>
              <div class="mail-filter-field"><span>{{ $t('adminCodeFilter') }}</span><el-select :teleported="false" v-model="filterDraft.hasCode"><el-option :label="$t('all')" value="" /><el-option :label="$t('adminWithCode')" value="1" /><el-option :label="$t('adminWithoutCode')" value="0" /></el-select></div>
            </div>
            <div class="mail-filter-field"><span>{{ $t('adminReadFilter') }}</span><el-select :teleported="false" v-model="filterDraft.unread"><el-option :label="$t('all')" value="" /><el-option :label="$t('adminUnread')" value="0" /><el-option :label="$t('adminRead')" value="1" /></el-select></div>
            <div class="mail-filter-actions"><el-button size="small" @click="resetFilters">{{ $t('reset') }}</el-button><el-button size="small" type="primary" @click="applyFilters">{{ $t('adminApplyFilters') }}</el-button></div>
          </div>
        </el-popover>
        <el-tooltip :content="$t('batchDelete')" placement="top">
          <button type="button" class="mail-tool-button desktop-mail-action" :aria-label="$t('batchDelete')" @click="openBathDelete"><Icon icon="mingcute:broom-line" width="18" height="18" /></button>
        </el-tooltip>
      </template>
<template #more-actions><el-dropdown-item @click="openBathDelete"><Icon icon="mingcute:broom-line" width="18" height="18" />{{ $t('batchDelete') }}</el-dropdown-item></template>
    </emailScroll>
    <el-dialog v-model="showBathDelete" :title="$t('clearEmail')" width="335"
               @closed="closedClear">
      <div class="clear-email">
        <el-input v-model="clearParams.sendName" :placeholder="$t('sender')"/>
        <el-input v-model="clearParams.subject" :placeholder="$t('subject')"/>
        <el-input v-model="clearParams.sendEmail" :placeholder="$t('sendEmailAddress')"/>
        <el-input v-model="clearParams.toEmail" :placeholder="$t('toEmail')"/>
        <el-date-picker popper-class="my-date-picker"
                        v-model="clearTime"
                        type="daterange"
                        :teleported="false"
                        unlink-panels
                        :range-separator="t('to')"
                        size="default"
        />
        <div class="clear-button">
          <el-select v-model="clearParams.type" style="width: 200px">
            <el-option key="eq" :label="t('equal')" value="eq"/>
            <el-option key="left" :label="t('leading')" value="left"/>
            <el-option key="include" :label="t('include')" value="include"/>
          </el-select>
          <el-button :loading="clearLoading" type="primary" @click="batchDelete">{{ t('clear') }}</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {starAdd, starCancel} from "@/request/star.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {computed, defineOptions, reactive, ref, watch, onMounted, onBeforeUnmount} from "vue";
import {useEmailStore} from "@/store/email.js";
import {
  allEmailList,
  allEmailDelete,
  allEmailBatchDelete,
  allEmailLatest
} from "@/request/all-email.js";
import {Icon} from "@iconify/vue";
import router from "@/router/index.js";
import {useI18n} from 'vue-i18n';
import {toUtc} from "@/utils/day.js";
import {sleep} from "@/utils/time-utils.js";
import {useSettingStore} from "@/store/setting.js";
import { useRoute } from 'vue-router'

defineOptions({
  name: 'all-email'
})

const route = useRoute()
const {t} = useI18n();
const emailStore = useEmailStore();
const settingStore = useSettingStore();
const clearTime = ref('')
const sysEmailScroll = ref({})
const searchValue = ref('')
const mySelect = ref()
const showBathDelete = ref(false)
const clearLoading = ref(false)
let stopped = false
onBeforeUnmount(() => { stopped = true })
const showFilters = ref(false)
const filterDates = ref(null)
const appliedFilterDates = ref(null)
const filterDraft = reactive({ deliveryStatus: '', unread: '', hasAttachments: '', hasCode: '' })
const deliveryStatuses = [
  { value: '0', label: 'received' }, { value: '1', label: 'sent' }, { value: '2', label: 'delivered' },
  { value: '3', label: 'bounced' }, { value: '4', label: 'complained' }, { value: '5', label: 'adminDeliveryDelayed' },
  { value: '7', label: 'noRecipientTitle' }, { value: '8', label: 'adminDeliveryFailed' },
]

onMounted(() => {
  latest();
})

const openSelect = () => {
  mySelect.value.toggleMenu()
}

const params = reactive({
  timeSort: 0,
  type: 'receive',
  userEmail: null,
  accountEmail: null,
  name: null,
  subject: null,
  searchType: 'name',
  sendEmail: null,
  toEmail: null,
  deliveryStatus: '', unread: '', hasAttachments: '', hasCode: '', startTime: '', endTime: '',
})

const clearParams = reactive({
  subject: '',
  sendEmail: '',
  sendName: '',
  startTime: '',
  toEmail: '',
  endTime: '',
  type: 'eq',
})

function resetClearParams() {
  clearParams.subject = ''
  clearParams.sendEmail = ''
  clearParams.sendName = ''
  clearParams.startTime = ''
  clearParams.toEmail = ''
  clearParams.endTime = ''
}

function closedClear() {
  resetClearParams()
  clearParams.type = 'eq'
  clearParams.endTime = ''
  clearTime.value = null
}

const selectTitle = computed(() => {
  if (params.searchType === 'user') return t('user')
  if (params.searchType === 'account') return t('selectEmail')
  if (params.searchType === 'name') return t('sender')
  if (params.searchType === 'subject') return t('subject')
  if (params.searchType === 'sendEmail') return t('sendEmailAddress')
  if (params.searchType === 'toEmail') return t('toEmail')
})
const activeFilterCount = computed(() => ['deliveryStatus', 'unread', 'hasAttachments', 'hasCode', 'startTime'].filter(key => params[key] !== '').length)
function openFilters() {
  for (const key of Object.keys(filterDraft)) filterDraft[key] = params[key]
  filterDates.value = appliedFilterDates.value ? [...appliedFilterDates.value] : null
}
function applyFilters() {
  Object.assign(params, filterDraft)
  appliedFilterDates.value = filterDates.value?.length ? [...filterDates.value] : null
  const start = filterDates.value?.length ? new Date(filterDates.value[0] + 'T00:00:00') : null
  const end = filterDates.value?.length ? new Date(filterDates.value[1] + 'T00:00:00') : null
  if (end) end.setDate(end.getDate() + 1)
  params.startTime = start ? toUtc(start).format('YYYY-MM-DD HH:mm:ss') : ''
  params.endTime = end ? toUtc(end).format('YYYY-MM-DD HH:mm:ss') : ''
  showFilters.value = false
  search()
}
function resetFilters() {
  Object.assign(filterDraft, { deliveryStatus: '', unread: '', hasAttachments: '', hasCode: '' })
  filterDates.value = null
  applyFilters()
}

const paramsStar = localStorage.getItem('all-email-params')
if (paramsStar) {
  const locaParams = JSON.parse(paramsStar)
  params.type = locaParams.type
  params.timeSort = locaParams.timeSort
  params.status = locaParams.status
  params.searchType = locaParams.searchType
}

watch(() => params, () => {
  localStorage.setItem('all-email-params', JSON.stringify(params))
}, {
  deep: true
})

function openBathDelete() {
  showBathDelete.value = true
}

function batchDelete() {

  if (clearTime.value) {
    clearParams.startTime = toUtc(clearTime.value[0]).format("YYYY-MM-DD HH:mm:ss")
    clearParams.endTime = toUtc(clearTime.value[1]).add(1, 'day').format("YYYY-MM-DD HH:mm:ss")
  }

  if (!clearParams.sendEmail && !clearParams.sendName && !clearParams.subject && !clearParams.toEmail && !clearTime.value) {
    showBathDelete.value = false
    return
  }

  ElMessageBox.confirm(
      t('delAllConfirm'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      }
  ).then(() => {
    clearLoading.value = true

    allEmailBatchDelete(clearParams).then(() => {
      ElMessage({
        message: t('clearSuccess'),
        type: "success",
        plain: true
      })
      resetClearParams()
      sysEmailScroll.value.refreshList();
    }).finally(() => {
      clearLoading.value = false
    })
  })
}

function rightSearch(type, value) {
  params.searchType = type;
  searchValue.value = value;
  search();
}

function refreshBefore() {
  syncSearch()
}

function syncSearch() {

  params.userEmail = null
  params.accountEmail = null
  params.name = null
  params.subject = null
  params.sendEmail = null
  params.toEmail = null

  if (params.searchType === 'user') {
    params.userEmail = searchValue.value
  }

  if (params.searchType === 'account') {
    params.accountEmail = searchValue.value
  }

  if (params.searchType === 'name') {
    params.name = searchValue.value
  }

  if (params.searchType === 'subject') {
    params.subject = searchValue.value
  }
  if (['sendEmail', 'toEmail'].includes(params.searchType)) params[params.searchType] = searchValue.value
}
function search() {
  syncSearch()
  sysEmailScroll.value.refreshList();
}

function changeTimeSort() {
  params.timeSort = params.timeSort ? 0 : 1
  search()
}

function typeSelectChange() {
  search()
}

function jumpContent(email) {
  emailStore.contentData.email = email
  emailStore.contentData.delType = 'physics'
  emailStore.contentData.showStar = false
  emailStore.contentData.showReply = false
  router.push({name: 'content'})
}


function getEmailList(emailId, size) {
  return allEmailList({emailId, size, ...params})
}

async function latest() {

  while (!stopped) {

    let autoRefresh = settingStore.settings.autoRefresh;

    await sleep(autoRefresh > 1 ? autoRefresh * 1000 : 3000);
    if (stopped) break

    const latestId = sysEmailScroll.value.latestEmail?.emailId

    if (autoRefresh < 2) {
      continue
    }

    if (!latestId && latestId !== 0) {
      continue
    }

    if (route.name !== 'all-email') {
      continue
    }

    // 页面不可见时暂停请求，恢复可见后继续
    if (document.hidden) {
      continue
    }

    if (params.type !== 'receive') {
      continue
    }

    try {

      const curTimeSort = params.timeSort
      const filterSnapshot = JSON.stringify(params)
      let list = await allEmailLatest(latestId, { ...params })

      if (list.length === 0) {
        continue
      }

      if (params.type !== 'receive') {
        continue
      }

      // 确保回来之后条件没变
      if (params.timeSort !== curTimeSort || JSON.stringify(params) !== filterSnapshot) {
        continue
      }

      for (let email of list) {

        sysEmailScroll.value.addItem(email)
        await sleep(50)

      }

    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        settingStore.settings.autoRefresh = 0;
      }
      console.error(e)
    }

  }
}

</script>
<style>

@media (max-width: 767px) {
  .el-date-range-picker .el-picker-panel__body {
    min-width: auto;

  }

  .my-date-picker::after {
    content: "";
    position: absolute; /* 脱离文档流，不会撑开 */
    left: 0;
    right: 0;
    height: 20px;
    background: transparent; /* 方便看效果 */
  }

  .el-date-range-picker__content {
    width: 100%;
  }

  .el-date-range-picker {
    width: 300px;
  }

  .el-tooltip .el-picker_popper {
    padding-bottom: 200px;
  }

  .el-date-range-picker__content.is-left {
    border-right: 0;
  }
}

</style>
<style scoped lang="scss">
.email-list-box {
  height: 100%;
  width: 100%;
  overflow: hidden;
}


.search {
  padding-top: 5px;
  padding-bottom: 5px;
}

.select {
  position: absolute;
  width: 40px;
  opacity: 0;
  pointer-events: none;
}

.search-type {
  display: flex;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
  .setting-icon { flex: 0 0 20px; }
}

:deep(.header-actions) {
  padding-top: 8px;
  padding-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .header-left {
    gap: 6px;
    flex: 1;
    flex-wrap: wrap;
    overflow: visible;
  }

  .header-tools { gap: 6px; }

  .header-right { margin-left: auto; }

  .icon {
    flex-shrink: 0;
  }
}

.mail-search-fields { display: flex; align-items: center; flex: 1 1 240px; gap: 8px; min-width: 0; }
@media (max-width: 767px) {
  :deep(.admin-mail-toolbar) {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 8px 4px;
    padding: 12px;
    > .el-checkbox { grid-row: 2; grid-column: 1; margin: 0; justify-content: center; }
    .header-left { display: contents; }
    .header-tools { grid-row: 2; grid-column: 2; gap: 4px; }
    .header-right { grid-row: 2; grid-column: 3; margin-left: 0; }
    .email-count { font-size: 12px; }
    .desktop-mail-action { display: none; }
  }
  .mail-search-fields { grid-row: 1; grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) 104px; gap: 8px; }
  .mail-search-fields .search-input { width: 100%; min-width: 0; max-width: none; }
  .mail-search-fields .status-select { width: 100%; min-width: 104px; }
  .mail-search-fields .status-select :deep(.el-select__wrapper) { height: 36px; min-height: 36px; }
  .mail-search-fields :deep(.el-input__wrapper), .mail-search-fields :deep(.el-select__wrapper) { min-height: 36px; height: 36px; }
  .mail-tool-button { min-width: 36px; min-height: 36px; }
}

.search-input {
  flex: 1 1 120px;
  min-width: 80px;
  max-width: 280px;

  :deep(.el-input__wrapper) {
    height: 28px;
    box-sizing: border-box;
    padding: 0 8px;
  }

  :deep(.el-input__inner) {
    height: 28px;
  }

  .setting-icon {
    position: relative;
    top: 3px;
  }
}

.clear-email {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 15px;

  .el-button {
    width: 100%;
  }
}

.status-select {
  flex-shrink: 0;
  width: 92px;
  min-width: 92px;

  :deep(.el-select__suffix), :deep(.el-select__caret) { flex-shrink: 0; }

  :deep(.el-select__wrapper) {
    height: 28px;
    box-sizing: border-box;
    padding: 0 6px;
    min-height: 28px;
  }
}

.input-with-select {
  max-width: 200px;
  border-radius: 0 4px 4px 0;
}

:deep(.input-with-select .el-input-group__append) {
  background-color: var(--el-fill-color-blank);
}

:deep(.el-select__wrapper) {
  height: 28px;
  box-sizing: border-box;
  min-height: unset;
}

:deep(.el-date-editor.el-input__wrapper) {
  width: 303px;
}

.icon {
  cursor: pointer;
}
.mail-tool-button { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; padding: 0; color: var(--el-text-color-secondary); background: transparent; border: 0; border-radius: 6px; cursor: pointer; }
.mail-tool-button:hover, .mail-tool-button:focus-visible { color: var(--el-text-color-primary); background: var(--el-fill-color-light); outline: none; }
.mail-tool-button.is-active { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
:deep(.header-actions .header-left > .icon) { color: var(--el-text-color-secondary); }
.filter-count { position: absolute; top: -3px; right: -3px; min-width: 12px; padding: 0 2px; border-radius: 6px; background: var(--el-color-primary); color: white; font-size: 9px; line-height: 12px; }
.mail-filters { display: flex; flex-direction: column; gap: 15px; }
.mail-filters > strong { font-size: 13px; font-weight: 600; }
.mail-filters .mail-filter-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; font-size: 12px; }
.mail-filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mail-filter-actions { display: flex; justify-content: flex-end; }
.mail-filters :deep(.el-date-editor) { width: 100%; box-sizing: border-box; }
</style>
