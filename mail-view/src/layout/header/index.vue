<template>
  <div class="header" :class="!hasPerm('email:send') ? 'not-send' : ''">
    <div class="header-left">
      <hanburger @click="changeAside" />
      <span class="breadcrumb-item">{{ $t(route.meta.title) }}</span>
    </div>

    <div v-perm="'email:send'" class="compose-btn" @click="openSend">
      <Icon icon="mingcute:edit-2-line" width="16" height="16" />
    </div>

    <div class="toolbar">
      <button v-if="uiStore.dark" class="tool-btn" @click="openDark($event)" aria-label="Light mode">
        <Icon icon="mingcute:sun-fill" width="18" height="18" />
      </button>
      <button v-else class="tool-btn" @click="openDark($event)" aria-label="Dark mode">
        <Icon icon="mingcute:moon-line" width="17" height="17" />
      </button>

      <button class="tool-btn" @click="openNotice" aria-label="Notice">
        <Icon icon="mingcute:notification-line" width="18" height="18" />
      </button>

      <el-dropdown ref="userinfoRef" @visible-change="e => userInfoShow = e" :teleported="false" popper-class="detail-dropdown">
        <button class="avatar-btn" @click="userInfoHide">
          <div class="avatar-circle">
            {{ formatName(userStore.user.email) }}
          </div>
          <Icon class="chevron" icon="mingcute:down-small-fill" width="16" height="16" />
        </button>
        <template #dropdown>
          <div class="user-panel">
            <div class="panel-avatar">
              {{ formatName(userStore.user.email) }}
            </div>
            <div class="panel-name">{{ userStore.user.name }}</div>
            <div class="panel-email" @click="copyEmail(userStore.user.email)">
              {{ userStore.user.email }}
            </div>
            <div class="panel-id" v-if="userStore.user.displayId">
              <Icon icon="mingcute:idcard-line" width="12" height="12" />
              {{ userStore.user.displayId }}
            </div>
            <div class="panel-role">
              <el-tag size="small" effect="plain">{{ userStore.user.role.name }}</el-tag>
            </div>
            <div class="panel-stats">
              <div class="stat-row">
                <span class="stat-label">{{ $t('sendCount') }}</span>
                <span class="stat-value">
                  <span v-if="sendCount" style="margin-right: 4px">{{ sendCount }}</span>
                  <el-tag size="small">{{ sendType }}</el-tag>
                </span>
              </div>
              <div class="stat-row">
                <span class="stat-label">{{ $t('accountCount') }}</span>
                <span class="stat-value">
                  <el-tag size="small" v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail">{{ $t('disabled') }}</el-tag>
                  <span v-else-if="accountCount && hasPerm('account:add')">{{ $t('totalUserAccount', {msg: accountCount}) }}</span>
                  <el-tag size="small" v-else-if="!accountCount && hasPerm('account:add')">{{ $t('unlimited') }}</el-tag>
                  <el-tag size="small" v-else-if="!hasPerm('account:add')">{{ $t('unauthorized') }}</el-tag>
                </span>
              </div>
            </div>
            <div class="panel-logout">
              <el-button type="primary" size="small" :loading="logoutLoading" @click="clickLogout" style="width: 100%;">
                {{ $t('logOut') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import hanburger from '@/components/hamburger/index.vue'
import {logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useRoute} from "vue-router";
import {computed, ref} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {setExtend} from "@/utils/day.js"

const {t} = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const logoutLoading = ref(false)
const userInfoShow = ref(false)
const userinfoRef = ref({})

const accountCount = computed(() => userStore.user.role.accountCount)

const sendType = computed(() => {
  if (settingStore.settings.send === 1) return t('disabled')
  if (!hasPerm('email:send')) return t('unauthorized')
  if (userStore.user.role.sendType === 'ban') return t('sendBanned')
  if (userStore.user.role.sendType === 'internal') return t('sendInternal')
  if (!userStore.user.role.sendCount) return t('unlimited')
  if (userStore.user.role.sendType === 'day') return t('daily')
  if (userStore.user.role.sendType === 'count') return t('total')
})

const sendCount = computed(() => {
  if (!hasPerm('email:send')) return null
  if (userStore.user.role.sendType === 'ban') return null
  if (userStore.user.role.sendType === 'internal') return null
  if (!userStore.user.role.sendCount) return null
  if (settingStore.settings.send === 1) return null
  return userStore.user.sendCount + '/' + userStore.user.role.sendCount
})

function userInfoHide(e) {
  if (userInfoShow.value) userinfoRef.value.handleClose()
  else userinfoRef.value.handleOpen()
}

async function copyEmail(email) {
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true })
  } catch (err) {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true })
  }
}

