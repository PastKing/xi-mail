<template>
  <div v-if="value" class="password-requirements" :class="{ complete }">
    <div class="password-summary" role="status" aria-live="polite">
      <Icon :icon="complete ? 'mingcute:check-circle-line' : 'mingcute:shield-line'" width="14" height="14"/>
      {{ complete ? $t('passwordRequirementsMet') : $t('passwordRequirementsTitle') }}
    </div>
    <ul>
      <li v-for="rule in rules" :key="rule.key" :class="{ met: rule.met }">
        <Icon :icon="rule.met ? 'mingcute:check-line' : 'mingcute:small-circle-line'" width="12" height="12"/>
        {{ $t(rule.key) }}
      </li>
    </ul>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
const props = defineProps({ value: { type: String, default: '' } });
const rules = computed(() => [
  { key: 'passwordLengthCheck', met: props.value.length >= 8 && props.value.length <= 64 },
  { key: 'passwordUpperCheck', met: /[A-Z]/.test(props.value) },
  { key: 'passwordLowerCheck', met: /[a-z]/.test(props.value) },
  { key: 'passwordNumberCheck', met: /[0-9]/.test(props.value) },
  { key: 'passwordSymbolCheck', met: /[^A-Za-z0-9\s]/.test(props.value) },
  { key: 'passwordSpaceCheck', met: !/\s/.test(props.value) },
]);
const complete = computed(() => rules.value.every(rule => rule.met));
</script>
<style scoped>
.password-requirements { margin-top: 8px; font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary); }
.password-summary { display: flex; align-items: center; gap: 5px; }
.password-requirements ul { display: flex; flex-wrap: wrap; gap: 2px 12px; padding: 0; margin: 4px 0 0; list-style: none; }
.password-requirements li { display: inline-flex; align-items: center; gap: 3px; }
.password-requirements .met, .password-requirements.complete .password-summary { color: var(--el-color-success); }
</style>
