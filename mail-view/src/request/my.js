import http from '@/axios/index.js';

export function loginUserInfo() {
    return http.get('/my/loginUserInfo')
}

export function resetPassword(password) {
    return http.put('/my/resetPassword', {password})
}

export function userDelete() {
    return http.delete('/my/delete')
}

export function saveLang(lang) {
    return http.put('/my/lang', { lang })
}

export function sessionList() {
    return http.get('/my/sessions')
}

export function sessionRevoke(sid) {
    return http.delete('/my/sessions', { params: { sid } })
}

export function sessionRevokeOthers() {
    return http.delete('/my/sessions/others')
}

