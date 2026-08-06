<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('domainList') }}</div>
      <div class="card-content">
        <div class="domain-panel">
          <div class="domain-tip">
            <Icon icon="mingcute:information-line" width="15" height="15"/>
            <span>{{ $t('domainManagementDesc') }}</span>
          </div>

          <div class="domain-add-row">
            <el-input
              v-model="newDomainInput"
              :placeholder="$t('domainPlaceholder')"
              @keyup.enter="addDomain"
              style="flex:1"
            />
            <el-button type="primary" @click="addDomain">
              <Icon icon="mingcute:add-line" width="16" height="16" style="margin-right:4px"/>
              {{ $t('add') }}
            </el-button>
          </div>

          <div class="domain-stat">
            <span class="domain-order-hint">
              <Icon icon="mingcute:dot-grid-line" width="14" height="14"/>
              {{ $t('domainOrderHint') }}
            </span>
            <span class="domain-count">{{ $t('domainEnabledCount', { enabled: enabledDomainCount, total: managedDomainsData.length }) }}</span>
          </div>

          <div v-if="managedDomainsData.length === 0" class="domain-empty">{{ $t('noDomains') }}</div>
          <div v-else class="domain-list">
            <div
              v-for="(item, idx) in managedDomainsData"
              :key="item.domain"
              class="domain-row"
              :class="{
                'is-dragging': dragIndex === idx,
                'is-drop-target': dragOverIndex === idx && dragIndex !== idx,
                'is-off': !item.enabled
              }"
              draggable="true"
              @dragstart="onDragStart(idx)"
              @dragover.prevent="dragOverIndex = idx"
              @drop.prevent="onDrop(idx)"
              @dragend="onDragEnd"
            >
              <el-tooltip :content="$t('dragToSort')" placement="top" :show-after="300">
                <span class="drag-handle">
                  <Icon icon="mingcute:dot-grid-line" width="16" height="16"/>
                </span>
              </el-tooltip>
              <span class="domain-index">{{ idx + 1 }}</span>
              <span class="domain-name">{{ item.domain }}</span>
              <div class="domain-actions">
                <el-tooltip :content="$t('moveUp')" placement="top" :show-after="300">
                  <el-button size="small" text :disabled="idx === 0" @click="moveDomain(idx, -1)">
                    <Icon icon="mingcute:up-line" width="16" height="16"/>
                  </el-button>
                </el-tooltip>
                <el-tooltip :content="$t('moveDown')" placement="top" :show-after="300">
                  <el-button size="small" text :disabled="idx === managedDomainsData.length - 1" @click="moveDomain(idx, 1)">
                    <Icon icon="mingcute:down-line" width="16" height="16"/>
                  </el-button>
                </el-tooltip>
                <el-switch
                  v-model="item.enabled"
                  :active-value="true"
                  :inactive-value="false"
                  size="small"
                />
                <el-button size="small" type="danger" text @click="managedDomainsData.splice(idx, 1)">
                  <Icon icon="mingcute:delete-2-line" width="16" height="16"/>
                </el-button>
              </div>
            </div>
          </div>

          <div class="domain-save-row">
            <el-button @click="resetManagedDomains">{{ $t('reset') }}</el-button>
            <el-button type="primary" :loading="settingLoading" @click="saveDomains">{{ $t('save') }}</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="card-title">{{ $t('domainMapping') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>
            <span>{{ $t('domainMapping') }}</span>
            <el-tooltip effect="dark" :content="$t('domainMappingDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <span class="domain-count">{{ Object.keys(domainMappingData).length }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="domainMappingShow = true">
              <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="domainMappingShow" :title="$t('domainMapping')" class="sys-setting-dialog mapping-dialog">
      <div class="mapping-list">
        <div v-for="(val, key) in domainMappingData" :key="key" class="mapping-row">
          <el-tag size="small" type="info" class="mapping-source">{{ key }}</el-tag>
          <Icon icon="mingcute:arrow-right-line" width="14" height="14" style="flex-shrink: 0; color: var(--el-text-color-secondary);" />
          <el-input size="small" v-model="domainMappingData[key]" :placeholder="$t('displayDomain')" style="flex: 1;" />
          <el-button size="small" type="danger" link @click="delete domainMappingData[key]">
            <Icon icon="mingcute:delete-2-line" width="16" height="16"/>
          </el-button>
        </div>
        <div class="mapping-row">
          <el-select
              size="small"
              v-model="newMappingSource"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('sourceDomain')"
              style="flex: 1;"
          >
            <el-option
                v-for="d in systemDomains"
                :key="d"
                :label="d"
                :value="d"
                :disabled="!!domainMappingData[d]"
            />
          </el-select>
          <Icon icon="mingcute:arrow-right-line" width="14" height="14" style="flex-shrink: 0; color: var(--el-text-color-secondary);" />
          <el-input size="small" v-model="newMappingDisplay" :placeholder="$t('displayDomain')" style="flex: 1;" />
          <el-button size="small" type="primary" link @click="addDomainMapping">
            <Icon icon="mingcute:add-line" width="16" height="16"/>
          </el-button>
        </div>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveDomainMapping">{{ $t('save') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, defineOptions, reactive, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-domain'
})

