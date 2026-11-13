<template>
  <div :class="['login-page', 'template-' + loginTemplate]" v-loading="oauthLoading" element-loading-text="登录中...">
    <!-- Each scene has its own composition; authentication stays shared. -->
    <header v-if="loginTemplate === 'minimal'" class="minimal-masthead">
      <div class="minimal-brand">
        <BrandMark :size="25" />
        <span>{{ settingStore.settings.title }}</span>
      </div>
      <span class="minimal-edition">{{ $t('simpleAndFocused') }}</span>
    </header>

    <section v-if="loginTemplate === 'editorial'" class="editorial-scene" aria-hidden="true">
      <div class="editorial-masthead"><span>{{ settingStore.settings.title }}</span><span>EST. {{ new Date().getFullYear() }}</span></div>
      <div class="editorial-copy">
        <span class="editorial-kicker">PERSONAL CORRESPONDENCE</span>
        <h2><span>{{ $t('editorialHeadlineFirst') }}</span><span>{{ $t('editorialHeadlineLast') }}<i>.</i></span></h2>
        <p>{{ $t('editorialNote') }}</p>
      </div>
      <div class="editorial-art">
        <span class="editorial-postmark">POST<br><b>XI—MAIL</b></span>
        <div class="editorial-lines"><i></i><i></i><i></i><small>{{ $t('privateMailbox') }}</small></div>
      </div>
      <span class="editorial-bottom">XI / MAIL <i></i> {{ $t('editorialEdition') }}</span>
    </section>

    <div v-if="loginTemplate === 'window'" class="window-scene" aria-hidden="true">
      <div class="window-moon"></div><div class="window-orbit"></div>
      <span class="window-star star-one">+</span><span class="window-star star-two">+</span><span class="window-star star-three">·</span>
      <div class="window-scene-note"><strong>NIGHT<br>POST.</strong><span>{{ $t('windowNote') }}</span></div>
    </div>

    <section v-if="loginTemplate === 'grid'" class="grid-banner" aria-hidden="true">
      <div class="grid-wordmark"><span>XI / MAIL</span><h2>{{ settingStore.settings.title }}</h2><p>{{ $t('gridNote') }}</p></div>
      <div class="grid-tiles"><i></i><i></i><i></i><i></i></div>
    </section>

    <!-- Envelope template: tactile mail piece and sliding registration letter -->
    <section v-if="loginTemplate === 'envelope'" class="envelope-scene" aria-hidden="true">
      <div class="envelope-return">
        <BrandMark :size="23" />
        <span>{{ settingStore.settings.title }}</span>
      </div>
      <div class="envelope-postmark">
        <span>XI MAIL</span>
        <b>{{ new Date().getFullYear() }}</b>
      </div>
      <div class="envelope-airmail"></div>
      <p>{{ $t('envelopeNote') }}</p>
    </section>

    <!-- Passport template: postal identity booklet -->
    <section v-if="loginTemplate === 'passport'" class="passport-scene" aria-hidden="true">
      <div class="passport-number">XM · {{ new Date().getFullYear() }} · 09</div>
      <div class="passport-stamp">
        <BrandMark :size="33" />
        <span>XI MAIL</span>
      </div>
      <div class="passport-route">
        <i></i><span>{{ $t('passportRoute') }}</span><i></i>
      </div>
    </section>

    <!-- Centered card -->
    <div class="card-wrapper">
      <div v-if="loginTemplate === 'window'" class="window-bar" aria-hidden="true">
        <span><Icon icon="mingcute:mail-line" width="14" height="14"/>{{ $t('windowAccess') }}</span><i></i>
      </div>
      <div class="auth-card" :class="{ 'is-register': show !== 'login' }" v-motion :initial="{ opacity: 0, y: 24, scale: 0.98 }" :enter="{ opacity: 1, y: 0, scale: 1, transition: { duration: 400 } }">
        <!-- Logo + Title -->
        <div class="card-header">
          <div class="logo-icon">
            <BrandMark :size="30" />
          </div>
          <h1 class="app-name">{{ settingStore.settings.title }}</h1>
        </div>

        <!-- Heading -->
        <Transition name="hd" mode="out-in">
          <div class="card-heading" :key="show">
            <h2>{{ refinedTemplate ? (show === 'login' ? $t('authSignIn') : $t('authCreate')) : (show === 'login' ? $t('loginTitle') : $t('regTitle')) }}</h2>
            <p>{{ show === 'login' ? $t('loginSubTitle') : $t('regSubTitle') }}</p>
          </div>
        </Transition>

        <!-- Server selector (standalone mode with multiple servers) -->
        <div v-if="serverStore.isStandalone && serverStore.servers.length > 1" class="server-selector">
          <el-select v-model="activeServerSelect" size="default" @change="onServerChange">
            <el-option
              v-for="s in serverStore.servers"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </div>

        <!-- Tab switcher -->
        <div class="tab-bar" v-if="settingStore.settings.register === 0">
          <button :class="['tab', show === 'login' && 'active']" @click="show = 'login'">{{ $t('loginBtn') }}</button>
          <button :class="['tab', show !== 'login' && 'active']" @click="show = 'register'">{{ $t('regBtn') }}</button>
        </div>

        <!-- Forms -->
        <Transition name="form" mode="out-in">
          <!-- LOGIN -->
          <div v-if="show === 'login'" key="login" class="fields login-fields">
            <div class="field field-email">
              <label>{{ $t('emailAccount') }}</label>
              <div class="input-group" :class="{ 'has-suffix': showLoginSuffix }">
                <div class="input-main">
                  <Icon class="input-icon" icon="mingcute:mail-line" width="16" height="16" />
                  <input v-model="form.email" type="text" autocomplete="off"
                    :placeholder="(settingStore.settings.loginDomain === 0 && hasDomains) ? $t('loginAccountPlaceholder') : $t('emailAccount')" />
                </div>
                <div v-if="showLoginSuffix" class="input-suffix" @click.stop="openSelect">
                  <span>{{ suffix }}</span>
                  <Icon icon="mingcute:down-line" width="11" height="11" />
                  <el-select v-if="show === 'login'" ref="mySelect" v-model="suffix" class="hidden-select" :popper-class="suffixPopperClass">
                    <el-option v-for="d in domainList" :key="d" :label="d" :value="d" />
                  </el-select>
                </div>
              </div>
            </div>

            <div class="field field-password">
              <label>{{ $t('password') }}</label>
              <div class="input-main standalone">
                <Icon class="input-icon" icon="mingcute:lock-line" width="16" height="16" />
                <input v-model="form.password" :type="showPwd ? 'text' : 'password'" autocomplete="off" :placeholder="$t('password')" />
                <button class="toggle-pwd" @click="showPwd = !showPwd" type="button" tabindex="-1">
                  <Icon :icon="showPwd ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" width="15" height="15" />
                </button>
              </div>
            </div>

            <button class="primary-btn" @click="submit" :disabled="loginLoading">
              <Icon v-if="loginLoading" icon="mingcute:loading-fill" class="spin" width="16" height="16" />
              <span v-else>{{ $t('loginBtn') }}</span>
            </button>

            <template v-if="enabledOAuthProviders.length">
              <div class="divider"><span>{{ $t('orDivider') }}</span></div>
              <div class="social-providers" :style="{ '--provider-count': Math.min(enabledOAuthProviders.length, 3) }">
                <button v-for="provider in enabledOAuthProviders" :key="provider.id" class="social-btn" :aria-label="$t('oauthSignInWith', { provider: provider.name })" :disabled="oauthLoading" @click="providerLogin(provider.id)">
                  <img :src="provider.logo" alt="" width="18" height="18" />
                  <span>{{ provider.name }}</span>
                </button>
              </div>
            </template>
          </div>

          <!-- REGISTER -->
          <div v-else key="register" class="fields register-fields">
            <div class="field field-email">
              <label>{{ $t('emailAccount') }}</label>
              <div class="input-group" :class="{ 'has-suffix': hasDomains }">
                <div class="input-main">
                  <Icon class="input-icon" icon="mingcute:mail-line" width="16" height="16" />
                  <input v-model="registerForm.email" type="text" autocomplete="off"
                    :placeholder="hasDomains ? 'username' : $t('emailAccount')" />
                </div>
                <div v-if="hasDomains" class="input-suffix" @click.stop="openSelect">
                  <span>{{ suffix }}</span>
                  <Icon icon="mingcute:down-line" width="11" height="11" />
                  <el-select v-if="show !== 'login'" ref="mySelect" v-model="suffix" class="hidden-select" :popper-class="suffixPopperClass">
                    <el-option v-for="d in domainList" :key="d" :label="d" :value="d" />
                  </el-select>
                </div>
              </div>
            </div>

            <div class="field field-password">
              <label>{{ $t('password') }}</label>
              <div class="input-main standalone">
                <Icon class="input-icon" icon="mingcute:lock-line" width="16" height="16" />
                <input v-model="registerForm.password" :type="showPwd ? 'text' : 'password'" autocomplete="off" :placeholder="$t('password')" />
                <button class="toggle-pwd" @click="showPwd = !showPwd" type="button" tabindex="-1">
                  <Icon :icon="showPwd ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" width="15" height="15" />
                </button>
              </div>
            </div>

            <div class="field field-confirm">
              <label>{{ $t('confirmPwd') }}</label>
              <div class="input-main standalone" :class="{ error: registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword }">
                <Icon class="input-icon" icon="mingcute:lock-check-line" width="16" height="16" />
                <input v-model="registerForm.confirmPassword" :type="showConfirmPwd ? 'text' : 'password'" autocomplete="off" :placeholder="$t('confirmPwd')" />
                <button class="toggle-pwd" @click="showConfirmPwd = !showConfirmPwd" type="button" tabindex="-1">
                  <Icon :icon="showConfirmPwd ? 'mingcute:eye-line' : 'mingcute:eye-close-line'" width="15" height="15" />
                </button>
              </div>
            </div>

            <div v-if="settingStore.settings.regKey === 0 || settingStore.settings.regKey === 2" class="field field-reg-key">
              <label>{{ settingStore.settings.regKey === 0 ? $t('regKey') : $t('regKeyOptional') }}</label>
              <div class="input-main standalone">
                <Icon class="input-icon" icon="mingcute:key-2-line" width="16" height="16" />
                <input v-model="registerForm.code" type="text" autocomplete="off"
                  :placeholder="settingStore.settings.regKey === 0 ? $t('regKey') : $t('regKeyOptional')" />
              </div>
              <div class="reg-key-tips">
                <span v-if="currentRegKeyHint" class="reg-key-hint">{{ currentRegKeyHint }}</span>
                <a v-if="settingStore.settings.regKeyLink" class="reg-key-link" :href="settingStore.settings.regKeyLink" target="_blank" rel="noopener noreferrer">
                  <Icon icon="mingcute:external-link-line" width="13" height="13" />
                  {{ $t('getRegKey') }}
                </a>
              </div>
            </div>

            <div v-show="verifyShow" class="register-turnstile"
              :data-sitekey="settingStore.settings.siteKey"
              data-callback="onTurnstileSuccess"
              data-error-callback="onTurnstileError"
              data-after-interactive-callback="loadAfter"
              data-before-interactive-callback="loadBefore">
              <span class="err-text" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
            </div>

            <button class="primary-btn" @click="submitRegister" :disabled="registerLoading">
              <Icon v-if="registerLoading" icon="mingcute:loading-fill" class="spin" width="16" height="16" />
              <span v-else>{{ $t('regBtn') }}</span>
            </button>


          </div>
        </Transition>
      </div>

      <!-- Footer below card -->
      <div class="page-footer" v-motion :initial="{ opacity: 0 }" :enter="{ opacity: 1, transition: { delay: 300 } }">
        <a href="https://github.com/PastKing/xi-mail" target="_blank">
          <Icon icon="mingcute:github-line" width="14" height="14" />
          <span>{{ $t('openSource') }}</span>
        </a>
      </div>
    </div>


  </div>
