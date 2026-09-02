import { ElNotification } from 'element-plus'
import { h } from 'vue'

// 请求浏览器通知权限（仅在开启新邮件通知时调用一次）
export function requestNotifyPermission() {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') {
        try { Notification.requestPermission() } catch (e) { /* ignore */ }
    }
}

/**
 * 新邮件到达提示：页面隐藏且有系统通知权限时走系统通知，否则页内弹窗
 * @param {object} email 摘要邮件对象
 * @param {object} opts { title, onClick }
 */
export function notifyNewEmail(email, opts = {}) {
    const sender = email.name || email.sendEmail || ''
    const subject = email.subject || ''

    if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
            const n = new Notification(opts.title || sender, {
                body: subject,
                tag: `email-${email.emailId}`,
                icon: '/mail.png'
            })
            n.onclick = () => {
                window.focus()
                opts.onClick?.()
                n.close()
            }
            return
        } catch (e) { /* 回退页内弹窗 */ }
    }

    ElNotification({
        title: sender,
        message: h('div', {
            style: 'cursor:pointer;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
            onClick: () => opts.onClick?.()
        }, subject),
        type: 'success',
        duration: 5000,
        position: 'bottom-right'
    })
}
