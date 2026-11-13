<template>
  <div class="box">
    <div class="header-actions">
      <el-tooltip :content="$t('messageBack')" :trigger-keys="[]">
        <button type="button" class="xi-icon-button" :aria-label="$t('messageBack')" @click="handleBack"><Icon icon="mingcute:left-line" width="18" height="18"/></button>
      </el-tooltip>
      <el-tooltip v-if="hasPerm('email:delete')" :content="$t('delete')" :trigger-keys="[]">
        <button type="button" class="xi-icon-button" :aria-label="$t('delete')" @click="handleDelete"><Icon icon="mingcute:delete-2-line" width="18" height="18"/></button>
      </el-tooltip>
      <el-tooltip v-if="emailStore.contentData.showStar" :content="$t(email.isStar ? 'messageRemoveStar' : 'messageAddStar')" :trigger-keys="[]">
        <button type="button" class="xi-icon-button" :aria-label="$t(email.isStar ? 'messageRemoveStar' : 'messageAddStar')" :aria-pressed="!!email.isStar" @click="changeStar">
          <Icon v-if="email.isStar" icon="fluent-color:star-16" width="18" height="18"/>
          <Icon v-else icon="mingcute:star-line" width="18" height="18"/>
        </button>
      </el-tooltip>
      <el-tooltip v-if="emailStore.contentData.showReply && hasPerm('email:send')" :content="$t('reply')" :trigger-keys="[]">
        <button type="button" class="xi-icon-button" :aria-label="$t('reply')" @click="openReply"><Icon icon="mingcute:back-2-line" width="18" height="18"/></button>
      </el-tooltip>
      <el-tooltip v-if="emailStore.contentData.showReply && hasPerm('email:send')" :content="$t('forward')" :trigger-keys="[]">
        <button type="button" class="xi-icon-button" :aria-label="$t('forward')" @click="openForward"><Icon icon="mingcute:share-forward-line" width="18" height="18"/></button>
      </el-tooltip>
      <el-tooltip v-if="settingStore.settings.translation?.mailTranslation!==false" :content="$t('mailTranslation')" :trigger-keys="[]">
        <button type="button" class="xi-icon-button" :aria-label="$t('mailTranslation')" :aria-expanded="showTranslation" @click="showTranslation=!showTranslation"><Icon icon="mingcute:translate-2-line" width="18" height="18"/></button>
      </el-tooltip>
    </div>
    <div></div>
    <el-scrollbar class="scrollbar">
      <div class="container">
        <div class="email-title">
          {{ email.subject }}
        </div>
        <div class="content">
          <div class="email-info" :class="{'is-translating':showTranslation}">
            <div>
              <div class="send"><span class="send-source">{{$t('from')}}</span>
                <div class="send-name">
                  <span class="send-name-title">{{ email.name }}</span>
                  <span><{{ email.sendEmail }}></span>
                </div>
              </div>
              <div class="receive"><span class="source">{{$t('recipient')}}</span><span class="receive-email">{{  formateReceive(email.recipient) }}</span></div>
              <div class="date">
                <div>{{ formatDetailDate(email.createTime) }}</div>
              </div>
              <button type="button" class="code-row" v-if="email.code" :title="$t('copy')" :aria-label="$t('copy') + ' ' + email.code" @click="copyEmailCode(email.code)">
                <Icon icon="mingcute:copy-2-line" width="14" height="14"/>
                <span>{{ email.code }}</span>
              </button>
            </div>
            <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
          </div>
          <el-scrollbar class="htm-scrollbar" :class="email.attList.length === 0 ? 'bottom-distance' : ''">
            <MailTranslation :open="showTranslation" :email-id="email.emailId" :format-html="formatImage" @close="showTranslation=false">
              <el-skeleton v-if="contentLoading" class="content-skeleton" :rows="6" animated />
              <ShadowHtml class="shadow-html" :html="formatImage(email.content)" v-else-if="email.content" />
              <pre v-else class="email-text">{{email.text}}</pre>
            </MailTranslation>
          </el-scrollbar>
          <div class="att" v-if="email.attList.length > 0">
            <div class="att-title">
              <span>{{$t('attachments')}}</span>
              <span>{{$t('attCount',{total: email.attList.length})}}</span>
            </div>
            <div class="att-box">

              <div class="att-item" v-for="att in email.attList" :key="att.attId">
                <div class="att-icon" @click="showImage(att.key)">
                  <Icon v-bind="getIconByName(att.filename)" />
                </div>
                <div class="att-name" @click="showImage(att.key)">
                  {{ att.filename }}
                </div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="opt-icon att-icon">
                  <el-tooltip v-if="isImage(att.filename)" :content="$t('preview')" :trigger-keys="[]">
                    <button type="button" class="xi-icon-button" :aria-label="$t('preview')" @click="showImage(att.key)"><Icon icon="mingcute:eye-2-line" width="18" height="18"/></button>
                  </el-tooltip>
                  <el-tooltip :content="$t('downloadAttachment')" :trigger-keys="[]">
                    <a class="xi-icon-button" :aria-label="$t('downloadAttachment')" :href="cvtR2Url(att.key)" download><Icon icon="mingcute:download-2-line" width="18" height="18"/></a>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="showPreview = false"
    />
  </div>
