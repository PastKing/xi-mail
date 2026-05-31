<template>
  <div class="layout" :class="'lm-' + layoutMode">
    <aside
      v-if="layoutMode !== 'top'"
      class="aside"
      :class="uiStore.asideShow ? 'aside-show' : 'aside-hide'"
    >
      <Aside />
    </aside>
    <div
      v-if="layoutMode !== 'top'"
      :class="(uiStore.asideShow && isMobile) ? 'overlay-show' : 'overlay-hide'"
      @click="uiStore.asideShow = false"
    />
    <div class="main-area">
      <header class="top-bar">
        <Header />
      </header>
      <HNav v-if="layoutMode === 'top'" />
      <Main />
    </div>
  </div>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import HNav from '@/layout/hnav/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from "@/store/ui.js";
import { useSettingStore } from "@/store/setting.js";
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore();
const settingStore = useSettingStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)

const layoutMode = computed(() => settingStore.settings?.layoutMode || 'default')

const handleResize = () => {
  isMobile.value = window.innerWidth < 1025
  if (layoutMode.value !== 'top') {
    uiStore.asideShow = window.innerWidth > 1024;
  }
}

onMounted(() => {
  uiStore.writerRef = writerRef
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   Main Layout: Eastern Aesthetic / 东方美学布局
   ──────────────────────────────────────────────────────────────────────────────
   - Clean separation between sidebar and content
   - Refined border treatments
   - Smooth, elegant transitions
   ══════════════════════════════════════════════════════════════════════════════ */
.layout {
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  overflow: hidden;
  background: var(--el-bg-color);
}

.aside {
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  z-index: 101;
  border-right: 1px solid rgba(61, 139, 132, 0.08);
}

.aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  transform: translateX(-100%);
  opacity: 0;
}

.aside-show {
  transform: translateX(0);
  opacity: 1;
  box-shadow: var(--aside-right-border);

  @media (max-width: 1025px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--aside-backgound);
  }
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
  /* Subtle texture for main content area */
  background-image: var(--xi-gradient-subtle);
}

.top-bar {
  height: 56px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 0;
  background: var(--el-bg-color);
  backdrop-filter: blur(8px);
}

.overlay-show {
  position: fixed;
  inset: 0;
  background: rgba(12, 15, 18, 0.55);
  z-index: 99;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(4px);
}

.overlay-hide {
  pointer-events: none;
  opacity: 0;
}
</style>
