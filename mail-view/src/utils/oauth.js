import { oauthAuthorize, oauthComplete } from '@/request/ouath.js'
import { OAUTH_PROVIDERS } from '@/config/oauth-providers.js'
import { useServerStore } from '@/store/server.js'
import i18n from '@/i18n/index.js'

const KEY = 'xi-mail:oauth:state'
function readPendingOAuth() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) } catch { return null }
}
export function getPendingOAuthIntent(provider) {
  const pending = readPendingOAuth()
  return pending?.provider === provider && pending?.serverId === useServerStore().activeServerId &&
    ['login', 'bind'].includes(pending.intent) ? pending.intent : null
}
export async function startOAuth(provider, intent = 'login') {
  if (!OAUTH_PROVIDERS.some(entry => entry.id === provider)) throw new Error('Unsupported provider')
  const flow = await oauthAuthorize(provider, intent)
  sessionStorage.setItem(KEY, JSON.stringify({ state: flow.state, provider, intent,
    serverId: useServerStore().activeServerId }))
  window.location.assign(flow.authorizationUrl)
}

export async function finishOAuth(params, callbackProvider) {
  const pending = readPendingOAuth()
  sessionStorage.removeItem(KEY)
  if (!params.get('state') || pending?.state !== params.get('state') ||
      pending?.serverId !== useServerStore().activeServerId || !OAUTH_PROVIDERS.some(entry => entry.id === pending?.provider) ||
      (callbackProvider && callbackProvider !== pending?.provider) ||
      !['login', 'bind'].includes(pending?.intent))
    throw new Error(i18n.global.t('oauthStateInvalid'))
  if (params.get('error')) throw new Error(i18n.global.t('oauthCancelled'))
  const result = await oauthComplete(pending.provider, params.get('code'), params.get('state'), pending.intent)
  return { intent: pending.intent, result }
}
