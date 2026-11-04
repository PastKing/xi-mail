<template>
  <main class="oauth-result" :class="'is-' + phase">
    <header class="oauth-page-header">
      <a :href="returnPath" class="oauth-wordmark"><BrandMark :size="27" /><span>{{ siteName }}</span></a>
      <span>{{ $t('oauthConnectionPage') }}</span>
    </header>
    <div class="oauth-page-body">
      <section class="oauth-result-card" :aria-busy="phase === 'processing'" aria-labelledby="oauth-result-title">
        <div class="oauth-card-heading">
          <span>{{ $t('oauthConnectionPage') }}</span>
          <span class="oauth-state-label"><span />{{ statusLabel }}</span>
        </div>

        <div class="oauth-connection" aria-hidden="true">
          <div class="oauth-service-mark"><img :src="provider.logo" alt="" width="36" height="36" /></div>
          <span class="oauth-connection-line"><Icon :icon="phase === 'success' ? 'mingcute:check-line' : 'mingcute:arrow-right-line'" width="18" height="18" /></span>
          <div class="oauth-mail-mark"><BrandMark :size="42" /></div>
        </div>
        <div class="oauth-service-names"><span>{{ provider.name }}</span><span>{{ siteName }}</span></div>

        <div class="oauth-status-copy" aria-live="polite" aria-atomic="true">
          <span class="oauth-status-icon" :class="{ spinning: phase === 'processing' }"><Icon :icon="statusIcon" width="22" height="22" /></span>
          <h1 id="oauth-result-title">{{ title }}</h1>
          <p>{{ description }}</p>
        </div>

        <div v-if="phase === 'failed'" class="oauth-error-detail" role="alert"><Icon icon="mingcute:information-line" width="17" height="17" /><p>{{ message }}</p></div>

        <div v-if="phase === 'processing' || phase === 'success'" class="oauth-progress">
          <div :class="{ complete: phase === 'success' }"><Icon :icon="phase === 'success' ? 'mingcute:check-circle-line' : 'mingcute:shield-line'" width="17" height="17" /><span>{{ $t('oauthVerifyIdentity') }}</span><span class="oauth-step-state">{{ $t(phase === 'success' ? 'oauthStepDone' : 'oauthStepPending') }}</span></div>
          <div :class="{ complete: phase === 'success' }"><Icon icon="mingcute:mail-line" width="17" height="17" /><span>{{ destinationLabel }}</span><span class="oauth-step-state">{{ $t(phase === 'success' ? 'oauthStepReady' : 'oauthStepWaiting') }}</span></div>
        </div>

        <div class="oauth-result-actions">
          <template v-if="phase === 'failed'">
            <el-button type="primary" :loading="retrying" @click="retryAuthorization">{{ $t('oauthAuthorizeAgain') }}<Icon icon="mingcute:arrow-right-line" width="16" height="16" /></el-button>
            <el-button text @click="goBack">{{ returnLabel }}</el-button>
          </template>
          <el-button v-else-if="phase === 'success'" type="primary" @click="continueToApp">{{ destinationLabel }}<Icon icon="mingcute:arrow-right-line" width="16" height="16" /></el-button>
          <el-button v-else-if="phase === 'idle'" type="primary" @click="goBack">{{ returnLabel }}<Icon icon="mingcute:arrow-right-line" width="16" height="16" /></el-button>
        </div>
        <p v-if="phase === 'success'" class="oauth-redirect-note">{{ $t('oauthRedirectSoon') }}</p>
      </section>
      <p class="oauth-page-note"><Icon icon="mingcute:lock-line" width="13" height="13" />{{ $t('oauthConnectionNote') }}</p>
    </div>
  </main>
