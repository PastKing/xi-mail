import http from '@/axios/index.js';

export function emailList(accountId, allReceive, emailId, timeSort, size, type, filters = {}) {
    return http.get('/email/list', {params: {...filters, accountId, allReceive, emailId, timeSort, size, type, skipStats: emailId ? '1' : undefined}})
}

export function emailDelete(emailIds) {
    return http.delete('/email/delete?emailIds=' + emailIds)
}

export function emailLatest(emailId, accountId, allReceive, filters = {}) {
    return http.get('/email/latest', {params: {...filters, emailId, accountId, allReceive}, noMsg: true, timeout: 35 * 1000})
}

export function emailRead(emailIds) {
    return http.put('/email/read', {emailIds})
}

export function emailContent(emailId) {
    return http.get('/email/content', {params: {emailId}})
}

// 列表接口只返回摘要，正文在打开时懒加载；取回后原地合并并打标记避免重复请求
export async function ensureEmailContent(email) {
    if (!email || !email.emailId || (email.contentFull && email.attachmentUrlsExpireAt > Date.now()+60000)) {
        return email
    }
    const data = await emailContent(email.emailId)
    email.content = data.content
    email.text = data.text
    email.attachmentUrls = data.attachmentUrls || {}
    email.attachmentUrlsExpireAt = data.attachmentUrlsExpireAt || Date.now()+300000
    email.contentFull = true
    return email
}

export function emailSend(form,progress) {
    return http.post('/email/send', form,{
        onUploadProgress: (e) => {
            progress(e)
        },
        noMsg: true
    })
}
