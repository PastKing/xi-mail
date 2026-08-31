<template>
  <div class="island-nav-shell">
    <nav class="island-rail" :aria-label="$t('islandNavigation')">
      <button class="island-logo" :aria-label="settingStore.settings.title" @click="goHome">
        <Icon icon="mingcute:mail-send-fill" width="20" height="20" />
      </button>

      <div class="island-primary">
        <el-tooltip
          v-for="item in primaryNav"
          :key="item.name"
          :content="$t(item.label)"
          placement="right"
          :show-after="180"
          :disabled="isMobile"
        >
          <button
            class="island-item"
            :class="{ active: isActive(item) }"
            :aria-label="$t(item.label)"
            @click="navigate(item)"
          >
            <Icon :icon="item.icon" width="19" height="19" />
            <span class="mobile-label">{{ $t(item.label) }}</span>
            <span v-if="item.badge === 'transfer' && transferStore.pendingCount > 0" class="island-dot"></span>
          </button>
        </el-tooltip>
      </div>

      <button
        class="island-item island-more"
        :class="{ active: launcherOpen || launcherHasActiveRoute }"
        :aria-label="$t('moreNavigation')"
        @click="launcherOpen = !launcherOpen"
      >
        <Icon icon="mingcute:grid-2-line" width="19" height="19" />
        <span class="mobile-label">{{ $t('moreNavigation') }}</span>
        <span v-if="moreHasTransferBadge" class="island-dot"></span>
      </button>
    </nav>

    <Transition name="launcher">
      <div v-if="launcherOpen" class="launcher-backdrop" @click="launcherOpen = false">
        <section class="island-launcher" role="dialog" aria-modal="true" @click.stop>
          <header class="launcher-head">
            <h2>{{ $t('islandNavigation') }}</h2>
            <button :aria-label="$t('close')" @click="launcherOpen = false">
              <Icon icon="mingcute:close-line" width="19" height="19" />
            </button>
          </header>

          <div class="launcher-section">
            <span class="launcher-title">{{ $t('mailServices') }}</span>
            <div class="launcher-grid">
              <button
                v-for="item in visibleMainNav"
                :key="item.name"
                :class="{ active: isActive(item) }"
                @click="navigate(item)"
              >
                <span class="launcher-icon">
                  <Icon :icon="item.icon" width="19" height="19" />
                  <el-badge
                    v-if="item.badge === 'transfer' && transferStore.pendingCount > 0"
                    :value="transferStore.pendingCount"
                    class="launcher-badge"
                  />
                </span>
                <span>{{ $t(item.label) }}</span>
              </button>
            </div>
          </div>

          <div v-if="visibleAdminNav.length" class="launcher-section">
            <span class="launcher-title">{{ $t('manage') }}</span>
            <div class="launcher-grid admin-grid">
              <button
                v-for="item in visibleAdminNav"
                :key="item.name"
                :class="{ active: isActive(item) }"
                @click="navigate(item)"
              >
                <span class="launcher-icon"><Icon :icon="item.icon" width="19" height="19" /></span>
                <span>{{ $t(item.label) }}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {Icon} from '@iconify/vue'
import router from '@/router/index.js'
import {useSettingStore} from '@/store/setting.js'
import {useNavigationAccess} from '@/layout/nav-config.js'

const route = useRoute()
const settingStore = useSettingStore()
const launcherOpen = ref(false)
const isMobile = ref(false)
let mobileMediaQuery
const {transferStore, visibleMainNav, visibleAdminNav} = useNavigationAccess()

const primaryNav = computed(() => visibleMainNav.value.filter(item => item.primary))
const launcherNames = computed(() => [
  ...visibleMainNav.value.filter(item => !primaryNav.value.some(primary => primary.name === item.name)),
  ...visibleAdminNav.value,
].map(item => item.name))
const launcherHasActiveRoute = computed(() => launcherNames.value.includes(route.meta.name))
const moreHasTransferBadge = computed(() => launcherNames.value.includes('transfer') && transferStore.pendingCount > 0)

function isActive(item) {
  return route.meta.name === item.name
}

function navigate(item) {
  launcherOpen.value = false
  if (!isActive(item)) router.push({name: item.name})
}

function goHome() {
  const inbox = visibleMainNav.value.find(item => item.name === 'email')
  if (inbox) navigate(inbox)
}

function handleEscape(event) {
  if (event.key === 'Escape') launcherOpen.value = false
}

function syncMobileState(event) {
  isMobile.value = event.matches
}

watch(() => route.fullPath, () => {
  launcherOpen.value = false
})

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  mobileMediaQuery = window.matchMedia('(max-width: 720px)')
  isMobile.value = mobileMediaQuery.matches
  mobileMediaQuery.addEventListener('change', syncMobileState)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  mobileMediaQuery?.removeEventListener('change', syncMobileState)
})
</script>

<style scoped lang="scss">
.island-nav-shell {
  width: 72px;
  height: 100%;
  flex: 0 0 72px;
  position: relative;
  z-index: 105;
}

.island-rail {
  position: absolute;
  z-index: 310;
  inset: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  box-shadow: 0 2px 8px rgba(18,24,32,.06);
}

.island-logo,
.island-item {
  appearance: none;
  border: 0;
  cursor: pointer;
}

