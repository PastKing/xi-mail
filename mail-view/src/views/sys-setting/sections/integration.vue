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
          <el-button type="primary" :loading="isSaving('resendWebhookSecret')" :disabled="isSaving('resendWebhookSecret')" @click="saveWebhookSecret">{{ $t('save') }}</el-button>
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
                @change="change('aiModel')"
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
            <el-switch @change="change('aiCode')" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.aiCode"/>
          </div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ $t('aiCodeFilter') }}</span></div>
          <p>{{ $t('aiCodeFilterHint') }}</p>
          <el-input-tag v-model="aiCodeFilterData" :aria-label="$t('aiCodeFilter')" :placeholder="$t('aiCodeFilterPlaceholder')" />
          <div class="settings-inline-actions"><el-button @click="resetAiCodeFilter">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('aiCodeFilter')" :disabled="isSaving('aiCodeFilter')" @click="saveAiCodeFilter">{{ $t('settingsInlineSave') }}</el-button></div>
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
            <span class="s3-config-status">{{ $t(setting.bucket && setting.endpoint && setting.s3AccessKey && setting.s3SecretKey ? 's3ConnectionConfigured' : 's3ConnectionNotConfigured') }}</span>
            <el-button class="settings-action" :loading="isSaving('bucket')" @click="addS3Show = true">{{ $t('manage') }}</el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('attachmentStorageLabel') }}</span></div>
          <div class="r2domain">
            <div class="storage-type">
              <el-select class="settings-compact-select" :aria-label="$t('attachmentStorageLabel')" popper-class="sys-setting-popper" v-model="setting.attachmentStorage" :disabled="isSaving('attachmentStorage')" @change="change('attachmentStorage')">
                <el-option label="R2" value="R2" :disabled="!setting.hasR2" />
                <el-option label="S3" value="S3" :disabled="!setting.bucket || !setting.endpoint || !setting.s3AccessKey || !setting.s3SecretKey" />
                <el-option v-if="!setting.hasR2" label="KV" value="KV" />
              </el-select>
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
          <div class="settings-inline-actions"><el-button @click="resetForwardEmail">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('forwardEmail','forwardStatus')" :disabled="isSaving('forwardEmail','forwardStatus')" @click="forwardEmailSave">{{ $t('settingsInlineSave') }}</el-button></div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ $t('forwardingRules') }}</span></div>
          <p>{{ $t('forwardingRulesDesc') }}</p>
          <el-radio-group v-model="ruleType"><el-radio :value="0">{{ $t('forwardAll') }}</el-radio><el-radio :value="1">{{ $t('rules') }}</el-radio></el-radio-group>
          <el-input-tag v-model="ruleEmail" :aria-label="$t('forwardingRules')" :placeholder="$t('ruleEmailsInputDesc')" @add-tag="ruleEmailAddTag" />
          <div class="settings-inline-actions"><el-button @click="resetForwardRules">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('ruleEmail','ruleType')" :disabled="isSaving('ruleEmail','ruleType')" @click="ruleEmailSave">{{ $t('settingsInlineSave') }}</el-button></div>
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
                @change="change('registerVerify')"
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
                @change="change('addEmailVerify')"
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
        <el-button type="primary" :loading="isSaving('r2Domain')" :disabled="isSaving('r2Domain')" @click="saveR2domain">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm s3-config-dialog" v-model="addS3Show" :title="$t('s3Configuration')" @closed="resetS3Form">
      <form class="s3-config-form" @submit.prevent="saveS3">
        <div class="s3-storage-state"><span>{{ $t('s3CurrentStorage') }}</span><strong>{{ setting.attachmentStorage === 'auto' ? setting.storageType : (setting.attachmentStorage || setting.storageType || 'R2') }}</strong><el-tooltip :content="$t('s3StorageSwitchNote')"><Icon class="warning" icon="mingcute:information-line" width="16" /></el-tooltip><span class="s3-state-caption">{{ $t('s3ConfigOnlyNote') }}</span></div>
        <section class="s3-config-section" :aria-label="$t('s3ConnectionSection')">
          <h3>{{ $t('s3ConnectionSection') }}</h3>
          <div class="s3-field-grid">
            <label class="s3-config-field s3-field-wide"><span>{{ $t('s3EndpointLabel') }}</span><el-input :disabled="isSaving('bucket') || s3Testing" :aria-label="$t('s3EndpointLabel')" placeholder="https://s3.example.com" inputmode="url" v-model="s3.endpoint" /><small>{{ $t('s3EndpointHelp') }}</small></label>
            <label class="s3-config-field"><span>{{ $t('s3BucketLabel') }}<el-tooltip :content="$t('s3BucketHelp')"><Icon class="warning" icon="mingcute:information-line" width="14" /></el-tooltip></span><el-input :disabled="isSaving('bucket') || s3Testing" :aria-label="$t('s3BucketLabel')" :placeholder="$t('s3BucketPlaceholder')" v-model="s3.bucket" /></label>
            <label class="s3-config-field"><span>{{ $t('s3RegionLabel') }}<el-tooltip :content="$t('s3RegionHelp')"><Icon class="warning" icon="mingcute:information-line" width="14" /></el-tooltip></span><el-input :disabled="isSaving('bucket') || s3Testing" :aria-label="$t('s3RegionLabel')" :placeholder="$t('s3RegionPlaceholder')" v-model="s3.region" /></label>
          </div>
        </section>
        <section class="s3-config-section" :aria-label="$t('s3CredentialsSection')">
          <h3>{{ $t('s3CredentialsSection') }}</h3>
          <div class="s3-field-grid">
            <label class="s3-config-field"><span>Access Key ID</span><el-input :disabled="isSaving('bucket') || s3Testing" aria-label="Access Key ID" autocomplete="off" :placeholder="setting.s3AccessKey ? $t('s3CredentialKept') : $t('s3AccessKeyPlaceholder')" v-model="s3.s3AccessKey" /></label>
            <label class="s3-config-field"><span>Secret Access Key</span><el-input :disabled="isSaving('bucket') || s3Testing" aria-label="Secret Access Key" type="password" show-password autocomplete="new-password" :placeholder="setting.s3SecretKey ? $t('s3CredentialKept') : $t('s3SecretKeyPlaceholder')" v-model="s3.s3SecretKey" /></label>
          </div>
        </section>
        <section class="s3-config-section" :aria-label="$t('s3FileSection')">
          <h3>{{ $t('s3FileSection') }}</h3>
          <div class="s3-field-grid">
            <label class="s3-config-field"><span>{{ $t('s3PrefixLabel') }}</span><el-input :disabled="isSaving('bucket') || s3Testing" :aria-label="$t('s3PrefixLabel')" :placeholder="$t('s3PrefixPlaceholder')" v-model="s3.s3Prefix" /><small>{{ $t('s3PrefixRootHelp') }}</small></label>
            <label class="s3-config-field force-path-style"><span>{{ $t('s3PathStyleLabel') }}</span><el-select :disabled="isSaving('bucket') || s3Testing" :aria-label="$t('s3PathStyleLabel')" v-model="s3.forcePathStyle" popper-class="sys-setting-popper"><el-option label="path-style" :value="0" /><el-option label="virtual-hosted-style" :value="1" /></el-select></label>
          </div>
          <div class="s3-path-preview"><span>{{ $t('s3AddressPreview') }}</span><code>{{ s3PreviewAddress }}</code></div>
        </section>
      </form>
      <template #footer>
        <p v-if="s3TestPassed" class="s3-test-passed">{{ $t('s3TestPassed') }}</p>
        <div class="s3-button">
          <el-tooltip :content="$t('s3TestHelp')" :trigger-keys="[]"><el-button class="s3-test-button" :loading="s3Testing" :disabled="isSaving('bucket')" @click="testS3">{{ $t('s3TestConnection') }}</el-button></el-tooltip>
          <el-button text :loading="clearS3Loading" :disabled="s3Testing || isSaving('bucket')" @click="clearS3">{{ $t('clear') }}</el-button>
          <el-button type="primary" :loading="isSaving('bucket') && !clearS3Loading" :disabled="s3Testing || isSaving('bucket')" @click="saveS3">{{ $t('save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="turnstileShow" :title="$t('addTurnstileSecret')"
               @closed="turnstileForm.secretKey = ''; turnstileForm.siteKey = ''">
      <form>
        <el-input type="text" placeholder="Site Key" v-model="turnstileForm.siteKey"/>
        <el-input type="text" style="margin-top: 15px" placeholder="Secret Key" v-model="turnstileForm.secretKey"/>
        <el-button type="primary" :loading="isSaving('siteKey','secretKey')" :disabled="isSaving('siteKey','secretKey')" @click="saveTurnstileKey">{{ $t('save') }}</el-button>
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
          <el-button :loading="isSaving('tgBotToken')" :disabled="isSaving('tgBotToken')" type="primary" @click="tgBotSave">{{ $t('save') }}</el-button>
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
            <el-button :loading="isSaving('noticeTitle','noticeContent','notice')" :disabled="isSaving('noticeTitle','noticeContent','notice')" type="primary" @click="saveNoticePopup">{{ $t('save') }}</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import {computed, defineOptions, reactive, ref, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {isEmail} from "@/utils/verify-utils.js";
import {useUiStore} from "@/store/ui.js";
import {useSysSetting} from "../use-sys-setting.js";
import NoticeEditor from "../components/notice-editor.vue";
import { useServerStore } from '@/store/server.js';
import { useRoute } from 'vue-router';
import {testS3Connection} from '@/request/setting';

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
const {setting, isSaving, clearS3Loading, editSetting, change, beforeChange, onSettingsLoaded, onSettingsDirty} = useSysSetting()
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
  s3Prefix: '',
  forcePathStyle: 1
})
const s3Testing=ref(false),s3TestPassed=ref(false)
const s3PreviewPath=computed(()=>[s3.s3Prefix.trim().replace(/^\/+|\/+$/g,''),'attachments/example.png'].filter(Boolean).join('/'))
const s3PreviewAddress=computed(()=>{
  let url
  try{url=new URL(s3.endpoint.trim());if(!['http:','https:'].includes(url.protocol))throw new Error()}
  catch{url=new URL('https://s3.example.com')}
  url.username='';url.password='';url.search='';url.hash=''
  const bucket=s3.bucket.trim()||'bucket',base=url.pathname.replace(/\/+$/,'')
  if(s3.forcePathStyle===0)url.pathname=base+'/'+bucket+'/'+s3PreviewPath.value
  else{url.hostname=(/^[a-zA-Z0-9.-]+$/.test(bucket)?bucket:'bucket')+'.'+url.hostname;url.pathname=base+'/'+s3PreviewPath.value}
  return url.href
})
watch(s3,()=>{s3TestPassed.value=false})

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
  s3.forcePathStyle = setting.value.endpoint ? setting.value.forcePathStyle : 0
  s3.s3Prefix = setting.value.s3Prefix || ''
  s3TestPassed.value=false
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
  if(!r2DomainShow.value)r2DomainInput.value = setting.value.r2Domain
  regVerifyCount.value = setting.value.regVerifyCount
  addVerifyCount.value = setting.value.addVerifyCount
  if(!addS3Show.value)resetS3Form()
  if(!noticePopupShow.value)resetNoticeForm()
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
  if (isSaving('bucket')) return
  clearS3Loading.value = true
  editSetting({
    bucket: '',
    endpoint: '',
    region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    s3Prefix:'',
    attachmentStorage:setting.value.hasR2?'R2':'KV',
    forcePathStyle: 1
  }).then(ok => {
    if (ok) addS3Show.value = false
  })
}

function s3Form() {
  if (isSaving('bucket')) return
  const bucket = s3.bucket.trim(), endpoint = s3.endpoint.trim()
  if (!bucket || !endpoint || (!s3.s3AccessKey.trim() && !setting.value.s3AccessKey) || (!s3.s3SecretKey.trim() && !setting.value.s3SecretKey)) {
    ElMessage.warning(t('s3RequiredFields'));return
  }
  try {
    const url = new URL(endpoint)
    if (!['https:','http:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.search || url.hash) throw new Error('invalid endpoint')
  } catch { ElMessage.warning(t('s3EndpointInvalid'));return }
  const form = {
    bucket,
    endpoint,
    region: s3.region.trim(),
    s3Prefix:s3.s3Prefix.trim(),
    attachmentStorage:setting.value.attachmentStorage || setting.value.storageType || (setting.value.hasR2?'R2':'KV'),
    forcePathStyle: s3.forcePathStyle
  }
  if (s3.s3AccessKey.trim()) form.s3AccessKey = s3.s3AccessKey.trim()
  if (s3.s3SecretKey.trim()) form.s3SecretKey = s3.s3SecretKey.trim()

  return form
}
async function testS3(){
  if(s3Testing.value)return
  const form=s3Form();if(!form)return
  const snapshot=JSON.stringify(s3)
  s3Testing.value=true;s3TestPassed.value=false
  try{await testS3Connection(form);s3TestPassed.value=snapshot===JSON.stringify(s3)}catch{}finally{s3Testing.value=false}
}
function saveS3() {
  if(s3Testing.value)return
  const form=s3Form();if(!form)return
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
  display: flex;
  justify-content:flex-end;
  gap: 8px;
  border-top:1px solid var(--el-border-color-extra-light);
  padding-top:12px;

  .el-button {
    margin-left: 0;
  }
}
.s3-config-form { display:flex; flex-direction:column; gap:18px; }
.s3-config-status { color:var(--el-text-color-secondary); font-size:12px; }
.s3-storage-state { display:flex; align-items:center; flex-wrap:wrap; gap:7px; font-size:12px; line-height:1.6; color:var(--el-text-color-secondary); }
.s3-storage-state strong { font-weight:500; padding:1px 7px; border-radius:4px; background:var(--el-fill-color-light); color:var(--el-text-color-regular); }
.s3-state-caption { margin-left:auto; }
.s3-config-section { min-width:0; }
.s3-config-section + .s3-config-section { border-top:1px solid var(--el-border-color-extra-light); padding-top:16px; }
.s3-config-section h3 { margin:0 0 10px; font-size:12px; line-height:1.5; font-weight:600; color:var(--el-text-color-secondary); }
.s3-field-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; gap:12px 16px; }
.s3-field-wide { grid-column:1/-1; }
.s3-config-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
.s3-config-field > span { display:inline-flex; align-items:center; gap:3px; font-size:14px; line-height:1.5; color:var(--el-text-color-primary); }
.s3-config-field small { font-size:12px; line-height:1.55; color:var(--el-text-color-secondary); overflow-wrap:anywhere; }
.s3-path-preview { display:flex; align-items:baseline; gap:10px; margin-top:12px; padding:9px 10px; background:var(--el-fill-color-light); border-radius:6px; color:var(--el-text-color-secondary); font-size:12px; line-height:1.6; }
.s3-path-preview > span { flex-shrink:0; }
.s3-path-preview code { min-width:0; font:inherit; overflow-wrap:anywhere; color:var(--el-text-color-regular); }
.s3-test-button { margin-right:auto!important; }
.s3-test-passed { margin:0 0 8px; font-size:12px; color:var(--el-color-success); text-align:left; }
.s3-config-form .force-path-style { flex-direction:column; align-items:stretch; gap:6px; }
.s3-config-form .force-path-style-left { justify-content:flex-start; padding:0; }
:global(.el-dialog.s3-config-dialog.sys-setting-dialog) { --s3-dialog-gap:clamp(16px,4vh,36px); width:min(620px,calc(100vw - 32px))!important; max-height:calc(100dvh - var(--s3-dialog-gap) - var(--s3-dialog-gap)); margin:var(--s3-dialog-gap) auto!important; padding:20px; display:flex; flex-direction:column; }
:global(.s3-config-dialog .el-dialog__header) { flex-shrink:0; padding:0 28px 16px 0; }
:global(.s3-config-dialog .el-dialog__footer) { flex-shrink:0; padding:14px 0 0; }
:global(.s3-config-dialog .el-dialog__body) { min-height:0; padding:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; }
@media(max-width:520px) {
  .s3-field-grid { grid-template-columns:minmax(0,1fr); gap:12px; }
  .s3-state-caption { flex-basis:100%; margin:0; }
  .s3-path-preview { flex-direction:column; gap:2px; }
  :global(.el-dialog.s3-config-dialog.sys-setting-dialog) { padding:16px; }
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
