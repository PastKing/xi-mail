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
              :style="{ background: theme.background }"
              :title="theme.label"
              :aria-label="theme.label"
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
              <div v-else-if="mode.id === 'island'" class="layout-preview lp-island">
                <div class="lp-island-rail">
                  <i></i><i></i><i></i><i></i>
                </div>
                <div class="lp-island-workspace">
                  <div class="lp-island-header"></div>
                  <div class="lp-island-body"></div>
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
              <div v-else-if="tpl.id === 'envelope'" class="tpl-preview tpl-envelope">
                <div class="tpl-envelope-flap"></div>
                <div class="tpl-envelope-label"></div>
                <div class="tpl-envelope-stamp"></div>
              </div>
              <div v-else-if="tpl.id === 'terminal'" class="tpl-preview tpl-terminal">
                <div class="tpl-terminal-copy"></div>
                <div class="tpl-terminal-form"></div>
              </div>
              <div v-else-if="tpl.id === 'passport'" class="tpl-preview tpl-passport">
                <div class="tpl-passport-seam"></div>
                <div class="tpl-passport-emblem"></div>
                <div class="tpl-passport-lines"></div>
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
  { id: 'indigo',  background: 'linear-gradient(135deg, #6366f1, #4f46e5)', label: 'Indigo'  },
  { id: 'rose',    background: 'linear-gradient(135deg, #f43f5e, #e11d48)', label: 'Rose'    },
  { id: 'emerald', background: 'linear-gradient(135deg, #10b981, #059669)', label: 'Emerald' },
  { id: 'amber',   background: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'Amber'   },
  { id: 'sky',     background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', label: 'Sky'     },
  { id: 'purple',  background: 'linear-gradient(135deg, #a855f7, #9333ea)', label: 'Purple'  },
]

const layoutModes = computed(() => [
  { id: 'default', label: t('layoutDefault') },
  { id: 'compact', label: t('layoutCompact') },
  { id: 'top',     label: t('layoutTop') },
  { id: 'island',  label: t('layoutIsland') },
])

const loginTemplates = computed(() => [
  { id: 'gradient',      label: t('templateGradient')      },
  { id: 'minimal',       label: t('templateMinimal')       },
  { id: 'split',         label: t('templateSplit')         },
  { id: 'glassmorphism', label: t('templateGlassmorphism') },
  { id: 'aurora',        label: t('templateAurora')        },
  { id: 'geometric',     label: t('templateGeometric')     },
  { id: 'envelope',      label: t('templateEnvelope')      },
  { id: 'terminal',      label: t('templateTerminal')      },
  { id: 'passport',      label: t('templatePassport')      },
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

/* ink editorial preview */
.tpl-gradient {
  background: linear-gradient(90deg, #090d0d 0 56%, #f3f0e8 56%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 42px;
    height: 42px;
    top: -16px;
    left: -12px;
    border-radius: 50%;
    background: var(--xi-orb-1);
    filter: blur(12px);
  }

  &::after {
    content: '';
    position: absolute;
    left: 8px;
    bottom: 10px;
    width: 34px;
    height: 3px;
    border-top: 2px solid rgba(255,255,255,.75);
    border-bottom: 1px solid rgba(255,255,255,.25);
  }

  .tpl-card-inner {
    position: absolute;
    top: 13px;
    right: 7px;
    width: 34px;
    height: 39px;
    background:
      linear-gradient(#cbc7bd 1px, transparent 1px) 4px 12px / 26px 9px repeat-y;
    border: 0;
    border-radius: 0;
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

.lp-island {
  gap: 5px;
  padding: 5px;
  background: var(--el-fill-color-extra-light) !important;
}

.lp-island-rail {
  width: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px 3px;
  border-radius: 5px;
  background: #171b24;
  box-shadow: 0 2px 5px rgba(0,0,0,.16);

  i {
    width: 5px;
    height: 5px;
    border-radius: 2px;
    background: #495064;

    &:first-child { background: var(--el-color-primary); }
  }
}

.lp-island-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 5px;
  background: var(--el-bg-color);
  box-shadow: 0 2px 5px rgba(0,0,0,.06);
}

.lp-island-header {
  height: 6px;
  border-radius: 2px;
  background: var(--el-fill-color);
}

.lp-island-body {
  flex: 1;
  border-radius: 3px;
  background: var(--xi-gradient-subtle);
}

/* minimal preview */
.tpl-minimal {
  background: #f4f5f7;

  .tpl-minimal-card {
    position: absolute;
    top: 17px;
    left: 16px;
    width: 48px;
    height: 34px;
    background:
      linear-gradient(#c7cac7 3px, transparent 3px) 0 0 / 32px 12px no-repeat,
      linear-gradient(#e2e4e1 1px, transparent 1px) 0 13px / 42px 9px repeat-y;
    border: 0;
    border-radius: 0;
    box-shadow: none;
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
    width: 54px; height: 38px;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(4px);
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.2);
    z-index: 1;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 7px;
      border-top: 1px solid rgba(255,255,255,.18);
    }
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
      var(--xi-orb-1) 30%,
      var(--xi-orb-2) 60%,
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

/* physical envelope preview */
.tpl-envelope {
  background: #c7b999;

  .tpl-envelope-flap {
    position: absolute;
    inset: 0;
    clip-path: polygon(0 0, 50% 62%, 100% 0);
    background: #d9cdb2;
    border-top: 1px solid #8d8067;
  }

  .tpl-envelope-label {
    position: absolute;
    width: 52px;
    height: 28px;
    left: 22px;
    top: 25px;
    border: 1px dashed #8f8269;
    background:
      linear-gradient(#a49a85 1px, transparent 1px) 7px 8px / 37px 7px repeat-y,
      #eee8d8;
    transform: rotate(1deg);
  }

  .tpl-envelope-stamp {
    position: absolute;
    width: 13px;
    height: 16px;
    right: 8px;
    top: 8px;
    border: 2px dotted var(--el-color-primary);
    background: #eee8d8;
  }
}

/* command terminal preview */
.tpl-terminal {
  display: flex;
  background: #07100a;

  .tpl-terminal-copy {
    width: 43%;
    margin: 9px 6px;
    background: repeating-linear-gradient(0deg, #6f9d76 0 2px, transparent 2px 7px);
    opacity: .6;
  }

  .tpl-terminal-form {
    flex: 1;
    margin: 7px 6px 7px 0;
    border-top: 6px solid #b7f7c0;
    background:
      linear-gradient(#315838 1px, transparent 1px) 5px 12px / calc(100% - 10px) 9px repeat-y;
  }
}

/* postal passport preview */
.tpl-passport {
  background: #e2d6b8;
  box-shadow: inset 0 0 0 5px #263f50;

  .tpl-passport-seam {
    position: absolute;
    top: 5px;
    bottom: 5px;
    left: 43%;
    width: 5px;
    border-inline: 1px solid #a99d80;
    background: repeating-linear-gradient(0deg, transparent 0 4px, #a99d80 4px 5px);
  }

  .tpl-passport-emblem {
    position: absolute;
    width: 21px;
    height: 27px;
    left: 11px;
    top: 15px;
    border-radius: 50%;
    background: #263f50;
  }

  .tpl-passport-lines {
    position: absolute;
    top: 13px;
    right: 9px;
    width: 42px;
    height: 38px;
    background: linear-gradient(#8d8775 1px, transparent 1px) 0 0 / 100% 8px repeat-y;
  }
}
</style>
