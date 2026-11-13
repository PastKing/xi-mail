<template>
  <div class="send" v-show="show">
    <div class="write-box">
      <div class="title">
        <div class="title-left">
          <span class="title-text"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.8 3.2 1-1a2.2 2.2 0 0 1 3.1 0l1.9 1.9a2.2 2.2 0 0 1 0 3.1l-1 1-5-5Zm-1.4 1.4 5 5L8.6 20.4l-5.7 1.3 1.3-5.7L14.4 4.6Z" /></svg></span>
          <span>{{ form.sendType === 'reply' ? $t('reply') : form.sendType === 'forward' ? $t('forward') : $t('composeMail') }}</span>
        </div>
        <button type="button" class="xi-icon-button" :aria-label="$t('close')" :title="$t('close')" @click="close">
          <Icon icon="mingcute:close-line" width="20" height="20"/>
        </button>
      </div>
      <div class="container">
        <div class="sender-row">
          <span class="sender-label">{{ $t('sender') }}</span>
          <el-select v-model="form.accountId" class="sender-select" popper-class="sender-select-popper" filterable :filter-method="filterSenders" :aria-label="$t('sender')" :placeholder="$t('senderSearchPlaceholder')" :loading="accountsLoading" :no-match-text="$t('senderNoMatches')" @visible-change="senderVisibleChange" @change="changeSender">
            <template #label="{label}"><span class="sender-selected"><span class="sender-selected-label" :title="form.sendEmail">{{ form.sendEmail || label }}</span><span v-if="form.name && form.name !== form.sendEmail" class="sender-selected-name">{{ form.name }}</span></span></template>
            <el-option v-for="item in filteredSenderOptions" :key="item.accountId" :value="item.accountId" :label="item.email">
              <div class="sender-option"><Icon icon="mingcute:mail-line" width="18" height="18" /><div class="sender-option-text"><span class="sender-option-email">{{ item.email }}</span><span v-if="item.name && item.name !== item.email" class="sender-option-name">{{ item.name }}</span></div><Icon v-if="form.accountId === item.accountId" class="sender-option-check" icon="mingcute:check-line" width="18" height="18" /></div>
            </el-option>
          </el-select>
          <el-tooltip v-if="internalOnly" :content="$t('senderInternalOnlyDesc')"><span class="sender-internal-tag">{{ $t('senderInternalOnly') }}</span></el-tooltip>
        </div>
        <el-input-tag class="recipient-field" @add-tag="addTagChange" tag-type="primary" @input="inputChange" size="default" v-model="form.receiveEmail" >
          <template #prefix>
            <div class="item-title" >{{ $t('recipient') }}</div>
            <el-select
                ref="mySelect"
                class="write-select"
                popper-class="write-select"
                :show-arrow="false"
                :no-match-text="' '"
                :no-data-text="' '"
                @visible-change="selectStatusChange"
                @change="selectChange"
            >
              <el-option
                  v-for="item in selectRecipientList"
                  :key="item"
                  :label="item"
                  :value="item"
                  style="color: #999896;"
              />
            </el-select>
          </template>
          <template #suffix>
            <div style="display: flex;margin-right: 3px;">
              <Icon icon="mingcute:user-add-2-line" width="20" height="20" class="add-contact" @click.stop="openContacts" />
            </div>
          </template>
        </el-input-tag>
        <el-input class="subject-field" v-model="form.subject" :aria-label="t('subject')" :placeholder="t('subject')" />
        <tinyEditor :def-value="defValue" ref="editor" @change="change" @focus="focusChange" />
        <div class="button-item">
          <button type="button" class="xi-icon-button att-add" :aria-label="$t('addAttachment')" :title="$t('addAttachment')" @click="chooseFile"><Icon icon="mingcute:attachment-2-line" width="18" height="18" /></button>
          <button type="button" class="xi-icon-button att-clear" :aria-label="$t('clear')" :title="$t('clear')" @click="clearContent"><Icon icon="mingcute:eraser-line" width="18" height="18" /></button>
          <div class="att-list">
            <div class="att-item" v-for="(item,index) in form.attachments" :key="index">
              <Icon v-bind="getIconByName(item.filename)"/>
              <span class="att-filename">{{ item.filename }}</span>
              <span class="att-size">{{ formatBytes(item.size) }}</span>
              <Icon style="cursor: pointer;" icon="mingcute:close-line" @click="delAtt(index)"
                    width="18" height="18"/>
            </div>
          </div>
          <div>
            <el-button type="primary" @click="sendEmail" v-if="form.sendType === 'reply'">{{ $t('reply') }}</el-button>
            <el-button type="primary" @click="sendEmail" v-else-if="form.sendType === 'forward'">{{ $t('forward') }}</el-button>
            <el-button type="primary" @click="sendEmail" v-else>{{ $t('send') }}</el-button>
          </div>
        </div>
      </div>
    </div>
    <el-dialog top="10vh" v-model="showContacts" @closed="clearSelectContact" :title="t('recentContacts')">
      <el-table ref="contactsTabRef" row-key="email" :data="contacts" style="height: 445px">
        <el-table-column type="selection" width="32" />
        <el-table-column property="email" :label="t('emailAccount')" >
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column width="55" label="" >
          <template #default>
            <div style="display: flex;">
              <Icon icon="mingcute:user-3-line" style="color: var(--el-text-color-primary)" width="20" height="20" color="#606266" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="contacts-bottom">
        <el-button type="default" @click="deleteContact">{{t('clear')}}</el-button>
        <el-button type="primary" @click="chooseContact">{{t('selectContacts')}}</el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import tinyEditor from '@/components/tiny-editor/index.vue'
