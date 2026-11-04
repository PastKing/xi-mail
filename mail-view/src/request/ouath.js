import http from '@/axios/index.js';
import { OAUTH_PROVIDERS } from '@/config/oauth-providers.js';

function providerPath(provider) {
    const entry = OAUTH_PROVIDERS.find(item => item.id === provider)
    if (!entry) throw new Error('Unsupported OAuth provider')
    return entry.apiId
}
export function oauthAuthorize(provider, intent = 'login') {
    const id = providerPath(provider)
    return http.post(intent === 'bind' ? `/my/oauth/${id}/authorize` : `/oauth/${id}/authorize`)
}
export function oauthComplete(provider, code, state, intent = 'login') {
    const id = providerPath(provider)
    // The callback page renders failures in context instead of duplicating them in a toast.
    return http.post(intent === 'bind' ? `/my/oauth/${id}/callback` : `/oauth/${id}/login`, {code, state}, {noMsg: true})
}

export const oauthBindings = () => http.get('/my/oauth')
export const oauthUnbind = provider => http.delete('/my/oauth', { params: { provider } })
