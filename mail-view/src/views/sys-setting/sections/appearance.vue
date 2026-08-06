<template>
  <div class="sys-setting-section">
    <div class="settings-card appearance-card">
      <div class="card-title">{{ $t('appearance') }}</div>
      <div class="card-content">
        <!-- Color themes -->
        <div class="setting-item appearance-block">
          <div><span>{{ $t('colorTheme') }}</span></div>
          <div class="theme-swatches">
            <button
              v-for="theme in colorThemes"
              :key="theme.id"
              :class="['swatch', { active: setting.colorTheme === theme.id }]"
              :style="{ background: theme.color }"
              :title="theme.label"
              @click="applyColorTheme(theme.id)"
            >
              <Icon v-if="setting.colorTheme === theme.id" icon="mingcute:check-fill" width="14" height="14" color="#fff" />
            </button>
          </div>
        </div>

        <!-- Layout mode -->
        <div class="setting-item appearance-block">
          <div><span>{{ $t('layoutMode') }}</span></div>
          <div class="layout-options">
            <button
              v-for="mode in layoutModes"
              :key="mode.id"
              :class="['layout-opt', { active: setting.layoutMode === mode.id }]"
              @click="applyLayoutMode(mode.id)"
            >
              <div v-if="mode.id === 'default'" class="layout-preview lp-default">
                <div class="lp-sidebar">
                  <div class="lp-sb-item lp-sb-full"></div>
                  <div class="lp-sb-item lp-sb-full"></div>
                  <div class="lp-sb-item lp-sb-full"></div>
                </div>
                <div class="lp-content">
                  <div class="lp-top-bar"></div>
                  <div class="lp-body"></div>
                </div>
              </div>
              <div v-else-if="mode.id === 'compact'" class="layout-preview lp-compact">
                <div class="lp-sidebar lp-sidebar-sm">
                  <div class="lp-sb-item lp-sb-dot"></div>
                  <div class="lp-sb-item lp-sb-dot"></div>
                  <div class="lp-sb-item lp-sb-dot"></div>
                </div>
                <div class="lp-content">
                  <div class="lp-top-bar"></div>
                  <div class="lp-body"></div>
                </div>
              </div>
              <div v-else class="layout-preview lp-top">
                <div class="lp-full-col">
                  <div class="lp-hbar">
                    <div class="lp-h-dot"></div>
                    <div class="lp-h-dot"></div>
                    <div class="lp-h-dot"></div>
                    <div class="lp-h-dot"></div>
                  </div>
                  <div class="lp-top-bar"></div>
                  <div class="lp-body"></div>
                </div>
              </div>
              <span class="tpl-label">{{ mode.label }}</span>
            </button>
          </div>
        </div>

        <!-- Login templates -->
        <div class="setting-item appearance-block">
          <div><span>{{ $t('loginTemplate') }}</span></div>
          <div class="template-previews">
            <button
              v-for="tpl in loginTemplates"
              :key="tpl.id"
              :class="['tpl-card', { active: setting.loginTemplate === tpl.id }]"
              @click="applyLoginTemplate(tpl.id)"
            >
              <div v-if="tpl.id === 'gradient'" class="tpl-preview tpl-gradient">
                <div class="tpl-card-inner"></div>
              </div>
              <div v-else-if="tpl.id === 'minimal'" class="tpl-preview tpl-minimal">
                <div class="tpl-card-inner tpl-minimal-card"></div>
              </div>
              <div v-else-if="tpl.id === 'split'" class="tpl-preview tpl-split">
                <div class="tpl-split-left"></div>
                <div class="tpl-split-right">
                  <div class="tpl-card-inner tpl-split-card"></div>
                </div>
              </div>
              <div v-else-if="tpl.id === 'glassmorphism'" class="tpl-preview tpl-glassmorphism">
                <div class="tpl-glass-orb tpl-glass-orb-1"></div>
                <div class="tpl-glass-orb tpl-glass-orb-2"></div>
                <div class="tpl-glass-card"></div>
              </div>
              <div v-else-if="tpl.id === 'aurora'" class="tpl-preview tpl-aurora">
                <div class="tpl-aurora-left">
                  <div class="tpl-aurora-card"></div>
                </div>
                <div class="tpl-aurora-right">
                  <div class="tpl-aurora-wave"></div>
                </div>
              </div>
              <div v-else-if="tpl.id === 'geometric'" class="tpl-preview tpl-geometric">
                <div class="tpl-geo-shapes">
                  <div class="tpl-geo-circle"></div>
                  <div class="tpl-geo-square"></div>
                  <div class="tpl-geo-triangle"></div>
                </div>
                <div class="tpl-geo-card"></div>
              </div>
              <span class="tpl-label">{{ tpl.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, defineOptions} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-appearance'
})

