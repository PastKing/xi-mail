<template>
  <div :class="accountShow && hasPerm('account:query') ? 'main-box-show' : 'main-box-hide'">
    <div :class="accountShow && hasPerm('account:query') ? 'block-show' : 'block-hide'" @click="uiStore.accountShow = false"></div>
    <account :class="accountShow && hasPerm('account:query') ? 'show' : 'hide'" />
    <router-view class="main-view" v-slot="{ Component, route }">
      <keep-alive :include="['email','all-email','send','sys-setting','star','user','role','analysis','reg-key','draft']">
        <component :is="Component" :key="route.meta.name || route.name"/>
      </keep-alive>
    </router-view>
  </div>

  <!-- 公告弹窗 -->
  <el-dialog
    v-model="noticeVisible"
    :width="noticeDialogWidth"
    class="notice-dialog"
    align-center
    destroy-on-close
    :show-close="false"
  >
    <template #header>
      <div class="notice-header">
        <div class="notice-title">{{ noticeData.title || $t('announcement') }}</div>
        <button type="button" class="notice-close" :aria-label="$t('close')" @click="noticeVisible = false">
          <Icon icon="mingcute:close-line" width="18" height="18" />
        </button>
      </div>
    </template>
    <div v-if="noticeData.content" class="notice-body" v-html="noticeData.content"></div>
    <template #footer>
      <el-button type="primary" @click="noticeVisible = false">
        {{ $t('noticeGotIt') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import account from '@/layout/account/index.vue'
import { useUiStore } from "@/store/ui.js";
import { useSettingStore } from "@/store/setting.js";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from 'vue-router'
import { hasPerm } from "@/perm/perm.js"
import { Icon } from '@iconify/vue'
import { renderNotice } from '@/utils/notice.js'

const settingStore = useSettingStore()
const uiStore = useUiStore();
const route = useRoute()
let innerWidth = window.innerWidth

const noticeVisible = ref(false)
const noticeData = ref({ title: '', content: '' })
const noticeDialogWidth = ref('520px')

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

watch(() => uiStore.changeNotice, () => {
  const settings = settingStore.settings
  showNotice({
    notice: settings.notice,
    noticeWidth: settings.noticeWidth,
    noticeTitle: settings.noticeTitle,
    noticeContent: settings.noticeContent,
  })
})

watch(() => uiStore.changePreview, () => {
  const d = uiStore.previewData
  showNotice({
    notice: d.notice,
    noticeWidth: d.noticeWidth,
    noticeTitle: d.noticeTitle,
    noticeContent: d.noticeContent,
  })
})

function showNotice(data) {
  if (data.notice === 1) return;
  const w = Number(data.noticeWidth) || 520;
  noticeDialogWidth.value = `min(${w}px, calc(100vw - 40px))`;
  noticeData.value = { title: data.noticeTitle || '', content: renderNotice(data.noticeContent) };
  noticeVisible.value = true;
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (['content','email','send'].includes(route.meta.name)) {
    if (innerWidth !== window.innerWidth) {
      innerWidth = window.innerWidth;
      uiStore.accountShow = window.innerWidth >= 767;
    }
  }
}
</script>

<style lang="scss" scoped>
.block-show {
  position: fixed;
  @media (max-width: 767px) {
    position: absolute;
    right: 0;
    border: 0;
    height: 100%;
    width: 100%;
    background: #000000;
    opacity: 0.5;
    z-index: 10;
    transition: opacity 0.25s;
  }
}

.block-hide {
  position: fixed;
  pointer-events: none;
  transition: all 0.25s;
}

.show {
  transition: all 0.15s ease;
  @media (max-width: 767px) {
    position: fixed;
    z-index: 100;
    width: 260px;
  }
}

.hide {
  transition: all 0.15s ease;
  position: fixed;
  transform: translateX(-100%);
  opacity: 0;
  @media (max-width: 1024px) {
    width: 260px;
    z-index: 100;
  }
}

.main-box-show {
  display: grid;
  grid-template-columns: 260px 1fr;
  flex: 1;
  overflow: hidden;
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
}

.main-box-hide {
  display: grid;
  grid-template-columns: 1fr;
  flex: 1;
  overflow: hidden;
}

.main-view {
  background: var(--el-bg-color);
  overflow: auto;
}
</style>

<style>
.notice-dialog.el-dialog {
  border-radius: 12px !important;
  padding: 0 !important;
}

.notice-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}

.notice-dialog .el-dialog__body {
  padding: 16px 20px !important;
}

.notice-dialog .el-dialog__footer {
  padding: 0 20px 16px !important;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px 14px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notice-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.5;
  word-break: break-word;
}

.notice-close {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.notice-close:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.notice-dialog .notice-body {
  max-height: 60vh;
  overflow-y: auto;
  line-height: 1.75;
  font-size: 14px;
  word-break: break-word;
  color: var(--el-text-color-regular);
}

.notice-body > :first-child { margin-top: 0; }
.notice-body > :last-child { margin-bottom: 0; }
.notice-body p { margin: 0 0 0.6em; }
.notice-body h1,
.notice-body h2,
.notice-body h3,
.notice-body h4 {
  margin: 1em 0 0.4em;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.notice-body a { color: var(--el-color-primary); }
.notice-body ul,
.notice-body ol { margin: 0 0 0.6em; padding-left: 1.4em; }
.notice-body img {
  max-width: 100%;
  height: auto;
}
.notice-body blockquote {
  margin: 0 0 0.6em;
  padding-left: 12px;
  border-left: 3px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
}
.notice-body hr {
  border: 0;
  border-top: 1px solid var(--el-border-color-lighter);
  margin: 1em 0;
}
</style>