</template>

<script setup>
import BrandMark from '@/components/BrandMark.vue';
import router from "@/router";
import {computed, nextTick, onMounted, reactive, ref, watch} from "vue";
import {login, register} from "@/request/login.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {registrationHint} from '@/i18n/language.js';
import {startOAuth} from '@/utils/oauth.js';
import {OAUTH_PROVIDERS} from '@/config/oauth-providers.js';
import {useServerStore} from "@/store/server.js";
import {websiteConfig} from "@/request/setting.js";
import {normalizeLoginTemplate} from '@/config/login-templates.js';

const {t} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const serverStore = useServerStore();
const loginTemplate = computed(() => normalizeLoginTemplate(settingStore.settings?.loginTemplate));
const refinedTemplate = computed(() => ['editorial', 'window', 'grid'].includes(loginTemplate.value));
const currentRegKeyHint = computed(() => {
  const s = settingStore.settings;
  if (!s) return '';
  return registrationHint(s.regKeyHint || '');
});
const activeServerSelect = ref(serverStore.activeServerId);
function onServerChange(id) {
  serverStore.setActiveServer(id);
  websiteConfig().then(s => {
    settingStore.settings = s;
    settingStore.domainList = s.domainList;
    suffix.value = s.domainList?.[0] || '';
  }).catch(() => {});
}
const loginLoading = ref(false);
const oauthLoading = ref(false);
const enabledOAuthProviders = computed(() => OAUTH_PROVIDERS.filter(provider => settingStore.settings[provider.id + 'Switch']));
const show = ref('login');
const showPwd = ref(false);
const showConfirmPwd = ref(false);

