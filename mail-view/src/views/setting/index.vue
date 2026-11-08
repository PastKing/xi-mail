<template>
  <div class="box" :class="{ 'has-oauth': showOAuthAccounts }">
    <div class="container">
      <div class="title"><Icon icon="mingcute:idcard-line" width="18" height="18" />{{$t('profile')}}</div>
      <div class="item">
        <div>{{$t('displayId')}}</div>
        <div>
          <el-tooltip :content="$t('clickToCopy')" placement="top" :show-after="200">
            <span class="display-id-value copyable" @click="copyText(userStore.user.displayId)">
              {{ userStore.user.displayId || '-' }}
              <Icon v-if="userStore.user.displayId" icon="mingcute:copy-2-line" width="13" height="13" class="copy-icon" />
            </span>
          </el-tooltip>
        </div>
      </div>
      <div class="item">
        <div>{{$t('emailAccount')}}</div>
        <div>
          <el-tooltip :content="$t('clickToCopy')" placement="top" :show-after="200">
            <span class="copyable" @click="copyText(userStore.user.email)">
              {{ userStore.user.email }}
              <Icon icon="mingcute:copy-2-line" width="13" height="13" class="copy-icon" />
            </span>
          </el-tooltip>
        </div>
      </div>
      <div class="item">
        <div>{{$t('username')}}</div>
        <div>
          <span v-if="setNameShow" class="edit-name-input">
            <el-input v-model="accountName"  ></el-input>
            <span class="edit-name" @click="setName">
             {{$t('save')}}
            </span>
          </span>
          <span v-else class="user-name">
            <span >{{ userStore.user.name }}</span>
            <span class="edit-name" @click="showSetName">
             {{$t('change')}}
            </span>
          </span>
        </div>
      </div>
      <div class="item">
        <div>{{$t('password')}}</div>
        <div>
          <el-button type="primary" @click="pwdShow = true">{{$t('changePwdBtn')}}</el-button>
        </div>
      </div>
    </div>
    <div class="container oauth-connections" v-if="showOAuthAccounts">
      <div class="title"><Icon icon="mingcute:key-2-line" width="18" height="18" />{{ $t('oauthAccounts') }}</div>
      <p class="oauth-description">{{ $t('oauthAccountsNote') }}</p>
      <div v-if="oauthLoading" class="oauth-description">{{ $t('oauthLoadingText') }}</div>
      <div v-for="provider in enabledOAuthProviders" :key="provider.provider" class="oauth-connection-row">
        <span class="oauth-logo"><img v-if="providerLogo(provider.provider)" :src="providerLogo(provider.provider)" :alt="provider.name" width="28" height="28" /><Icon v-else icon="mingcute:key-2-line" width="22" height="22" /></span>
        <div><strong>{{ provider.name }}</strong><small>{{ provider.binding ? provider.binding.displayName || $t('oauthBound') : $t('oauthUnbound') }}</small></div>
        <el-button v-if="provider.binding" size="small" :loading="oauthBusy === provider.provider" @click="unbindProvider(provider)">{{ $t('oauthUnbind') }}</el-button>
        <el-button v-else size="small" type="primary" plain :loading="oauthBusy === provider.provider" @click="bindProvider(provider)">{{ $t('oauthBind') }}</el-button>
      </div>
      <el-button v-if="oauthLoadFailed" size="small" @click="loadOAuth">{{ $t('oauthRetry') }}</el-button>
    </div>
    <div class="del-email" v-perm="'my:delete'">
      <div class="delete-copy">
        <div class="title">{{$t('deleteUser')}}</div>
        <p>{{$t('delAccountMsg')}}</p>
      </div>
      <el-button type="danger" plain @click="deleteConfirm">{{$t('deleteUserBtn')}}</el-button>
    </div>
    <el-dialog v-model="pwdShow" :title="$t('changePassword')" width="340">
      <div class="update-pwd">
        <el-input type="password" :placeholder="$t('oldPassword')" v-model="form.oldPwd" autocomplete="off"/>
        <el-input type="password" :placeholder="$t('newPassword')" v-model="form.password" autocomplete="off"/>
        <el-input type="password" :placeholder="$t('confirmPassword')" v-model="form.newPwd" autocomplete="off"/>
        <el-button type="primary" :loading="setPwdLoading" @click="submitPwd">{{$t('save')}}</el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import {computed, reactive, ref, defineOptions, onMounted} from 'vue'
import {Icon} from "@iconify/vue";
import {resetPassword, userDelete} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useServerStore} from "@/store/server.js";
import {oauthBindings, oauthUnbind} from '@/request/ouath.js';
import {startOAuth} from '@/utils/oauth.js';
import {OAUTH_PROVIDERS} from '@/config/oauth-providers.js';
import {hasPerm} from '@/perm/perm.js';

