import {computed} from 'vue'
import {useSettingStore} from '@/store/setting.js'
import {useUserStore} from '@/store/user.js'
import {useTransferStore} from '@/store/transfer.js'
import {transferPendingList} from '@/request/account-transfer.js'
import {hasPerm} from '@/perm/perm.js'

export const mainNav = Object.freeze([
  { name: 'email', icon: 'mingcute:inbox-line', label: 'inbox', primary: true },
  { name: 'send', icon: 'mingcute:send-line', label: 'sent', sendOnly: true, primary: true },
  { name: 'draft', icon: 'mingcute:file-line', label: 'drafts', sendOnly: true },
  { name: 'star', icon: 'mingcute:star-line', label: 'starred', primary: true },
  { name: 'transfer', icon: 'mingcute:transfer-3-line', label: 'transferPending', badge: 'transfer', primary: true },
  { name: 'setting', icon: 'mingcute:settings-3-line', label: 'settings', primary: true },
])

export const adminNav = Object.freeze([
  { name: 'analysis', icon: 'mingcute:chart-pie-2-line', label: 'analytics', perm: 'analysis:query' },
  { name: 'user', icon: 'mingcute:group-line', label: 'allUsers', perm: 'user:query' },
  { name: 'all-email', icon: 'mingcute:mail-open-line', label: 'allMail', perm: 'all-email:query' },
  { name: 'role', icon: 'mingcute:shield-line', label: 'permissions', perm: 'role:query' },
  { name: 'reg-key', icon: 'mingcute:key-2-line', label: 'inviteCode', perm: 'reg-key:query' },
  { name: 'sys-setting', icon: 'mingcute:settings-6-line', label: 'SystemSettings', perm: 'setting:query' },
])

let pendingRequest

function loadPendingCount(transferStore) {
  if (!pendingRequest) {
    pendingRequest = transferPendingList()
      .then(list => {
        transferStore.pendingCount = list.length
        return list.length
      })
      .catch(() => 0)
  }
  return pendingRequest
}

export function useNavigationAccess() {
  const settingStore = useSettingStore()
  const userStore = useUserStore()
  const transferStore = useTransferStore()

  const canSend = computed(() => {
    if (settingStore.settings.send === 1) return false
    if (userStore.user?.role?.sendType === 'ban') return false
    return hasPerm('email:send')
  })

  const isVisible = item => {
    if (item.sendOnly && !canSend.value) return false
    return !item.perm || hasPerm(item.perm)
  }

  const visibleMainNav = computed(() => mainNav.filter(isVisible))
  const visibleAdminNav = computed(() => adminNav.filter(isVisible))

  loadPendingCount(transferStore)

  return {
    canSend,
    transferStore,
    visibleMainNav,
    visibleAdminNav,
  }
}
