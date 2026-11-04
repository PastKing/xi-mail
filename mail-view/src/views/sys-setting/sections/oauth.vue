<template>
  <div class="sys-setting-section oauth-settings">
    <div class="settings-card">
      <div class="card-title oauth-title">
        <span>{{ $t('oauthIntegration') }}</span>
        <div class="oauth-actions">
          <el-button size="small" @click="resetForm">{{ $t('oauthReset') }}</el-button>
          <el-button size="small" type="primary" :loading="settingLoading" @click="saveOAuth">{{ $t('save') }}</el-button>
        </div>
      </div>
      <div class="card-content">
        <div class="oauth-provider-tabs" role="tablist" :aria-label="$t('oauthIntegration')">
          <button v-for="provider in OAUTH_PROVIDERS" :key="provider.id" type="button" role="tab" :aria-selected="selected === provider.id" :id="'oauth-tab-' + provider.id" aria-controls="oauth-provider-panel" @click="selected = provider.id" @keydown="moveTab($event, provider.id)"><img :src="provider.logo" alt="" width="18" height="18" />{{ provider.name }}</button>
        </div>
        <div id="oauth-provider-panel" role="tabpanel" :aria-labelledby="'oauth-tab-' + selected">
        <div class="oauth-guide">
          <h3>{{ $t('oauthGuide') }}</h3>
          <p>{{ $t(activeProvider.guideKey) }}</p>
          <label>{{ $t('oauthCallbackUrl') }}</label>
          <div class="oauth-callback-row">
            <el-input :model-value="callbackUrl" readonly :aria-label="$t('oauthCallbackUrl')" />
            <el-button :aria-label="$t('clickToCopy')" @click="copyCallback"><Icon icon="mingcute:copy-2-line" width="15" height="15" /></el-button>
          </div>
          <p class="oauth-callback-note">{{ $t('oauthCallbackAuto') }}</p>
          <a :href="activeProvider.applicationUrl" target="_blank" rel="noopener noreferrer">{{ $t('oauthManageProvider', { provider: activeProvider.name }) }} <Icon icon="mingcute:external-link-line" width="12" height="12" /></a>
          <a v-if="activeProvider.docsUrl" class="oauth-docs-link" :href="activeProvider.docsUrl" target="_blank" rel="noopener noreferrer">{{ $t('oauthDocumentation') }} <Icon icon="mingcute:external-link-line" width="12" height="12" /></a>
        </div>
        <div class="oauth-form-grid">
          <div class="oauth-enable-row">
            <div><h3>{{ $t('oauthEnableProvider', { provider: activeProvider.name }) }}</h3><p>{{ $t('oauthEnableProviderNote', { provider: activeProvider.name }) }}</p></div>
            <el-switch v-model="form.enabled" :aria-label="$t('oauthEnableProvider', { provider: activeProvider.name })" />
          </div>
          <label class="oauth-field"><span>Client ID</span><el-input v-model="form.clientId" autocomplete="off" placeholder="Client ID" /></label>
          <label class="oauth-field"><span>Client Secret</span><el-input v-model="form.clientSecret" type="password" show-password autocomplete="new-password" :placeholder="setting[selected + 'HasSecret'] ? $t('oauthSecretKept') : $t('oauthProviderSecret', { provider: activeProvider.name })" /></label>
          <label v-if="activeProvider.trustLevel" class="oauth-field"><span>{{ $t('oauthMinTrustLevel') }}</span><el-input-number v-model="form.minTrustLevel" :min="0" :max="4" :step="1" step-strictly /><small>{{ $t('oauthProviderTrust', { provider: activeProvider.name }) }}</small></label>
        </div>
        <p class="oauth-policy">{{ $t('oauthAdminPolicy') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, reactive, ref, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useSysSetting } from '../use-sys-setting.js'
import { OAUTH_PROVIDERS } from '@/config/oauth-providers.js'

const { t } = useI18n()
const { setting, settingLoading, editSetting, onSettingsLoaded } = useSysSetting()
const selected = ref(OAUTH_PROVIDERS[0].id)
const activeProvider = computed(() => OAUTH_PROVIDERS.find(provider => provider.id === selected.value))
const callbackUrl = computed(() => window.location.origin + activeProvider.value.callbackPath)
const drafts = reactive(Object.fromEntries(OAUTH_PROVIDERS.map(provider => [provider.id, {}])))
const form = computed(() => drafts[selected.value])
let savingProvider = null
function resetProvider(id) {
  Object.assign(drafts[id], { enabled: !!setting.value[id + 'Switch'], clientId: setting.value[id + 'ClientId'] || '',
    clientSecret: '', minTrustLevel: setting.value[id + 'MinTrustLevel'] ?? 0 })
}
function resetForm() { resetProvider(selected.value) }
onSettingsLoaded(() => {
  if (savingProvider) resetProvider(savingProvider)
  else OAUTH_PROVIDERS.forEach(provider => resetProvider(provider.id))
})
async function saveOAuth() {
  if (settingLoading.value) return
  const id = selected.value, draft = form.value
  savingProvider = id
  try {
    await editSetting({ [id + 'Switch']: draft.enabled, [id + 'ClientId']: (draft.clientId || '').trim(),
      [id + 'ClientSecret']: draft.clientSecret, [id + 'CallbackUrl']: callbackUrl.value,
      ...(activeProvider.value.trustLevel ? { [id + 'MinTrustLevel']: draft.minTrustLevel } : {}) })
  } finally { savingProvider = null }
}
async function moveTab(event, id) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = OAUTH_PROVIDERS.findIndex(provider => provider.id === id)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? OAUTH_PROVIDERS.length - 1 :
    (index + (event.key === 'ArrowRight' ? 1 : -1) + OAUTH_PROVIDERS.length) % OAUTH_PROVIDERS.length
  selected.value = OAUTH_PROVIDERS[next].id
  await nextTick()
  document.getElementById('oauth-tab-' + selected.value)?.focus()
}
async function copyCallback() {
  try { await navigator.clipboard.writeText(callbackUrl.value); ElMessage.success(t('copySuccessMsg')) }
  catch { ElMessage.error(t('copyFailMsg')) }
}
</script>
<style scoped lang="scss">
.oauth-title { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.oauth-actions { display: flex; gap: 8px; }
.oauth-actions :deep(.el-button + .el-button) { margin-left: 0; }
.oauth-provider-tabs { display: flex; padding: 3px; background: var(--el-fill-color-light); border-radius: 8px; margin-bottom: 18px; }
.oauth-provider-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: 1; min-width: 0; padding: 9px 8px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--el-text-color-secondary); font-size: 13px; cursor: pointer; }
.oauth-provider-tabs button[aria-selected="true"] { background: var(--el-bg-color); border-color: var(--el-border-color-lighter); color: var(--el-text-color-primary); }
.oauth-provider-tabs button:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.oauth-provider-tabs img { object-fit: contain; }
.oauth-guide { padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 9px; margin-bottom: 28px; }
.oauth-guide h3, .oauth-enable-row h3 { margin: 0 0 7px; font-size: 13px; font-weight: 500; }
.oauth-guide p, .oauth-enable-row p, .oauth-policy { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.8; }
.oauth-guide label { display: block; font-size: 12px; margin: 18px 0 9px; }
.oauth-callback-row { display: flex; gap: 8px; }
.oauth-callback-note { margin: 8px 0 0; font-size: 11px !important; }
.oauth-callback-row :deep(input) { font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
.oauth-guide a { display: inline-flex; align-items: center; gap: 5px; margin-top: 15px; font-size: 12px; color: var(--el-color-primary); text-decoration: none; }
.oauth-guide .oauth-docs-link { margin-left: 18px; }
.oauth-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 25px 30px; }
.oauth-enable-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.oauth-field { display: flex; flex-direction: column; gap: 10px; min-width: 0; font-size: 12px; }
.oauth-field small { color: var(--el-text-color-secondary); font-size: 11px; }
.oauth-field :deep(.el-input-number) { width: 100%; }
.oauth-policy { margin: 28px 0 0; padding-top: 18px; border-top: 1px solid var(--el-border-color-lighter); }
@media (max-width: 767px) { .oauth-form-grid { grid-template-columns: 1fr; } .oauth-title { flex-wrap: wrap; } .oauth-guide { padding: 14px; } }
</style>
