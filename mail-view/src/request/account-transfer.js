import http from '@/axios/index.js'

export function transferCreate(params) {
    return http.post('/transfer/create', params)
}

export function transferAccept(transferId) {
    return http.put('/transfer/accept', { transferId })
}

export function transferReject(transferId) {
    return http.put('/transfer/reject', { transferId })
}

export function transferPendingList() {
    return http.get('/transfer/pending')
}

export function transferSentList() {
    return http.get('/transfer/sent')
}

export function transferReceivedHistory() {
    return http.get('/transfer/received-history')
}
