<template>
  <nav class="hnav">
    <div class="hnav-inner">
      <!-- Logo -->
      <div class="hnav-logo">
        <div class="logo-mark">
          <Icon icon="mingcute:mail-send-fill" width="15" height="15" />
        </div>
        <span class="logo-text">{{ settingStore.settings.title }}</span>
      </div>

      <div class="hnav-divider-v" />

      <!-- Main nav items -->
      <div class="hnav-items">
        <div
          v-for="item in visibleMainNav"
          :key="item.name"
          class="hnav-item"
          :class="{ active: route.meta.name === item.name }"
          @click="router.push({ name: item.name })"
        >
          <div class="hnav-icon">
            <Icon :icon="item.icon" :width="item.size || 16" :height="item.size || 16" />
            <el-badge
              v-if="item.name === 'transfer' && transferStore.pendingCount > 0"
              :value="transferStore.pendingCount"
              class="hnav-badge"
            />
          </div>
          <span class="hnav-label">{{ $t(item.label) }}</span>
        </div>

        <!-- Admin nav -->
        <div
          v-for="item in visibleAdminNav"
          :key="'admin-' + item.name"
          class="hnav-item"
          :class="{ active: route.meta.name === item.name }"
          @click="router.push({ name: item.name })"
        >
          <div class="hnav-icon">
            <Icon :icon="item.icon" :width="item.size || 16" :height="item.size || 16" />
          </div>
          <span class="hnav-label">{{ $t(item.label) }}</span>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import router from '@/router/index.js'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useSettingStore } from '@/store/setting.js'
import { useNavigationAccess } from '@/layout/nav-config.js'

const settingStore = useSettingStore()
const route = useRoute()
const {transferStore, visibleMainNav, visibleAdminNav} = useNavigationAccess()
</script>

<style lang="scss" scoped>
.hnav {
  height: 44px;
  flex-shrink: 0;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  position: relative;
}

.hnav-inner {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.hnav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 0 10px 0 2px;
}

.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--xi-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

.logo-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.hnav-divider-v {
  width: 1px;
  height: 16px;
  background: var(--el-border-color-lighter);
  flex-shrink: 0;
  margin: 0 6px;
}

.hnav-items {
  display: flex;
  align-items: center;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.hnav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: all 0.13s ease;
  font-size: 13px;
  font-weight: 450;
  white-space: nowrap;
  flex-shrink: 0;
  position: relative;

  &:hover {
    background: var(--el-fill-color);
    color: var(--el-text-color-primary);
  }

  &.active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 550;

    .hnav-icon { color: var(--el-color-primary); }
  }
}

.hnav-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hnav-badge {
  position: absolute;
  top: -5px;
  right: -7px;

  :deep(.el-badge__content) {
    font-size: 9px;
    height: 14px;
    line-height: 14px;
    padding: 0 4px;
    min-width: 14px;
    border: none;
  }
}
</style>
