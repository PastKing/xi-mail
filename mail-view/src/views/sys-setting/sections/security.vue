<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('securitySetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>
            <span>{{ $t('autoBan') }}</span>
            <el-tooltip effect="dark" :content="$t('autoBanDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="auto-ban-right">
            <el-input-number v-model="setting.autoBanMonths" @change="change" :min="0" :max="120" :step="1" style="width: 110px;" />
            <span class="ban-unit">{{ $t('month') }}</span>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('banMessage') }}</span>
            <el-tooltip effect="dark" :content="$t('banMessageDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-input v-model="setting.banMessage" @change="change" style="width: 200px;" />
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('emailKeywordBlacklist') }}</span>
            <el-tooltip effect="dark" :content="$t('emailKeywordBlacklistDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-button class="opt-button" size="small" type="primary" @click="keywordBlacklistShow = true">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('senderDomainBlacklist') }}</span>
            <el-tooltip effect="dark" :content="$t('senderFilterModeDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward" style="display: flex; gap: 8px; align-items: center;">
            <el-select v-model="setting.senderFilterMode" style="width: 110px" @change="change">
              <el-option :label="$t('senderFilterBlacklist')" :value="0"/>
              <el-option :label="$t('senderFilterWhitelist')" :value="1"/>
            </el-select>
            <el-button class="opt-button" size="small" type="primary"
              @click="setting.senderFilterMode === 1 ? senderDomainWhitelistShow = true : senderDomainBlacklistShow = true">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Email maintenance -->
    <div class="settings-card">
      <div class="card-title">{{ $t('emailMaintenance') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>
            <span>{{ $t('syncDelete') }}</span>
            <el-tooltip effect="dark" :content="$t('syncDeleteDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                     v-model="setting.syncDelete"/>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('autoCleanEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('autoCleanEmailDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="auto-ban-right">
            <el-input-number v-model="setting.autoCleanDays" @change="change" :min="0" :max="3650" :step="1" style="width: 110px;" />
            <span class="ban-unit">{{ $t('day') }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="autoCleanExcludeShow = true">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('newEmailNotify') }}</span>
            <el-tooltip effect="dark" :content="$t('newEmailNotifyDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                     v-model="setting.newEmailNotify"/>
        </div>
      </div>
    </div>

    <!-- Global API Token -->
    <div class="settings-card">
      <div class="card-title">
        <div class="card-title-row">
          <span>{{ $t('globalToken') }}</span>
          <el-switch v-model="globalTokenEnabled" @change="onGlobalTokenEnabledChange" />
        </div>
      </div>
      <div class="card-content">
        <p class="global-token-desc">{{ $t('globalTokenDesc') }}</p>

        <template v-if="globalTokenEnabled">
          <div class="gt-field-row">
            <div class="gt-token-box">
              <Icon icon="mingcute:key-2-line" width="15" height="15" class="gt-key-icon"/>
              <span class="gt-token-text" :class="{ masked: !globalTokenVisible }">
                {{ globalTokenVisible ? (globalToken || $t('noToken')) : (globalToken ? '•'.repeat(32) : $t('noToken')) }}
              </span>
            </div>
            <div class="gt-actions">
              <el-tooltip :content="globalTokenVisible ? $t('hide') : $t('show')">
                <el-button size="small" circle plain @click="globalTokenVisible = !globalTokenVisible">
                  <Icon :icon="globalTokenVisible ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" width="14" height="14"/>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="$t('copy')" v-if="globalToken">
                <el-button size="small" circle plain @click="copyGlobalToken">
                  <Icon icon="mingcute:copy-2-line" width="14" height="14"/>
                </el-button>
              </el-tooltip>
              <el-button size="small" type="primary" @click="onGenerateGlobalToken" :loading="globalTokenGenerating">
                <Icon :icon="globalToken ? 'mingcute:refresh-2-line' : 'mingcute:add-line'" width="14" height="14" style="margin-right:4px"/>
                {{ globalToken ? $t('regenerate') : $t('generate') }}
              </el-button>
            </div>
          </div>

          <div class="gt-api-box">
            <div class="gt-api-title">{{ $t('globalTokenApiHint') }}</div>
            <div class="gt-api-line">
              <span class="gt-method">GET</span>
              <code>/api/admin/mails?limit=20&amp;offset=0&amp;address=xxx@domain.com</code>
            </div>
            <div class="gt-api-line">
              <span class="gt-header-label">Header</span>
              <code>x-admin-auth: {{ globalTokenVisible && globalToken ? globalToken : '&lt;your-token&gt;' }}</code>
            </div>
            <div class="gt-api-line">
              <span class="gt-header-label">{{ $t('globalTokenResp') }}</span>
              <code>{ "results": [...], "count": N }</code>
            </div>
          </div>
        </template>

        <div v-else class="gt-disabled-tip">
          <Icon icon="mingcute:lock-line" width="16" height="16"/>
          <span>{{ $t('globalTokenDisabledTip') }}</span>
        </div>
      </div>
    </div>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="keywordBlacklistShow" :title="$t('emailKeywordBlacklist')"
               @closed="resetKeywordBlacklist">
      <div class="tag-editor">
        <div class="tag-editor-hint">{{ $t('emailKeywordBlacklistHint') }}</div>
        <el-input-tag v-model="keywordBlacklistData" :placeholder="$t('emailKeywordBlacklistPlaceholder')" />
        <el-button type="primary" :loading="settingLoading" @click="saveKeywordBlacklist">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="senderDomainBlacklistShow" :title="$t('senderDomainBlacklist')"
               @closed="resetSenderDomainBlacklist">
      <div class="tag-editor">
        <div class="tag-editor-hint">{{ $t('senderDomainBlacklistHint') }}</div>
        <el-input-tag v-model="senderDomainBlacklistData" :placeholder="$t('senderDomainBlacklistPlaceholder')" />
        <el-button type="primary" :loading="settingLoading" @click="saveSenderDomainBlacklist">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="senderDomainWhitelistShow" :title="$t('senderDomainWhitelist')"
               @closed="resetSenderDomainWhitelist">
      <div class="tag-editor">
        <div class="tag-editor-hint">{{ $t('senderDomainWhitelistHint') }}</div>
        <el-input-tag v-model="senderDomainWhitelistData" :placeholder="$t('senderDomainWhitelistPlaceholder')" />
        <el-button type="primary" :loading="settingLoading" @click="saveSenderDomainWhitelist">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="autoCleanExcludeShow" :title="$t('autoCleanExclude')"
               @closed="resetAutoCleanExclude">
      <div class="tag-editor">
        <div class="tag-editor-hint">{{ $t('autoCleanExcludeHint') }}</div>
        <el-input-tag v-model="autoCleanExcludeData" :placeholder="$t('autoCleanExcludePlaceholder')" />
        <el-button type="primary" :loading="settingLoading" @click="saveAutoCleanExclude">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {defineOptions, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {generateGlobalToken, getGlobalToken, setGlobalTokenEnabled} from "@/request/setting.js";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-security'
})

