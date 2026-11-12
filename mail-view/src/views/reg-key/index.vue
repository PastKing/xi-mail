<template>
  <div class="reg-key">
    <div class="header-actions">
      <el-tooltip :content="$t('addItem')" placement="top">
        <button type="button" class="xi-icon-button" :aria-label="$t('addItem')" @click="openAdd"><Icon icon="mingcute:add-line" width="18" height="18" /></button>
      </el-tooltip>
      <div class="search">
        <el-input
            v-model="params.code"
            class="search-input"
            :placeholder="$t('searchRegKeyDesc')"
            @keyup.enter="search"
        >
        </el-input>
      </div>
      <el-tooltip :content="$t('searchAction')" placement="top">
        <button type="button" class="xi-icon-button" :aria-label="$t('searchAction')" @click="search"><Icon icon="mingcute:search-line" width="18" height="18" /></button>
      </el-tooltip>
      <el-tooltip :content="$t('refresh')" placement="top">
        <button type="button" class="xi-icon-button" :aria-label="$t('refresh')" @click="refresh"><Icon icon="mingcute:refresh-2-line" width="18" height="18" /></button>
      </el-tooltip>
      <el-tooltip :content="$t('clearUnused')" placement="top">
        <button type="button" class="xi-icon-button" :aria-label="$t('clearUnused')" @click="clearNotUse"><Icon icon="mingcute:broom-line" width="18" height="18" /></button>
      </el-tooltip>
    </div>

    <el-scrollbar class="scrollbar">
      <div  class="loading" :class="regKeyLoading ? 'loading-show' : 'loading-hide'" :style="regKeyFirst ? 'background: transparent' : ''">
        <loading/>
      </div>
      <div class="code-box">
        <div class="code-item" v-for="item in regKeyData">
          <div class="code-info">
            <div class="info-left">
              <div class="info-left-item">
                <span class="code" @click="copyCode(item.code)">{{ item.code }}</span>
              </div>
              <div class="info-left-item">
                <div>{{ $t('remainingUses') }}：</div>
                <div v-if="item.count">{{ item.count }}</div>
                <el-tag v-else type="danger">{{ $t('exhausted') }}</el-tag>
              </div>
              <div class="info-left-item">
                <div>{{ $t('roleDesc') }}：</div>
                <el-tag>{{ item.roleName }}</el-tag>
              </div>
              <div class="info-left-item">
                <div>{{ $t('validUntil') }}：</div>
                <div v-if="item.expireTime">{{ formatExpireTime(item.expireTime) }}</div>
                <el-tag v-else type="danger">{{ $t('expired') }}</el-tag>
              </div>
            </div>
            <div class="info-right">
              <el-dropdown class="setting">
                <button type="button" class="xi-icon-button" :aria-label="$t('moreNavigation')"><Icon icon="mingcute:settings-3-line" width="18" height="18" /></button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="copyCode(item.code)">{{ $t('copy') }}</el-dropdown-item>
                    <el-dropdown-item @click="openHistory(item)">{{ $t('history') }}</el-dropdown-item>
                    <el-dropdown-item @click="deleteRegKey(item)">{{ $t('delete') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
      <div class="empty" v-if="regKeyData.length === 0">
        <el-empty v-if="!regKeyFirst" :image-size="isMobile ? 120 : null" :description="$t('noCodeFound')"/>
      </div>
    </el-scrollbar>
    <el-dialog v-model="showAdd" class="invite-create-dialog" :title="$t('addRegKey')" @closed="resetForm" :close-on-click-modal="!addLoading" :close-on-press-escape="!addLoading" :show-close="!addLoading">
      <el-form class="invite-create-form" label-position="top" :disabled="addLoading" @submit.prevent="submit">
        <el-form-item :label="$t('regKey')">
        <el-input v-model="addForm.code" :aria-label="$t('regKey')" :maxlength="128" :placeholder="$t('regKey')" autocomplete="off">
          <template #suffix>
            <el-tooltip :content="$t('regenerate')" :trigger-keys="[]"><button type="button" class="xi-icon-button" :disabled="addLoading" :aria-label="$t('regenerate')" @click.stop="genCode"><Icon icon="mingcute:refresh-2-line" width="16" height="16" /></button></el-tooltip>
          </template>
        </el-input>
        </el-form-item>
        <div class="invite-form-grid">
        <el-form-item :label="$t('roleDesc')">
        <el-select v-model="addForm.roleId" :aria-label="$t('roleDesc')" filterable :placeholder="$t('roleDesc')">
          <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        </el-form-item>
        <el-form-item :label="$t('inviteUses')">
          <el-input-number v-model="addForm.count" :aria-label="$t('inviteUses')" controls-position="right" :precision="0" :min="1" :max="99999" />
        </el-form-item>
        </div>
        <el-form-item :label="$t('validUntil')">
        <el-date-picker
            v-model="addForm.expireTime"
            type="date"
            value-format="YYYY-MM-DD"
            popper-class="invite-date-popper"
            :aria-label="$t('validUntil')"
            :disabled-date="disabledExpiry"
            :placeholder="$t('validUntil')"
        />
        <div class="invite-expiry-presets"><el-button v-for="days in [7,30,90]" :key="days" size="small" :type="addForm.expireTime === expiryAfter(days) ? 'primary' : 'default'" plain @click="setExpiry(days)">{{ $t('inviteQuickExpiry',{days}) }}</el-button></div>
        <p class="invite-form-hint">{{ $t('inviteExpiryHint') }}</p>
        </el-form-item>
        <div class="invite-preview">
          <span class="invite-form-hint">{{ $t('invitePreview') }}</span>
          <button type="button" :disabled="!addForm.code.trim()" :aria-label="$t('inviteCopyCode')" @click="copyCode(addForm.code.trim())"><span>{{ addForm.code.trim() || '—' }}</span><Icon icon="mingcute:copy-line" width="16" /></button>
          <span class="invite-form-hint">{{ roleList.find(item=>item.roleId === addForm.roleId)?.name || '—' }} · {{ $t('inviteUses') }} {{ addForm.count || '—' }} · {{ addForm.expireTime || '—' }}</span>
        </div>
        <el-button class="invite-submit" type="primary" native-type="submit" :loading="addLoading"
        >{{ $t('add') }}
        </el-button>
      </el-form>
    </el-dialog>
    <el-dialog class="history-list" v-model="showRegKeyHistory" :title="$t('useHistory')">
      <div class="loading" :class="historyLoading ? 'loading-show' : 'loading-hide'">
        <loading/>
      </div>
      <el-table v-if="!historyLoading" :data="historyList" :fit="true" style="height: 100%">
        <el-table-column :min-width="emailColumnWidth" property="email" :label="$t('user')"
                         :show-overflow-tooltip="true"/>
        <el-table-column :width="createTimeColumnWidth" :formatter="formatUserCreateTime" property="createTime"
                         :label="$t('date')" fixed="right" :show-overflow-tooltip="true"/>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import {defineOptions, nextTick, reactive, ref, watch} from "vue"
import {Icon} from "@iconify/vue";
import loading from "@/components/loading/index.vue";
import {useSettingStore} from "@/store/setting.js";
import {roleSelectUse} from "@/request/role.js";
import {useRoleStore} from "@/store/role.js";
import {regKeyAdd, regKeyList, regKeyClearNotUse, regKeyDelete, regKeyHistory} from "@/request/reg-key.js";
import {getTextWidth} from "@/utils/text.js";
import dayjs from "dayjs";
import {tzDayjs} from "@/utils/day.js";
import {useI18n} from "vue-i18n";
import { generateInviteCode as generateRandomCode } from '@/utils/invite-code';

defineOptions({
  name: 'reg-key'
})

const roleStore = useRoleStore();
const settingStore = useSettingStore();
const params = reactive({
  code: '',
})

const {t} = useI18n()
const roleList = reactive([])
const addLoading = ref(false)
const showAdd = ref(false)
const regKeyLoading = ref(true)
const regKeyFirst = ref(true)
const showRegKeyHistory = ref(false)
const historyList = reactive([])
const emailColumnWidth = ref(0)
const createTimeColumnWidth = ref(0)
const historyLoading = ref(false)
const isMobile = window.innerWidth < 1025

const addForm = reactive({
  code: '',
  count: 1,
  roleId: null,
  expireTime: null
})

const regKeyData = reactive([])

getList(true)

roleSelectUse().then(list => {
  roleList.length = 0
  roleList.push(...list)
  if (showAdd.value && !addForm.roleId) addForm.roleId = list.find(role=>role.isDefault)?.roleId ?? list[0]?.roleId ?? null
})

watch(() => roleStore.refresh, () => {
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
})

function openHistory(regKey) {

  historyList.length = 0
  historyLoading.value = true
  regKeyHistory(regKey.regKeyId).then(list => {

    historyList.push(...list)
    if (list.length > 0) {

      const email = list.reduce((a, b) =>
          compareByLengthAndUpperCase(a, b, 'email')
      ).email;

      emailColumnWidth.value = getTextWidth(email) + 30
      emailColumnWidth.value = emailColumnWidth.value < 300 ? emailColumnWidth.value : 300
      const createTime = list.reduce((a, b) =>
          compareByLengthAndUpperCase(a, b, 'createTime')
      ).createTime;
      createTimeColumnWidth.value = getTextWidth(createTime)
    }

  }).finally(() => {
    historyLoading.value = false
  })

  showRegKeyHistory.value = true
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};

function formatUserCreateTime(regKey) {
  const createTime = tzDayjs(regKey.createTime);
  const currentYear = dayjs().year();
  const expireYear = createTime.year();

  if (settingStore.lang === 'en') {

    if (expireYear === currentYear) {
      return createTime.format('MMM D, HH:mm');
    } else {
      return createTime.format('MMM D, YYYY HH:mm');
    }

  } else {

    if (expireYear === currentYear) {
      return createTime.format('M月D日 HH:mm');
    } else {
      return createTime.format('YYYY年M月D日 HH:mm');
    }

  }

}

function formatExpireTime(expireTime) {
  const expireDate = tzDayjs(expireTime);
  const currentYear = dayjs().year();
  const expireYear = expireDate.year();

  if (settingStore.lang === 'en') {

    return expireYear === currentYear
        ? expireDate.format('MMM D')
        : expireDate.format('MMM D, YYYY');

  } else {

    return expireYear === currentYear
        ? expireDate.format('M月D日')
        : expireDate.format('YYYY年M月D日');

  }
}

function refresh() {
  params.code = null
  getList(true)
}

function search() {
  getList(true)
}

function getList(showLoading = false) {
  if (showLoading) {
    regKeyLoading.value = true
  }
  regKeyList(params).then(list => {
    regKeyData.length = 0
    regKeyData.push(...list)
    regKeyLoading.value = false
    setTimeout(() => {
      regKeyFirst.value = false
    },200)
  })
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error('复制失败:', err);
    ElMessage({
      message: '复制失败',
      type: 'error',
      plain: true,
    })
  }
}

function genCode() {
  addForm.code = generateRandomCode()
}

function clearNotUse() {
  ElMessageBox.confirm(t('clearRegKey'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    regKeyClearNotUse().then(() => {
      ElMessage({
        message: t('clearSuccess'),
        type: 'success',
        plain: true,
      })
      getList()
    })
  });
}

function submit() {
  if (addLoading.value) return
  const code = addForm.code.trim()

  if (!code) {
    ElMessage({
      message: t('emptyRegKeyMsg'),
      type: "error",
      plain: true
    })
    return
  }
  if (code.length > 128 || /[\s\x00-\x1f\x7f]/.test(code)) { ElMessage.error(t('inviteInvalidCode'));return }

  if (!addForm.roleId) {
    ElMessage({
      message: t('emptyRole'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.expireTime) {
    ElMessage({
      message: t('emptyTimeMsg'),
      type: "error",
      plain: true
    })
    return
  }
  if (addForm.expireTime < dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD')) { ElMessage.error(t('inviteInvalidExpiry'));return }

  if (!Number.isInteger(addForm.count) || addForm.count < 1 || addForm.count > 99999) {
    ElMessage({
      message: t('inviteInvalidCount'),
      type: "error",
      plain: true
    })
    return
  }

  addLoading.value = true
  regKeyAdd({...addForm,code}).then(() => {
    showAdd.value = false
    resetForm()
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    getList()
  }).catch(() => {
    // The request interceptor displays the error; preserve the form for retry.
  }).finally(() => {
    addLoading.value = false
  })
}

function deleteRegKey(regKey) {
  ElMessageBox.confirm(t('delConfirm', {msg: regKey.code}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    regKeyDelete([regKey.regKeyId]).then(() => {
      getList()
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}

function resetForm() {
  Object.assign(addForm,{code:'',count:1,roleId:null,expireTime:null})
}

function openAdd() {
  resetForm()
  genCode()
  addForm.roleId = roleList.find(role=>role.isDefault)?.roleId ?? roleList[0]?.roleId ?? null
  setExpiry(30)
  showAdd.value = true
}

function expiryAfter(days) { return dayjs().tz('Asia/Shanghai').add(days,'day').format('YYYY-MM-DD') }
function setExpiry(days) { addForm.expireTime = expiryAfter(days) }
function disabledExpiry(date) { return dayjs(date).format('YYYY-MM-DD') < dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD') }

</script>

<style scoped lang="scss">
.invite-form-grid { display:grid; grid-template-columns:minmax(0,1fr) 112px; gap:12px; }
.invite-create-form .el-form-item { margin-bottom:16px; }
.invite-create-form :deep(.el-date-editor.el-input), .invite-form-grid .el-input-number { width:100%; }
.invite-expiry-presets { display:flex; gap:8px; margin-top:8px; }
.invite-expiry-presets .el-button { margin:0; }
.invite-form-hint { margin:6px 0 0; color:var(--el-text-color-secondary); font-size:12px; line-height:1.6; }
.invite-preview { display:flex; flex-direction:column; gap:5px; padding:10px 12px; border-radius:6px; background:var(--el-fill-color-light); }
.invite-preview > button { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:0; border:0; color:var(--el-text-color-primary); background:transparent; text-align:left; cursor:pointer; font:inherit; }
.invite-preview > button span { overflow-wrap:anywhere; min-width:0; }
.invite-preview svg { flex-shrink:0; color:var(--el-text-color-secondary); }
.invite-preview > button:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:3px; }
.invite-submit { width:100%; margin-top:16px; }
:global(.invite-date-popper.el-popper) { max-width:calc(100vw - 24px); }
:global(.invite-date-popper .el-date-picker) { width:min(322px, calc(100vw - 24px)); }
:global(.invite-date-popper .el-picker-panel__content) { width:calc(100% - 36px); }
.reg-key {
  height: 100%;
  overflow: hidden;
}

.scrollbar {
  height: calc(100% - 48px);
  position: relative;
  background: var(--extra-light-fill);
  @media (max-width: 372px) {
    height: calc(100% - 85px);
  }

  .code-box {
    padding: 15px 15px 25px 15px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 15px;

    .code-item {
      background: var(--el-bg-color);
      border-radius: 8px;
      border: 1px solid var(--el-border-color);
      transition: all 200ms;
      padding: 15px;

      .code-info {
        display: flex;

        .info-left {
          flex: 1;
          min-width: 0;

          .info-left-item {
            display: flex;
            padding-top: 5px;

            .code {
              font-weight: bold;;
              font-size: 16px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              cursor: pointer;
            }
          }

          .info-left-item:first-child {
            padding-top: 0;
          }
        }

        .info-right {
          display: flex;
          flex-direction: column;
          padding-top: 2px;
          gap: 5px;
        }
      }
    }
  }
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

:deep(.history-list.el-dialog) {
  min-height: 300px;
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.history-list .loading {
  position: absolute;
  top: 10px;
  z-index: 0;
  background: rgba(255, 255, 255, 0);
}

:deep(.history-list .el-dialog__header) {
  padding-bottom: 5px;
}

:deep(.el-scrollbar__view) {
  height: calc(100% - 80px);
}

.loading {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--loadding-background);
  z-index: 2;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}

.container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.setting {
  cursor: pointer;
}

.header-actions {
  padding: 10px 16px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 18px;

  .search-input {
    width: min(200px, calc(100vw - 140px));
  }

  .search {
    :deep(.el-input-group) {
      height: 28px;
    }

    :deep(.el-input__inner) {
      height: 28px;
    }
  }

  .icon {
    cursor: pointer;
  }
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

</style>