const {t} = useI18n()
const {setting, settingStore, settingLoading, editSetting, onSettingsLoaded} = useSysSetting()

const managedDomainsData = ref([])
const newDomainInput = ref('')
const dragIndex = ref(null)
const dragOverIndex = ref(null)

const domainMappingShow = ref(false)
const domainMappingData = reactive({})
const newMappingSource = ref('')
const newMappingDisplay = ref('')

const enabledDomainCount = computed(() =>
  managedDomainsData.value.filter(d => d.enabled !== false).length
)

const systemDomains = computed(() =>
  (settingStore.domainList || []).map(d => d.replace(/^@/, ''))
)

function resetManagedDomains() {
  newDomainInput.value = ''
  const stored = setting.value.managedDomains
  if (stored && stored.length > 0) {
    managedDomainsData.value = stored.map(d => typeof d === 'string' ? {domain: d, enabled: true} : {...d})
  } else {
    managedDomainsData.value = (setting.value.domainList || []).map(d => ({
      domain: d.replace(/^@/, ''),
      enabled: true
    }))
  }
}

onSettingsLoaded(() => {
  resetManagedDomains()
  Object.keys(domainMappingData).forEach(key => delete domainMappingData[key])
  Object.assign(domainMappingData, setting.value.domainMapping || {})
})

function addDomain() {
  const d = newDomainInput.value.trim().replace(/^@/, '').toLowerCase()
  if (!d) return
  if (managedDomainsData.value.some(item => item.domain === d)) {
    ElMessage.warning(t('domainExists'))
    return
  }
  managedDomainsData.value.push({domain: d, enabled: true})
  newDomainInput.value = ''
}

function moveDomain(idx, offset) {
  const target = idx + offset
  const list = managedDomainsData.value
  if (target < 0 || target >= list.length) return
  ;[list[idx], list[target]] = [list[target], list[idx]]
}

function onDragStart(idx) {
  dragIndex.value = idx
}

function onDrop(idx) {
  const from = dragIndex.value
  if (from === null || from === idx) return
  const list = managedDomainsData.value
  const [moved] = list.splice(from, 1)
  list.splice(idx, 0, moved)
  onDragEnd()
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

function saveDomains() {
  editSetting({managedDomains: managedDomainsData.value.filter(d => d.domain)})
}

function addDomainMapping() {
  if (newMappingSource.value && newMappingDisplay.value) {
    domainMappingData[newMappingSource.value] = newMappingDisplay.value
    newMappingSource.value = ''
    newMappingDisplay.value = ''
  }
}

function saveDomainMapping() {
  editSetting({domainMapping: {...domainMappingData}}, true).then(ok => {
    if (ok) domainMappingShow.value = false
  })
}
</script>

<style scoped lang="scss">
.domain-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 2px;
}

.domain-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-radius: var(--xi-radius-sm, 6px);
  padding: 8px 10px;

  svg { flex-shrink: 0; margin-top: 2px; }
}

.domain-add-row {
  display: flex;
  gap: 8px;
  align-items: center;

  @media (max-width: 480px) {
    flex-wrap: wrap;
    > .el-input { flex: 1; min-width: 140px; }
    > .el-button { flex-shrink: 0; }
  }
}

.domain-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);

  .domain-order-hint {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--xi-radius-sm, 6px);
  padding: 4px;
}

.domain-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
    .drag-handle { color: var(--el-text-color-secondary); }
  }

  &.is-dragging { opacity: 0.4; }

  &.is-drop-target {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-off {
    .domain-name { color: var(--el-text-color-placeholder); text-decoration: line-through; }
  }

  .drag-handle {
    display: flex;
    align-items: center;
    color: var(--el-text-color-placeholder);
    cursor: grab;
    flex-shrink: 0;

    &:active { cursor: grabbing; }
  }

  .domain-index {
    flex-shrink: 0;
    width: 20px;
    text-align: center;
    font-size: 11.5px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--el-text-color-placeholder);
  }
}

.domain-name {
  font-size: 13px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;

  .el-switch { margin: 0 4px; }
}

.domain-save-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  @media (max-width: 480px) {
    .el-button { flex: 1; }
  }
}

.domain-empty {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px 0;
  font-size: 13px;
}

.domain-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mapping-source {
  min-width: 100px;
  text-align: center;
}

:deep(.mapping-dialog.el-dialog) {
  width: 520px !important;

  @media (max-width: 560px) {
    width: calc(100% - 40px) !important;
  }
}
</style>