const {t} = useI18n()
const {setting, editSetting} = useSysSetting()

const colorThemes = [
  { id: 'indigo',  color: '#6366f1', label: 'Indigo'  },
  { id: 'rose',    color: '#f43f5e', label: 'Rose'    },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'amber',   color: '#f59e0b', label: 'Amber'   },
  { id: 'sky',     color: '#0ea5e9', label: 'Sky'     },
  { id: 'purple',  color: '#a855f7', label: 'Purple'  },
]

const layoutModes = computed(() => [
  { id: 'default', label: t('layoutDefault') },
  { id: 'compact', label: t('layoutCompact') },
  { id: 'top',     label: t('layoutTop') },
])

const loginTemplates = computed(() => [
  { id: 'gradient',      label: t('templateGradient')      },
  { id: 'minimal',       label: t('templateMinimal')       },
  { id: 'split',         label: t('templateSplit')         },
  { id: 'glassmorphism', label: t('templateGlassmorphism') },
  { id: 'aurora',        label: t('templateAurora')        },
  { id: 'geometric',     label: t('templateGeometric')     },
])

function applyColorTheme(id) {
  setting.value.colorTheme = id
  document.documentElement.dataset.colorTheme = id
  editSetting({colorTheme: id})
}

function applyLayoutMode(id) {
  setting.value.layoutMode = id
  editSetting({layoutMode: id})
}

function applyLoginTemplate(id) {
  setting.value.loginTemplate = id
  editSetting({loginTemplate: id})
}
</script>

<style scoped lang="scss">
.appearance-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: none;
  }

  > div:first-child {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  > div:last-child {
    justify-content: flex-start;
    width: 100%;
    flex-shrink: 1;
  }
}

.theme-swatches {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  outline: none;

  &:hover { transform: scale(1.1); }

  &.active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 4px var(--el-color-primary);
  }
}

.template-previews {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
}

.tpl-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  flex-shrink: 0;

  .tpl-preview {
    width: 100px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid var(--el-border-color-lighter);
    transition: all 0.2s ease;
    position: relative;
  }

  &.active .tpl-preview {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
  }

  &:hover .tpl-preview {
    border-color: var(--el-color-primary-light-5);
    transform: translateY(-2px);
  }
}

.tpl-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

/* gradient preview - aurora style */
.tpl-gradient {
  background: #05050d;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 200%; height: 150%;
    top: -80%; right: -80%;
    background: radial-gradient(circle at 40% 40%,
      var(--xi-orb-1, rgba(99,102,241,0.55)) 0%, transparent 60%
    );
    filter: blur(20px);
  }

  &::after {
    content: '';
    position: absolute;
    width: 160%; height: 140%;
    bottom: -80%; left: -60%;
    background: radial-gradient(circle at 60% 60%,
      var(--xi-orb-2, rgba(139,92,246,0.48)) 0%, transparent 60%
    );
    filter: blur(18px);
  }

  .tpl-card-inner {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 48px; height: 34px;
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(6px);
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.12);
    z-index: 1;
  }
}

