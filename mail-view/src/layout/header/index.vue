<template>
  <div class="header" :class="{ 'not-send': !hasPerm('email:send'), 'is-navigation-shell': !hasAsideNav }">
    <div class="header-left">
      <hanburger v-if="hasAsideNav" @click="changeAside" />
      <span class="breadcrumb-item">{{ $t(route.meta.title) }}</span>
    </div>

    <button v-perm="'email:send'" type="button" class="compose-btn" :aria-label="$t('composeMail')" :title="$t('composeMail')" @click="openSend">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.8 3.2 1-1a2.2 2.2 0 0 1 3.1 0l1.9 1.9a2.2 2.2 0 0 1 0 3.1l-1 1-5-5Zm-1.4 1.4 5 5L8.6 20.4l-5.7 1.3 1.3-5.7L14.4 4.6Z" /></svg>
    </button>

    <div class="toolbar">
      <button class="tool-btn lang-btn" @click="toggleLang" :aria-label="settingStore.lang === 'zh' ? 'Switch to English' : '切换为中文'">
        <span class="lang-label">{{ settingStore.lang === 'zh' ? 'EN' : '中' }}</span>
      </button>

      <button v-if="uiStore.dark" class="tool-btn" @click="openDark($event)" aria-label="Light mode">
        <Icon icon="mingcute:sun-fill" width="18" height="18" />
      </button>
      <button v-else class="tool-btn" @click="openDark($event)" aria-label="Dark mode">
        <Icon icon="mingcute:moon-line" width="17" height="17" />
      </button>

      <button class="tool-btn" @click="openNotice" aria-label="Notice">
        <Icon icon="mingcute:notification-line" width="18" height="18" />
      </button>

      <el-dropdown ref="userinfoRef" @visible-change="e => userInfoShow = e" popper-class="detail-dropdown">
        <button type="button" class="avatar-btn" :aria-label="$t('accountMenu')" @click="userInfoHide">
          <div class="avatar-circle">
            <UserAvatar :seed="avatarSeed" :size="32" />
          </div>
          <Icon class="chevron" icon="mingcute:down-small-fill" width="16" height="16" />
        </button>
        <template #dropdown>
          <el-dropdown-menu class="user-dropdown-menu">
            <div class="user-panel">
            <div class="panel-avatar">
              <UserAvatar :seed="avatarSeed" :size="48" />
              <button type="button" class="avatar-shuffle" :aria-label="$t('avatarShuffle')" :title="$t('avatarShuffleHint')" @click.stop="shuffleAvatar"><Icon icon="mingcute:refresh-2-line" width="13" height="13" /></button>
            </div>
            <div class="panel-name">{{ userStore.user.name }}</div>
            <el-tooltip :content="$t('clickToCopy')" placement="top" :show-after="200">
              <div class="panel-id" v-if="userStore.user.displayId" @click="copyEmail(userStore.user.displayId)">
                <Icon icon="mingcute:idcard-line" width="12" height="12" />
                {{ userStore.user.displayId }}
                <Icon icon="mingcute:copy-2-line" width="11" height="11" class="panel-id-copy" />
              </div>
            </el-tooltip>
            <div class="panel-email" @click="copyEmail(userStore.user.email)">
              {{ userStore.user.email }}
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
          </el-dropdown-menu>
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
import {useEmailStore} from '@/store/email.js';
import {useAccountStore} from '@/store/account.js';
import {useWriterStore} from '@/store/writer.js';
import {useRoute} from "vue-router";
import {computed, ref, watch} from "vue";
import UserAvatar from '@/components/UserAvatar.vue';
import {avatarHash} from '@/utils/avatar.js';
import {useSettingStore} from "@/store/setting.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {setExtend} from "@/utils/day.js"
import i18n from "@/i18n/index.js"
import {useServerStore} from "@/store/server.js"
import {saveLang} from "@/request/my.js"

const {t} = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
const serverStore = useServerStore();
const userStore = useUserStore();
const avatarVariant = ref('');
const avatarOwner = computed(() => `${serverStore.activeServerId || 'local'}:${userStore.user.displayId || userStore.user.userId || userStore.user.email || 'guest'}`);
const avatarKey = computed(() => `xi-mail:avatar:${avatarHash(avatarOwner.value).toString(36)}`);
const avatarSeed = computed(() => `${avatarOwner.value}:${avatarVariant.value}`);
watch(avatarKey, key => {
  try { avatarVariant.value = localStorage.getItem(key) || ''; } catch { avatarVariant.value = ''; }
}, {immediate:true});
function shuffleAvatar() {
  const bytes = crypto.getRandomValues(new Uint32Array(2));
  avatarVariant.value = [...bytes].map(value => value.toString(36)).join('-');
  try { localStorage.setItem(avatarKey.value, avatarVariant.value); } catch {}
}
const uiStore = useUiStore();
const logoutLoading = ref(false)
const userInfoShow = ref(false)
const userinfoRef = ref({})
const hasAsideNav = computed(() => ['default', 'compact'].includes(settingStore.settings?.layoutMode || 'default'))

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

