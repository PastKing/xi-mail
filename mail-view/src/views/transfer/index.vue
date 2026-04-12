<template>
  <div class="transfer-box">
    <div class="header-actions">
      <el-tooltip :content="$t('refresh')" placement="bottom">
        <Icon class="icon" icon="ion:reload" width="20" height="20" @click="loadAll" />
      </el-tooltip>
    </div>

    <div class="transfer-body">
      <!-- 左栏：发起转移 -->
      <div class="col-left">
        <div class="section-title">
          <Icon icon="mingcute:transfer-3-line" width="14" height="14" />
          {{ $t('initiateTransfer') }}
        </div>
        <div class="create-card">
          <div class="form-field">
            <div class="field-label">{{ $t('transferFromAccount') }}</div>
            <el-select
              v-model="createForm.accountId"
              :placeholder="$t('selectAccount')"
              filterable
              style="width:100%"
              :loading="accountsLoading"
            >
              <el-option
                v-for="acc in myAccounts"
                :key="acc.accountId"
                :label="acc.email"
                :value="acc.accountId"
              />
            </el-select>
          </div>
          <div class="form-field">
            <div class="field-label">{{ $t('transferTargetId') }}</div>
            <el-input
              v-model="createForm.toDisplayId"
              :placeholder="$t('transferTargetIdPlaceholder')"
              clearable
            />
          </div>
          <el-button
            type="primary"
            :loading="createLoading"
            :disabled="!createForm.accountId || !createForm.toDisplayId"
            @click="doCreate"
            style="width:100%;margin-top:4px"
          >
            <Icon icon="mingcute:transfer-3-line" width="14" height="14" style="margin-right:5px" />
            {{ $t('transferAccount') }}
          </el-button>
          <div class="create-hint">
            <Icon icon="mingcute:information-line" width="13" height="13" style="flex-shrink:0;margin-top:1px" />
            {{ $t('transferHint') }}
          </div>
        </div>
      </div>

      <!-- 右栏：各类请求列表 -->
      <div class="col-right">
        <!-- 待处理：收到的请求 -->
        <div class="section">
          <div class="section-title">
            <Icon icon="mingcute:inbox-2-line" width="14" height="14" />
            {{ $t('transferIncoming') }}
            <el-badge v-if="incomingTransfers.length > 0" :value="incomingTransfers.length" type="danger" class="section-badge" />
          </div>
          <div v-if="!incomingLoading && incomingTransfers.length === 0" class="empty-hint">
            {{ $t('noMoreData') }}
          </div>
          <div v-loading="incomingLoading" element-loading-background="transparent">
            <div v-for="item in incomingTransfers" :key="item.transferId" class="transfer-card incoming">
              <div class="card-left">
                <div class="card-avatar incoming-avatar">
                  <Icon icon="hugeicons:mailbox-01" width="15" height="15" />
                </div>
                <div class="card-info">
                  <div class="card-email">{{ item.accountEmail }}</div>
                  <div class="card-time">{{ tzDayjs(item.createTime).format('YYYY-MM-DD HH:mm') }}</div>
                </div>
              </div>
              <div class="card-actions">
                <el-button size="small" type="primary" @click="doAccept(item)">
                  <Icon icon="mingcute:check-line" width="13" height="13" style="margin-right:3px"/>
                  {{ $t('acceptTransfer') }}
                </el-button>
                <el-button size="small" @click="doReject(item)">{{ $t('rejectTransfer') }}</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 已处理：收到记录 -->
        <div class="section">
          <div class="section-title">
            <Icon icon="mingcute:time-line" width="14" height="14" />
            {{ $t('transferReceivedHistory') }}
          </div>
          <div v-if="!receivedHistoryLoading && receivedHistory.length === 0" class="empty-hint">
            {{ $t('noMoreData') }}
          </div>
          <div v-loading="receivedHistoryLoading" element-loading-background="transparent">
            <div v-for="item in receivedHistory" :key="item.transferId" class="transfer-card">
              <div class="card-left">
                <div class="card-avatar">
                  <Icon icon="hugeicons:mailbox-01" width="15" height="15" />
                </div>
                <div class="card-info">
                  <div class="card-email">{{ item.accountEmail }}</div>
                  <div class="card-time">{{ tzDayjs(item.createTime).format('YYYY-MM-DD HH:mm') }}</div>
                </div>
              </div>
              <el-tag :type="item.status === 1 ? 'success' : 'info'" size="small" round>
                {{ $t('transferStatus' + item.status) }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 发起的请求 -->
        <div class="section">
          <div class="section-title">
            <Icon icon="mingcute:send-plane-line" width="14" height="14" />
            {{ $t('transferOutgoing') }}
          </div>
          <div v-if="!sentLoading && sentTransfers.length === 0" class="empty-hint">
            {{ $t('noMoreData') }}
          </div>
          <div v-loading="sentLoading" element-loading-background="transparent">
            <div v-for="item in sentTransfers" :key="item.transferId" class="transfer-card">
              <div class="card-left">
                <div class="card-avatar">
                  <Icon icon="hugeicons:mailbox-01" width="15" height="15" />
                </div>
                <div class="card-info">
                  <div class="card-email">{{ item.accountEmail }}</div>
                  <div class="card-time">{{ tzDayjs(item.createTime).format('YYYY-MM-DD HH:mm') }}</div>
                </div>
              </div>
              <el-tag
                :type="item.status === 0 ? 'warning' : item.status === 1 ? 'success' : 'info'"
                size="small" round
              >
                {{ $t('transferStatus' + item.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, defineOptions } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import {
  transferCreate, transferAccept, transferReject,
  transferPendingList, transferSentList, transferReceivedHistory
} from '@/request/account-transfer.js'
import { accountList } from '@/request/account.js'
import { tzDayjs } from '@/utils/day.js'
import { useTransferStore } from '@/store/transfer.js'
import { ElMessage } from 'element-plus'

defineOptions({ name: 'transfer' })

const { t } = useI18n()
const transferStore = useTransferStore()

const incomingTransfers = ref([])
const sentTransfers = ref([])
const receivedHistory = ref([])
const incomingLoading = ref(false)
const sentLoading = ref(false)
const receivedHistoryLoading = ref(false)

const myAccounts = ref([])
const accountsLoading = ref(false)
const createLoading = ref(false)
const createForm = reactive({ accountId: null, toDisplayId: '' })

async function loadMyAccounts() {
  accountsLoading.value = true
  try {
    const list = await accountList(0, 200, null)
    myAccounts.value = list
    if (list.length > 0 && !createForm.accountId) createForm.accountId = list[0].accountId
  } finally { accountsLoading.value = false }
}

async function doCreate() {
  if (!createForm.accountId || !createForm.toDisplayId) return
  createLoading.value = true
  try {
    await transferCreate({ accountId: createForm.accountId, toDisplayId: createForm.toDisplayId })
    ElMessage({ message: t('transferCreateSuccess'), type: 'success', plain: true })
    createForm.toDisplayId = ''
    sentTransfers.value = await transferSentList()
  } catch(e) {
    ElMessage({ message: e?.message || t('error'), type: 'error', plain: true })
  } finally { createLoading.value = false }
}

async function loadAll() {
  incomingLoading.value = true
  sentLoading.value = true
  receivedHistoryLoading.value = true
  const [incoming, sent, history] = await Promise.all([
    transferPendingList(), transferSentList(), transferReceivedHistory()
  ])
  incomingTransfers.value = incoming
  sentTransfers.value = sent
  receivedHistory.value = history
  transferStore.pendingCount = incoming.length
  incomingLoading.value = false
  sentLoading.value = false
  receivedHistoryLoading.value = false
}

async function doAccept(item) {
  try {
    await transferAccept(item.transferId)
    ElMessage({ message: t('transferAcceptSuccess'), type: 'success', plain: true })
    incomingTransfers.value = incomingTransfers.value.filter(i => i.transferId !== item.transferId)
    transferStore.pendingCount = incomingTransfers.value.length
    receivedHistory.value = await transferReceivedHistory()
    loadMyAccounts()
  } catch(e) { ElMessage({ message: e?.message || t('error'), type: 'error', plain: true }) }
}

async function doReject(item) {
  try {
    await transferReject(item.transferId)
    ElMessage({ message: t('transferRejectSuccess'), type: 'success', plain: true })
    incomingTransfers.value = incomingTransfers.value.filter(i => i.transferId !== item.transferId)
    transferStore.pendingCount = incomingTransfers.value.length
    receivedHistory.value = await transferReceivedHistory()
  } catch(e) { ElMessage({ message: e?.message || t('error'), type: 'error', plain: true }) }
}

onMounted(() => { loadAll(); loadMyAccounts() })
</script>

<style lang="scss" scoped>
.transfer-box {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 顶部操作栏，与 user/reg-key 等页面完全一致 */
.header-actions {
  padding: 10px 16px;
  display: flex;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 18px;
  flex-shrink: 0;

  .icon {
    cursor: pointer;
    color: var(--el-text-color-secondary);
    transition: color 0.15s;
    &:hover { color: var(--el-text-color-primary); }
  }
}

/* 主体：左右两栏，溢出滚动 */
.transfer-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 14px;
  }
}

/* 左栏：发起转移 */
.col-left {
  position: sticky;
  top: 0;
  @media (max-width: 900px) {
    position: static;
  }
}

/* 右栏：各请求列表 */
.col-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* Section 标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .section-badge {
    margin-left: 2px;
    :deep(.el-badge__content) {
      font-size: 10px;
      height: 15px;
      line-height: 15px;
      padding: 0 5px;
      min-width: 15px;
    }
  }
}

/* 发起表单卡片 */
.create-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--xi-radius);
  padding: 16px;
  background: var(--el-bg-color);
  box-shadow: var(--xi-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  .field-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }
}

.create-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 1.5;
}

/* 无数据提示 */
.empty-hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  padding: 10px 0;
}

/* 转移记录卡片 */
.transfer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--xi-radius-sm);
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 6px;
  background: var(--el-bg-color);
  transition: border-color 0.15s, box-shadow 0.15s;

  &:last-child { margin-bottom: 0; }

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: var(--xi-shadow-sm);
  }

  &.incoming {
    border-left: 3px solid var(--el-color-primary-light-3);
  }
}

.card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.card-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;

  &.incoming-avatar {
    background: rgba(99, 102, 241, 0.08);
    color: var(--el-color-primary);
  }
}

.card-info {
  min-width: 0;
  .card-email {
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--el-text-color-primary);
  }
  .card-time {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
