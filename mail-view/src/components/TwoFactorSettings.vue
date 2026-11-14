<template>
  <section class="two-factor-settings" :aria-busy="loading">
    <div class="two-factor-heading"><Icon icon="mingcute:shield-line" width="18"/><strong>{{ $t('twoFactorTitle') }}</strong><span class="two-factor-state" :class="{enabled: status.enabled}">{{ $t(status.enabled ? 'twoFactorEnabled' : 'twoFactorDisabled') }}</span></div>
    <p>{{ $t('twoFactorDescription') }}</p>
    <div class="two-factor-actions"><small v-if="status.enabled">{{ $t('twoFactorRecoveryRemaining', { count: status.recoveryRemaining }) }}</small><el-button :disabled="loading || failed" @click="start" :type="status.enabled ? 'default' : 'primary'" plain>{{ $t(status.enabled ? 'twoFactorTurnOff' : 'twoFactorBind') }}</el-button><el-button v-if="failed" @click="load">{{ $t('refresh') }}</el-button></div>
    <el-dialog v-model="visible" append-to-body :title="$t(status.enabled ? 'twoFactorTurnOff' : 'twoFactorBind')" width="min(420px, calc(100vw - 32px))" :close-on-click-modal="false" :before-close="beforeClose" @closed="clear">
      <form class="two-factor-form" @submit.prevent="submit">
        <template v-if="recovery.length">
          <p>{{ $t('twoFactorRecoveryHint') }}</p>
          <div class="recovery-codes"><code v-for="item in recovery" :key="item">{{ item }}</code></div>
          <el-button @click="copyRecovery">{{ $t('copy') }}</el-button>
          <el-button type="primary" @click="visible = false">{{ $t('twoFactorSaved') }}</el-button>
        </template>
        <template v-else>
          <template v-if="setup">
            <p>{{ $t('twoFactorScan') }}</p>
            <img v-if="qr" :src="qr" alt="TOTP QR" class="two-factor-qr" width="200" height="200"/>
            <div class="two-factor-manual">
              <span class="two-factor-key-label">{{ $t('twoFactorManualKey') }}</span>
              <el-tooltip :content="$t('clickToCopy')" :trigger-keys="[]" :show-after="200">
                <button type="button" class="two-factor-secret" :aria-label="$t('twoFactorCopyKey')" @click="copySecret">
                  <span class="two-factor-key-groups"><span v-for="(group, index) in secretGroups" :key="index">{{ group }}</span></span>
                  <Icon icon="mingcute:copy-2-line" width="16" height="16" aria-hidden="true"/>
                </button>
              </el-tooltip>
              <small class="two-factor-key-note">{{ $t('twoFactorKeyHint') }}</small>
            </div>
          </template>
          <el-input v-else v-model="password" type="password" show-password autocomplete="current-password" :placeholder="$t('oldPassword')" :aria-label="$t('oldPassword')" :disabled="busy"/>
          <el-input v-if="setup || status.enabled" v-model="code" autocomplete="one-time-code" :inputmode="setup ? 'numeric' : 'text'" :placeholder="$t(setup ? 'twoFactorSetupCode' : 'twoFactorCode')" :aria-label="$t(setup ? 'twoFactorSetupCode' : 'twoFactorCode')" maxlength="24" :disabled="busy"/>
          <p v-if="status.enabled">{{ $t('twoFactorDisableHint') }}</p>
          <el-button type="primary" native-type="submit" :loading="busy">{{ $t(setup || status.enabled ? 'confirm' : 'twoFactorNext') }}</el-button>
        </template>
      </form>
    </el-dialog>
  </section>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import QRCode from 'qrcode';
