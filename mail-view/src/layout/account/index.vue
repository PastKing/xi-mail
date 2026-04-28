<template>
  <div class="account-box">
    <div class="head-opt">
      <Icon v-perm="'account:add'" class="icon add" icon="ion:add-outline" width="22" height="22" @click="add"/>
      <el-input
        v-model="searchKeyword"
        :placeholder="$t('searchAccount')"
        class="search-input"
        size="small"
        clearable
      >
        <template #prefix>
          <Icon icon="iconoir:search" width="14" height="14" />
        </template>
      </el-input>
      <Icon class="icon refresh" icon="ion:reload" width="16" height="16" @click="refresh"/>
    </div>

    <el-scrollbar class="scrollbar" ref="scrollbarRef">
      <div v-infinite-scroll="getAccountList" :infinite-scroll-distance="400" :infinite-scroll-immediate="false">
        <!-- Account rows -->
        <div
          v-for="(item, index) in filteredAccounts"
          :key="item.accountId"
          class="account-row"
          :class="{ 'row-active': accountStore.currentAccountId === item.accountId }"
          @click="changeAccount(item)"
        >
          <div class="row-left">
            <div class="row-icon" @click.stop="setAllReceive(item)">
              <Icon
                v-if="!item.allReceive"
                icon="eva:email-fill"
                width="15" height="15"
                class="icon-inbox"
              />
              <Icon
                v-else
                icon="flat-color-icons:folder"
                width="15" height="15"
              />
            </div>
            <span class="row-email">{{ item.email }}</span>
          </div>
          <div class="row-actions" @click.stop>
            <Icon
              icon="fluent-color:clipboard-24"
              width="16" height="16"
              class="action-icon"
              @click.stop="copyAccount(item.email)"
            />
            <el-dropdown trigger="click" placement="bottom-end">
              <Icon
                icon="mingcute:more-1-fill"
                width="16" height="16"
                class="action-icon"
              />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="hasPerm('email:send')" @click="openSetName(item)">{{ $t('rename') }}</el-dropdown-item>
                  <el-dropdown-item v-if="item.accountId !== userStore.user.account.accountId" @click="setAsTop(item, index)">{{ $t('pin') }}</el-dropdown-item>
                  <el-dropdown-item
                    v-if="item.accountId !== userStore.user.account.accountId && hasPerm('account:delete')"
                    @click="remove(item)"
                  >{{ $t('delete') }}</el-dropdown-item>
                  <el-dropdown-item @click="openTransfer(item)">{{ $t('transferAccount') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- No search results -->
        <div v-if="searchKeyword && filteredAccounts.length === 0 && !loading" class="empty-search">
          <Icon icon="iconoir:search" width="22" height="22" />
          <span>{{ $t('noMessagesFound') }}</span>
        </div>

        <!-- Initial Loading Skeleton -->
        <template v-if="loading">
          <div v-for="i in skeletonRows" :key="i" class="skeleton-row">
            <el-skeleton animated>
              <template #template>
                <div style="display:flex;align-items:center;gap:8px;padding:0 10px;">
                  <el-skeleton-item variant="circle" style="width:16px;height:16px;flex-shrink:0"/>
                  <el-skeleton-item variant="text" style="flex:1;height:14px"/>
                </div>
              </template>
            </el-skeleton>
          </div>
        </template>

        <!-- Follow Loading Skeleton -->
        <template v-if="accounts.length > 0 && !noLoading && !searchKeyword">
          <div class="skeleton-row">
            <el-skeleton animated>
              <template #template>
                <div style="display:flex;align-items:center;gap:8px;padding:0 10px;">
                  <el-skeleton-item variant="circle" style="width:16px;height:16px;flex-shrink:0"/>
                  <el-skeleton-item variant="text" style="flex:1;height:14px"/>
                </div>
              </template>
            </el-skeleton>
          </div>
        </template>

        <div class="foot-tip" v-if="noLoading && accounts.length > 0 && !searchKeyword">
          {{ accounts.length }} {{ $t('accountTotal') }}
        </div>
        <div class="empty" v-if="noLoading && accounts.length === 0">
          <el-empty :image-size="40" :description="$t('noMessagesFound')"/>
        </div>
      </div>
    </el-scrollbar>

    <!-- Add dialog -->
    <el-dialog v-model="showAdd" :title="$t('addAccount')">
      <div class="add-form">
        <div class="add-field">
          <label class="field-label">{{ $t('emailAccount') }}</label>
          <el-input
            v-model="addForm.email"
            ref="addRef"
            type="text"
            :placeholder="$t('emailAccount')"
            autocomplete="off"
          >
            <template #suffix>
              <el-tooltip :content="$t('randomPrefix')" placement="top">
                <Icon
                  icon="mingcute:refresh-2-line"
                  width="16" height="16"
                  class="rand-icon"
                  @click.stop="randomizePrefix"
                />
              </el-tooltip>
            </template>
          </el-input>
        </div>
        <div class="add-field">
          <label class="field-label">{{ $t('select') }}</label>
          <el-select v-model="addForm.suffix" style="width: 100%">
            <el-option v-for="item in domainList" :key="item" :label="item" :value="item"/>
          </el-select>
        </div>
        <div class="email-preview" v-if="addForm.email">
          <Icon icon="mingcute:mail-line" width="13" height="13" />
          <span>{{ addForm.email }}{{ addForm.suffix }}</span>
        </div>
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading">{{ $t('add') }}</el-button>
      </div>
      <div
        class="add-email-turnstile"
        :class="verifyShow ? 'turnstile-show' : 'turnstile-hide'"
        :data-sitekey="settingStore.settings.siteKey"
        data-callback="onTurnstileSuccess"
        data-error-callback="onTurnstileError"
      >
        <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
      </div>
    </el-dialog>

    <!-- Rename dialog -->
    <el-dialog v-model="setNameShow" :title="$t('changeUserName')">
      <div class="container">
        <el-input v-model="accountName" type="text" :placeholder="$t('username')" autocomplete="off"/>
        <el-button class="btn" type="primary" @click="setName" :loading="setNameLoading">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>

    <!-- Transfer dialog -->
    <el-dialog v-model="transferShow" :title="$t('transferAccountTitle')" width="400px">
      <div style="display: grid; gap: 12px; padding-bottom: 10px;">
        <div style="font-size: 13px; color: var(--el-text-color-secondary);">{{ $t('transferAccountDesc') }}</div>
        <div style="font-size: 13px;"><b>{{ transferAccount?.email }}</b></div>
        <el-input v-model="transferTargetId" :placeholder="$t('transferTargetIdPlaceholder')" />
        <el-button type="primary" :loading="transferLoading" @click="doTransfer">{{ $t('transferAccount') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { Icon } from "@iconify/vue";
import { nextTick, reactive, ref, computed, watch } from "vue";
import {
  accountList,
  accountAdd,
  accountDelete,
  accountSetName,
  accountSetAllReceive,
  accountSetAsTop
} from "@/request/account.js";
import { sleep } from "@/utils/time-utils.js";
import { isEmail } from "@/utils/verify-utils.js";
import { useSettingStore } from "@/store/setting.js";
import { useAccountStore } from "@/store/account.js";
import { useEmailStore } from "@/store/email.js";
import { useUserStore } from "@/store/user.js";
import { hasPerm } from "@/perm/perm.js";
import { useI18n } from "vue-i18n";
import { AccountAllReceiveEnum } from "@/enums/account-enum.js";
import { transferCreate } from '@/request/account-transfer.js';

const { t } = useI18n();
const userStore = useUserStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const emailStore = useEmailStore();

const showAdd = ref(false);
const addLoading = ref(false);
const domainList = settingStore.domainList;
const accounts = reactive([]);
const noLoading = ref(false);
const loading = ref(false);
const followLoading = ref(false);
const verifyShow = ref(false);
const setNameShow = ref(false);
const setNameLoading = ref(false);
const accountName = ref(null);
const addRef = ref({});
const scrollbarRef = ref({});
const searchKeyword = ref('');
let account = null;
let turnstileId = null;
const botJsError = ref(false);
let verifyToken = '';
let verifyErrorCount = 0;
let first = true;
const addForm = reactive({
  email: '',
  suffix: settingStore.domainList[0]
});
let skeletonRows = 8;
const queryParams = { size: 100 };

const transferShow = ref(false);
const transferLoading = ref(false);
const transferAccount = ref(null);
const transferTargetId = ref('');

// Filtered accounts based on search keyword
const filteredAccounts = computed(() => {
  if (!searchKeyword.value) return accounts;
  const kw = searchKeyword.value.toLowerCase();
  return accounts.filter(a =>
    a.email.toLowerCase().includes(kw) ||
    (a.name && a.name.toLowerCase().includes(kw))
  );
});

if (hasPerm('account:query')) {
  getAccountList();
}

watch(() => accountStore.changeUserAccountName, () => {
  if (accounts[0]) accounts[0].name = accountStore.changeUserAccountName;
});


window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) return;
  verifyErrorCount++;
  console.warn('人机验加载失败', e);
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.add-email-turnstile');
      } else {
        window.turnstile.reset(turnstileId);
      }
    });
  }, 1500);
};