const form = reactive({ email: '', password: '' });
const mySelect = ref();
const suffix = ref('');
const registerForm = reactive({ email: '', password: '', confirmPassword: '', code: null });
const domainList = computed(() => settingStore.domainList || []);
const hasDomains = computed(() => domainList.value.length > 0);
const showLoginSuffix = computed(() => settingStore.settings.loginDomain === 0 && hasDomains.value && !form.email.includes('@'));
const suffixPopperClass = '';
const registerLoading = ref(false);
suffix.value = domainList.value[0] || '';
watch(domainList, domains => { if (!domains.includes(suffix.value)) suffix.value = domains[0] || ''; });

if (serverStore.isStandalone && !settingStore.settings?.title && serverStore.servers.length > 0) {
  websiteConfig().then(s => {
    settingStore.settings = s;
    settingStore.domainList = s.domainList;
    if (s.domainList?.[0]) suffix.value = s.domainList[0];
  }).catch(() => {});
}

const verifyShow = ref(false);
let verifyToken = '';
let turnstileId = null;
const botJsError = ref(false);
let verifyErrorCount = 0;

window.onTurnstileSuccess = (token) => { verifyToken = token; };
window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) return;
  verifyErrorCount++;
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) turnstileId = window.turnstile.render('.register-turnstile');
      else window.turnstile.reset(turnstileId);
    });
  }, 1500);
};
window.loadAfter = () => {};
window.loadBefore = () => {};