</template>
<script setup>
import ShadowHtml from '@/components/shadow-html/index.vue'
import {reactive, ref, watch, onMounted, onUnmounted} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead, ensureEmailContent} from "@/request/email.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url,toOssDomain} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import {hasPerm} from '@/perm/perm.js';
import MailTranslation from '@/components/MailTranslation.vue';

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const router = useRouter()
const email = emailStore.contentData.email
const showPreview = ref(false)
const srcList = reactive([])
const contentLoading = ref(false)
const showTranslation = ref(false)

const { t } = useI18n()
watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

onMounted(() => {
  if (emailStore.contentData.showUnread && email.unread === EmailUnreadEnum.UNREAD) {
    email.unread = EmailUnreadEnum.READ;
    emailRead([email.emailId]);
  }

  // 列表只带摘要，进入详情时懒加载完整正文
  if (!email.contentFull) {
    contentLoading.value = !email.content && !email.text
    ensureEmailContent(email).finally(() => {
      contentLoading.value = false
    })
  }
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
})

function openReply() {
  uiStore.writerRef.openReply(email)
}

function openForward() {
  uiStore.writerRef.openForward(email)
}

function toMessage(message) {
  return  message ? JSON.parse(message).message : '';
}

async function copyEmailCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true });
  } catch (err) {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true });
  }
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.objectProxyBase || settingStore.settings.r2Domain;
  return  content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function showImage(key) {
  if (!isImage(key)) return;
  const url = cvtR2Url(key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.isStar) {
    email.isStar = 0;
    starCancel(email.emailId).then(() => {
      email.isStar = 0;
      emailStore.cancelStarEmailId = email.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.emailId])
    }).catch((e) => {
      console.error(e)
      email.isStar = 1;
    })
  } else {
    email.isStar = 1;
    starAdd(email.emailId).then(() => {
      email.isStar = 1;
      emailStore.addStarEmailId = email.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email)
    }).catch((e) => {
      console.error(e)
      email.isStar = 0;
    })
  }
}

const handleBack = () => {
  router.back()
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.emailId]
      })
    } else  {

      allEmailDelete(email.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.emailId]
      })
    }

    router.back()
  }).catch(error => {
    if (error !== 'cancel' && error !== 'close') console.error(error)
  })
}
</script>
<style scoped lang="scss">
.box {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.header-actions {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 18px;
}


.scrollbar {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.container {
  font-size: 14px;
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 10px;
  @media (max-width: 1023px) {
    padding-left: 15px;
    padding-right: 15px;
  }

  .email-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .htm-scrollbar {
  }

  .content {
    display: flex;
    flex-direction: column;

    .att {
      margin-top: 30px;
      margin-bottom: 30px;
      border: 1px solid var(--light-border-color);
      padding: 14px;
      border-radius: 6px;
      width: fit-content;
      .att-box {
        min-width: min(410px,calc(100vw - 60px));
        max-width: 600px;
        display: grid;
        gap: 12px;
        grid-template-rows: 1fr;
      }

      .att-title {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        span:first-child {
          font-weight: bold;
        }
      }

      .att-item {
        cursor: pointer;
        div {
          align-self: center;
        }
        background: var(--light-ill);
        padding: 5px 7px;
        border-radius: 4px;
        align-self: start;
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        .att-icon {
          display: grid;
        }

        .att-size {
          color: var(--secondary-text-color);
        }

        .att-name {
          margin-left: 8px;
          margin-right: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .att-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .opt-icon {
          padding-left: 10px;
          color: var(--secondary-text-color);
          align-items: center;
          display: flex;
          gap: 8px;
          cursor: pointer;
          a {
            color: var(--secondary-text-color);
            align-items: center;
            display: flex;
          }
        }
      }
    }

    .email-info {

      border-bottom: 1px solid var(--light-border-color);
      margin-bottom: 20px;
      padding-bottom: 8px;
      @media (max-width: 1024px) {
        margin-bottom: 15px;
      }
      &.is-translating {
        margin-bottom: 0;
      }
      .date {
        color: var(--regular-text-color);
        margin-bottom: 6px;
      }

      .email-msg {
        max-width: 400px;
        width: fit-content;
        margin-bottom: 15px;
      }

      .send {
        display: flex;
        margin-bottom: 6px;

        .send-name {
          color: var(--regular-text-color);
          display: flex;
          flex-wrap: wrap;
        }

        .send-name-title {
          padding-right: 5px;
        }
      }

      .receive {
        margin-bottom: 6px;
        display: flex;
        .receive-email {
          max-width: 700px;
          word-break: break-word;
        }
        span:nth-child(2) {
          color: var(--regular-text-color);
        }
      }

      .send-source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }

      .source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }
    }
  }
}

.shadow-html::after  {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--message-block-color); /* 半透明黑色蒙层 */
  pointer-events: none; /* 不影响点击 */
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.content-skeleton {
  padding: 4px 2px;
}

.code-row {
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  transition: background 0.15s;

  &:hover {
    background: var(--el-color-primary-light-8);
  }
}

.bottom-distance {
  margin-bottom: 30px;
}


</style>
