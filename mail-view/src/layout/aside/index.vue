<template>
  <div class="aside-root">
    <div class="aside-header">
      <div class="logo-mark">
        <Icon icon="mingcute:mail-send-fill" width="18" height="18" />
      </div>
      <div class="logo-text">{{ settingStore.settings.title }}</div>
    </div>

    <el-scrollbar class="aside-scroll">
      <nav class="nav-section">
        <template v-for="item in mainNav" :key="item.name">
        <div
          v-if="item.sendOnly ? canSend : (!item.perm || hasPerm(item.perm))"
          class="nav-item"
          :class="{ active: route.meta.name === item.name }"
          @click="router.push({ name: item.name })"
        >
          <div class="nav-icon-wrap">
            <Icon :icon="item.icon" :width="item.size || 18" :height="item.size || 18" />
            <el-badge
              v-if="item.name === 'transfer' && transferStore.pendingCount > 0"
              :value="transferStore.pendingCount"
              class="nav-badge"
            />
          </div>
          <span class="nav-label">{{ $t(item.label) }}</span>
        </div>
        </template>
      </nav>

      <div class="nav-divider" v-perm="['all-email:query','user:query','role:query','setting:query','analysis:query','reg-key:query']">
        <span class="divider-text">{{ $t('manage') }}</span>
      </div>

      <nav class="nav-section">
        <div
          v-for="item in adminNav"
          :key="item.name"
          class="nav-item"
          :class="{ active: route.meta.name === item.name }"
          @click="router.push({ name: item.name })"
          v-perm="item.perm"
        >
          <div class="nav-icon-wrap">
            <Icon :icon="item.icon" :width="item.size || 18" :height="item.size || 18" />
          </div>
          <span class="nav-label">{{ $t(item.label) }}</span>
        </div>
      </nav>
    </el-scrollbar>
  </div>
</template>

<script setup>
import router from "@/router/index.js";
import { useRoute } from "vue-router";
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { useSettingStore } from "@/store/setting.js";
import { useUserStore } from "@/store/user.js";
import { useTransferStore } from "@/store/transfer.js";
import { transferPendingList } from "@/request/account-transfer.js";
import { hasPerm } from "@/perm/perm.js";

const settingStore = useSettingStore();
const userStore = useUserStore();
const transferStore = useTransferStore();
const route = useRoute();

// Send/draft items are hidden if: global send is disabled, role is banned, or no email:send permission
const canSend = computed(() => {
  if (settingStore.settings.send === 1) return false;
  const role = userStore.user?.role;
  if (role?.sendType === 'ban') return false;
  return hasPerm('email:send');
});

const mainNav = [
  { name: 'email', icon: 'mingcute:inbox-line', label: 'inbox' },
  { name: 'send', icon: 'mingcute:send-line', label: 'sent', sendOnly: true },
  { name: 'draft', icon: 'mingcute:file-line', label: 'drafts', sendOnly: true },
  { name: 'star', icon: 'mingcute:star-line', label: 'starred' },
  { name: 'setting', icon: 'mingcute:settings-3-line', label: 'settings' },
  { name: 'transfer', icon: 'mingcute:transfer-3-line', label: 'transferPending' },
];

const adminNav = [
  { name: 'analysis', icon: 'mingcute:chart-pie-2-line', label: 'analytics', perm: 'analysis:query' },
  { name: 'user', icon: 'mingcute:group-line', label: 'allUsers', perm: 'user:query' },
  { name: 'all-email', icon: 'mingcute:mail-open-line', label: 'allMail', perm: 'all-email:query' },
  { name: 'role', icon: 'mingcute:shield-line', label: 'permissions', perm: 'role:query' },
  { name: 'reg-key', icon: 'mingcute:key-2-line', label: 'inviteCode', perm: 'reg-key:query' },
  { name: 'sys-setting', icon: 'mingcute:settings-6-line', label: 'SystemSettings', perm: 'setting:query' },
];

transferPendingList().then(list => {
  transferStore.pendingCount = list.length;
}).catch(() => {});
</script>

<style lang="scss" scoped>
.aside-root {
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--aside-backgound);
  user-select: none;
}

.aside-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px 16px;
  flex-shrink: 0;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--xi-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #f4f4f5;
  letter-spacing: -0.01em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.aside-scroll {
  flex: 1;
  overflow: hidden;

  :deep(.el-scrollbar__wrap--hidden-default) {
    background: var(--aside-backgound) !important;
  }
}

.nav-section {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--xi-radius-sm);
  color: #a1a1aa;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13.5px;
  font-weight: 450;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #e4e4e7;
  }

  &.active {
    background: rgba(99, 102, 241, 0.12);
    color: #c7d2fe;
    font-weight: 550;

    .nav-icon-wrap {
      color: #a5b4fc;
    }
  }
}

.nav-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  position: absolute;
  top: -5px;
  right: -7px;

  :deep(.el-badge__content) {
    font-size: 10px;
    height: 15px;
    line-height: 15px;
    padding: 0 4px;
    min-width: 15px;
    border: none;
  }
}

.nav-divider {
  padding: 16px 18px 6px;
}

.divider-text {
  font-size: 11px;
  font-weight: 600;
  color: #52525b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
