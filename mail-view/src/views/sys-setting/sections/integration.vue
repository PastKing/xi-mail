<template>
  <div class="sys-setting-section">
    <div v-if="inArea('webhook')" class="settings-card">
      <div class="card-title">{{ $t('resendWebhookTitle') }}</div>
      <div class="card-content">
        <p class="ai-code-desc">{{ $t('resendWebhookDescription') }}</p>
        <div class="webhook-endpoint"><span>{{ $t('oauthCallbackUrl') }}</span><code>{{ webhookUrl }}</code></div>
        <label class="webhook-secret-field"><span>Signing Secret</span>
          <el-input v-model="webhookSecret" type="password" show-password autocomplete="new-password" :placeholder="setting.hasResendWebhookSecret ? $t('oauthSecretKept') : 'whsec_…'" />
        </label>
        <div class="webhook-secret-actions">
          <el-tag :type="setting.hasResendWebhookSecret ? 'success' : 'warning'" size="small">{{ $t(setting.hasResendWebhookSecret ? 'resendWebhookConfigured' : 'resendWebhookUnconfigured') }}</el-tag>
          <el-button type="primary" :loading="settingLoading" @click="saveWebhookSecret">{{ $t('save') }}</el-button>
        </div>
      </div>
    </div>
    <div v-if="inArea('storage')" class="settings-card">
      <div class="card-title"><Icon icon="mingcute:scan-line" width="15" height="15"/>{{ $t('aiCode') }}</div>
      <div class="card-content">
        <p class="ai-code-desc">{{ $t('aiCodeDesc') }}</p>
        <div class="setting-item">
          <div>
            <span>{{ $t('workersAi') }}</span>
            <el-tooltip effect="dark" :content="$t('workersAiDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-tag :type="setting.hasAi ? 'success' : 'info'" size="small">
              {{ setting.hasAi ? $t('workersAiBound') : $t('workersAiUnbound') }}
            </el-tag>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('aiModel') }}</span>
            <el-tooltip effect="dark" :content="$t('aiModelDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-select popper-class="sys-setting-popper"
                v-model="setting.aiModel"
                @change="change"
                :disabled="!setting.hasAi"
                :placeholder="$t('aiModel')"
                style="width: 280px"
            >
              <el-option
                  v-for="m in (setting.aiModels || [])"
                  :key="m.id"
                  :label="aiModelLabel(m)"
                  :value="m.id"
              />
            </el-select>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('aiCodeEnable') }}</span>
            <el-tooltip effect="dark" :content="$t('aiCodeEnableDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward" style="display: flex; gap: 8px; align-items: center;">
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.aiCode"/>
          </div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ $t('aiCodeFilter') }}</span></div>
          <p>{{ $t('aiCodeFilterHint') }}</p>
          <el-input-tag v-model="aiCodeFilterData" :aria-label="$t('aiCodeFilter')" :placeholder="$t('aiCodeFilterPlaceholder')" />
          <div class="settings-inline-actions"><el-button @click="resetAiCodeFilter">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="settingLoading" @click="saveAiCodeFilter">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
      </div>
    </div>

    <div v-if="inArea('storage')" class="settings-card">
      <div class="card-title"><Icon icon="mingcute:folder-2-line" width="15" height="15"/>{{ $t('oss') }}</div>
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
            <el-button class="settings-action" @click="r2DomainShow = true">{{ $t('change') }}</el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('s3Configuration') }}</span></div>
          <div class="r2domain">
            <el-button class="settings-action" @click="addS3Show = true">{{ $t('manage') }}</el-button>
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

    <div v-if="inArea('forward')" class="settings-card">
      <div class="card-title"><Icon icon="mingcute:notification-line" width="15" height="15"/>{{ $t('emailPush') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('tgBot') }}</span></div>
          <div class="forward">
            <span>{{ setting.tgBotStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
            <el-button class="settings-action" @click="openTgSetting">{{ $t('manage') }}</el-button>
          </div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ $t('otherEmail') }}</span><el-switch v-model="forwardStatus" :active-value="0" :inactive-value="1" :aria-label="$t('otherEmail')" /></div>
          <p>{{ $t('otherEmailDesc') }}</p>
          <el-input-tag v-model="forwardEmail" :aria-label="$t('otherEmail')" :placeholder="$t('otherEmailInputDesc')" @add-tag="emailAddTag" />
          <div class="settings-inline-actions"><el-button @click="resetForwardEmail">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="settingLoading" @click="forwardEmailSave">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ $t('forwardingRules') }}</span></div>
          <p>{{ $t('forwardingRulesDesc') }}</p>
          <el-radio-group v-model="ruleType"><el-radio :value="0">{{ $t('forwardAll') }}</el-radio><el-radio :value="1">{{ $t('rules') }}</el-radio></el-radio-group>
          <el-input-tag v-model="ruleEmail" :aria-label="$t('forwardingRules')" :placeholder="$t('ruleEmailsInputDesc')" @add-tag="ruleEmailAddTag" />
          <div class="settings-inline-actions"><el-button @click="resetForwardRules">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="settingLoading" @click="ruleEmailSave">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
      </div>
    </div>

    <div v-if="inArea('verify')" class="settings-card">
      <div class="card-title"><Icon icon="mingcute:shield-shape-line" width="15" height="15"/>{{ $t('turnstileSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('signUpVerification') }}</span></div>
          <div>
            <el-input-number v-if="setting.registerVerify === 2" v-model="regVerifyCount" :aria-label="$t('signUpVerification')" :min="1" style="width: 110px" @change="saveRegVerifyCount" />
            <el-select popper-class="sys-setting-popper"
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
        <p v-if="setting.registerVerify === 2" class="verify-rule-hint">{{ $t('rulesVerifyTitle', {count:regVerifyCount}) }}</p>
        <div class="setting-item">
          <div><span>{{ $t('addEmailVerification') }}</span></div>
          <div>
            <el-input-number v-if="setting.addEmailVerify === 2" v-model="addVerifyCount" :aria-label="$t('addEmailVerification')" :min="1" style="width: 110px" @change="saveAddVerifyCount" />
            <el-select popper-class="sys-setting-popper"
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
        <p v-if="setting.addEmailVerify === 2" class="verify-rule-hint">{{ $t('rulesVerifyTitle', {count:addVerifyCount}) }}</p>
        <div class="setting-item">
          <div><span>Site Key</span></div>
          <div class="bot-verify">
            <span>{{ setting.siteKey }}</span>
            <el-button class="settings-action" @click="turnstileShow = true">{{ $t('change') }}</el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>Secret Key</span></div>
          <div class="bot-verify">
            <span>{{ setting.secretKey }}</span>
            <el-button class="settings-action" @click="turnstileShow = true">{{ $t('change') }}</el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="inArea('notice')" class="settings-card">
      <div class="card-title"><Icon icon="mingcute:announcement-line" width="15" height="15"/>{{ $t('noticeTitle') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('noticePopup') }}</span></div>
          <div class="forward">
            <span>{{ setting.notice === 0 ? $t('enabled') : $t('disabled') }}</span>
            <el-button class="settings-action" @click="noticePopupShow = true">{{ $t('manage') }}</el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('popUp') }}</span></div>
          <div class="forward">
            <el-button class="settings-action" @click="uiStore.showNotice()">{{ $t('preview') }}</el-button>
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
          <el-select popper-class="sys-setting-popper" v-model="tgMsgFrom">
            <el-option v-for="item in tgMsgFromOption" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
        </div>
        <div class="tg-msg-label">
          <span>{{ $t('recipient') }}</span>
          <el-select popper-class="sys-setting-popper" v-model="tgMsgTo">
            <el-option v-for="item in showHideOption" :key="item.value" :label="item.label" :value="item.value"/>
          </el-select>
        </div>
        <div class="tg-msg-label">
          <span>{{ $t('emailText') }}</span>
          <el-select popper-class="sys-setting-popper" v-model="tgMsgText">
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

    <el-dialog top="5vh" v-model="noticePopupShow" :title="$t('noticePopup')" class="sys-setting-dialog notice-popup"
               @closed="resetNoticeForm">
      <form @submit.prevent>
        <div class="notice-form-grid">
          <div class="notice-form-row">
            <span class="notice-form-label">{{ $t('titleDesc') }}</span>
            <el-input v-model="noticeForm.noticeTitle" :placeholder="$t('titleDesc')"/>
          </div>
          <div class="notice-form-row">
            <span class="notice-form-label">{{ $t('width') }}</span>
            <el-input-number v-model="noticeForm.noticeWidth" :min="300" :max="1200" :step="20" style="width:100%">
              <template #suffix>px</template>
            </el-input-number>
          </div>
        </div>
        <notice-editor v-model="noticeForm.noticeContent" />
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
import NoticeEditor from "../components/notice-editor.vue";
import { useServerStore } from '@/store/server.js';
import { useRoute } from 'vue-router';

defineOptions({
  name: 'sys-setting-integration'
})

const props = defineProps({settingsArea:{type:String,default:''}})
const {t, locale} = useI18n()
const route = useRoute()
const sectionArea = computed(() => {
  if (props.settingsArea) return props.settingsArea
  const key = route.query.find
  if (['tgBot','otherEmail','forwardingRules'].includes(key)) return 'forward'
  if (['signUpVerification','addEmailVerification'].includes(key)) return 'verify'
  if (['noticeTitle','noticePopup','popUp'].includes(key)) return 'notice'
  if (key === 'resendWebhookTitle') return 'webhook'
  if (['workersAi','aiModel','aiCodeEnable','s3Configuration','storageType'].includes(key)) return 'storage'
  return 'all'
})
const inArea = area => sectionArea.value === 'all' || sectionArea.value === area
const uiStore = useUiStore()
const {setting, settingLoading, clearS3Loading, editSetting, change, beforeChange, onSettingsLoaded, onSettingsDirty} = useSysSetting()
const webhookSecret = ref('')
const webhookServer = useServerStore()
const webhookUrl = computed(() => new URL(webhookServer.getActiveBaseURL().replace(/\/+$/, '') + '/webhooks', window.location.origin).href)
onSettingsLoaded(() => { webhookSecret.value = '' })
async function saveWebhookSecret() {
  if (await editSetting({ resendWebhookSecret: webhookSecret.value })) webhookSecret.value = ''
}

const r2DomainShow = ref(false)
const r2DomainInput = ref('')
const addS3Show = ref(false)
const turnstileShow = ref(false)
const tgSettingShow = ref(false)
const noticePopupShow = ref(false)
const regVerifyCount = ref(1)
const addVerifyCount = ref(1)
const aiCodeFilterData = ref([])
let aiFilterBaseline

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
let forwardBaseline, ruleBaseline
const forwardSnapshot = () => JSON.stringify({status:forwardStatus.value,emails:forwardEmail.value})
const ruleSnapshot = () => JSON.stringify({type:ruleType.value,emails:ruleEmail.value})

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
  if (aiFilterBaseline === undefined || JSON.stringify(aiCodeFilterData.value) === aiFilterBaseline) resetAiCodeFilter()
  if (forwardBaseline === undefined || forwardSnapshot() === forwardBaseline) resetForwardEmail()
  if (ruleBaseline === undefined || ruleSnapshot() === ruleBaseline) resetForwardRules()
})
onSettingsDirty(() => (forwardBaseline !== undefined && forwardSnapshot() !== forwardBaseline) || (ruleBaseline !== undefined && ruleSnapshot() !== ruleBaseline) || (aiFilterBaseline !== undefined && JSON.stringify(aiCodeFilterData.value) !== aiFilterBaseline) || !!webhookSecret.value || !!turnstileForm.siteKey || !!turnstileForm.secretKey, () => { resetForwardEmail();resetForwardRules();resetAiCodeFilter();webhookSecret.value='';turnstileForm.siteKey='';turnstileForm.secretKey='' })