const {t} = useI18n()
const {setting, settingLoading, editSetting, change, beforeChange, onSettingsLoaded} = useSysSetting()

const keywordBlacklistShow = ref(false)
const keywordBlacklistData = ref([])
const senderDomainBlacklistShow = ref(false)
const senderDomainBlacklistData = ref([])
const senderDomainWhitelistShow = ref(false)
const senderDomainWhitelistData = ref([])
const autoCleanExcludeShow = ref(false)
const autoCleanExcludeData = ref([])

const globalToken = ref('')
const globalTokenEnabled = ref(false)
const globalTokenVisible = ref(false)
const globalTokenGenerating = ref(false)

/** Settings store the lists as a comma separated string on legacy rows. */
function toList(value) {
  return Array.isArray(value) ? [...value] : (value || '').split(',').filter(Boolean)
}

function resetKeywordBlacklist() {
  keywordBlacklistData.value = toList(setting.value.emailKeywordBlacklist)
}

function resetSenderDomainBlacklist() {
  senderDomainBlacklistData.value = toList(setting.value.senderDomainBlacklist)
}

function resetSenderDomainWhitelist() {
  senderDomainWhitelistData.value = toList(setting.value.senderDomainWhitelist)
}

function resetAutoCleanExclude() {
  autoCleanExcludeData.value = toList(setting.value.autoCleanExclude)
}