function toggleLang() {
  const next = settingStore.lang === 'zh' ? 'en' : 'zh'
  settingStore.lang = next
  i18n.global.locale.value = next
  setExtend(next === 'zh' ? 'zh-cn' : 'en')
  saveLang(next).catch(() => {})
}

function openSend() { uiStore.writerRef.open() }
function changeAside() { uiStore.asideShow = !uiStore.asideShow }

function clickLogout() {
  logoutLoading.value = true
  logout().then(() => {
    serverStore.clearToken(serverStore.activeServerId)
    useEmailStore().$reset(); useAccountStore().$reset(); useWriterStore().$reset(); userStore.$reset();
    localStorage.removeItem('email'); localStorage.removeItem('writer');
    sessionStorage.removeItem('xi-mail:oauth:state');
    window.location.replace('/login');
  }).finally(() => {
    logoutLoading.value = false
  })
}

</script>

<style>
.detail-dropdown {
  color: var(--el-text-color-primary) !important;
  background: var(--el-bg-color) !important;
}
.detail-dropdown .el-dropdown-menu {
  background: var(--el-bg-color) !important;
  border: 1px solid var(--el-border-color-lighter) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
  padding: 0 !important;
}
.user-dropdown-menu {
  background: var(--el-bg-color) !important;
  padding: 0 !important;
  border: none !important;
}
.user-dropdown-menu .user-panel {
  background: var(--el-bg-color) !important;
  color: var(--el-text-color-primary) !important;
}
</style>

<style lang="scss" scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   Header: Eastern Aesthetic / 东方美学顶栏
   ──────────────────────────────────────────────────────────────────────────────
   - Clean, minimal design with generous whitespace
   - Refined interactions and subtle transitions
   - Jade-accent compose button
   ══════════════════════════════════════════════════════════════════════════════ */
:deep(.el-popper.is-pure) {
  border-radius: var(--xi-radius);
  box-shadow: var(--xi-shadow-lg);
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

:deep(.el-dropdown__popper) {
  background: var(--el-bg-color) !important;
}

:deep(.el-dropdown__popper .el-dropdown-menu) {
  background: var(--el-bg-color) !important;
}

.header {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 12px;
  padding: 0 8px 0 0;
}

.header.not-send .compose-btn {
  display: none;
}

.header.is-navigation-shell {
  padding-left: 18px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.breadcrumb-item {
  font-weight: 600;
  font-size: 15px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.compose-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--xi-radius);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
  flex-shrink: 0;

  svg { width: 20px; height: 20px; fill: currentColor; }

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:active {
    background: var(--el-color-primary-light-9);
  }
  &:focus-visible { outline: 2px solid var(--el-color-primary-light-5); outline-offset: 3px; }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--xi-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: var(--base-fill);
    color: var(--el-color-primary);
  }
}

.lang-btn {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.lang-label {
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  line-height: 1;
  letter-spacing: 0.4px;
}

.avatar-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  padding: 3px;
  border-radius: var(--xi-radius);
  border: none;
  background: transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 6px;

  &:hover {
    background: var(--base-fill);
  }
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: var(--xi-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chevron {
  color: var(--el-text-color-placeholder);
  margin-right: 4px;
  transition: transform 0.2s ease;
}

/* ── User panel ── */
.user-panel {
  width: 260px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.panel-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: var(--xi-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}
.avatar-shuffle { position:absolute; right:-6px; bottom:-4px; display:flex; align-items:center; justify-content:center; width:22px; height:22px; padding:0; border:1px solid var(--el-border-color-light); border-radius:50%; background:var(--el-bg-color-overlay); color:var(--el-text-color-secondary); cursor:pointer; }
.avatar-shuffle:hover { color:var(--el-color-primary); border-color:var(--el-color-primary); }
.avatar-shuffle:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:2px; }

.panel-name {
  font-weight: 600;
  font-size: 15px;
  max-width: 220px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
  letter-spacing: -0.01em;
}

.panel-email {
  font-size: 13px;
  color: var(--regular-text-color);
  cursor: pointer;
  max-width: 220px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
  padding: 2px 8px;
  border-radius: var(--xi-radius-sm);

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.panel-id {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: var(--regular-text-color);
  letter-spacing: 0.3px;
  margin-top: 4px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: color 0.15s ease;

  .panel-id-copy { opacity: 0; transition: opacity 0.15s ease; }

  &:hover {
    color: var(--el-color-primary);
    .panel-id-copy { opacity: 1; }
  }
}

.panel-role {
  margin-top: 8px;
}

.panel-stats {
  width: 100%;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
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
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.el-tooltip__trigger:first-child:focus-visible {
  outline: unset;
}
</style>