const openSelect = () => { mySelect.value.toggleMenu(); };

async function providerLogin(provider) {
  oauthLoading.value = true;
  try { await startOAuth(provider); } catch { oauthLoading.value = false; }
}

const submit = () => {
  if (!form.email) { ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true }); return; }
  const email = form.email.trim() + (showLoginSuffix.value ? suffix.value : '');
  if (!isEmail(email)) { ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true }); return; }
  if (!form.password) { ElMessage({ message: t('emptyPwdMsg'), type: 'error', plain: true }); return; }
  loginLoading.value = true;
  login(email, form.password)
    .then(async data => { await saveToken(data.token); })
    .catch(() => { /* The request interceptor displays credential and rate-limit errors. */ })
    .finally(() => { loginLoading.value = false; });
};

async function saveToken(token) {
  const sid = serverStore.activeServer?.id || 'local'
  serverStore.setToken(sid, token)
  const user = await loginUserInfo();
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  settingStore.domainList = user.domainList || settingStore.domainList;
  permsToRouter(user.permKeys).forEach(r => { router.addRoute('layout', r); });
  await router.replace({ name: 'layout' });
  uiStore.showNotice();
  oauthLoading.value = false;
}

function submitRegister() {
  if (!registerForm.email) { ElMessage({ message: t('emptyEmailMsg'), type: 'error', plain: true }); return; }
  if (registerForm.email.split('@')[0].length < settingStore.settings.minEmailPrefix) {
    ElMessage({ message: t('minEmailPrefix', { msg: settingStore.settings.minEmailPrefix }), type: 'error', plain: true }); return;
  }
  const regSuffix = hasDomains.value ? suffix.value : '';
  if (!isEmail(registerForm.email + regSuffix)) { ElMessage({ message: t('notEmailMsg'), type: 'error', plain: true }); return; }
  if (!registerForm.password) { ElMessage({ message: t('emptyPwdMsg'), type: 'error', plain: true }); return; }
  if (registerForm.password.length < 6) { ElMessage({ message: t('pwdLengthMsg'), type: 'error', plain: true }); return; }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage({ message: t('confirmPwdFailMsg'), type: 'error', plain: true }); return;
  }
  if (settingStore.settings.regKey === 0 && !registerForm.code) {
    ElMessage({ message: t('emptyRegKeyMsg'), type: 'error', plain: true }); return;
  }
  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true;
      nextTick(() => {
        if (!turnstileId) {
          try { turnstileId = window.turnstile.render('.register-turnstile'); }
          catch { botJsError.value = true; }
        } else { window.turnstile.reset('.register-turnstile'); }
      });
    } else if (!botJsError.value) {
      ElMessage({ message: t('botVerifyMsg'), type: 'error', plain: true });
    }
    return;
  }
  registerLoading.value = true;
  register({ email: registerForm.email + regSuffix, password: registerForm.password, token: verifyToken, code: registerForm.code })
    .then(({ regVerifyOpen }) => {
      show.value = 'login';
      Object.assign(registerForm, { email: '', password: '', confirmPassword: '', code: '' });
      registerLoading.value = false;
      verifyToken = '';
      settingStore.settings.regVerifyOpen = regVerifyOpen;
      verifyShow.value = false;
      ElMessage({ message: t('regSuccessMsg'), type: 'success', plain: true });
    })
    .catch(res => {
      registerLoading.value = false;
      if (res.code === 400) {
        verifyToken = '';
        settingStore.settings.regVerifyOpen = true;
        if (turnstileId) window.turnstile.reset(turnstileId);
        else nextTick(() => { turnstileId = window.turnstile.render('.register-turnstile'); });
        verifyShow.value = true;
      }
    });
}
</script>

