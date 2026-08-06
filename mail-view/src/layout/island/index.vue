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
        >
          <button
            class="island-item"
            :class="{ active: isActive(item) }"
            :aria-label="$t(item.label)"
            @click="navigate(item)"
          >
            <Icon :icon="item.icon" width="19" height="19" />
            <span class="mobile-label">{{ $t(item.label) }}</span>
          </button>
        </el-tooltip>
      </div>

      <button
        class="island-item island-more"
        :class="{ active: launcherOpen || launcherHasActiveRoute }"
        :aria-label="$t('moreNavigation')"
        @click="launcherOpen = true"
      >
        <Icon icon="mingcute:grid-2-line" width="19" height="19" />
        <span class="mobile-label">{{ $t('moreNavigation') }}</span>
        <span v-if="transferStore.pendingCount > 0" class="island-dot"></span>
      </button>
    </nav>

    <Transition name="launcher">
      <div v-if="launcherOpen" class="launcher-backdrop" @click="launcherOpen = false">
        <section class="island-launcher" role="dialog" aria-modal="true" @click.stop>
          <header class="launcher-head">
            <div>
              <span class="launcher-kicker">XI / NAVIGATION</span>
              <h2>{{ $t('islandNavigation') }}</h2>
            </div>
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
                <Icon icon="mingcute:right-small-line" width="16" height="16" class="launcher-arrow" />
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
                <Icon icon="mingcute:right-small-line" width="16" height="16" class="launcher-arrow" />
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
const {transferStore, visibleMainNav, visibleAdminNav} = useNavigationAccess()

const primaryNav = computed(() => visibleMainNav.value.filter(item => item.primary).slice(0, 4))
const launcherNames = computed(() => [
  ...visibleMainNav.value.filter(item => !primaryNav.value.some(primary => primary.name === item.name)),
  ...visibleAdminNav.value,
].map(item => item.name))
const launcherHasActiveRoute = computed(() => launcherNames.value.includes(route.meta.name))

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

watch(() => route.fullPath, () => {
  launcherOpen.value = false
})

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<style scoped lang="scss">
.island-nav-shell {
  width: 88px;
  height: 100%;
  flex: 0 0 88px;
  position: relative;
  z-index: 105;
}

.island-rail {
  position: absolute;
  inset: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(28,34,45,.98), rgba(17,21,29,.98));
  box-shadow:
    0 18px 45px rgba(10,14,20,.24),
    inset 0 1px 0 rgba(255,255,255,.07);
}

.island-logo,
.island-item {
  appearance: none;
  border: 0;
  cursor: pointer;
}

.island-logo {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  color: #fff;
  border-radius: 14px;
  background: var(--xi-gradient);
  box-shadow:
    0 9px 22px var(--xi-orb-card-border),
    inset 0 1px 0 rgba(255,255,255,.2);
  transition: transform .2s ease;

  &:hover { transform: translateY(-2px) rotate(-3deg); }
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
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(237,242,247,.55);
  border-radius: 13px;
  background: transparent;
  transition: color .18s ease, background .18s ease, transform .18s ease;

  &:hover {
    color: #fff;
    background: rgba(255,255,255,.075);
    transform: translateY(-1px);
  }

  &.active {
    color: #fff;
    background: var(--xi-gradient);
    box-shadow: 0 8px 22px var(--xi-orb-card-border);

    &::after {
      content: '';
      position: absolute;
      right: -13px;
      width: 4px;
      height: 14px;
      border-radius: 3px;
      background: var(--el-color-primary);
      box-shadow: 0 0 10px var(--xi-orb-1);
    }
  }
}

.island-more {
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,.07);
}

.island-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border: 2px solid #171c25;
  border-radius: 50%;
  background: var(--el-color-danger);
}

.mobile-label { display: none; }

.launcher-backdrop {
  position: fixed;
  z-index: 300;
  inset: 0;
  background: rgba(7,10,14,.36);
  backdrop-filter: blur(5px);
}

.island-launcher {
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 88px;
  width: min(480px, calc(100vw - 110px));
  overflow: auto;
  padding: 24px;
  color: var(--el-text-color-primary);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 22px;
  background: color-mix(in srgb, var(--el-bg-color) 94%, transparent);
  box-shadow: 0 28px 90px rgba(0,0,0,.25);
}

.launcher-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 6px 0 0;
    font-size: 24px;
    line-height: 1;
    letter-spacing: -.04em;
  }

  button {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    color: var(--el-text-color-secondary);
    border: 0;
    border-radius: 10px;
    background: var(--el-fill-color-light);
    cursor: pointer;
  }
}

.launcher-kicker,
.launcher-title {
  color: var(--el-color-primary);
  font: 650 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.launcher-section { margin-top: 22px; }
.launcher-title {
  display: block;
  margin: 0 0 10px 3px;
  color: var(--el-text-color-placeholder);
}

.launcher-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  > button {
    min-width: 0;
    height: 52px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    color: var(--el-text-color-regular);
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 12px;
    background: var(--el-fill-color-extra-light);
    cursor: pointer;
    text-align: left;
    transition: transform .16s ease, border-color .16s ease, background .16s ease;

    &:hover {
      color: var(--el-text-color-primary);
      border-color: var(--el-color-primary-light-7);
      background: var(--el-color-primary-light-9);
      transform: translateY(-1px);
    }

    &.active {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-6);
      background: var(--el-color-primary-light-9);
    }

    > span:nth-child(2) {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 12px;
      font-weight: 550;
    }
  }
}

.launcher-icon {
  position: relative;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  color: var(--el-color-primary);
  border-radius: 9px;
  background: var(--el-color-primary-light-9);
}

.launcher-arrow { color: var(--el-text-color-placeholder); }

.launcher-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

.launcher-enter-active,
.launcher-leave-active { transition: opacity .2s ease; }
.launcher-enter-active .island-launcher,
.launcher-leave-active .island-launcher { transition: transform .24s ease, opacity .2s ease; }
.launcher-enter-from,
.launcher-leave-to { opacity: 0; }
.launcher-enter-from .island-launcher,
.launcher-leave-to .island-launcher { transform: translateX(-14px) scale(.98); opacity: 0; }

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
    inset: auto 12px calc(10px + env(safe-area-inset-bottom));
    height: 64px;
    flex-direction: row;
    justify-content: center;
    gap: 2px;
    padding: 6px;
    border-radius: 20px;
    background: color-mix(in srgb, #151b24 94%, transparent);
  }

  .island-logo { display: none; }

  .island-primary {
    flex: 1;
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }

  .island-item {
    width: min(17vw, 66px);
    height: 50px;
    flex-direction: column;
    gap: 3px;
    border-radius: 14px;

    &.active::after { display: none; }
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
    font-size: 9px;
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .island-dot { top: 5px; right: 10px; }

  .island-launcher {
    top: auto;
    right: 8px;
    bottom: 8px;
    left: 8px;
    width: auto;
    max-height: min(76vh, 650px);
    padding: 20px 16px calc(22px + env(safe-area-inset-bottom));
    border-radius: 24px;
  }

  .launcher-enter-from .island-launcher,
  .launcher-leave-to .island-launcher {
    transform: translateY(20px) scale(.98);
  }
}

@media (max-width: 390px) {
  .island-rail { inset-inline: 8px; }
  .launcher-grid { grid-template-columns: 1fr; }
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