window.onTurnstileSuccess = (token) => { verifyToken = token; };

function getSkeletonRows() {
  if (accounts.length > 15) return skeletonRows = 15;
  if (accounts.length === 0) return skeletonRows = 8;
  skeletonRows = accounts.length;
}

function setName() {
  let name = accountName.value;
  if (name === account.name) { setNameShow.value = false; return; }
  if (!name) {
    ElMessage({ message: t('emptyUserNameMsg'), type: 'error', plain: true });
    return;
  }
  setNameLoading.value = true;
  accountSetName(account.accountId, name).then(() => {
    account.name = name;
    setNameShow.value = false;
    if (account.accountId === userStore.user.account.accountId) userStore.user.name = name;
    ElMessage({ message: t('saveSuccessMsg'), type: 'success', plain: true });
  }).finally(() => { setNameLoading.value = false; });
}

function openSetName(accountItem) {
  accountName.value = accountItem.name;
  account = accountItem;
  setNameShow.value = true;
}

function setAllReceive(acc) {
  let allReceiveAccount = accounts.find(a => a.allReceive === AccountAllReceiveEnum.ENABLED);
  if (allReceiveAccount && allReceiveAccount.accountId !== acc.accountId) allReceiveAccount.allReceive = AccountAllReceiveEnum.DISABLED;
  acc.allReceive = acc.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
  accountSetAllReceive(acc.accountId).catch(() => {
    acc.allReceive = acc.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
    if (allReceiveAccount) allReceiveAccount.allReceive = AccountAllReceiveEnum.ENABLED;
  }).then(() => {
    if (acc.allReceive === AccountAllReceiveEnum.ENABLED) {
      ElMessage({ message: t('setSuccess'), type: 'success', plain: true });
    }
    changeAccount(acc);
    emailStore.emailScroll?.refreshList();
    emailStore.sendScroll?.refreshList();
  });
}

