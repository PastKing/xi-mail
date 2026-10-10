const HTML_TAG = /<\/?[a-z][^>]*>/i

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

// 不含 HTML 标签的公告按纯文本处理，保留换行
export function renderNotice(content) {
    if (!content) return ''
    if (HTML_TAG.test(content)) return content
    return escapeHtml(content).replace(/\r?\n/g, '<br>')
}