import {h, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, computed} from "vue";
import {Icon} from "@iconify/vue";
import {useUserStore} from "@/store/user.js";
import {emailSend, ensureEmailContent} from "@/request/email.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {fileToBase64, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import sendPercent from "@/components/send-percent/index.vue"
import {toOssDomain,formatPrivateImages} from "@/utils/convert.js";
import {formatDetailDate} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {userDraftStore} from "@/store/draft.js";
import {useWriterStore} from "@/store/writer.js";
import db from "@/db/db.js";
import dayjs from "dayjs";
import {useI18n} from "vue-i18n";
import router from "@/router/index.js";
import {ElMessageBox} from "element-plus";
import {accountList as fetchAccountList} from "@/request/account.js";
import {useServerStore} from "@/store/server.js";

defineExpose({
  open,
  openReply,
  openForward,
  openDraft
})

const {t} = useI18n()
const writerStore = useWriterStore();
const draftStore = userDraftStore()
const settingStore = useSettingStore()
const emailStore = useEmailStore();
const accountStore = useAccountStore()
const editor = ref({})
const userStore = useUserStore();
const show = ref(false);
const percent = ref(0)
let percentMessage = null
let sending = false
const defValue = ref('')
const contactsTabRef = ref({})
const showContacts = ref(false)
const mySelect = ref()
let selectStatus = false
const backReply = reactive({
  receiveEmail: [],
  subject: '',
  content: '',
  sendType: ''
})
const form = reactive({
  sendEmail: '',
  receiveEmail: [],
  accountId: -1,
  name: '',
  subject: '',
  content: '',
  sendType: '',
  text: '',
  emailId: 0,
  attachments: [],
  draftId: null,
})

const selectRecipientList = ref([])
const accountOptions = ref([])
const accountsLoaded = ref(false)
const accountsLoading = ref(false)
const senderQuery = ref('')

// 只列出能对外发件的邮箱；一个都没有时保留全部邮箱，此时只能发给站内邮箱
const sendableAccounts = computed(() => accountOptions.value.filter(item => item.canSend))
const internalOnly = computed(() => accountsLoaded.value && sendableAccounts.value.length === 0)
const senderOptions = computed(() => sendableAccounts.value.length > 0 ? sendableAccounts.value : accountOptions.value)
const filteredSenderOptions = computed(() => {
  const query = senderQuery.value.trim().toLowerCase()
  return senderOptions.value.filter(item => `${item.email || ''} ${item.name || ''}`.toLowerCase().includes(query))
})
function filterSenders(query) { senderQuery.value = query }
function senderVisibleChange(visible) {
  if (!visible) senderQuery.value = ''
  else if (!accountsLoaded.value) loadAccounts()
}