</template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { finishOAuth, getPendingOAuthIntent, startOAuth } from '@/utils/oauth.js'
import { useServerStore } from '@/store/server.js'
import { useSettingStore } from '@/store/setting.js'
import { OAUTH_PROVIDERS } from '@/config/oauth-providers.js'
import BrandMark from '@/components/BrandMark.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const server = useServerStore()
const setting = useSettingStore()
const provider = computed(() => OAUTH_PROVIDERS.find(item => item.id === route.params.provider) || OAUTH_PROVIDERS[0])
const siteName = computed(() => setting.settings.title || 'Xi-Mail')
const phase = ref('processing')
const intent = ref('login')
const message = ref('')
const retrying = ref(false)
const returnPath = computed(() => server.getToken() ? '/settings' : '/login')
const returnLabel = computed(() => t(server.getToken() ? 'oauthBackToSettings' : 'oauthBackToLogin'))
const destinationLabel = computed(() => t(intent.value === 'bind' ? 'oauthBackToSettings' : 'oauthOpenMailbox'))
const statusLabel = computed(() => t({ idle: 'oauthStatusIdle', processing: 'oauthStatusProcessing', success: 'oauthStatusSuccess', failed: 'oauthStatusFailed' }[phase.value]))
const statusIcon = computed(() => ({ idle: 'mingcute:link-line', processing: 'mingcute:loading-line', success: 'mingcute:check-line', failed: 'mingcute:close-line' }[phase.value]))
const title = computed(() => t(phase.value === 'success' ? (intent.value === 'bind' ? 'oauthBindingComplete' : 'oauthLoginComplete') :
  { idle: 'oauthStartTitle', processing: 'oauthProcessing', failed: 'oauthFailed' }[phase.value], { provider: provider.value.name }))
const description = computed(() => t(phase.value === 'success' ? (intent.value === 'bind' ? 'oauthBindingCompleteNote' : 'oauthLoginCompleteNote') :
  { idle: 'oauthStartNote', processing: 'oauthProcessingNote', failed: 'oauthFailureNote' }[phase.value], { provider: provider.value.name }))
