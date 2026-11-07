import http from '@/axios/index.js';

export function allEmailList(params) {
    return http.get('/allEmail/list', {params: {...params, skipStats: params.emailId ? '1' : undefined}})
}

export function allEmailDelete(emailIds) {
    return http.delete('/allEmail/delete?emailIds=' + emailIds)
}

export function allEmailBatchDelete(params) {
    return http.delete('/allEmail/batchDelete', {params: params} )
}

export function allEmailLatest(emailId, filters = {}) {
    return http.get('/allEmail/latest', {params: {...filters, emailId}, noMsg: true, timeout: 35 * 1000})
}
