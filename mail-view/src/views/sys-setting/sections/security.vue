<template>
  <div class="sys-setting-section">
    <div v-if="inArea('accounts') || inArea('filter')" class="settings-card">
      <div class="card-title">{{ $t(sectionArea === 'filter' ? 'settingsFilterTitle' : sectionArea === 'accounts' ? 'settingsAccessTitle' : 'securitySetting') }}</div>
      <div class="card-content" :class="{'filter-card-content':sectionArea === 'filter'}">
        <div v-if="inArea('accounts')" class="setting-item">
          <div>
            <span>{{ $t('autoBan') }}</span>
            <el-tooltip effect="dark" :content="$t('autoBanDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="auto-ban-right">
            <el-input-number class="settings-number-input" controls-position="right" v-model="setting.autoBanMonths" :aria-label="$t('autoBan')" @change="change('autoBanMonths')" :min="0" :max="120" :step="1" />
            <span class="ban-unit">{{ $t('month') }}</span>
          </div>
        </div>
        <div v-if="inArea('accounts')" class="setting-item">
          <div>
            <span>{{ $t('banMessage') }}</span>
            <el-tooltip effect="dark" :content="$t('banMessageDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-input v-model="setting.banMessage" @change="change('banMessage')" style="width: 200px;" />
          </div>
        </div>
        <div v-if="inArea('filter')" class="settings-inline-field">
          <div class="settings-inline-heading"><span class="filter-heading-label"><span>{{ $t('emailKeywordBlacklist') }}</span><el-tooltip :content="$t('emailKeywordBlacklistHint')"><Icon class="warning" icon="mingcute:information-line" width="16" /></el-tooltip></span></div>
          <p>{{ $t('ruleKeywordsSummary') }}</p>
          <RuleListEditor ref="keywordEditor" v-model="keywordBlacklistData" :disabled="isSaving('emailKeywordBlacklist')" :label="$t('emailKeywordBlacklist')" :placeholder="$t('emailKeywordBlacklistPlaceholder')" />
          <div class="settings-inline-actions"><el-button :disabled="isSaving('emailKeywordBlacklist')" @click="resetKeywordBlacklist">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('emailKeywordBlacklist')" :disabled="isSaving('emailKeywordBlacklist')" @click="saveKeywordBlacklist">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
        <div v-if="inArea('filter')" class="settings-inline-field">
          <div class="settings-inline-heading"><span class="filter-heading-label"><span>{{ $t('senderDomainBlacklist') }}</span><el-tooltip :content="$t(setting.senderFilterMode === 1 ? 'senderDomainWhitelistHint' : 'senderDomainBlacklistHint')"><Icon class="warning" icon="mingcute:information-line" width="16" /></el-tooltip></span>
            <el-select class="settings-compact-select sender-mode-select" popper-class="sys-setting-popper" v-model="setting.senderFilterMode" :disabled="isSaving('senderFilterMode','senderDomainBlacklist','senderDomainWhitelist')" :aria-label="$t('settingsFilterDomains')" @change="changeSenderMode">
              <el-option :label="$t('senderFilterBlacklist')" :value="0"/><el-option :label="$t('senderFilterWhitelist')" :value="1"/>
            </el-select>
          </div>
          <p>{{ $t(setting.senderFilterMode === 1 ? 'ruleWhitelistSummary' : 'ruleBlacklistSummary') }}</p>
          <RuleListEditor v-if="setting.senderFilterMode === 1" key="whitelist" ref="whitelistEditor" v-model="senderDomainWhitelistData" kind="domain" :disabled="isSaving('senderDomainWhitelist')" :label="$t('senderDomainWhitelist')" :placeholder="$t('senderDomainWhitelistPlaceholder')" />
          <RuleListEditor v-else key="blacklist" ref="blacklistEditor" v-model="senderDomainBlacklistData" kind="domain" :disabled="isSaving('senderDomainBlacklist')" :label="$t('senderDomainBlacklist')" :placeholder="$t('senderDomainBlacklistPlaceholder')" />
          <div class="settings-inline-actions"><el-button :disabled="isSaving('senderDomainBlacklist','senderDomainWhitelist')" @click="setting.senderFilterMode === 1 ? resetSenderDomainWhitelist() : resetSenderDomainBlacklist()">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('senderDomainBlacklist','senderDomainWhitelist')" :disabled="isSaving('senderDomainBlacklist','senderDomainWhitelist')" @click="setting.senderFilterMode === 1 ? saveSenderDomainWhitelist() : saveSenderDomainBlacklist()">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
      </div>
    </div>

    <!-- Email maintenance -->
    <div v-if="inArea('retention')" class="settings-card">
      <div class="card-title">{{ $t('emailMaintenance') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>
            <span>{{ $t('syncDelete') }}</span>
            <el-tooltip effect="dark" :content="$t('syncDeleteDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <el-switch @change="change('syncDelete')" :before-change="beforeChange" :active-value="0" :inactive-value="1"
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
            <el-input-number class="settings-number-input" controls-position="right" v-model="setting.autoCleanDays" :aria-label="$t('autoCleanEmail')" @change="change('autoCleanDays')" :min="0" :max="3650" :step="1" />
            <span class="ban-unit">{{ $t('day') }}</span>
          </div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ $t('autoCleanExclude') }}</span></div>
          <p>{{ $t('autoCleanExcludeHint') }}</p>
          <el-input-tag v-model="autoCleanExcludeData" :aria-label="$t('autoCleanExclude')" :placeholder="$t('autoCleanExcludePlaceholder')" />
          <div class="settings-inline-actions"><el-button @click="resetAutoCleanExclude">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('autoCleanExclude')" :disabled="isSaving('autoCleanExclude')" @click="saveAutoCleanExclude">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('newEmailNotify') }}</span>
            <el-tooltip effect="dark" :content="$t('newEmailNotifyDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <el-switch @change="change('newEmailNotify')" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                     v-model="setting.newEmailNotify"/>
        </div>
      </div>
    </div>

    <!-- Global API Token -->
    <div v-if="inArea('accounts')" class="settings-card">
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
                <el-button circle plain @click="globalTokenVisible = !globalTokenVisible">
                  <Icon :icon="globalTokenVisible ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" width="14" height="14"/>
                </el-button>
              </el-tooltip>
              <el-tooltip :content="$t('copy')" v-if="globalToken">
                <el-button circle plain @click="copyGlobalToken">
                  <Icon icon="mingcute:copy-2-line" width="14" height="14"/>
                </el-button>
              </el-tooltip>
              <el-button type="primary" @click="onGenerateGlobalToken" :loading="globalTokenGenerating">
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

  </div>
