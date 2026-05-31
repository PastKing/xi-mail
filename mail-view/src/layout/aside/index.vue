<template>
  <div class="aside-root" :class="{ compact: isCompact }">
    <div class="aside-header">
      <div class="logo-mark">
        <Icon icon="mingcute:mail-send-fill" width="18" height="18" />
      </div>
      <div v-if="!isCompact" class="logo-text">{{ settingStore.settings.title }}</div>
    </div>

    <el-scrollbar class="aside-scroll">
      <nav class="nav-section">
        <el-tooltip
          v-for="item in mainNav"
          :key="item.name"
          :disabled="!isCompact"
          :content="$t(item.label)"
          placement="right"
          :show-after="100"
        >
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
            <span v-if="!isCompact" class="nav-label">{{ $t(item.label) }}</span>
          </div>
        </el-tooltip>
      </nav>

      <div class="nav-divider" v-perm="['all-email:query','user:query','role:query','setting:query','analysis:query','reg-key:query']">
        <span v-if="!isCompact" class="divider-text">{{ $t('manage') }}</span>
        <div v-else class="divider-line"></div>
      </div>

      <nav class="nav-section">
        <el-tooltip
          v-for="item in adminNav"
          :key="item.name"
          :disabled="!isCompact"
          :content="$t(item.label)"
          placement="right"
          :show-after="100"
        >
          <div
            class="nav-item"
            :class="{ active: route.meta.name === item.name }"
            @click="router.push({ name: item.name })"
            v-perm="item.perm"
          >
            <div class="nav-icon-wrap">
              <Icon :icon="item.icon" :width="item.size || 18" :height="item.size || 18" />
            </div>
            <span v-if="!isCompact" class="nav-label">{{ $t(item.label) }}</span>
          </div>
        </el-tooltip>
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
const isCompact = computed(() => settingStore.settings?.layoutMode === 'compact');
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
/* ══════════════════════════════════════════════════════════════════════════════
   Sidebar: Eastern Aesthetic / 东方美学侧边栏
   ──────────────────────────────────────────────────────────────────────────────
   - Subtle texture overlay for depth
   - Refined nav items with elegant hover states
   - Jade-inspired accent colors
   ══════════════════════════════════════════════════════════════════════════════ */
.aside-root {
  width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--aside-backgound);
  user-select: none;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  
  /* Subtle ink-wash texture overlay */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(ellipse 100% 100% at 50% 0%, rgba(61,139,132,0.06) 0%, transparent 70%),
      radial-gradient(ellipse 80% 60% at 0% 100%, rgba(61,139,132,0.04) 0%, transparent 50%);
    pointer-events: none;
  }

  &.compact {
    width: 60px;

    .aside-header {
      padding: 24px 0 20px;
      justify-content: center;
    }

    .nav-section { padding: 0 8px; }

    .nav-item {
      padding: 0;
      justify-content: center;
      gap: 0;
      height: 40px;
      border-radius: var(--xi-radius);
    }

    .nav-icon-wrap { width: 100%; justify-content: center; }

    .nav-divider {
      padding: 14px 10px 8px;
      display: flex;
      justify-content: center;
    }
  }
}

.divider-line {
  width: 28px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(61,139,132,0.3), transparent);
}

.aside-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.logo-mark {
  width: 36px;
  height: 36px;
  border-radius: var(--xi-radius);
  background: var(--xi-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 
    0 2px 8px rgba(61, 139, 132, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 
      0 4px 16px rgba(61, 139, 132, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #f0f2f4;
  letter-spacing: -0.02em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.aside-scroll {
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;

  :deep(.el-scrollbar__wrap--hidden-default) {
    background: transparent !important;
  }
}

.nav-section {
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--xi-radius-sm);
  color: rgba(240, 242, 244, 0.6);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13.5px;
  font-weight: 480;
  position: relative;
  letter-spacing: -0.01em;

  &:hover {
    background: rgba(61, 139, 132, 0.08);
    color: rgba(240, 242, 244, 0.9);
  }

  &.active {
    background: rgba(61, 139, 132, 0.15);
    color: #bce0dc;
    font-weight: 560;

    /* Left accent bar - jade inspired */
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: var(--xi-gradient);
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 8px rgba(61, 139, 132, 0.5);
    }

    .nav-icon-wrap {
      color: #8ac4be;
    }
  }
}

.nav-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  position: absolute;
  top: -6px;
  right: -8px;

  :deep(.el-badge__content) {
    font-size: 10px;
    height: 16px;
    line-height: 16px;
    padding: 0 5px;
    min-width: 16px;
    border: none;
    background: var(--xi-accent-vermillion);
  }
}

.nav-divider {
  padding: 20px 20px 10px;
}

.divider-text {
  font-size: 10.5px;
  font-weight: 600;
  color: rgba(240, 242, 244, 0.28);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