<style>
.el-select-dropdown__item { padding: 0 15px; }

/* ── Dark login templates: readable suffix dropdown ── */
.xi-dark-login-dropdown {
  background: #303b38 !important;
  border-color: #4b5855 !important;
}
.xi-dark-login-dropdown .el-select-dropdown__list {
  padding: 4px 0;
}
.xi-dark-login-dropdown .el-select-dropdown__item {
  color: #dce5d7;
}
.xi-dark-login-dropdown .el-select-dropdown__item.is-hovering {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #e4e9df;
}
.xi-dark-login-dropdown .el-select-dropdown__item.is-selected {
  color: #c4d1bb;
  font-weight: 600;
}
.xi-dark-login-dropdown .el-popper__arrow::before {
  background: #303b38 !important;
  border-color: #4b5855 !important;
}
</style>

<style lang="scss" scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   Login Page: Eastern Aesthetic Base Styles / 东方美学登录页
   ──────────────────────────────────────────────────────────────────────────────
   - Jade-inspired color palette
   - Refined, calm visual design
   - Organic animations
   ══════════════════════════════════════════════════════════════════════════════ */
/* ── Full-page centered layout ── */
.login-page {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  /* Light mode: warm jade-tinted background */
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(61,139,132,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 100%, rgba(90,158,150,0.08) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(122,179,172,0.05) 0%, transparent 60%),
    #fafaf8;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

:global(.dark) .login-page {
  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(61,139,132,0.14) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 80% 100%, rgba(90,158,150,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(122,179,172,0.06) 0%, transparent 60%),
    #0c0f12;
}

/* ── Background decoration ── */
.bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Subtle grid lines */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(61,139,132,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(61,139,132,0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
}

/* Decorative orbs */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
}

.bg-orb-1 {
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(61,139,132,0.18) 0%, transparent 70%);
  top: -180px;
  right: -80px;
  animation: orb-drift-1 18s ease-in-out infinite;
}

.bg-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(90,158,150,0.14) 0%, transparent 70%);
  bottom: -120px;
  left: -60px;
  animation: orb-drift-2 22s ease-in-out infinite;
}

.bg-orb-3 {
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(122,179,172,0.12) 0%, transparent 70%);
  top: 35%;
  right: 18%;
  animation: orb-drift-3 26s ease-in-out infinite;
}