/* layout mode selector */
.layout-options {
  display: flex;
  gap: 16px;

  @media (max-width: 480px) {
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
}

.layout-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  flex-shrink: 0;

  .layout-preview {
    width: 100px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid var(--el-border-color-lighter);
    transition: all 0.2s ease;
    display: flex;
    background: var(--el-fill-color-light);
  }

  &.active .layout-preview {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
  }

  &:hover .layout-preview {
    border-color: var(--el-color-primary-light-5);
    transform: translateY(-2px);
  }
}

.lp-sidebar {
  width: 28px;
  background: #1a1a22;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 5px;
}

.lp-sidebar-sm {
  width: 14px;
  align-items: center;
  padding: 8px 3px;
}

.lp-sb-item { border-radius: 2px; background: #3f3f52; }
.lp-sb-full { height: 5px; width: 100%; }
.lp-sb-dot  { height: 5px; width: 5px; border-radius: 50%; }

.lp-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 5px;
  gap: 4px;
}

.lp-top-bar {
  height: 6px;
  background: var(--el-border-color-lighter);
  border-radius: 2px;
}

.lp-body {
  flex: 1;
  background: var(--el-fill-color-extra-light);
  border-radius: 2px;
}

.lp-top { flex-direction: column; }

.lp-full-col {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 5px;
  gap: 4px;
}

.lp-hbar {
  height: 8px;
  background: #1a1a22;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  flex-shrink: 0;
}

.lp-h-dot {
  width: 10px;
  height: 3px;
  background: #3f3f52;
  border-radius: 1px;
}

/* minimal preview */
.tpl-minimal {
  background: #f4f5f7;

  .tpl-minimal-card {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 48px; height: 34px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
}

/* split preview */
.tpl-split {
  background: var(--el-bg-color);
  display: flex;

  .tpl-split-left {
    width: 36px;
    background: var(--xi-gradient);
    flex-shrink: 0;
  }

  .tpl-split-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-bg-color);
  }

  .tpl-split-card {
    width: 32px; height: 26px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 3px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
}

/* glassmorphism preview */
.tpl-glassmorphism {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;

  .tpl-glass-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(8px);
    opacity: 0.6;
  }

  .tpl-glass-orb-1 {
    width: 35px; height: 35px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    top: -10px; right: -5px;
  }

  .tpl-glass-orb-2 {
    width: 25px; height: 25px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    bottom: -8px; left: -5px;
  }

  .tpl-glass-card {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 44px; height: 32px;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(4px);
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.2);
    z-index: 1;
  }
}

/* aurora preview */
.tpl-aurora {
  background: #0a0a12;
  position: relative;
  overflow: hidden;
  display: flex;

  .tpl-aurora-left {
    width: 45%;
    background: #0d0d16;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tpl-aurora-card {
    width: 28px; height: 24px;
    background: rgba(255,255,255,0.05);
    border-radius: 3px;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .tpl-aurora-right {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .tpl-aurora-wave {
    position: absolute;
    width: 200%; height: 100%;
    top: 0; left: -50%;
    background: linear-gradient(180deg,
      transparent 0%,
      rgba(0,255,136,0.1) 30%,
      rgba(138,43,226,0.08) 60%,
      transparent 100%
    );
    filter: blur(8px);
  }
}

/* geometric preview */
.tpl-geometric {
  background: #faf9f7;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;

  .tpl-geo-shapes {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 60%;
  }

  .tpl-geo-circle {
    position: absolute;
    width: 30px; height: 30px;
    background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
    border-radius: 50%;
    top: -8px; left: -8px;
  }

  .tpl-geo-square {
    position: absolute;
    width: 20px; height: 20px;
    background: linear-gradient(135deg, #5f27cd 0%, #a55eea 100%);
    border-radius: 4px;
    bottom: 8px; left: 12px;
    transform: rotate(15deg);
  }

  .tpl-geo-triangle {
    position: absolute;
    width: 0; height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 18px solid #00d2d3;
    left: 35%; top: 30%;
  }

  .tpl-geo-card {
    position: relative;
    width: 38px; height: 28px;
    background: #fff;
    border-radius: 4px;
    border: 2px solid #1a1a1a;
    box-shadow: 3px 3px 0 #1a1a1a;
    z-index: 1;
  }
}
</style>