const contacts = computed(() => writerStore.sendRecipientRecord.map(item => ({email: item})))

function openContacts() {
  showContacts.value = true
  nextTick(() => {
    form.receiveEmail.forEach(item => {
      if (writerStore.sendRecipientRecord.includes(item)) {
        contactsTabRef.value.toggleRowSelection({email: item});
      }
    })
  })
}

function deleteContact() {
  ElMessageBox.confirm(t('confirmDeletionOfContacts'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
    form.receiveEmail = form.receiveEmail.filter(item => !contactList.includes(item));
    writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(item => !contactList.includes(item));
  })
}

function chooseContact() {

  const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
  contactList.forEach(item => {
    if (!form.receiveEmail.includes(item)) {
      form.receiveEmail.push(item);
    }
  })

  form.receiveEmail = form.receiveEmail.filter(item => {
    return contactList.includes(item) || !writerStore.sendRecipientRecord.includes(item);
  });

  showContacts.value = false
}

function clearSelectContact() {
  contactsTabRef.value.clearSelection();
}

function selectChange(value) {
  form.receiveEmail.push(value)
}

function selectStatusChange(status) {
  selectStatus = status
}

async function loadAccounts() {
  if (accountsLoading.value) return
  accountsLoading.value = true
  accountsLoaded.value = false
  try {
    // 先用当前账户填充，保证选择框立即有值显示
    if (form.sendEmail) {
      accountOptions.value = [{ accountId: form.accountId, email: form.sendEmail, name: form.name }]
    }
    // 一次性拉取足够多的账户（API直接返回数组）
    const list = await fetchAccountList(0, 200, null)
    if (Array.isArray(list) && list.length > 0) {
      accountOptions.value = list
      // 如果当前 accountId 不在列表中，追加进去
      const exists = list.some(a => a.accountId === form.accountId)
      if (!exists && form.sendEmail) {
        accountOptions.value = [{ accountId: form.accountId, email: form.sendEmail, name: form.name }, ...list]
      }
    }
  } catch (e) {
    if (form.sendEmail) {
      accountOptions.value = [{ accountId: form.accountId, email: form.sendEmail, name: form.name }]
    }
  }
  accountsLoaded.value = true
  accountsLoading.value = false

  // 当前邮箱不能对外发件时，默认换成第一个能发的邮箱
  const sendable = sendableAccounts.value
  if (sendable.length > 0 && !sendable.some(item => item.accountId === form.accountId)) {
    changeSender(sendable[0].accountId)
  }
}

function changeSender(accountId) {
  const account = accountOptions.value.find(a => a.accountId === accountId)
  if (account) {
    form.sendEmail = account.email
    form.accountId = account.accountId
    form.name = account.name || account.email
  }
}

const openSelect = () => {
  mySelect.value.toggleMenu()
}

function inputChange(value) {

  selectRecipientList.value = writerStore.sendRecipientRecord.filter(item => value && !form.receiveEmail.includes(item) && item.startsWith(value)).slice(0, 10);

  if (!selectStatus && selectRecipientList.value.length > 0) {
    openSelect()
  }

  if (selectStatus && selectRecipientList.value.length === 0) {
    openSelect()
  }

}

function addTagChange(val) {

  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  form.receiveEmail.splice(form.receiveEmail.length - 1, 1)

  let has = false
  emails.forEach(email => {
    if (isEmail(email) && !form.receiveEmail.includes(email)) {
      form.receiveEmail.push(email)
      has = true
    }
  })
  if (selectStatus && has) openSelect()
}

function clearContent() {
  ElMessageBox.confirm(t('clearContentConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    resetForm()
  })

}

function delAtt(index) {
  form.attachments.splice(index, 1);
}

