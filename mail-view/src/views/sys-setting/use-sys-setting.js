import {getCurrentInstance, onUnmounted, ref} from "vue";
import {storeToRefs} from "pinia";
import {ElMessage} from "element-plus";
import {settingQuery, settingSet} from "@/request/setting.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import i18n from "@/i18n/index.js";
import { OAUTH_PROVIDERS } from '@/config/oauth-providers.js';

export const SYS_SETTING_VERSION = 'v3.6.11'

let context = null

function createContext() {
  const settingStore = useSettingStore()
  const accountStore = useAccountStore()
  const userStore = useUserStore()
  const {settings: setting} = storeToRefs(settingStore)

  const firstLoading = ref(true)
  const settingLoading = ref(false)
  const savingFields = ref([])
  const clearS3Loading = ref(false)
  const pendingSaves = []
  let saveQueue = Promise.resolve()

  /* Sections register a handler to re-sync their local form state whenever
     the settings are (re)fetched from the server. */
  const loadedHandlers = new Set()
  const dirtyChecks = new Map()

  let backup = '{}'
  let persisted = {}
  let hasPersisted = false
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b)
  const isSaving = (...keys) => settingLoading.value && keys.flat().some(key => savingFields.value.includes(key))

  const t = (key, params) => i18n.global.t(key, params)

  function onSettingsLoaded(handler) {
    loadedHandlers.add(handler)
    if (!firstLoading.value) handler()
    if (getCurrentInstance()) {
      onUnmounted(() => loadedHandlers.delete(handler))
    }
  }

  function onSettingsDirty(check, discard) {
    dirtyChecks.set(check, discard)
    if (getCurrentInstance()) onUnmounted(() => dirtyChecks.delete(check))
  }
  function hasUnsavedChanges() { return [...dirtyChecks.keys()].some(check => check()) }
  function discardUnsavedChanges() { for (const [check,discard] of dirtyChecks) if (check()) discard?.() }

  function getSettings(completingJob = null) {
    return settingQuery().then(settingData => {
      const queuedFields=new Set(pendingSaves.filter(job=>job!==completingJob).flatMap(job=>job.keys))
      const edits = hasPersisted ? Object.fromEntries(Object.entries(setting.value).filter(([key,value]) => queuedFields.has(key) || (!completingJob?.keys.includes(key) && !equal(value,persisted[key])))) : {}
      persisted = clone(settingData)
      hasPersisted = true
      setting.value = {...settingData,...edits}
      settingStore.domainList = settingData.domainList
      if (setting.value.colorTheme) {
        document.documentElement.dataset.colorTheme = setting.value.colorTheme
      }
      firstLoading.value = false
      loadedHandlers.forEach(handler => handler(completingJob?.keys || []))
    })
  }

  function backupSetting() {
    backup = JSON.stringify(setting.value)
  }

  function beforeChange() {
    backupSetting()
    return true
  }

  /** Inline controls submit only fields changed from the last server snapshot. */
  function change(field) {
    if(typeof field==='string')return editSetting({[field]:clone(setting.value[field])},false)
    const settingForm = {...setting.value}
    delete settingForm.siteKey
    delete settingForm.secretKey
    delete settingForm.s3AccessKey
    delete settingForm.s3SecretKey
    delete settingForm.resendTokens
    delete settingForm.queenTokens
    delete settingForm.sendflareTokens
    delete settingForm.sendProviders
    delete settingForm.hasR2
    delete settingForm.objectProxyBase
    delete settingForm.hasAi
    delete settingForm.aiModels
    delete settingForm.domainList
    delete settingForm.hasResendWebhookSecret
    delete settingForm.translation
    // OAuth settings are saved only by the provider form, never by unrelated switches.
    for (const provider of OAUTH_PROVIDERS) {
      for (const suffix of ['Switch', 'ClientId', 'ClientSecret', 'CallbackUrl', 'HasSecret', 'MinTrustLevel']) delete settingForm[provider.id + suffix]
    }
    const changed = hasPersisted ? Object.fromEntries(Object.entries(settingForm).filter(([key,value]) => !savingFields.value.includes(key) && !equal(value,persisted[key]))) : settingForm
    return editSetting(changed, false)
  }

  /** Resolves to true when the save succeeded, so callers can close their dialog. */
  function editSetting(settingForm, refreshStatus = true) {
    const keys = Object.keys(settingForm)
    if (!keys.length) return Promise.resolve(true)
    const job={keys,form:clone(settingForm)}
    pendingSaves.push(job)
    syncSavingState()
    const run=async()=>{
      const before = clone(hasPersisted ? persisted : JSON.parse(backup))
      try{
        await settingSet(job.form)
        ElMessage({message: t('saveSuccessMsg'), type: 'success', plain: true})
        if (setting.value.manyEmail === 1) accountStore.currentAccountId = userStore.user.account?.accountId || 0
        if (refreshStatus) await getSettings(job)
        else Object.assign(persisted,clone(job.form))
        return true
      }catch{
        for (const key of keys) {
          if (!pendingSaves.some(other=>other!==job&&other.keys.includes(key)) && equal(setting.value[key],job.form[key])) setting.value[key] = clone(before[key])
        }
        if(keys.includes('colorTheme')&&setting.value.colorTheme)document.documentElement.dataset.colorTheme=setting.value.colorTheme
        return false
      }finally{
        pendingSaves.splice(pendingSaves.indexOf(job),1)
        syncSavingState()
        if(keys.includes('bucket'))clearS3Loading.value = false
      }
    }
    const result=saveQueue.then(run,run)
    saveQueue=result.then(()=>undefined,()=>undefined)
    return result
  }
  function syncSavingState(){
    settingLoading.value=pendingSaves.length>0
    savingFields.value=[...new Set(pendingSaves.flatMap(job=>job.keys))]
  }

  return {
    setting,
    settingStore,
    firstLoading,
    settingLoading,
    isSaving,
    clearS3Loading,
    getSettings,
    editSetting,
    change,
    beforeChange,
    backupSetting,
    onSettingsLoaded,
    onSettingsDirty,
    hasUnsavedChanges,
    discardUnsavedChanges,
    applyExternalSettings(patch) {
      Object.assign(setting.value,clone(patch))
      Object.assign(persisted,clone(patch))
      loadedHandlers.forEach(handler => handler())
    },
  }
}

export function useSysSetting() {
  if (!context) {
    context = createContext()
  }
  return context
}