function remove(acc) {
  ElMessageBox.confirm(t('delConfirm', { msg: acc.email }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    accountDelete(acc.accountId).then(() => {
      const index = accounts.findIndex(item => item.accountId === acc.accountId);
      accounts.splice(index, 1);
      if (accounts.length < queryParams.size) getAccountList();
      ElMessage({ message: t('delSuccessMsg'), type: 'success', plain: true });
    });
  });
}

function refresh() {
  if (loading.value) return;
  loading.value = false;
  followLoading.value = false;
  noLoading.value = false;
  queryParams.accountId = 0;
  queryParams.lastSort = null;
  getSkeletonRows();
  scrollbarRef.value.setScrollTop(0);
  accounts.splice(0, accounts.length);
  getAccountList();
}

function changeAccount(acc) {
  accountStore.currentAccountId = acc.accountId;
  accountStore.currentAccount = acc;
}

function add() {
  showAdd.value = true;
  setTimeout(() => { addRef.value.focus(); }, 100);
}

function setAsTop(acc, index) {
  accountSetAsTop(acc.accountId).then(() => {
    ElMessage({ message: t('setSuccess'), type: 'success', plain: true });
    const [item] = accounts.splice(index, 1);
    accounts.splice(1, 0, item);
  });
}

async function copyAccount(email) {
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true });
  } catch (err) {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true });
  }
}

function getAccountList() {
  if (loading.value || followLoading.value || noLoading.value) return;
  if (accounts.length === 0) { loading.value = true; }
  else { followLoading.value = true; }
  let start = Date.now();
  const accountId = accounts.length > 0 ? accounts.at(-1).accountId : 0;
  const lastSort = accounts.length > 0 ? accounts.at(-1).sort : null;
  accountList(accountId, queryParams.size, lastSort).then(async list => {
    let duration = Date.now() - start;
    if (duration < 200) await sleep(200 - duration);
    if (list.length < queryParams.size) noLoading.value = true;
    if (accounts.length === 0 && list[0]) accountStore.currentAccount = list[0];
    accounts.push(...list);
    loading.value = false;
    followLoading.value = false;
    first = false;
  }).catch(() => {
    loading.value = false;
    followLoading.value = false;
  });
}