@keyframes orb-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(-20px, 15px) scale(1.03); }
  66%       { transform: translate(10px, -18px) scale(0.98); }
}
@keyframes orb-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(18px, -24px) scale(1.02); }
  66%       { transform: translate(-15px, 12px) scale(0.98); }
}
@keyframes orb-drift-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(-15px, -20px) scale(1.04); }
}

/* Top decorative bar */
.bg-layer::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--xi-gradient);
  opacity: 0.4;
}

/* ── Card wrapper ── */
.card-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-height: 100vh;
  overflow-y: auto;
  padding: 28px 18px;
}

/* ── Auth card ── */
.auth-card {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--xi-radius-lg);
  padding: 32px 32px 28px;
  box-shadow:
    0 0 0 1px rgba(61, 139, 132, 0.04),
    0 4px 28px -4px rgba(61, 139, 132, 0.10),
    0 20px 60px -12px rgba(61, 139, 132, 0.08);

  @media (max-width: 460px) {
    padding: 24px 20px 22px;
    border-radius: var(--xi-radius);
  }
}

:global(.dark) .auth-card {
  background: rgba(18, 22, 26, 0.85);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border-color: rgba(61, 139, 132, 0.12);
  box-shadow:
    0 0 0 1px rgba(61, 139, 132, 0.08),
    0 4px 28px -4px rgba(0, 0, 0, 0.35),
    0 20px 60px -12px rgba(0, 0, 0, 0.25);
}

/* ── Card header ── */
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--xi-radius);
  background: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.app-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
  letter-spacing: -0.02em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── Card heading ── */
.card-heading {
  margin-bottom: 16px;

  h2 {
    margin: 0 0 3px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 0;
    font-size: 12.5px;
    color: var(--el-text-color-secondary);
  }
}

/* ── Server selector ── */
.server-selector {
  margin-bottom: 12px;

  :deep(.el-select) { width: 100%; }
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  background: rgba(61, 139, 132, 0.06);
  border-radius: var(--xi-radius);
  padding: 4px;
  margin-bottom: 18px;
}

.tab {
  flex: 1;
  padding: 8px 0;
  font-size: 13.5px;
  font-weight: 520;
  color: var(--el-text-color-secondary);
  background: transparent;
  border: none;
  border-radius: var(--xi-radius-sm);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.active {
    background: var(--el-bg-color);
    color: var(--el-color-primary);
    font-weight: 600;
    box-shadow: 0 1px 6px rgba(61, 139, 132, 0.12);
  }
}

/* ── Form fields ── */
.fields {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.register-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;

  > * {
    grid-column: 1 / -1;
  }

  > .field-password {
    grid-column: 1;
  }

  > .field-confirm {
    grid-column: 2;
  }

  @media (max-width: 340px) {
    grid-template-columns: 1fr;

    > .field-password,
    > .field-confirm {
      grid-column: 1;
    }
  }
}

.auth-card.is-register {
  .card-header {
    margin-bottom: 14px;
  }

  .card-heading {
    margin-bottom: 12px;
  }

  .tab-bar {
    margin-bottom: 12px;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.01em;
  }
}

.reg-key-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.reg-key-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.reg-key-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--el-color-primary);
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.75;
    text-decoration: underline;
  }
}

/* ── Input group (email + suffix) ── */
.input-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: var(--xi-radius);
  background: var(--el-fill-color-blank);
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;

  &:focus-within {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 3px rgba(61, 139, 132, 0.08);
  }

  .input-suffix {
    border-left: 1px solid var(--el-border-color);
  }
}

.input-main {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;

  &.standalone {
    border: 1px solid var(--el-border-color);
    border-radius: var(--xi-radius);
    background: var(--el-fill-color-blank);
    transition: border-color 0.2s, box-shadow 0.2s;
    overflow: hidden;

    &:focus-within {
      border-color: var(--el-color-primary);
      box-shadow: 0 0 0 3px rgba(61, 139, 132, 0.08);
    }

    &.error {
      border-color: var(--el-color-danger);
      box-shadow: 0 0 0 3px var(--el-color-danger-light-8);
    }
  }

  input {
    flex: 1;
    height: 40px;
    padding: 0 12px 0 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
    min-width: 0;

    &::placeholder { color: var(--el-text-color-placeholder); }
  }
}