function resetAiCodeFilter() {
  aiCodeFilterData.value = Array.isArray(setting.value.aiCodeFilter)
    ? [...setting.value.aiCodeFilter]
    : (setting.value.aiCodeFilter || '').split(',').filter(Boolean)
  aiFilterBaseline = JSON.stringify(aiCodeFilterData.value)
}

async function saveAiCodeFilter() {
  const saved = [...aiCodeFilterData.value]
  if (await editSetting({aiCodeFilter:saved.join(',')}, true)) aiFilterBaseline = JSON.stringify(saved)
}

function aiModelLabel(m) {
  const tagKey = {
    recommend: 'aiModelTagRecommend',
    lowCost: 'aiModelTagLowCost',
    zh: 'aiModelTagZh',
    strong: 'aiModelTagStrong'
  }[m.tag]
  return tagKey ? `${m.name}（${t(tagKey)}）` : m.name
}

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

function resetForwardEmail() {
  forwardStatus.value = setting.value.forwardStatus
  forwardEmail.value = setting.value.forwardEmail ? setting.value.forwardEmail.split(',') : []
  forwardBaseline = forwardSnapshot()
}

function resetForwardRules() {
  ruleType.value = setting.value.ruleType
  ruleEmail.value = setting.value.ruleEmail ? setting.value.ruleEmail.split(',') : []
  ruleBaseline = ruleSnapshot()
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
  editSetting({regVerifyCount: regVerifyCount.value})
}

