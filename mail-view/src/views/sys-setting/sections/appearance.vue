<template>
  <div class="sys-setting-section">
    <div class="settings-card appearance-card">
      <div class="card-title">{{ $t('appearance') }}</div>
      <div class="card-content">
        <!-- Color themes -->
        <div class="appearance-block">
          <div><span>{{ $t('colorTheme') }}</span></div>
          <div class="theme-swatches">
            <button
              v-for="theme in colorThemes"
              :key="theme.id"
              :class="['swatch', { active: setting.colorTheme === theme.id }]"
              :style="{ background: theme.background }"
              :title="theme.label"
              :aria-label="theme.label"
              type="button"
              :aria-pressed="setting.colorTheme === theme.id"
              @click="applyColorTheme(theme.id)"
            >
              <Icon v-if="setting.colorTheme === theme.id" icon="mingcute:check-fill" width="14" height="14" color="#fff" />
            </button>
          </div>
        </div>

        <!-- Layout mode -->
        <div class="appearance-block">
          <div><span>{{ $t('layoutMode') }}</span></div>
          <div class="layout-options">
            <button
              v-for="mode in layoutModes"
              :key="mode.id"
              :class="['layout-opt', { active: setting.layoutMode === mode.id }]"
              type="button"
              :aria-pressed="setting.layoutMode === mode.id"
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
        <div class="appearance-block">
          <div><span>{{ $t('loginTemplate') }}</span></div>
          <div class="template-previews">
            <button
              v-for="tpl in loginTemplates"
              :key="tpl.id"
              :class="['tpl-card', { active: normalizeLoginTemplate(setting.loginTemplate) === tpl.id }]"
              type="button"
              :aria-pressed="normalizeLoginTemplate(setting.loginTemplate) === tpl.id"
              @click="applyLoginTemplate(tpl.id)"
            >
              <div v-if="tpl.id === 'minimal'" class="tpl-preview tpl-minimal"><div class="tpl-card-inner tpl-minimal-card"></div></div>
              <div v-else-if="tpl.id === 'editorial'" class="tpl-preview tpl-editorial"><i></i><b></b><span></span></div>
              <div v-else-if="tpl.id === 'window'" class="tpl-preview tpl-window"><i></i><b></b></div>
              <div v-else-if="tpl.id === 'grid'" class="tpl-preview tpl-grid"><i></i><b></b><span></span></div>
              <div v-else-if="tpl.id === 'envelope'" class="tpl-preview tpl-envelope">
                <div class="tpl-envelope-flap"></div>
                <div class="tpl-envelope-label"></div>
                <div class="tpl-envelope-stamp"></div>
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
import {LOGIN_TEMPLATES, normalizeLoginTemplate} from '@/config/login-templates.js';
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

const loginTemplates = computed(() => LOGIN_TEMPLATES.map(template => ({ id: template.id, label: t(template.label) })))

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
  gap: 10px;
  min-width: 0;
  padding: 12px 0;
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
  gap: 12px;
  flex-wrap: wrap;
}

.appearance-block button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 4px;
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

/* layout mode selector */
.layout-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
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
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 3px;
  background: var(--el-bg-color);
  box-shadow: 0 1px 3px rgba(0,0,0,.05);

  i {
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: var(--el-text-color-placeholder);

    &:first-child {
      background: var(--el-color-primary);
      box-shadow: -3px 0 0 -2px var(--el-color-primary);
    }
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
  background: var(--el-fill-color-extra-light);
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
/* Thumbnails mirror the three new page compositions. */
.tpl-editorial { background: #f6f1e6; }
.tpl-editorial::before { content: ''; position: absolute; left: 8px; right: 8px; top: 10px; border-top: 3px double #29271f; }
.tpl-editorial i { position: absolute; top: 23px; left: 10px; width: 27px; height: 19px; border-block: 4px solid #29271f; }
.tpl-editorial b { position: absolute; left: 10px; bottom: 6px; width: 12px; height: 12px; border: 1px solid #8a8172; border-radius: 50%; }
.tpl-editorial span { position: absolute; top: 23px; right: 10px; width: 32px; height: 29px; background: repeating-linear-gradient(0deg, transparent 0 8px, #cfc6b5 8px 9px); }
.tpl-window { background: #111a2b; }
.tpl-window::before { content: ''; position: absolute; width: 28px; height: 28px; border-radius: 50%; left: 9px; top: 10px; background: #dddbc7; }
.tpl-window::after { content: ''; position: absolute; width: 28px; height: 28px; border-radius: 50%; left: 16px; top: 5px; background: #111a2b; }
.tpl-window i { position: absolute; z-index: 1; inset: 9px 23px; border: 1px solid #e3dfd1; border-radius: 3px; background: #f5f2e9; }
.tpl-window b { position: absolute; z-index: 2; inset: 21px 31px 16px; background: repeating-linear-gradient(0deg, transparent 0 6px, #a6a99e 6px 7px); }
.tpl-grid { background: #eeeae1; }
.tpl-grid i { position: absolute; left: 10px; top: 14px; width: 33px; height: 38px; border: 1px solid #34332c; background: #fbf9f2; }
.tpl-grid b { position: absolute; right: 10px; top: 17px; width: 20px; height: 20px; border-radius: 50%; background: #c4513a; }
.tpl-grid span { position: absolute; right: 10px; top: 39px; width: 20px; height: 14px; background: #d5aa57; }
</style>