.input-icon {
  padding: 0 7px 0 11px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.input-suffix {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 10px;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
  user-select: none;
  background: transparent;
  box-shadow: none;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }

  span {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.hidden-select {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  width: 100%;
}

.toggle-pwd {
  padding: 0 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  display: flex;
  align-items: center;
  transition: color 0.15s;
  flex-shrink: 0;

  &:hover { color: var(--el-text-color-primary); }
}

/* ── Primary button ── */
.primary-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: var(--xi-radius);
  background: var(--xi-gradient);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--xi-shadow-md), 0 0 0 1px rgba(0,0,0,0.06);
  margin-top: 4px;
  letter-spacing: 0.01em;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(61, 139, 132, 0.30), 0 0 0 1px rgba(0,0,0,0.08);
    background: var(--xi-gradient-hover);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: var(--xi-shadow-sm);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* ── Divider ── */
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--el-text-color-placeholder);
  font-size: 11.5px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--el-border-color-light);
  }
}

/* ── Social button ── */
.social-providers { display: flex; flex-wrap: wrap; gap: 8px; }
.social-providers .social-btn { flex: 1 1 calc(100% / var(--provider-count) - 8px); min-width: 0; padding: 0 6px; gap: 6px; font-size: 12px; }
.social-providers .social-btn img { flex-shrink: 0; object-fit: contain; }
.social-providers .social-btn:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 3px; }
@media (max-width: 360px) {
  .social-providers { gap: 5px; }
  .social-providers .social-btn { height: 54px; flex-direction: column; gap: 4px; padding: 5px 2px; font-size: 11px; }
}
.social-btn {
  width: 100%;
  height: 36px;
  border: 1px solid var(--el-border-color);
  border-radius: 9px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

/* ── Footer ── */
.page-footer {
  margin-top: 14px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: var(--el-text-color-placeholder);
    text-decoration: none;
    transition: color 0.15s;

    &:hover { color: var(--el-text-color-secondary); }
  }
}

/* ── Utility ── */
.err-text { font-size: 12px; color: var(--el-color-danger); }
.spin { animation: spin-anim 0.7s linear infinite; }
@keyframes spin-anim { to { transform: rotate(360deg); } }

/* ── Transitions ── */
.hd-enter-active, .hd-leave-active { transition: opacity 0.2s, transform 0.2s; }
.hd-enter-from { opacity: 0; transform: translateY(6px); }
.hd-leave-to   { opacity: 0; transform: translateY(-6px); }

.form-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.form-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.form-enter-from   { opacity: 0; transform: translateX(10px); }
.form-leave-to     { opacity: 0; transform: translateX(-10px); }

/* ── Bind dialog ── */
.bind-body { display: flex; flex-direction: column; gap: 12px; }
.oauth-bind-note { font-size: 12px; line-height: 1.7; color: var(--el-text-color-secondary); margin-bottom: 4px; }

:deep(.bind-dlg) {
  .el-dialog__body { padding-top: 4px; }
  @media (max-width: 440px) { width: calc(100% - 32px) !important; }
}

:deep(.el-input-group__append) {
  padding: 0 8px;
  background: var(--el-bg-color);
}

/* ── Login page templates — each in its own file ──
   To add/modify a template: edit templates/*.scss
   To add a new template: create templates/xxx.scss
   and import it below, then add the CSS class + Vue logic.
   ── */
// stylelint-disable
/* Login page templates — edit templates/*.scss to customize */
@import './templates/minimal';
@import './templates/refined';
@import './templates/editorial';
@import './templates/window';
@import './templates/grid';
@import './templates/envelope';
@import './templates/passport';

/* Keep the registration layout compact even when a template customizes
   the generic .fields container. These rules intentionally follow imports. */
.login-page .register-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;

  > * { grid-column: 1 / -1; }
  > .field-password { grid-column: 1; }
  > .field-confirm { grid-column: 2; }
}

@media (max-width: 340px) {
  .login-page .register-fields {
    grid-template-columns: 1fr;

    > .field-password,
    > .field-confirm {
      grid-column: 1;
    }
  }
}
</style>
