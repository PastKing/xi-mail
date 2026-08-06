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
          <div><span>{{ $t('resendToken') }}</span></div>
          <div>
            <el-button class="opt-button" style="margin-top: 0" @click="showResendList = true" size="small"
                       type="primary">
              <Icon icon="mingcute:list-check-line" width="18" height="18"/>
            </el-button>
            <el-button class="opt-button" style="margin-top: 0" @click="resendTokenFormShow = true" size="small"
                       type="primary">
              <Icon icon="mingcute:add-line" width="16" height="16"/>
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

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="resendTokenFormShow" :title="$t('resendToken')"
               @closed="resendTokenForm.token = ''">
      <form>
        <el-select style="margin-bottom: 15px" v-model="resendTokenForm.domain" placeholder="Select">
          <el-option
              v-for="item in settingStore.domainList"
              :key="item"
              :label="item"
              :value="item"
          />
        </el-select>
        <el-input type="text" :placeholder="$t('addResendTokenDesc')" v-model="resendTokenForm.token"/>
        <el-button type="primary" :loading="settingLoading" @click="saveResendToken">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog resend-table" v-model="showResendList" :title="$t('resendTokenList')">
      <el-table :data="resendList">
        <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                         :show-overflow-tooltip="true"/>
        <el-table-column :width="tokenColumnWidth" property="value" label="Token" fixed="right"
                         :show-overflow-tooltip="true"/>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, defineOptions, reactive, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {getTextWidth} from "@/utils/text.js";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-registration'
})

const {t, locale} = useI18n()
const {setting, settingStore, settingLoading, editSetting, change, beforeChange, onSettingsLoaded} = useSysSetting()

const emailPrefixShow = ref(false)
const minEmailPrefix = ref(0)
const emailPrefixFilter = ref([])

const resendTokenFormShow = ref(false)
const showResendList = ref(false)
const resendTokenForm = reactive({domain: '', token: ''})
const emailColumnWidth = ref(0)
const tokenColumnWidth = ref(0)

const authRefreshOptions = computed(() => [
  {label: t('disable'), value: 0},
  {label: '3s', value: 3},
  {label: '5s', value: 5},
  {label: '10s', value: 10},
  {label: '15s', value: 15},
  {label: '20s', value: 20},
])

const resendList = computed(() => {
  const list = Object.keys(setting.value.resendTokens || {}).map(key => ({
    key,
    value: setting.value.resendTokens[key]
  }))

  if (list.length > 0) {
    const key = list.reduce((a, b) => longerLabel(a, b, 'key')).key
    emailColumnWidth.value = getTextWidth(key) + 30

    const value = list.reduce((a, b) => longerLabel(a, b, 'value')).value
    tokenColumnWidth.value = getTextWidth(value) + 30
  }

  return list
})

function longerLabel(a, b, key) {
  const upperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length
  if (a[key].length === b[key].length) {
    return upperCaseCount(a[key]) > upperCaseCount(b[key]) ? a : b
  }
  return a[key].length > b[key].length ? a : b
}

function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix
  emailPrefixFilter.value = setting.value.emailPrefixFilter
}

onSettingsLoaded(() => {
  resetEmailPrefix()
  resendTokenForm.domain = (setting.value.domainList || [])[0] || ''
})

function saveEmailPrefix() {
  editSetting({
    minEmailPrefix: minEmailPrefix.value,
    emailPrefixFilter: emailPrefixFilter.value
  }, true).then(ok => {
    if (ok) emailPrefixShow.value = false
  })
}

function saveResendToken() {
  const domain = resendTokenForm.domain.slice(1)
  editSetting({resendTokens: {[domain]: resendTokenForm.token}}).then(ok => {
    if (ok) resendTokenFormShow.value = false
  })
}
</script>

<style scoped lang="scss">
.email-prefix {
  display: flex;
  justify-content: space-between;
}

.prefix-filter {
  display: flex;
  flex-direction: column;
}

:deep(.resend-table.el-dialog) {
  min-height: 300px;
  width: 500px !important;

  @media (max-width: 540px) {
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