onSettingsLoaded(() => {
  resetKeywordBlacklist()
  resetSenderDomainBlacklist()
  resetSenderDomainWhitelist()
  resetAutoCleanExclude()
})

function saveKeywordBlacklist() {
  editSetting({emailKeywordBlacklist: keywordBlacklistData.value}, true).then(ok => {
    if (ok) keywordBlacklistShow.value = false
  })
}

function saveSenderDomainBlacklist() {
  editSetting({senderDomainBlacklist: senderDomainBlacklistData.value}, true).then(ok => {
    if (ok) senderDomainBlacklistShow.value = false
  })
}

function saveSenderDomainWhitelist() {
  editSetting({senderDomainWhitelist: senderDomainWhitelistData.value}, true).then(ok => {
    if (ok) senderDomainWhitelistShow.value = false
  })
}

function saveAutoCleanExclude() {
  editSetting({autoCleanExclude: autoCleanExcludeData.value.join(',')}, true).then(ok => {
    if (ok) autoCleanExcludeShow.value = false
  })
}

getGlobalToken().then(data => {
  globalToken.value = data.token || ''
  globalTokenEnabled.value = !!data.enabled
}).catch(() => {})

function onGlobalTokenEnabledChange(val) {
  setGlobalTokenEnabled(val).catch(() => {
    globalTokenEnabled.value = !val
    ElMessage.error(t('saveFail'))
  })
}

async function onGenerateGlobalToken() {
  globalTokenGenerating.value = true
  try {
    const data = await generateGlobalToken()
    globalToken.value = data.token
    globalTokenVisible.value = true
    ElMessage.success(t('generateSuccess'))
  } catch {
    ElMessage.error(t('saveFail'))
  } finally {
    globalTokenGenerating.value = false
  }
}

function copyGlobalToken() {
  if (!globalToken.value) return
  navigator.clipboard.writeText(globalToken.value).then(() => {
    ElMessage.success(t('copySuccess'))
  }).catch(() => {
    ElMessage.error(t('copyFail'))
  })
}
</script>

<style scoped lang="scss">
.auto-ban-right {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.ban-unit {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.global-token-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 16px;
  line-height: 1.6;
}

.gt-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.gt-token-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;

  .gt-key-icon {
    flex-shrink: 0;
    color: var(--el-color-primary);
    opacity: 0.8;
  }

  .gt-token-text {
    flex: 1;
    font-family: 'SF Mono', 'Consolas', monospace;
    font-size: 13px;
    color: var(--el-text-color-primary);
    word-break: break-all;
    line-height: 1.5;

    &.masked {
      letter-spacing: 3px;
      color: var(--el-text-color-placeholder);
      font-size: 12px;
    }
  }
}

.gt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.gt-api-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--el-fill-color-extra-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);

  .gt-api-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 2px;
  }
}

.gt-api-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;

  code {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: var(--el-text-color-primary);
    word-break: break-all;
    line-height: 1.5;
  }
}

.gt-method {
  flex-shrink: 0;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.gt-header-label {
  flex-shrink: 0;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.6;
}

.gt-disabled-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--el-text-color-placeholder);
  padding: 8px 0;
}

.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .tag-editor-hint {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .el-button {
    width: 100%;
    margin: 0;
  }
}
</style>
