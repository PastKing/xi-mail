<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('oss') }}</div>
      <div class="card-content">
        <div class="r2domain-item">
          <div>
            <span>{{ $t('osDomain') }}</span>
            <el-tooltip effect="dark" :content="$t('ossDomainDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="r2domain">
            <span>{{ setting.r2Domain || '' }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="r2DomainShow = true">
              <Icon icon="mingcute:edit-2-line" width="16" height="16"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('s3Configuration') }}</span></div>
          <div class="r2domain">
            <el-button class="opt-button" size="small" type="primary" @click="addS3Show = true">
              <Icon icon="mingcute:settings-3-line" width="16" height="16"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('storageType') }}</span></div>
          <div class="r2domain">
            <div class="storage-type">
              <el-tag>{{ setting.storageType }}</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="card-title">{{ $t('emailPush') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('tgBot') }}</span></div>
          <div class="forward">
            <span>{{ setting.tgBotStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="openTgSetting">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('otherEmail') }}</span></div>
          <div class="forward">
            <span>{{ setting.forwardStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="openThirdEmailSetting">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('forwardingRules') }}</span></div>
          <div class="forward">
            <span>{{ setting.ruleType === 0 ? $t('forwardAll') : $t('rules') }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="openForwardRules">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="card-title">{{ $t('turnstileSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('signUpVerification') }}</span></div>
          <div>
            <el-button class="opt-button" size="small" type="primary" @click="openRegVerifyCount">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
            <el-select
                @change="change"
                :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                v-model="setting.registerVerify"
                placeholder="Select"
                class="bot-verify-select"
            >
              <el-option :value="0" :label="$t('enable')"/>
              <el-option :value="1" :label="$t('disable')"/>
              <el-option :value="2" :label="$t('rulesVerify')"/>
            </el-select>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('addEmailVerification') }}</span></div>
          <div>
            <el-button class="opt-button" size="small" type="primary" @click="openAddVerifyCount">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
            <el-select
                @change="change"
                :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                v-model="setting.addEmailVerify"
                placeholder="Select"
                class="bot-verify-select"
            >
              <el-option :value="0" :label="$t('enable')"/>
              <el-option :value="1" :label="$t('disable')"/>
              <el-option :value="2" :label="$t('rulesVerify')"/>
            </el-select>
          </div>
        </div>
        <div class="setting-item">
          <div><span>Site Key</span></div>
          <div class="bot-verify">
            <span>{{ setting.siteKey }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="turnstileShow = true">
              <Icon icon="mingcute:edit-2-line" width="16" height="16"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>Secret Key</span></div>
          <div class="bot-verify">
            <span>{{ setting.secretKey }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="turnstileShow = true">
              <Icon icon="mingcute:edit-2-line" width="16" height="16"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="card-title">{{ $t('noticeTitle') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('noticePopup') }}</span></div>
          <div class="forward">
            <span>{{ setting.notice === 0 ? $t('enabled') : $t('disabled') }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="noticePopupShow = true">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('popUp') }}</span></div>
          <div class="forward">
            <el-button class="opt-button" size="small" type="primary" @click="uiStore.showNotice()">
              <Icon icon="mingcute:hand-finger-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Dialogs ── -->
    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="r2DomainShow" :title="$t('addOsDomain')"
               @closed="r2DomainInput = setting.r2Domain">
      <form>
        <el-input type="text" :placeholder="$t('domainDesc')" v-model="r2DomainInput"/>
        <el-button type="primary" :loading="settingLoading" @click="saveR2domain">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="addS3Show" :title="$t('s3Configuration')" @closed="resetS3Form">
      <form>
        <el-input class="dialog-input" type="text" placeholder="Bucket" v-model="s3.bucket"/>
        <el-input class="dialog-input" type="text" placeholder="Endpoint" v-model="s3.endpoint"/>
        <el-input class="dialog-input" type="text" placeholder="Region" v-model="s3.region"/>
        <el-input class="dialog-input" type="text" :placeholder="setting.s3AccessKey || 'Access Key'" v-model="s3.s3AccessKey"/>
        <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.s3SecretKey || 'Secret Key'" v-model="s3.s3SecretKey"/>
        <div class="force-path-style">
          <div class="force-path-style-left">
            <span>ForcePathStyle</span>
            <el-tooltip effect="dark" :content="$t('forcePathStyleDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <el-switch :before-change="beforeChange" :active-value="0" :inactive-value="1" v-model="s3.forcePathStyle"/>
        </div>
        <div class="s3-button">
          <el-button :loading="clearS3Loading" @click="clearS3">{{ $t('clear') }}</el-button>
          <el-button type="primary" :loading="settingLoading && !clearS3Loading" @click="saveS3">{{ $t('save') }}</el-button>
        </div>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="turnstileShow" :title="$t('addTurnstileSecret')"
               @closed="turnstileForm.secretKey = ''; turnstileForm.siteKey = ''">
      <form>
        <el-input type="text" placeholder="Site Key" v-model="turnstileForm.siteKey"/>
        <el-input type="text" style="margin-top: 15px" placeholder="Secret Key" v-model="turnstileForm.secretKey"/>
        <el-button type="primary" :loading="settingLoading" @click="saveTurnstileKey">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="regVerifyCountShow"
               :title="$t('rulesVerifyTitle', { count: regVerifyCount })"
               @closed="regVerifyCount = setting.regVerifyCount">
      <form>
        <el-input-number v-model="regVerifyCount" :min="1"/>
        <el-button type="primary" :loading="settingLoading" @click="saveRegVerifyCount">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="addVerifyCountShow"
               :title="$t('rulesVerifyTitle', { count: addVerifyCount })"
               @closed="addVerifyCount = setting.addVerifyCount">
      <form>
        <el-input-number v-model="addVerifyCount" :min="1"/>
        <el-button type="primary" :loading="settingLoading" @click="saveAddVerifyCount">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog v-model="tgSettingShow" class="sys-setting-dialog forward-dialog">
      <template #header>
        <div class="forward-head">
          <span class="forward-set-title">{{ $t('tgBot') }}</span>
          <el-tooltip effect="dark" :content="$t('tgBotDesc')">
            <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
          </el-tooltip>
        </div>
      </template>
      <div class="forward-set-body">
        <el-input :placeholder="$t('tgBotToken')" v-model="tgBotToken"/>
        <el-input-tag tag-type="warning" :placeholder="$t('toBotTokenDesc')" v-model="tgChatId" @add-tag="addChatTag"/>
        <el-input tag-type="warning" :placeholder="$t('customDomainDesc')" v-model="customDomain"/>
        <div class="tg-msg-label">
          <span>{{ $t('from') }}</span>
          <el-select v-model="tgMsgFrom">
            <el-option v-for="item in tgMsgFromOption" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
        </div>
        <div class="tg-msg-label">
          <span>{{ $t('recipient') }}</span>
          <el-select v-model="tgMsgTo">
            <el-option v-for="item in showHideOption" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
        </div>
        <div class="tg-msg-label">
          <span>{{ $t('emailText') }}</span>
          <el-select v-model="tgMsgText">
            <el-option v-for="item in showHideOption" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-switch v-model="tgBotStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                     :inactive-text="$t('disable')"/>
          <el-button :loading="settingLoading" type="primary" @click="tgBotSave">{{ $t('save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="thirdEmailShow" class="sys-setting-dialog forward-dialog">
      <template #header>
        <div class="forward-head">
          <span class="forward-set-title">{{ $t('otherEmail') }}</span>
          <el-tooltip effect="dark" :content="$t('otherEmailDesc')">
            <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
          </el-tooltip>
        </div>
      </template>
      <div class="forward-set-body">
        <el-input-tag tag-type="warning" :placeholder="$t('otherEmailInputDesc')" v-model="forwardEmail"
                      @add-tag="emailAddTag"/>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-switch v-model="forwardStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                     :inactive-text="$t('disable')"/>
          <el-button :loading="settingLoading" type="primary" @click="forwardEmailSave">{{ $t('save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="forwardRulesShow" class="sys-setting-dialog forward-dialog">
      <template #header>
        <div class="forward-head">
          <span class="forward-set-title">{{ $t('forwardingRules') }}</span>
          <el-tooltip effect="dark" :content="$t('forwardingRulesDesc')">
            <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
          </el-tooltip>
        </div>
      </template>
      <div class="forward-set-body">
        <el-input-tag :placeholder="$t('ruleEmailsInputDesc')" tag-type="success" v-model="ruleEmail"
                      @add-tag="ruleEmailAddTag"/>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-radio-group v-model="ruleType">
            <el-radio :value="0">{{ $t('forwardAll') }}</el-radio>
            <el-radio :value="1">{{ $t('rules') }}</el-radio>
          </el-radio-group>
          <el-button :loading="settingLoading" type="primary" @click="ruleEmailSave">{{ $t('save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog top="5vh" v-model="noticePopupShow" :title="$t('noticePopup')" class="sys-setting-dialog notice-popup"
               @closed="resetNoticeForm">
      <form>
        <div class="notice-form-row">
          <span class="notice-form-label">{{ $t('titleDesc') }}</span>
          <el-input v-model="noticeForm.noticeTitle" :placeholder="$t('titleDesc')"/>
        </div>
        <div class="notice-form-row">
          <span class="notice-form-label">{{ $t('width') }}</span>
          <el-input-number v-model="noticeForm.noticeWidth" :min="300" :max="1200" style="width:100%">
            <template #suffix>px</template>
          </el-input-number>
        </div>
        <div class="notice-popup-item">
          <el-input
              v-model="noticeForm.noticeContent"
              :autosize="{ minRows: 15, maxRows: 25 }"
              type="textarea"
              :placeholder="$t('noticeContentDesc')"
          />
        </div>
      </form>
      <template #footer>
        <div class="dialog-footer">
          <el-switch v-model="noticeForm.notice" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                     :inactive-text="$t('disable')"/>
          <div>
            <el-button @click="uiStore.previewNotice({ ...noticeForm })">{{ $t('preview') }}</el-button>
            <el-button :loading="settingLoading" type="primary" @click="saveNoticePopup">{{ $t('save') }}</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, defineOptions, reactive, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {isEmail} from "@/utils/verify-utils.js";
import {useUiStore} from "@/store/ui.js";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-integration'
})

const {t, locale} = useI18n()
const uiStore = useUiStore()
const {setting, settingLoading, clearS3Loading, editSetting, change, beforeChange, onSettingsLoaded} = useSysSetting()

const r2DomainShow = ref(false)
const r2DomainInput = ref('')
const addS3Show = ref(false)
const turnstileShow = ref(false)
const tgSettingShow = ref(false)
const thirdEmailShow = ref(false)
const forwardRulesShow = ref(false)
const noticePopupShow = ref(false)
const regVerifyCountShow = ref(false)
const addVerifyCountShow = ref(false)
const regVerifyCount = ref(1)
const addVerifyCount = ref(1)

const turnstileForm = reactive({siteKey: '', secretKey: ''})

const s3 = reactive({
  bucket: '',
  endpoint: '',
  region: '',
  s3AccessKey: '',
  s3SecretKey: '',
  forcePathStyle: 1
})

const noticeForm = reactive({
  noticeTitle: '',
  noticeContent: '',
  noticeType: '',
  noticeDuration: '',
  noticePosition: '',
  noticeOffset: 0,
  notice: 0,
  noticeWidth: 0
})

const tgChatId = ref([])
const customDomain = ref('')
const tgBotStatus = ref(0)
const tgBotToken = ref('')
const tgMsgFrom = ref('')
const tgMsgTo = ref('')
const tgMsgText = ref('')
const forwardEmail = ref([])
const forwardStatus = ref(0)
const ruleType = ref(0)
const ruleEmail = ref([])

const showHideOption = computed(() => [
  {label: t('show'), value: 'show'},
  {label: t('hide'), value: 'hide'},
])
const tgMsgFromOption = computed(() => [
  ...showHideOption.value,
  {label: t('onlyName'), value: 'only-name'},
])
const tgMsgLabelWidth = computed(() => locale.value === 'en' ? '120px' : '100px')

function resetS3Form() {
  s3.bucket = setting.value.bucket
  s3.endpoint = setting.value.endpoint
  s3.region = setting.value.region
  s3.s3AccessKey = ''
  s3.s3SecretKey = ''
  s3.forcePathStyle = setting.value.forcePathStyle
}

function resetNoticeForm() {
  noticeForm.notice = setting.value.notice
  noticeForm.noticeContent = setting.value.noticeContent
  noticeForm.noticeDuration = setting.value.noticeDuration
  noticeForm.noticeTitle = setting.value.noticeTitle
  noticeForm.noticePosition = setting.value.noticePosition
  noticeForm.noticeType = setting.value.noticeType
  noticeForm.noticeOffset = setting.value.noticeOffset
  noticeForm.noticeWidth = setting.value.noticeWidth
}

onSettingsLoaded(() => {
  r2DomainInput.value = setting.value.r2Domain
  regVerifyCount.value = setting.value.regVerifyCount
  addVerifyCount.value = setting.value.addVerifyCount
  resetS3Form()
  resetNoticeForm()
})

function openTgSetting() {
  tgBotStatus.value = setting.value.tgBotStatus
  tgBotToken.value = setting.value.tgBotToken
  customDomain.value = setting.value.customDomain
  tgMsgFrom.value = setting.value.tgMsgFrom
  tgMsgText.value = setting.value.tgMsgText
  tgMsgTo.value = setting.value.tgMsgTo
  tgChatId.value = setting.value.tgChatId ? setting.value.tgChatId.split(',') : []
  tgSettingShow.value = true
}

function openThirdEmailSetting() {
  forwardStatus.value = setting.value.forwardStatus
  forwardEmail.value = setting.value.forwardEmail ? setting.value.forwardEmail.split(',') : []
  thirdEmailShow.value = true
}

function openForwardRules() {
  ruleType.value = setting.value.ruleType
  ruleEmail.value = setting.value.ruleEmail ? setting.value.ruleEmail.split(',') : []
  forwardRulesShow.value = true
}

function openRegVerifyCount() {
  if (settingLoading.value) return
  regVerifyCountShow.value = true
}

function openAddVerifyCount() {
  if (settingLoading.value) return
  addVerifyCountShow.value = true
}

/** el-input-tag emits the raw text, so split it on both ASCII and CJK commas. */
function splitTag(val) {
  return Array.from(new Set(val.split(/[,，]/).map(item => item.trim()).filter(Boolean)))
}

function emailAddTag(val) {
  forwardEmail.value.splice(forwardEmail.value.length - 1, 1)
  splitTag(val).forEach(email => {
    if (isEmail(email) && !forwardEmail.value.includes(email)) {
      forwardEmail.value.push(email)
    }
  })
}

function ruleEmailAddTag(val) {
  ruleEmail.value.splice(ruleEmail.value.length - 1, 1)
  splitTag(val).forEach(email => {
    if (isEmail(email) && !ruleEmail.value.includes(email)) {
      ruleEmail.value.push(email)
    }
  })
}

function addChatTag(val) {
  tgChatId.value.splice(tgChatId.value.length - 1, 1)
  splitTag(val).forEach(id => {
    if (!isNaN(Number(id))) {
      tgChatId.value.push(id)
    }
  })
}

function saveR2domain() {
  editSetting({r2Domain: r2DomainInput.value}).then(ok => {
    if (ok) r2DomainShow.value = false
  })
}

function clearS3() {
  clearS3Loading.value = true
  editSetting({
    bucket: '',
    endpoint: '',
    region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    forcePathStyle: 1
  }).then(ok => {
    if (ok) addS3Show.value = false
  })
}

function saveS3() {
  const form = {
    bucket: s3.bucket,
    endpoint: s3.endpoint,
    region: s3.region,
    forcePathStyle: s3.forcePathStyle
  }
  if (s3.s3AccessKey) form.s3AccessKey = s3.s3AccessKey
  if (s3.s3SecretKey) form.s3SecretKey = s3.s3SecretKey

  editSetting(form).then(ok => {
    if (ok) addS3Show.value = false
  })
}

function saveTurnstileKey() {
  editSetting({siteKey: turnstileForm.siteKey, secretKey: turnstileForm.secretKey}).then(ok => {
    if (ok) turnstileShow.value = false
  })
}

function saveRegVerifyCount() {
  regVerifyCount.value = regVerifyCount.value || 1
  editSetting({regVerifyCount: regVerifyCount.value}).then(ok => {
    if (ok) regVerifyCountShow.value = false
  })
}

function saveAddVerifyCount() {
  addVerifyCount.value = addVerifyCount.value || 1
  editSetting({addVerifyCount: addVerifyCount.value}).then(ok => {
    if (ok) addVerifyCountShow.value = false
  })
}

function tgBotSave() {
  editSetting({
    tgBotToken: tgBotToken.value,
    customDomain: customDomain.value,
    tgBotStatus: tgBotStatus.value,
    tgChatId: tgChatId.value + '',
    tgMsgFrom: tgMsgFrom.value,
    tgMsgText: tgMsgText.value,
    tgMsgTo: tgMsgTo.value
  }).then(ok => {
    if (ok) tgSettingShow.value = false
  })
}

function forwardEmailSave() {
  editSetting({
    forwardStatus: forwardStatus.value,
    forwardEmail: forwardEmail.value + ''
  }).then(ok => {
    if (ok) thirdEmailShow.value = false
  })
}

function ruleEmailSave() {
  editSetting({
    ruleEmail: ruleEmail.value + '',
    ruleType: ruleType.value
  }).then(ok => {
    if (ok) forwardRulesShow.value = false
  })
}

function saveNoticePopup() {
  noticeForm.noticeOffset = noticeForm.noticeOffset || 0
  noticeForm.noticeWidth = noticeForm.noticeWidth || 0
  noticeForm.noticeDuration = noticeForm.noticeDuration || 0
  editSetting({...noticeForm}).then(ok => {
    if (ok) noticePopupShow.value = false
  })
}
</script>

<style scoped lang="scss">
.r2domain-item {
  display: flex;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  > div:first-child {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  > div:last-child {
    flex: 1;
    text-align: right;
  }
}

.r2domain {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;

  .storage-type {
    margin-right: 3px;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.bot-verify {
  display: grid;
  grid-template-columns: 1fr auto;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  span {
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.bot-verify-select {
  margin-left: 10px;
}

.s3-button {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 15px;

  .el-button {
    margin-left: 0;
  }
}

.force-path-style {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  .force-path-style-left {
    padding-left: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
  }
}

.notice-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .notice-form-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    min-width: 48px;
  }

  .el-input, .el-input-number {
    flex: 1;
  }
}

.notice-popup-item {
  margin-top: 8px;
}

.forward-set-body {
  display: flex;
  flex-direction: column;

  .el-switch {
    align-self: end;
  }

  > *:nth-child(-n+2) {
    margin-bottom: 15px;
  }

  .tg-msg-label {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .el-select {
      width: v-bind(tgMsgLabelWidth);
    }
  }
}

.forward-head {
  display: flex;
  align-items: center;

  .forward-set-title {
    top: 1px;
    padding-right: 5px;
    position: relative;
    font-size: 16px;
    font-weight: bold;
  }
}

:deep(.forward-dialog.el-dialog) {
  width: 500px !important;

  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.notice-popup.el-dialog) {
  min-height: 300px;
  width: 820px !important;

  @media (max-width: 860px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}
</style>