import http from '@/axios/index.js';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const status = ref({enabled:false,recoveryRemaining:0}), loading = ref(true), failed = ref(false), visible = ref(false), busy = ref(false);
const password = ref(''), code = ref(''), setup = ref(null), qr = ref(''), recovery = ref([]);
const secretGroups = computed(() => setup.value?.secret?.match(/.{1,4}/g) || []);
async function load() { loading.value = true; try { status.value = await http.get('/my/two-factor'); failed.value = false; } catch { failed.value = true; } finally { loading.value = false; } }
onMounted(load);
function clear() { password.value = ''; code.value = ''; setup.value = null; qr.value = ''; recovery.value = []; }
function start() { clear(); visible.value = true; }
function beforeClose(done) { if (!busy.value && !recovery.value.length) done(); }
async function submit() {
  if (busy.value || (!setup.value && !password.value) || ((setup.value || status.value.enabled) && !code.value.trim())) return;
  busy.value = true;
  try {
    if (status.value.enabled && !recovery.value.length) {
      await http.post('/my/two-factor/disable', {password:password.value,code:code.value.trim()});
      visible.value = false; await load();
    } else if (!setup.value) {
      const data = await http.post('/my/two-factor/setup', {password:password.value});
      password.value = ''; setup.value = data;
      qr.value = await QRCode.toDataURL(data.uri, {width:200,margin:2,errorCorrectionLevel:'M'});
    } else {
      const data = await http.post('/my/two-factor/confirm', {code:code.value.trim(), enrollmentId:setup.value.enrollmentId});
      recovery.value = data.recoveryCodes; setup.value = null; qr.value = ''; code.value = '';
      await load();
    }
  } catch { /* Request interceptor displays errors. */ }
  finally { busy.value = false; }
}
async function copyRecovery() {
  try { await navigator.clipboard.writeText(recovery.value.join('\n')); ElMessage.success(t('copySuccessMsg')); }
  catch { ElMessage.error(t('copyFailMsg')); }
}
async function copySecret() {
  if (!setup.value?.secret) return;
  try { await navigator.clipboard.writeText(setup.value.secret); ElMessage.success(t('copySuccessMsg')); }
  catch { ElMessage.error(t('copyFailMsg')); }
}
</script>
<style scoped>
.two-factor-settings { border:1px solid var(--el-border-color-lighter); border-radius:8px; background:var(--el-bg-color); padding:16px 20px; }
.two-factor-heading { display:flex; align-items:center; gap:8px; font-size:14px; }
.two-factor-state { margin-left:auto; color:var(--el-text-color-secondary); font-size:12px; }
.enabled { color:var(--el-color-success); }
p { margin:10px 0; color:var(--el-text-color-secondary); font-size:13px; line-height:1.6; }
.two-factor-actions { display:flex; align-items:center; justify-content:flex-end; gap:10px; }
small { color:var(--el-text-color-secondary); margin-right:auto; }
.two-factor-form { display:grid; gap:12px; }
.two-factor-form p { margin:0; }
.two-factor-qr { justify-self:center; max-width:100%; }
.two-factor-manual { display:grid; gap:7px; min-width:0; }
.two-factor-key-label { color:var(--el-text-color-secondary); font-size:12px; }
.two-factor-secret { display:flex; align-items:center; gap:12px; width:100%; padding:12px; border:1px solid var(--el-border-color-lighter); border-radius:8px; background:var(--el-fill-color-light); color:var(--el-text-color-primary); cursor:pointer; text-align:left; transition:background .15s,border-color .15s; }
.two-factor-key-groups { flex:1; min-width:0; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px 8px; font-family:ui-monospace,Consolas,monospace; font-size:13px; letter-spacing:.04em; line-height:1.4; }
.two-factor-secret > svg { flex-shrink:0; color:var(--el-text-color-secondary); }
.two-factor-secret:hover { border-color:var(--el-color-primary-light-5); background:var(--el-color-primary-light-9); }
.two-factor-secret:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:2px; }
.two-factor-key-note { margin:0; font-size:12px; line-height:1.6; }
.recovery-codes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:12px; background:var(--el-fill-color-light); border-radius:6px; font-size:12px; }
code { overflow-wrap:anywhere; }
@media(max-width:767px) { .two-factor-settings { padding:14px; } }
</style>