function randomizePrefix() {
  const len = settingStore.settings.randomPrefixLength || 8;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const first = 'abcdefghijklmnopqrstuvwxyz';
  result += first.charAt(Math.floor(Math.random() * first.length));
  for (let i = 1; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  addForm.email = result;
}

function openTransfer(item) {
  transferAccount.value = item;
  transferTargetId.value = '';
  transferShow.value = true;
}

async function doTransfer() {
  if (!transferTargetId.value) return;
  transferLoading.value = true;
  try {
    await transferCreate({ accountId: transferAccount.value.accountId, toDisplayId: transferTargetId.value });
    transferShow.value = false;
    ElMessage({ message: t('transferCreateSuccess'), type: 'success', plain: true });
  } finally {
    transferLoading.value = false;
  }
}

function submit() {
  if (!addForm.email) {
    ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true });
    return;
  }
  if (addForm.email.length < settingStore.settings.minEmailPrefix) {
    ElMessage({ message: t('minEmailPrefix', { msg: settingStore.settings.minEmailPrefix }), type: 'error', plain: true });
    return;
  }
  if (!isEmail(addForm.email + addForm.suffix)) {
    ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true });
    return;
  }
  if (!verifyToken && (settingStore.settings.addEmailVerify === 0 || (settingStore.settings.addEmailVerify === 2 && settingStore.settings.addVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true;
      nextTick(() => {
        if (!turnstileId) {
          try { turnstileId = window.turnstile.render('.add-email-turnstile'); }
          catch (e) { botJsError.value = true; }
        } else {
          window.turnstile.reset('.add-email-turnstile');
        }
      });
    } else if (!botJsError.value) {
      ElMessage({ message: t('botVerifyMsg'), type: 'error', plain: true });
    }
    return;
  }
  addLoading.value = true;
  accountAdd(addForm.email + addForm.suffix, verifyToken).then(acc => {
    addLoading.value = false;
    showAdd.value = false;
    addForm.email = '';
    accounts.push(acc);
    verifyToken = '';
    settingStore.settings.addVerifyOpen = acc.addVerifyOpen;
    ElMessage({ message: t('addSuccessMsg'), type: 'success', plain: true });
    verifyShow.value = false;
    userStore.refreshUserInfo();
  }).catch(res => {
    if (res.code === 400) {
      verifyToken = '';
      if (turnstileId) window.turnstile.reset(turnstileId);
      else nextTick(() => { turnstileId = window.turnstile.render('.add-email-turnstile'); });
      verifyShow.value = true;
    }
    addLoading.value = false;
  });
}
</script>

<style>
path[fill="#ffdda1"] { fill: #ffdd7d; }
</style>
<style scoped lang="scss">
.account-box {
  border-right: 1px solid var(--el-border-color-lighter) !important;
  background-color: var(--el-bg-color);
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.head-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0 8px;
  flex-shrink: 0;

  .icon {
    cursor: pointer;
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
    transition: color 0.15s;
    &:hover { color: var(--el-text-color-primary); }
  }

  .search-input {
    flex: 1;
    min-width: 0;
    :deep(.el-input__wrapper) {
      padding: 0 6px;
      box-shadow: none !important;
      background: var(--base-fill);
      border-radius: var(--xi-radius-sm);
    }
    :deep(.el-input__inner) {
      font-size: 12px;
    }
  }

  .refresh {
    color: var(--el-text-color-placeholder);
    &:hover { color: var(--el-text-color-primary); }
  }
}

.scrollbar {
  flex: 1;
  overflow: hidden;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  height: 34px;
  cursor: pointer;
  border-radius: var(--xi-radius-sm);
  margin: 1px 6px;
  transition: all 0.15s ease;
  gap: 4px;

  &:hover {
    background: var(--base-fill);
    .row-actions { opacity: 1; }
  }

  &.row-active {
    background: var(--el-color-primary-light-9);
    .row-email { font-weight: 600; color: var(--el-color-primary); }
    .row-actions { opacity: 1; }
  }

  .row-left {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    flex: 1;

    .row-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 2px;
      border-radius: 4px;
      transition: background 0.15s;
      &:hover { background: var(--el-fill-color); }
      .icon-inbox { color: #f59e0b; }
    }

    .row-email {
      font-size: 12.5px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--el-text-color-regular);
      line-height: 1;
    }
  }

  .row-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;

    .action-icon {
      cursor: pointer;
      padding: 3px;
      border-radius: 4px;
      color: var(--el-text-color-secondary);
      transition: all 0.15s;
      &:hover {
        background: var(--el-fill-color);
        color: var(--el-text-color-primary);
      }
    }
  }
}

.skeleton-row {
  height: 34px;
  display: flex;
  align-items: center;
  margin: 1px 6px;
}

.foot-tip {
  text-align: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  padding: 8px 0 6px;
}

.empty-search {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 0;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.btn {
  width: 100%;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 4px;
}

.add-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .field-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
  }
}

.rand-icon {
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  transition: color 0.15s;
  &:hover { color: var(--el-color-primary); }
}

.email-preview {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  font-size: 12.5px;
  color: var(--el-color-primary);
  font-family: monospace;
  border: 1px solid var(--el-border-color-lighter);
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}


.add-email-turnstile { margin-top: 15px; }
.turnstile-show { opacity: 1; }
.turnstile-hide {
  opacity: 0;
  pointer-events: none;
  position: fixed;
}
</style>
