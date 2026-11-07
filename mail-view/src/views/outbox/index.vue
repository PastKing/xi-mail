<template>
  <div class="outbox-page">
    <div class="outbox-tabs" role="tablist" :aria-label="$t('outbox')">
      <button
        role="tab"
        :aria-selected="!drafts"
        :class="{ active: !drafts }"
        @click="switchTab(false)"
      >
        <Icon icon="mingcute:send-line" width="17" />{{ $t('sent') }}
      </button>
      <button
        role="tab"
        :aria-selected="drafts"
        :class="{ active: drafts }"
        @click="switchTab(true)"
      >
        <Icon icon="mingcute:file-line" width="17" />{{ $t('drafts') }}
      </button>
    </div>
    <div class="outbox-content">
      <KeepAlive><component :is="drafts ? Draft : Sent" /></KeepAlive>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useRoute, useRouter } from 'vue-router';
import Sent from '@/views/send/index.vue';
import Draft from '@/views/draft/index.vue';
defineOptions({ name: 'send' });
const route = useRoute(),
  router = useRouter();
const drafts = computed(() => route.query.view === 'drafts');
function switchTab(value) {
  router.replace({ path: '/sent', query: value ? { view: 'drafts' } : {} });
}
</script>
<style scoped>
.outbox-page {
  height: 100%;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.outbox-tabs {
  display: flex;
  gap: 6px;
  padding: 12px 18px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}
.outbox-tabs button {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  color: var(--el-text-color-secondary);
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
}
.outbox-tabs button.active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
}
.outbox-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
@media (max-width: 600px) {
  .outbox-tabs {
    padding-left: 10px;
    padding-top: 6px;
  }
  .outbox-tabs button {
    padding: 10px 12px;
  }
}
</style>
