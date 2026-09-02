<template>
  <div class="box">
    <div class="container">
      <div class="title">{{$t('profile')}}</div>
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
    <div class="del-email" v-perm="'my:delete'">
      <div class="title">{{$t('deleteUser')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('delAccountMsg')}}
      </div>
      <div>
        <el-button type="primary" @click="deleteConfirm">{{$t('deleteUserBtn')}}</el-button>
      </div>
    </div>
    <el-dialog v-model="pwdShow" :title="$t('changePassword')" width="340">
      <div class="update-pwd">
        <el-input type="password" :placeholder="$t('newPassword')" v-model="form.password" autocomplete="off"/>
        <el-input type="password" :placeholder="$t('confirmPassword')" v-model="form.newPwd" autocomplete="off"/>
        <el-button type="primary" :loading="setPwdLoading" @click="submitPwd">{{$t('save')}}</el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import {reactive, ref, defineOptions} from 'vue'
import {Icon} from "@iconify/vue";
import {resetPassword, userDelete} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useServerStore} from "@/store/server.js";

const { t } = useI18n()
const accountStore = useAccountStore()
const userStore = useUserStore();
const setPwdLoading = ref(false)
const setNameShow = ref(false)
const accountName = ref(null)

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
  let name = accountName.value

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
    userStore.user.name = name
  })
}

const pwdShow = ref(false)
const form = reactive({
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
  resetPassword(form.password).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })
    pwdShow.value = false
    setPwdLoading.value = false
    form.password = ''
    form.newPwd = ''
  }).catch(() => {
    setPwdLoading.value = false
  })

}

</script>
<style scoped lang="scss">
.box {
  padding: 40px 40px;
  max-width: 600px;

  @media (max-width: 767px) {
    padding: 28px 24px;
  }

  .update-pwd {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .title {
    font-size: 16px;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .container {
    font-size: 13.5px;
    display: grid;
    gap: 20px;
    margin-bottom: 40px;

    .item {
      display: grid;
      grid-template-columns: 50px 1fr;
      gap: 100px;
      position: relative;
      .user-name {
        display: grid;
        grid-template-columns: auto 1fr;
        span:first-child {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }

      .edit-name-input {
        position: absolute;
        bottom: -6px;
        .el-input {
          width: min(200px, calc(100vw - 222px));
        }
      }

      .edit-name {
        color: var(--el-color-primary);
        padding-left: 10px;
        cursor: pointer;
        font-weight: 500;
        transition: opacity 0.15s;

        &:hover { opacity: 0.8; }
      }

      @media (max-width: 767px) {
        gap: 50px;
      }

      div:first-child {
        font-weight: 550;
        color: var(--el-text-color-secondary);
      }

      div:last-child {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .display-id-value {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 12.5px;
        color: var(--el-text-color-secondary);
        letter-spacing: 0.5px;
      }

      .copyable {
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: color 0.15s ease;

        .copy-icon { opacity: 0; transition: opacity 0.15s ease; flex-shrink: 0; }

        &:hover {
          color: var(--el-color-primary);
          .copy-icon { opacity: 1; }
        }
      }
    }
  }

  .del-email {
    font-size: 13.5px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