function openNotice() { uiStore.showNotice() }

function openDark(e) {
  const nextIsDark = !uiStore.dark
  const root = document.documentElement

  if (!document.startViewTransition) {
    switchDark(nextIsDark, root);
    return
  }

  const x = e.clientX
  const y = e.clientY
  const maxX = Math.max(x, window.innerWidth - x)
  const maxY = Math.max(y, window.innerHeight - y)
  const endRadius = Math.hypot(maxX, maxY)

  root.setAttribute('data-theme-to', nextIsDark ? 'dark' : 'light')
  root.style.setProperty('--vt-x', `${x}px`)
  root.style.setProperty('--vt-y', `${y}px`)
  root.style.setProperty('--vt-end-radius', `${endRadius + 10}px`)

  const transition = document.startViewTransition(() => {
    switchDark(nextIsDark, root);
  })

  transition.finished.finally(() => {
    root.removeAttribute('data-theme-to')
  })
}

function switchDark(nextIsDark, root) {
  root.setAttribute('class', nextIsDark ? 'dark' : '')
  const metaTag = document.getElementById('theme-color-meta');
  const isMobile = !window.matchMedia("(pointer: fine) and (hover: hover)").matches;
  metaTag.setAttribute('content', nextIsDark ? (isMobile ? '#141414' : '#000000') : (isMobile ? '#FFFFFF' : '#F1F1F1'));
  uiStore.dark = nextIsDark
}

function openSend() { uiStore.writerRef.open() }
function changeAside() { uiStore.asideShow = !uiStore.asideShow }

function clickLogout() {
  logoutLoading.value = true
  logout().then(() => {
    localStorage.removeItem("token")
    router.replace('/login')
  }).finally(() => {
    logoutLoading.value = false
  })
}

function formatName(email) {
  return email[0]?.toUpperCase() || ''
}
</script>

<style>
.detail-dropdown {
  color: var(--el-text-color-primary) !important;
}
</style>

<style lang="scss" scoped>
:deep(.el-popper.is-pure) {
  border-radius: var(--xi-radius);
  box-shadow: var(--xi-shadow-lg);
}

.header {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 10px;
  padding: 0 6px 0 0;
}

.header.not-send .compose-btn {
  display: none;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.breadcrumb-item {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.compose-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--xi-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
  flex-shrink: 0;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
  }

  &:active {
    transform: translateY(0);
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.tool-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  transition: all 0.15s ease;

  &:hover {
    background: var(--base-fill);
    color: var(--el-text-color-primary);
  }
}

.avatar-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 2px;
  border-radius: 8px;
  border: none;
  background: transparent;
  transition: background 0.15s;
  margin-left: 4px;

  &:hover {
    background: var(--base-fill);
  }
}

.avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--xi-gradient);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chevron {
  color: var(--el-text-color-placeholder);
  margin-right: 4px;
}

/* ── User panel ── */
.user-panel {
  width: 240px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.panel-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--xi-gradient);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.panel-name {
  font-weight: 600;
  font-size: 14px;
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
}

.panel-email {
  font-size: 12.5px;
  color: var(--regular-text-color);
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: color 0.15s;

  &:hover {
    color: var(--el-color-primary);
  }
}

.panel-id {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  letter-spacing: 0.3px;
  margin-top: 2px;
}

.panel-role {
  margin-top: 6px;
}

.panel-stats {
  width: 100%;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
}

.stat-label {
  color: var(--regular-text-color);
}

.stat-value {
  display: flex;
  align-items: center;
}

.panel-logout {
  width: 100%;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.el-tooltip__trigger:first-child:focus-visible {
  outline: unset;
}
</style>

