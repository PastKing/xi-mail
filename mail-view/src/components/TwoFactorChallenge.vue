<template>
  <el-dialog :model-value="!!challenge" :title="$t('twoFactorTitle')" append-to-body width="min(380px, calc(100vw - 32px))" :close-on-click-modal="false" :before-close="beforeClose">
    <form class="two-factor-challenge" @submit.prevent="verify">
      <p>{{ $t('twoFactorLoginHint') }}</p>
      <el-input ref="input" v-model="code" :aria-label="$t('twoFactorCode')" :placeholder="$t('twoFactorCode')" autocomplete="one-time-code" maxlength="24" :disabled="busy" />
      <el-button type="primary" native-type="submit" :loading="busy">{{ $t('confirm') }}</el-button>
    </form>
  </el-dialog>
</template>
<script setup>
import { ref, watch, nextTick } from 'vue';
import http from '@/axios/index.js';
const props = defineProps({ challenge: { type: String, default: '' } });
const emit = defineEmits(['verified', 'cancel']);
const code = ref(''), busy = ref(false), input = ref();
watch(() => props.challenge, async () => { code.value = ''; await nextTick(); input.value?.focus(); });
async function verify() {
  if (busy.value || !code.value.trim()) return;
  busy.value = true;
  const currentChallenge = props.challenge;
  try {
    const data = await http.post('/login/two-factor', { challenge: props.challenge, code: code.value.trim() });
    if (props.challenge === currentChallenge) emit('verified', data.token);
  } catch { /* The request interceptor displays validation errors. */ }
  finally { busy.value = false; }
}
function beforeClose(done) { if (!busy.value) { emit('cancel'); done(); } }
</script>
<style scoped>
.two-factor-challenge { display:grid; gap:16px; }
p { margin:0; color:var(--el-text-color-secondary); line-height:1.6; }
</style>
