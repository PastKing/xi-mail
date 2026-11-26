<template>
  <div class="mail-detail-status">
    <span class="status-label">{{ $t('tabStatus') }}</span>
    <Icon :icon="status.icon" :style="{ color: status.color }" width="16" height="16" aria-hidden="true" />
    <span>{{ status.content }}</span>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  status: { type: Object, required: true }
})
</script>

<style scoped>
.mail-detail-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--regular-text-color);
}

.status-label {
  flex-shrink: 0;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-right: 4px;
}

.mail-detail-status svg {
  flex-shrink: 0;
}
</style>
