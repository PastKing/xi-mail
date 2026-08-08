import {getCurrentInstance, onUnmounted, ref} from "vue";
import {storeToRefs} from "pinia";
import {ElMessage} from "element-plus";
import {settingQuery, settingSet} from "@/request/setting.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import i18n from "@/i18n/index.js";

export const SYS_SETTING_VERSION = 'v3.4.2'

let context = null

function createContext() {
  const settingStore = useSettingStore()
  const accountStore = useAccountStore()
  const userStore = useUserStore()
  const {settings: setting} = storeToRefs(settingStore)

  const firstLoading = ref(true)
  const settingLoading = ref(false)
  const clearS3Loading = ref(false)

  /* Sections register a handler to re-sync their local form state whenever
     the settings are (re)fetched from the server. */
  const loadedHandlers = new Set()

  let backup = '{}'

  const t = (key, params) => i18n.global.t(key, params)

  function onSettingsLoaded(handler) {
    loadedHandlers.add(handler)
    if (!firstLoading.value) handler()
    if (getCurrentInstance()) {
      onUnmounted(() => loadedHandlers.delete(handler))
    }
  }

  function getSettings() {
    return settingQuery().then(settingData => {
      setting.value = settingData
      settingStore.domainList = settingData.domainList
      if (settingData.colorTheme) {
        document.documentElement.dataset.colorTheme = settingData.colorTheme
      }
      firstLoading.value = false
      loadedHandlers.forEach(handler => handler())
    })
  }

  function backupSetting() {
    backup = JSON.stringify(setting.value)
  }

  function beforeChange() {
    if (settingLoading.value) return false
    backupSetting()
    return true
  }

  /** Persists the whole setting object, used by the inline switches / selects. */
  function change() {
    const settingForm = {...setting.value}
    delete settingForm.siteKey
    delete settingForm.secretKey
    delete settingForm.s3AccessKey
    delete settingForm.s3SecretKey
    delete settingForm.resendTokens
    return editSetting(settingForm, false)
  }

  /** Resolves to true when the save succeeded, so callers can close their dialog. */
  function editSetting(settingForm, refreshStatus = true) {
    if (settingLoading.value) return Promise.resolve(false)
    settingLoading.value = true

    return settingSet(settingForm).then(async () => {
      ElMessage({message: t('saveSuccessMsg'), type: 'success', plain: true})
      if (setting.value.manyEmail === 1) {
        accountStore.currentAccountId = userStore.user.account.accountId
      }
      if (refreshStatus) {
        await getSettings()
      }
      return true
    }).catch(() => {
      setting.value = {...setting.value, ...JSON.parse(backup)}
      return false
    }).finally(() => {
      settingLoading.value = false
      clearS3Loading.value = false
    })
  }

  return {
    setting,
    settingStore,
    firstLoading,
    settingLoading,
    clearS3Loading,
    getSettings,
    editSetting,
    change,
    beforeChange,
    backupSetting,
    onSettingsLoaded,
  }
}

export function useSysSetting() {
  if (!context) {
    context = createContext()
  }
  return context
}
