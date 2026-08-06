<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('serverManage') }}</div>
      <div class="card-content">
        <ServerManager />
      </div>
    </div>
  </div>
</template>

<script setup>
import {defineOptions} from "vue";
import ServerManager from "@/components/server-manager/index.vue";

defineOptions({
  name: 'sys-setting-servers'
})
</script>