</template>

<script setup>
import {computed, defineOptions, ref, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {generateGlobalToken, getGlobalToken, setGlobalTokenEnabled} from "@/request/setting.js";
import {useSysSetting} from "../use-sys-setting.js";
import {useRoute} from 'vue-router';
import RuleListEditor from '@/components/RuleListEditor.vue';

defineOptions({
  name: 'sys-setting-security'
})

const props = defineProps({settingsArea:{type:String,default:''}})
const {t} = useI18n()
const route = useRoute()
const sectionArea = computed(() => {
  if (props.settingsArea) return props.settingsArea
  const key = route.query.find
  if (['senderDomainBlacklist','emailKeywordBlacklist'].includes(key)) return 'filter'
  if (['autoBan','banMessage','globalToken'].includes(key)) return 'accounts'
  if (['syncDelete','autoCleanEmail','newEmailNotify'].includes(key)) return 'retention'
  return 'all'
})
const inArea = area => sectionArea.value === 'all' || sectionArea.value === area
const {setting, isSaving, editSetting, change, beforeChange, onSettingsLoaded, onSettingsDirty} = useSysSetting()
const keywordEditor=ref(),blacklistEditor=ref(),whitelistEditor=ref()
const editorFor = key => ({keyword:keywordEditor,blacklist:blacklistEditor,whitelist:whitelistEditor})[key]?.value
function changeSenderMode(value) {
  const previous=value===1?'blacklist':'whitelist'
  if(editorFor(previous)?.commitPending()===false){setting.value.senderFilterMode=value===1?0:1;return}
  change('senderFilterMode')
}

const keywordBlacklistData = ref([])
const senderDomainBlacklistData = ref([])
const senderDomainWhitelistData = ref([])
const autoCleanExcludeData = ref([])
const listBaselines = {}

const globalToken = ref('')
const globalTokenEnabled = ref(false)
const globalTokenVisible = ref(false)
const globalTokenGenerating = ref(false)

/** Settings store the lists as a comma separated string on legacy rows. */
function toList(value) {
  return Array.isArray(value) ? [...value] : (value || '').split(',').filter(Boolean)
}

function resetKeywordBlacklist() {
  keywordEditor.value?.resetPending()
  keywordBlacklistData.value = toList(setting.value.emailKeywordBlacklist)
  listBaselines.keyword = JSON.stringify(keywordBlacklistData.value)
}

function resetSenderDomainBlacklist() {
  blacklistEditor.value?.resetPending()
  senderDomainBlacklistData.value = toList(setting.value.senderDomainBlacklist)
  listBaselines.blacklist = JSON.stringify(senderDomainBlacklistData.value)
}

function resetSenderDomainWhitelist() {
  whitelistEditor.value?.resetPending()
  senderDomainWhitelistData.value = toList(setting.value.senderDomainWhitelist)
  listBaselines.whitelist = JSON.stringify(senderDomainWhitelistData.value)
}

function resetAutoCleanExclude() {
  autoCleanExcludeData.value = toList(setting.value.autoCleanExclude)
  listBaselines.exclude = JSON.stringify(autoCleanExcludeData.value)
}

onSettingsLoaded(() => {
  for (const [key,value,reset] of [['keyword',keywordBlacklistData,resetKeywordBlacklist],['blacklist',senderDomainBlacklistData,resetSenderDomainBlacklist],['whitelist',senderDomainWhitelistData,resetSenderDomainWhitelist],['exclude',autoCleanExcludeData,resetAutoCleanExclude]]) {
    if (listBaselines[key] === undefined || (JSON.stringify(value.value) === listBaselines[key] && !editorFor(key)?.hasPending())) reset()
  }
})
onSettingsDirty(() => [['keyword',keywordBlacklistData],['blacklist',senderDomainBlacklistData],['whitelist',senderDomainWhitelistData],['exclude',autoCleanExcludeData]].some(([key,value]) => editorFor(key)?.hasPending() || (listBaselines[key] !== undefined && JSON.stringify(value.value) !== listBaselines[key])), () => { resetKeywordBlacklist();resetSenderDomainBlacklist();resetSenderDomainWhitelist();resetAutoCleanExclude() })

async function saveList(key, value, field, serialize = data => data) {
  if(editorFor(key)?.commitPending()===false)return
  const saved = [...value.value]
  const ok = await editSetting({[field]:serialize(saved)}, true)
  if (ok) listBaselines[key] = JSON.stringify(saved)
}
const saveKeywordBlacklist = () => saveList('keyword',keywordBlacklistData,'emailKeywordBlacklist')
const saveSenderDomainBlacklist = () => saveList('blacklist',senderDomainBlacklistData,'senderDomainBlacklist')
const saveSenderDomainWhitelist = () => saveList('whitelist',senderDomainWhitelistData,'senderDomainWhitelist')
const saveAutoCleanExclude = () => saveList('exclude',autoCleanExcludeData,'autoCleanExclude',data=>data.join(','))

watch(() => inArea('accounts'), (visible, _, onCleanup) => {
  if (!visible) return
  let active = true
  onCleanup(() => { active = false })
  getGlobalToken().then(data => {
    if (!active) return
    globalToken.value = data.token || ''
    globalTokenEnabled.value = !!data.enabled
  }).catch(() => {})
}, {immediate:true})

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
.sys-setting-section .filter-card-content {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:16px;
  align-items:start;
  .settings-inline-field {
    min-width:0;
    padding:16px;
    border:1px solid var(--el-border-color-lighter);
    border-radius:8px;
    margin:0;
  }
  .settings-inline-heading { min-height:32px; }
  .settings-inline-field > p { margin:6px 0 12px; }
  .settings-inline-actions { padding-top:12px; border-top:1px solid var(--el-border-color-extra-light); }
}
.filter-heading-label { display:inline-flex; align-items:center; gap:2px; min-width:0; }
@media(max-width:1000px) { .sys-setting-section .filter-card-content { grid-template-columns:minmax(0,1fr); } }
@media(max-width:600px) { .sys-setting-section .filter-card-content { gap:12px; .settings-inline-field { padding:12px; } .settings-inline-field > p { min-height:0; } } }
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
  font-size: 14px;
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
    font-size: 14px;
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
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .el-button {
    width: 100%;
    margin: 0;
  }
}
</style>