function chooseFile() {
  const doc = document.createElement("input")
  doc.setAttribute("type", "file")
  doc.multiple = true;
  doc.click()
  doc.onchange = async (e) => {

    const fileList = e.target.files;

    for (const file of fileList) {

      const size = file.size
      const filename = file.name
      const contentType = file.type

      const content = await fileToBase64(file)
      form.attachments.push({content, filename, size, contentType})

    }

  }
}

async function sendEmail() {

  if (form.receiveEmail.length === 0) {
    ElMessage({
      message: t('emptyRecipientMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.subject) {
    ElMessage({
      message: t('emptySubjectMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  form.content = editor.value.getContent();

  if (!form.content) {
    ElMessage({
      message: t('emptyContentMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.manyType === 'divide' && form.attachments.length > 0) {
    ElMessage({
      message: t('noSeparateSendMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (sending) {
    ElMessage({
      message: t('sendingErrorMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  percentMessage = ElMessage({
    message: () => h(sendPercent, {value: percent.value, desc: t('sending')}),
    dangerouslyUseHTMLString: true,
    plain: true,
    duration: 0,
    customClass: 'message-bottom'
  })

  sending = true

  show.value = false

  emailSend(form, (e) => {
    percent.value = Math.round((e.loaded * 98) / e.total)
  }).then(async emailList => {
    const email = emailList[0]
    emailList.forEach(item => {
      emailStore.sendScroll?.addItem(item)
    })

    ElNotification({
      title: t('sendSuccessMsg'),
      type: "success",
      message: h('span', {style: 'color: teal'}, email.subject),
      position: 'bottom-right'
    })

    userStore.refreshUserInfo();

    addRecipientRecord();

    if (form.draftId) {
      form.subject = ''
      form.content = ''
      form.receiveEmail = []
      await persistExistingDraft({...toRaw(form)}).catch(() => ElMessage.warning(t('draftCleanupFailed')))
    }

    show.value = false
    resetForm();
  }).catch((e) => {
    ElNotification({
      title: t('sendFailMsg'),
      type: e.code === 403 ? 'warning' : 'error',
      message: h('span', {style: 'color: teal'}, e.message),
      position: 'bottom-right'
    })
    if (e.code === 401) {
      const serverStore = useServerStore();
      serverStore.clearToken(serverStore.activeServerId);
      router.replace('/login');
    }
    show.value = true
    addRecipientRecord();
  }).finally(() => {
    percentMessage.close()
    percent.value = 0
    sending = false
  })
}

function addRecipientRecord() {
  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(
      email => !form.receiveEmail.includes(email)
  );

  writerStore.sendRecipientRecord.unshift(...form.receiveEmail);
  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.slice(0, 500);
}

function resetForm() {
  form.receiveEmail = []
  form.subject = ''
  form.content = ''
  form.manyType = null
  form.attachments = []
  form.sendType = ''
  form.emailId = 0
  form.draftId = null
  backReply.content = ''
  backReply.subject = ''
  backReply.receiveEmail = []
  backReply.sendType = ''
  editor.value.clearEditor()
}

function change(content, text) {
  form.content = content;
  form.text = text
}

function focusChange() {
  if (selectStatus) openSelect()
}

async function openForward(email) {
  resetForm();

  email.subject = email.subject || ''

  form.subject = email.subject
  form.sendType = 'forward'

  defValue.value = ''

  // 列表只带摘要，引用原文前先取完整正文
  try { await ensureEmailContent(email) } catch (e) { console.error(e) }

  setTimeout(() => {
    defValue.value = `
      ${formatImage(email.content,email.attachmentUrls) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
    `
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })

  });
}

async function openReply(email) {

  resetForm();

  email.subject = email.subject || ''

  form.receiveEmail.push(email.sendEmail)
  form.subject = (
      email.subject.startsWith('Re:') ||
      email.subject.startsWith('Re：') ||
      email.subject.startsWith('回复：') ||
      email.subject.startsWith('回复:')) ? email.subject : 'Re: ' + email.subject
  form.sendType = 'reply'
  form.emailId = email.emailId

  defValue.value = ''

  // 列表只带摘要，引用原文前先取完整正文
  try { await ensureEmailContent(email) } catch (e) { console.error(e) }

  setTimeout(() => {
    defValue.value = `
    <div></div>
    <div>
    <br>
        ${formatDetailDate(email.createTime)} ${email.name} &lt${email.sendEmail}&gt ${t('wrote')}:
    </div>
    <blockquote class="mceNonEditable" style="margin: 0 0 0 0.8ex;border-left: 1px solid rgb(204,204,204);padding-left: 1ex;">
      <articl>
          ${formatImage(email.content,email.attachmentUrls) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
      </article>
    </blockquote>`
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })
  })

}

function formatImage(content,urls) {
  content = formatPrivateImages(content,urls);
  const domain = settingStore.settings.objectProxyBase || settingStore.settings.r2Domain;
  return content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function open() {
  if (!accountStore.currentAccount.email) {
    form.sendEmail = userStore.user.email;
    form.accountId = userStore.user.account?.accountId;
    form.name = userStore.user.name;
  } else {
    form.sendEmail = accountStore.currentAccount.email;
    form.accountId = accountStore.currentAccount.accountId;
    form.name = accountStore.currentAccount.name;
  }
  loadAccounts()
  show.value = true;
  editor.value.focus()
}

function openDraft(draft) {
  Object.assign(form, {...draft})
  defValue.value = ''
  setTimeout(() => defValue.value = form.content)
  show.value = true;
  editor.value.focus()
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    close()
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

async function persistExistingDraft(snapshot) {
  const {draftId, attachments, ...draft} = snapshot;
  await db.value.transaction('rw', db.value.draft, db.value.att, async () => {
    if (!draft.content && !draft.subject && !draft.receiveEmail?.length) {
      await db.value.draft.delete(draftId);
      await db.value.att.delete(draftId);
    } else {
      await db.value.draft.update(draftId, {...draft,createTime:dayjs().utc().format('YYYY-MM-DD HH:mm:ss')});
      await db.value.att.put({draftId,attachments:toRaw(attachments || [])});
    }
  });
  draftStore.refreshList++;
}

async function close() {

  if (selectStatus) openSelect();

  form.content = editor.value.getContent();

  if (form.draftId) {
    try { await persistExistingDraft({...toRaw(form)}) }
    catch { ElMessage.error(t('draftSaveFailed')); return; }
    show.value = false
    resetForm()
    return;
  }

  if (!(form.content || form.subject || form.receiveEmail.length > 0)) {
    show.value = false
    resetForm()
    return;
  }

  if (backReply.sendType === 'reply' || backReply.sendType === 'forward') {
    let subjectFlag = form.subject === backReply.subject
    let contentFlag = editor.value.getContent() === backReply.content
    let receiveFlag = form.receiveEmail.length === 1 && form.receiveEmail[0] === backReply.receiveEmail[0]
    if (backReply.sendType === 'forward' && form.receiveEmail.length === 0) {
      receiveFlag = true;
    }
    if (subjectFlag && contentFlag && receiveFlag) {
      resetForm();
      close()
      return;
    }
  }

  ElMessageBox.confirm(t('saveDraftConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning',
    distinguishCancelAndClose: true
  }).then(async () => {
    const formData = {...toRaw(form)};
    delete formData.draftId
    delete formData.attachments
    formData.createTime = dayjs().utc().format('YYYY-MM-DD HH:mm:ss');
    const draftId = await db.value.draft.add({...formData})
    db.value.att.add({draftId, attachments: toRaw(form.attachments)})
    draftStore.refreshList++
    show.value = false
    await nextTick(() => {
      resetForm()
    })
  }).catch((action) => {
    if (action === 'cancel') {
      show.value = false
      resetForm()
    }
  })

}

</script>
<style>
.write-select .el-select-dropdown__list {
  padding: 4px 4px !important;
}
.write-select .el-select-dropdown__item {
  padding: 0 10px 0 10px;
}

.write-select .el-select-dropdown {
  min-width: 0 !important;
}

.el-popper.sender-select-popper {
  width: min(420px, calc(100vw - 32px)) !important;
  min-width: 0 !important;
  max-width: calc(100vw - 32px) !important;
  box-sizing: border-box;
}
.el-select-dropdown.sender-select-popper {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

.sender-select-popper .el-select-dropdown__item {
  height: auto;
  min-height: 46px;
  padding: 9px 12px;
}

.sender-option {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.4;
}
.sender-option > svg { flex-shrink: 0; color: var(--el-text-color-secondary); }
.sender-option-text { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; }
.sender-option .sender-option-check { color: var(--el-color-primary); }

.sender-option-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sender-option-email {
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
<style scoped lang="scss">
.send {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: rgb(15 23 42 / 18%);

  .write-box {
    background: var(--el-bg-color);
    width: min(1040px, calc(100% - 48px));
    box-shadow: var(--el-box-shadow-light);
    border: 1px solid var(--el-border-color-light);
    padding: 16px;
    border-radius: 12px;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    @media (max-width: 1024px) {
      width: 100%;
      height: 100%;
      border-radius: 0;
      border: 0;
      padding-top: 10px;
    }

    @media (min-width: 1025px) {
      height: min(760px, calc(100vh - 48px));
    }

    .title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 15px;
      font-weight: 600;

      .title-left {
        align-items: center;
        display: flex;
        gap: 9px;
        min-width: 0;
        flex: 1;
      }

      .title-text {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        color: var(--el-color-primary);
        svg { width: 18px; height: 18px; fill: currentColor; }
      }
    }

    .sender-row { display:flex; align-items:center; gap:8px; min-width:0; min-height:40px; padding:0 10px; border:1px solid var(--el-border-color); border-radius:var(--el-border-radius-base); }
    .sender-label { width:52px; flex-shrink:0; color:var(--el-text-color-secondary); font-size:13px; }
    .sender-select { flex:1; min-width:0; width:0; }
    .sender-select :deep(.el-select__wrapper) { min-height:38px; padding:0; box-shadow:none; background:transparent; }
    .sender-select :deep(.el-select__selected-item) { min-width:0; font-size:13px; }
    .sender-row:focus-within { border-color:var(--el-color-primary); }
    .sender-selected { display:flex; align-items:center; min-width:0; gap:10px; }
    .sender-selected-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--el-text-color-primary); }
    .sender-selected-name { max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--el-text-color-secondary); font-size:12px; }
    .sender-internal-tag { flex-shrink:0; font-size:11px; line-height:22px; padding:0 6px; border-radius:4px; color:var(--el-color-warning); background:var(--el-color-warning-light-9); }
    .item-title { min-width:52px; color:var(--el-text-color-secondary); font-size:13px; }
    .recipient-field :deep(.el-input-tag__wrapper), .subject-field :deep(.el-input__wrapper) { min-height:40px; }
    @media(max-width:500px) { .sender-selected-name { display:none; } .sender-label { width:44px; } .item-title { min-width:44px; } }

    .container {
      height: 100%;
      min-height: 0;
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr) auto;
      gap: 12px;


      .button-item {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;

        .att-add {
          cursor: pointer;
        }

        .att-clear {
          cursor: pointer;
        }

        .att-list {
          display: grid;
          gap: 5px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          min-width: 0;
          max-height: 110px;
          overflow-y: auto;
          @media (max-width: 450px) {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }

          .att-item {
            display: grid;
            grid-template-columns: auto 1fr auto auto;
            gap: 5px;
            height: 32px;
            font-size: 14px;
            padding: 4px 5px;
            background: var(--light-ill);
            border-radius: 4px;
            .att-filename {
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
            }
          }
        }
      }
    }
  }

}

.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-dialog) {
  width: 420px !important;
  @media (max-width: 460px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.contacts-bottom {
  display: flex;
  justify-content: end;
  margin-top: 10px;
}

.add-contact {
  color: var(--regular-text-color)
}

.write-select {
  position: absolute;
  width: 300px;
  left: 60px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
}

:deep(.el-input-tag__suffix) {
  padding-right: 4px;
}

.icon {
  cursor: pointer;
}
</style>