.island-logo {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  margin-bottom: 10px;
  color: var(--el-color-primary);
  border-radius: 8px;
  background: transparent;
  transition: transform .2s ease;

  &::after {
    content: '';
    position: absolute;
    top: 56px;
    left: 14px;
    right: 14px;
    height: 1px;
    background: var(--el-border-color-lighter);
  }
}

.island-primary {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.island-item {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  border-radius: 8px;
  background: transparent;
  transition: color .18s ease, background .18s ease, transform .18s ease;

  &.active {
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);

    &::after {
      content: '';
      position: absolute;
      left: -7px;
      width: 2px;
      height: 18px;
      border-radius: 0 2px 2px 0;
      background: var(--el-color-primary);
    }
  }
}

@media (hover: hover) and (pointer: fine) {
  .island-logo:hover { background: var(--el-fill-color-light); }

  .island-item:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }

  .island-item.active:hover {
    color: var(--el-color-primary);
  }
}

.island-more {
  flex-shrink: 0;
}

.island-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border: 2px solid var(--el-bg-color);
  border-radius: 50%;
  background: var(--el-color-danger);
}

.mobile-label { display: none; }

.launcher-backdrop {
  position: fixed;
  z-index: 300;
  inset: 0;
  background: rgba(12,15,18,.18);
}

.island-launcher {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 72px;
  width: min(320px, calc(100vw - 88px));
  overflow: auto;
  padding: 18px 14px;
  color: var(--el-text-color-primary);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-bg-color);
  box-shadow: 0 10px 30px rgba(0,0,0,.14);
}

.launcher-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 0;
    font-size: 16px;
    line-height: 32px;
    letter-spacing: 0;
  }

  button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    color: var(--el-text-color-secondary);
    border: 0;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;

    &:hover { background: var(--el-fill-color-light); }
  }
}

.launcher-title {
  font-size: 11px;
  font-weight: 600;
}

.launcher-section { margin-top: 18px; }
.launcher-title {
  display: block;
  margin: 0 0 6px 8px;
  color: var(--el-text-color-placeholder);
}

.launcher-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;

  > button {
    min-width: 0;
    height: 44px;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 0 8px;
    color: var(--el-text-color-regular);
    border: 0;
    border-radius: 7px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: color .16s ease, background .16s ease;

    &:hover {
      color: var(--el-text-color-primary);
      background: var(--el-fill-color-light);
    }

    &.active {
      color: var(--el-color-primary);
      background: var(--el-fill-color-light);
    }

    > span:nth-child(2) {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
      font-weight: 500;
    }
  }
}

.launcher-icon {
  position: relative;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: currentColor;
}

.launcher-badge {
  position: absolute;
  top: -7px;
  right: -9px;
}

.launcher-enter-active,
.launcher-leave-active { transition: opacity .2s ease; }
.launcher-enter-active .island-launcher,
.launcher-leave-active .island-launcher { transition: transform .24s ease, opacity .2s ease; }
.launcher-enter-from,
.launcher-leave-to { opacity: 0; }
.launcher-enter-from .island-launcher,
.launcher-leave-to .island-launcher { transform: translateX(-10px); opacity: 0; }

@media (max-width: 720px) {
  .island-nav-shell {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    height: 0;
    flex: 0 0 0;
  }

  .island-rail {
    position: fixed;
    inset: auto 0 0;
    height: calc(58px + env(safe-area-inset-bottom));
    flex-direction: row;
    justify-content: center;
    gap: 0;
    padding: 4px 8px env(safe-area-inset-bottom);
    border-color: var(--el-border-color-lighter);
    border-width: 1px 0 0;
    border-radius: 0;
    background: var(--el-bg-color);
    box-shadow: 0 -4px 14px rgba(0,0,0,.05);
  }

  .island-logo { display: none; }

  .island-primary {
    flex: 1;
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }

  .island-item {
    width: min(15vw, 58px);
    height: 50px;
    flex-direction: column;
    gap: 3px;
    color: var(--el-text-color-secondary);
    border-radius: 10px;

    &.active {
      color: var(--el-color-primary);
      background: transparent;

      &::after {
        top: -4px;
        right: auto;
        left: 50%;
        width: 22px;
        height: 2px;
        transform: translateX(-50%);
        border-radius: 2px;
      }
    }

    &:hover {
      color: var(--el-text-color-secondary);
      background: transparent;
      transform: none;
    }

    &.active:hover {
      color: var(--el-color-primary);
      background: transparent;
    }
  }

  .island-more {
    flex-shrink: 1;
    border: 0;
  }

  .mobile-label {
    display: block;
    max-width: 60px;
    overflow: hidden;
    color: inherit;
    font-size: 10px;
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .island-dot { top: 5px; right: 10px; }

  .island-launcher {
    top: auto;
    right: 0;
    bottom: calc(58px + env(safe-area-inset-bottom));
    left: 0;
    width: auto;
    max-height: min(68vh, 620px);
    padding: 16px 12px 18px;
    border-width: 1px 0 0;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -8px 24px rgba(0,0,0,.12);
  }

  .launcher-enter-from .island-launcher,
  .launcher-leave-to .island-launcher {
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-logo,
  .island-item,
  .launcher-grid > button,
  .launcher-enter-active,
  .launcher-leave-active,
  .island-launcher { transition: none !important; }
}
</style>