function saveAddVerifyCount() {
  addVerifyCount.value = addVerifyCount.value || 1
  editSetting({addVerifyCount: addVerifyCount.value})
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

async function forwardEmailSave() {
  const saved = forwardSnapshot()
  const ok = await editSetting({forwardStatus:forwardStatus.value,forwardEmail:forwardEmail.value.join(',')})
  if (ok) forwardBaseline = saved
}

async function ruleEmailSave() {
  const saved = ruleSnapshot()
  const ok = await editSetting({ruleEmail:ruleEmail.value.join(','),ruleType:ruleType.value})
  if (ok) ruleBaseline = saved
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
.verify-rule-hint { margin:0 0 12px; color:var(--el-text-color-secondary); font-size:12px; }
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
    font-size: 14px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    min-width: 48px;
  }

  .el-input, .el-input-number {
    flex: 1;
  }
}

.notice-form-grid {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 0 20px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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

.ai-code-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  line-height: 1.6;
}
.webhook-endpoint { display: flex; flex-wrap: wrap; gap: 10px 20px; margin-bottom: 18px; font-size: 12px; }
.webhook-endpoint code { overflow-wrap: anywhere; color: var(--el-text-color-secondary); }
.webhook-secret-field { display: flex; flex-direction: column; gap: 10px; font-size: 12px; }
.webhook-secret-actions { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.ai-model-name {
  font-size: 12px;
  color: var(--el-text-color-regular);
  word-break: break-all;
  max-width: 240px;
  text-align: right;
}

.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .tag-editor-hint {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .el-button {
    width: 100%;
    margin: 0;
  }
}
</style>
