import http from '@/axios/index.js';

export function settingSet(setting) {
    return http.put('/setting/set',setting)
}

export function settingQuery() {
    return http.get('/setting/query')
}

export function websiteConfig() {
    return http.get('/setting/websiteConfig')
}

export function setBackground(background) {
    return http.put('/setting/setBackground',{background})
}

export function deleteBackground() {
    return http.delete('/setting/deleteBackground')
}

export function getGlobalToken() {
    return http.get('/setting/globalToken')
}

export function setGlobalTokenEnabled(enabled) {
    return http.put('/setting/globalToken/enabled', { enabled })
}

export function generateGlobalToken() {
    return http.post('/setting/globalToken/generate')
}
