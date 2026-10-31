<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('emailAddressSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('emailPrefix') }}</span></div>
          <div class="forward">
            <el-button class="opt-button" size="small" type="primary" @click="emailPrefixShow = true">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('randomPrefixLength') }}</span>
            <el-tooltip effect="dark" :content="$t('randomPrefixDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-input-number size="small" v-model="setting.randomPrefixLength" @change="change" :min="4" :max="32" :step="1" style="width: 120px;" />
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="card-title">{{ $t('emailSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('receiveEmail') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.receive"/>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('autoRefresh') }}</span>
            <el-tooltip effect="dark" :content="$t('autoRefreshDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-select
                @change="change"
                :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                v-model="setting.autoRefresh"
                placeholder="Select"
            >
              <el-option
                  v-for="item in authRefreshOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('sendEmail') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.send"/>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('noRecipientTitle') }}</span>
            <el-tooltip effect="dark" :content="$t('noRecipientDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.noRecipient"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('sendConfigManagement') }}</span></div>
          <div>
            <el-button class="opt-button" style="margin-top: 0" @click="showResendList = true" size="small"
                       type="primary">
              {{ $t('manage') }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="emailPrefixShow" :title="$t('emailPrefix')" @closed="resetEmailPrefix">
      <div class="email-prefix">
        <div>{{ $t('atLeast') }}</div>
        <el-input-number v-model="minEmailPrefix" :min="1" :max="20" style="width: 150px">
          <template #suffix>
            <span>{{ $t('character') }}</span>
          </template>
        </el-input-number>
      </div>
      <div class="prefix-filter">
        <div style="margin-bottom: 10px;">{{ $t('mustNotContain') }}</div>
        <el-input-tag style="margin-bottom: 10px;" v-model="emailPrefixFilter" :placeholder="$t('mustNotContainDesc')"/>
      </div>
      <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveEmailPrefix">{{ $t('save') }}</el-button>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="resendTokenFormShow"
               :title="editingResendToken ? $t('editResendTokenTitle') : $t('resendToken')"
               @closed="resetResendTokenForm">
      <form @submit.prevent="saveResendToken">
        <el-select style="margin-bottom: 15px" v-model="resendTokenForm.domain" :disabled="editingResendToken" placeholder="Select">
          <el-option
              v-for="item in settingStore.domainList"
              :key="item"
              :label="item"
              :value="item"
          />
        </el-select>
        <el-input type="password" show-password autocomplete="off" :placeholder="editingResendToken ? $t('replaceResendTokenDesc') : $t('addResendTokenDesc')" v-model="resendTokenForm.token"/>
        <el-button type="primary" native-type="submit" :loading="settingLoading"
                   :disabled="!resendTokenForm.domain || (editingResendToken && !resendTokenForm.token.trim())">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog send-config-dialog" v-model="showResendList" :title="$t('sendConfigManagement')">
      <el-input v-model="domainSearch" clearable :placeholder="$t('searchSendingDomain')"
                :aria-label="$t('searchSendingDomain')" @input="domainPage = 1" />
      <p class="send-channel-help">{{ $t('sendConfigDesc') }}</p>
      <el-table :data="pagedDomains" max-height="430" row-key="key" class="send-channel-table">
        <el-table-column min-width="170" property="key" :label="$t('domain')"
                         :show-overflow-tooltip="true"/>
        <el-table-column :label="$t('sendChannel')" width="150">
          <template #default="{row}">
            <el-select :key="`${row.key}-${channelVersion}`" :model-value="row.channel" :disabled="settingLoading || !!resendTokenLoading"
                       :aria-label="`${$t('sendChannel')} ${row.key}`" @change="saveSendChannel(row.key, $event)">
              <el-option label="Resend" value="resend" />
              <el-option label="Cloudflare" value="cloudflare" :disabled="!setting.hasCloudflareEmail" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column :label="$t('resendToken')" min-width="180" show-overflow-tooltip>
          <template #default="{row}">
            <span v-if="row.value">{{ row.value }}</span>
            <span v-else class="send-channel-help">{{ $t(row.channel === 'cloudflare' ? 'sendTokenNotRequired' : 'sendTokenMissing') }}</span>
          </template>
        </el-table-column>
        <el-table-column :width="100" :label="$t('action')" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" :loading="resendTokenLoading === row.key"
                       v-if="row.channel === 'resend' || row.value"
                       :disabled="settingLoading || !!resendTokenLoading" @click="openResendTokenForm(row)">
              {{ $t(row.value ? 'change' : 'add') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="domainPage" :page-size="10" :total="filteredDomains.length"
                     layout="prev, pager, next" class="send-config-pagination" />
      <el-tag :type="setting.hasCloudflareEmail ? 'success' : 'warning'">
        {{ $t(setting.hasCloudflareEmail ? 'cloudflareEmailBound' : 'cloudflareEmailNotBound') }}
      </el-tag>
      <p class="send-channel-help">{{ $t('cloudflareSendingDesc') }}</p>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, defineOptions, reactive, ref, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSysSetting} from "../use-sys-setting.js";
import {getResendToken} from "@/request/setting.js";
import {useUserStore} from "@/store/user.js";

defineOptions({
  name: 'sys-setting-registration'
})

const {t, locale} = useI18n()
const userStore = useUserStore()
const {setting, settingStore, settingLoading, editSetting, change, beforeChange, onSettingsLoaded} = useSysSetting()

const emailPrefixShow = ref(false)
const minEmailPrefix = ref(0)
const emailPrefixFilter = ref([])

const resendTokenFormShow = ref(false)
const editingResendToken = ref(false)
const resendTokenLoading = ref('')
const showResendList = ref(false)
const resendTokenForm = reactive({domain: '', token: ''})
const domainSearch = ref('')
const domainPage = ref(1)
const channelVersion = ref(0)
const filteredDomains = computed(() => (settingStore.domainList || [])
  .map(domain => domain.replace(/^@/, ''))
  .filter(domain => domain.toLowerCase().includes(domainSearch.value.trim().toLowerCase()))
  .map(key => ({key, channel: setting.value.sendChannels?.[key] || 'resend', value: setting.value.resendTokens?.[key] || ''})))
const pagedDomains = computed(() => filteredDomains.value.slice((domainPage.value - 1) * 10, domainPage.value * 10))
watch(() => filteredDomains.value.length, count => {
  domainPage.value = Math.min(domainPage.value, Math.max(1, Math.ceil(count / 10)))
})

function saveSendChannel(domain, channel) {
  return editSetting({sendChannels: {...setting.value.sendChannels, [domain]: channel}})
    .finally(() => channelVersion.value++)
}

const authRefreshOptions = computed(() => [
  {label: t('disable'), value: 0},
  {label: '3s', value: 3},
  {label: '5s', value: 5},
  {label: '10s', value: 10},
  {label: '15s', value: 15},
  {label: '20s', value: 20},
])

function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix
  emailPrefixFilter.value = setting.value.emailPrefixFilter
}

onSettingsLoaded(() => {
  resetEmailPrefix()
})

function saveEmailPrefix() {
  editSetting({
    minEmailPrefix: minEmailPrefix.value,
    emailPrefixFilter: emailPrefixFilter.value
  }, true).then(ok => {
    if (ok) emailPrefixShow.value = false
  })
}

async function openResendTokenForm(row) {
  if (settingLoading.value || resendTokenLoading.value) return
  let token = ''
  if (row?.value && userStore.user.type === 0) {
    resendTokenLoading.value = row.key
    try {
      token = (await getResendToken(row.key)).token
    } catch {
      return
    } finally {
      resendTokenLoading.value = ''
    }
    // Discard the response if the user closed the list while it was loading.
    if (!showResendList.value) return
  }
  editingResendToken.value = !!row?.value
  resendTokenForm.domain = row ? `@${row.key}` : (settingStore.domainList || [])[0] || ''
  resendTokenForm.token = token
  resendTokenFormShow.value = true
}

function resetResendTokenForm() {
  resendTokenForm.token = ''
  resendTokenForm.domain = ''
  editingResendToken.value = false
}

function saveResendToken() {
  const token = resendTokenForm.token.trim()
  if (!resendTokenForm.domain || (editingResendToken.value && !token)) return
  const domain = resendTokenForm.domain.replace(/^@/, '')
  return editSetting({resendTokens: {[domain]: token}}).then(ok => {
    if (ok) resendTokenFormShow.value = false
  })
}
</script>

<style scoped lang="scss">
.send-channel-help {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.send-channel-table {
  margin-bottom: 16px;

  @media (max-width: 660px) {
    :deep(.el-table__header-wrapper), :deep(colgroup) {
      display: none;
    }
    :deep(.el-table__body) {
      width: 100% !important;
    }
    :deep(.el-table__row) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 70px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      padding: 8px 0;
    }
    :deep(.el-table__cell) {
      display: block;
      position: static !important;
      width: auto !important;
      border-bottom: 0;
    }
    :deep(.el-table__cell:nth-child(-n+2)) {
      grid-column: 1 / -1;
    }
    :deep(.el-table__cell:first-child) {
      font-weight: 600;
    }
    :deep(.el-table__cell .cell) {
      padding: 0 4px;
    }
    :deep(.el-table-fixed-column--right .cell) {
      text-align: right;
    }
    :deep(.el-table__cell::before) {
      display: none;
    }
  }
}

.send-config-pagination {
  justify-content: center;
  margin-bottom: 16px;
}

.email-prefix {
  display: flex;
  justify-content: space-between;
}

.prefix-filter {
  display: flex;
  flex-direction: column;
}

:deep(.send-config-dialog.el-dialog) {
  min-height: 300px;
  width: min(850px, calc(100% - 40px)) !important;

  @media (max-width: 660px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }

  .el-dialog__header {
    padding-bottom: 5px;
  }
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}
</style>