const { t } = useI18n()
const accountStore = useAccountStore()
const userStore = useUserStore();
const setPwdLoading = ref(false)
const setNameShow = ref(false)
const accountName = ref(null)
const providerLogo = id => OAUTH_PROVIDERS.find(provider => provider.id === id)?.logo
const oauthProviders = ref([])
const oauthLoading = ref(false)
const oauthBusy = ref('')
const oauthLoadFailed = ref(false)
const enabledOAuthProviders = computed(() => oauthProviders.value.filter(provider => provider.enabled))
const showOAuthAccounts = computed(() => hasPerm('oauth:manage') && (oauthLoading.value || oauthLoadFailed.value || enabledOAuthProviders.value.length > 0))
async function loadOAuth() {
  oauthLoading.value = true; oauthLoadFailed.value = false
  try { oauthProviders.value = await oauthBindings() }
  catch { oauthLoadFailed.value = true }
  finally { oauthLoading.value = false }
}
onMounted(() => { if (hasPerm('oauth:manage')) loadOAuth() })
async function bindProvider(provider) {
  oauthBusy.value = provider.provider
  try { await startOAuth(provider.provider, 'bind') }
  catch { /* The request interceptor displays the error. */ }
  finally { oauthBusy.value = '' }
}
async function unbindProvider(provider) {
  try { await ElMessageBox.confirm(t('oauthUnbindConfirm'), { confirmButtonText: t('confirm'), cancelButtonText: t('cancel'), type: 'warning' }) }
  catch { return }
  oauthBusy.value = provider.provider
  try { await oauthUnbind(provider.provider); await loadOAuth(); ElMessage.success(t('oauthUnboundSuccess')) }
  catch { /* The request interceptor displays the error. */ }
  finally { oauthBusy.value = '' }
}

defineOptions({
  name: 'setting'
})

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true })
  } catch (err) {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true })
  }
}

function showSetName() {
  accountName.value = userStore.user.name
  setNameShow.value = true
}

function setName() {

  if (!accountName.value) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameShow.value = false
  const previousName = userStore.user.name
  const name = accountName.value

  if (name === userStore.user.name) {
    return
  }

  userStore.user.name = accountName.value

  accountSetName(userStore.user.account.accountId,name).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })

    accountStore.changeUserAccountName = name

  }).catch(() => {
    userStore.user.name = previousName
  })
}

const pwdShow = ref(false)
const form = reactive({
  oldPwd: '',
  password: '',
  newPwd: '',
})

const deleteConfirm = () => {
  ElMessageBox.confirm(t('delAccountConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete().then(() => {
      const serverStore = useServerStore();
      serverStore.clearToken(serverStore.activeServerId);
      router.replace('/login');
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  })
}


function submitPwd() {

  if (!form.oldPwd) {
    ElMessage({
      message: t('emptyOldPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password !== form.newPwd) {
    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  setPwdLoading.value = true
  resetPassword(form.password, form.oldPwd).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })
    pwdShow.value = false
    setPwdLoading.value = false
    form.oldPwd = ''
    form.password = ''
    form.newPwd = ''
  }).catch(() => {
    setPwdLoading.value = false
  })

}

</script>
<style scoped lang="scss">
.box {
  width: 100%; max-width: 1280px; margin: 0 auto; padding: 20px;
  display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-content: start; align-items: start;
  &.has-oauth {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto 1fr;
    .oauth-connections { grid-column: 2; grid-row: 1 / span 2; }
    .del-email { grid-column: 1; grid-row: 2; }
  }
  .title { display: flex; align-items: center; gap: 9px; font-size: 16px; font-weight: 600; letter-spacing: -.01em; }
  .title > svg { color: var(--el-text-color-secondary); }
  .container { min-width: 0; padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); font-size: 13px; display: grid; align-content: start; gap: 14px; }
  .container .item { display: grid; grid-template-columns: 80px minmax(0, 1fr); align-items: center; gap: 18px; min-height: 28px;
    > div:first-child { color: var(--el-text-color-secondary); font-size: 12px; }
    > div:last-child { min-width: 0; }
  }
  .user-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .user-name > span:first-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .edit-name { color: var(--el-color-primary); cursor: pointer; font-weight: 500; white-space: nowrap; font-size: 12px; flex-shrink: 0; }
  .edit-name-input { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .edit-name-input .el-input { min-width: 0; flex: 1; }
  .display-id-value { font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: inherit; letter-spacing: .5px; }
  .copyable { cursor: pointer; display: inline-flex; align-items: center; gap: 6px; max-width: 100%; overflow-wrap: anywhere;
    .copy-icon { opacity: 0; flex-shrink: 0; }
    &:hover { color: var(--el-color-primary); .copy-icon { opacity: 1; } }
  }
  .container.oauth-connections { gap: 8px; }
  .oauth-description { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.8; margin: 0; }
  .oauth-connection-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid var(--el-border-color-lighter); border-radius: 9px; }
  .oauth-connection-row > div { flex: 1; min-width: 0; }
  .oauth-connection-row strong { display: block; font-size: 13px; line-height: 18px; font-weight: 500; }
  .oauth-connection-row small { display: block; font-size: 11px; line-height: 16px; color: var(--el-text-color-secondary); overflow-wrap: anywhere; }
  .oauth-logo { display: grid; place-items: center; width: 32px; height: 32px; background: var(--el-fill-color-light); border-radius: 8px; flex-shrink: 0; }
  .oauth-logo img { width: 24px; height: 24px; object-fit: contain; }
  .del-email { min-width: 0; padding: 16px 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: var(--el-bg-color); }
  .del-email > .el-button { flex-shrink: 0; }
  .delete-copy p { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.6; margin: 6px 0 0; }
}
.update-pwd { display: flex; flex-direction: column; gap: 15px; }
@media (max-width: 1023px) {
  .box, .box.has-oauth { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; padding: 16px;
    .oauth-connections, .del-email { grid-column: auto; grid-row: auto; }
  }
}
@media (max-width: 600px) {
  .box, .box.has-oauth { padding: 12px; gap: 12px; .container { padding: 14px; } .container .item { grid-template-columns: 66px minmax(0, 1fr); gap: 12px; } .del-email { padding: 14px; flex-direction: column; align-items: flex-start; gap: 12px; } }
}
</style>
