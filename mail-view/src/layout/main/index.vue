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
        <div class="notice-header-icon">
          <Icon icon="mingcute:announcement-line" width="22" height="22" />
        </div>
        <div class="notice-header-text">
          <span class="notice-title">{{ noticeData.title || $t('announcement') }}</span>
        </div>
        <Icon class="notice-close" icon="mingcute:close-line" width="18" height="18" @click="noticeVisible = false" />
      </div>
    </template>
    <div class="notice-body" v-html="noticeData.content"></div>
    <template #footer>
      <el-button type="primary" class="notice-confirm-btn" @click="noticeVisible = false">
        {{ $t('confirm') }}
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
  noticeData.value = { title: data.noticeTitle || '', content: data.noticeContent || '' };
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
  border-radius: 16px !important;
  overflow: hidden;
  padding: 0 !important;
}

.notice-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}

.notice-dialog .el-dialog__body {
  padding: 20px 24px 8px !important;
}

.notice-dialog .el-dialog__footer {
  padding: 12px 24px 20px !important;
  text-align: center;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px 16px;
  background: linear-gradient(135deg, var(--el-color-primary-light-7) 0%, var(--el-color-primary-light-9) 100%);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notice-header-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--el-color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notice-header-text {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.notice-close {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  font-size: 16px;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
}
.notice-close:hover {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.notice-dialog .notice-body {
  max-height: 55vh;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 14px;
  word-break: break-word;
  color: var(--el-text-color-regular);
}

.notice-confirm-btn {
  min-width: 100px;
  border-radius: 8px !important;
}
</style>