let redirectTimer, run = 0, navigating = false
function goBack() { router.replace(returnPath.value) }
function continueToApp() {
  if (phase.value !== 'success' || navigating) return
  navigating = true
  clearTimeout(redirectTimer)
  if (intent.value === 'bind') router.replace('/settings')
  else window.location.replace('/inbox')
}
async function retryAuthorization() {
  if (retrying.value) return
  retrying.value = true
  try { await startOAuth(provider.value.id, intent.value) }
  catch { retrying.value = false }
}
async function processCallback() {
  if (!route.params.provider) return
  const currentRun = ++run
  clearTimeout(redirectTimer)
  navigating = false
  message.value = ''
  intent.value = getPendingOAuthIntent(provider.value.id) || (server.getToken() ? 'bind' : 'login')
  const params = new URLSearchParams(location.search)
  if (!['code', 'state', 'error'].some(key => params.has(key))) { phase.value = 'idle'; return }
  phase.value = 'processing'
  history.replaceState({}, '', location.pathname)
  try {
    const { intent, result } = await finishOAuth(params, route.params.provider)
    if (currentRun !== run) return
    if (intent !== 'bind') {
      if (typeof result?.token !== 'string' || !result.token) throw new Error(t('oauthFailed'))
      server.setToken(server.activeServerId || 'local', result.token)
    }
    // The result remains visible briefly before automatic navigation.
    setSuccess(intent)
  } catch (error) {
    if (currentRun !== run) return
    if (error?.code === 401 || error?.response?.status === 401) {
      server.clearToken(server.activeServerId)
      intent.value = 'login'
    }
    phase.value = 'failed'
    message.value = error?.isAxiosError ? t(error.response ? 'serverBusyErrorMsg' : 'networkErrorMsg') : error?.message || t('oauthFailed')
  }
}
function setSuccess(completedIntent) {
  intent.value = completedIntent
  phase.value = 'success'
  redirectTimer = setTimeout(continueToApp, 1800)
}
watch(() => route.fullPath, processCallback, { immediate: true })
onBeforeUnmount(() => { run++; clearTimeout(redirectTimer) })
</script>
<style scoped>
.oauth-result { min-height: 100vh; min-height: 100dvh; background: var(--el-bg-color-page); color: var(--el-text-color-primary); display: flex; flex-direction: column; }
.oauth-page-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 26px 36px; font-size: 12px; color: var(--el-text-color-secondary); }
.oauth-wordmark { display: inline-flex; align-items: center; gap: 9px; color: var(--el-text-color-primary); text-decoration: none; font-size: 15px; font-weight: 600; }
.oauth-page-body { width: 100%; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 32px 24px 80px; }
.oauth-result-card { width: min(100%, 480px); padding: 28px 32px 30px; border: 1px solid var(--el-border-color-lighter); border-radius: 18px; background: var(--el-bg-color); }
.oauth-card-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 11px; color: var(--el-text-color-secondary); }
.oauth-state-label { display: inline-flex; align-items: center; gap: 6px; }
.oauth-state-label > span { width: 5px; height: 5px; background: currentColor; border-radius: 50%; }
.is-processing .oauth-state-label, .is-processing .oauth-status-icon { color: var(--el-color-primary); }
.is-success .oauth-state-label, .is-success .oauth-status-icon { color: var(--el-color-success); }
.is-failed .oauth-state-label, .is-failed .oauth-status-icon { color: var(--el-color-warning); }
.oauth-connection { display: flex; align-items: center; justify-content: center; margin: 34px auto 0; max-width: 256px; }
.oauth-service-mark, .oauth-mail-mark { width: 64px; height: 64px; flex-shrink: 0; display: grid; place-items: center; border: 1px solid var(--el-border-color-lighter); border-radius: 18px; background: var(--el-bg-color); }
.oauth-service-mark img { object-fit: contain; }
.oauth-mail-mark { background: var(--el-color-primary-light-9); color: var(--el-color-primary); border-color: var(--el-color-primary-light-8); }
.oauth-connection-line { display: flex; align-items: center; flex: 1; color: var(--el-text-color-placeholder); gap: 10px; margin: 0 12px; }
.oauth-connection-line::before, .oauth-connection-line::after { content: ''; flex: 1; height: 1px; background: var(--el-border-color); }
.is-success .oauth-connection-line { color: var(--el-color-success); }
.oauth-service-names { max-width: 256px; display: flex; justify-content: space-between; margin: 10px auto 0; font-size: 11px; color: var(--el-text-color-secondary); }
.oauth-service-names > span { width: 64px; text-align: center; overflow-wrap: anywhere; }
.oauth-status-copy { text-align: center; margin: 30px 0 24px; }
.oauth-status-icon { width: 36px; height: 36px; display: inline-grid; place-items: center; margin-bottom: 8px; color: var(--el-text-color-secondary); }
h1 { margin: 0; font-size: 23px; line-height: 1.5; font-weight: 600; letter-spacing: -.5px; }
.oauth-status-copy p { margin: 10px auto 0; max-width: 350px; font-size: 13px; line-height: 1.85; color: var(--el-text-color-secondary); }
.oauth-error-detail { display: flex; align-items: flex-start; gap: 9px; padding: 13px 14px; border: 1px solid var(--el-border-color-lighter); border-radius: 9px; background: var(--el-fill-color-light); }
.oauth-error-detail > svg { flex-shrink: 0; color: var(--el-text-color-secondary); margin-top: 3px; }
.oauth-error-detail p { margin: 0; color: var(--el-text-color-regular); font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.oauth-progress { padding: 4px 14px; border: 1px solid var(--el-border-color-lighter); border-radius: 9px; }
.oauth-progress > div { display: flex; align-items: center; gap: 9px; min-height: 43px; color: var(--el-text-color-secondary); font-size: 12px; }
.oauth-progress > div + div { border-top: 1px solid var(--el-border-color-lighter); }
.oauth-progress .complete > svg { color: var(--el-color-success); }
.oauth-step-state { margin-left: auto; font-size: 11px; }
.oauth-result-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 22px; }
.oauth-result-actions:empty { display: none; }
.oauth-result-actions :deep(.el-button) { margin: 0; min-height: 40px; border-radius: 9px; font-size: 13px; }
.oauth-result-actions :deep(.el-button > span) { gap: 8px; }
.oauth-redirect-note { margin: 13px 0 0; text-align: center; color: var(--el-text-color-secondary); font-size: 11px; }
.oauth-page-note { display: flex; align-items: center; justify-content: center; gap: 6px; max-width: 440px; text-align: center; margin: 20px 12px 0; color: var(--el-text-color-secondary); font-size: 11px; line-height: 1.7; }
.oauth-page-note > svg { flex-shrink: 0; }
.spinning > svg { animation: oauth-spin 1.1s linear infinite; }
@keyframes oauth-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinning > svg { animation: none; } }
@media (max-width: 540px) { .oauth-page-header { padding: 22px; } .oauth-page-body { padding: 18px 18px 50px; } .oauth-result-card { padding: 24px; border-radius: 15px; } h1 { font-size: 21px; } }
</style>
