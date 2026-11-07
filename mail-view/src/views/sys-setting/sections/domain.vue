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

          <el-input v-model="domainSearch" clearable :placeholder="$t('domainSearchPlaceholder')" :aria-label="$t('domainSearchPlaceholder')">
            <template #prefix><Icon icon="mingcute:search-line" width="16" height="16" /></template>
          </el-input>

          <div class="domain-stat">
            <span class="domain-order-hint">
              <Icon icon="mingcute:dot-grid-line" width="14" height="14"/>
              {{ $t('domainOrderHint') }}
            </span>
            <span class="domain-count">{{ $t('domainEnabledCount', { enabled: enabledDomainCount, total: managedDomainsData.length }) }}<template v-if="domainSearch.trim()"> · {{ $t('domainMatchedCount', { count: visibleDomains.length }) }}</template></span>
          </div>

          <div v-if="managedDomainsData.length === 0" class="domain-empty">{{ $t('noDomains') }}</div>
          <div v-else-if="visibleDomains.length === 0" class="domain-empty">{{ $t('domainNoMatches') }}</div>
          <div v-else ref="domainListEl" class="domain-list">
            <div
              v-for="{ item, index: idx } in visibleDomains"
              :key="item.domain"
              :data-domain-index="idx"
              class="domain-row"
              :class="{
                'is-dragging': dragIndex === idx,
                'is-drop-target': dragOverIndex === idx && dragIndex !== idx,
                'is-off': !item.enabled
              }"
              @dragover.prevent="dragOverIndex = idx"
              @drop.prevent="onDrop(idx)"
            >
                <span class="drag-handle" :title="$t('dragToSort')" draggable="true" @dragstart.stop="onDragStart(idx, $event)" @dragend="onDragEnd">
                  <Icon icon="mingcute:dot-grid-line" width="16" height="16"/>
                </span>
              <span class="domain-index">{{ idx + 1 }}</span>
              <span class="domain-name" :title="item.domain">{{ item.domain }}</span>
              <div class="domain-actions">
                  <button type="button" class="domain-icon-button domain-step" :title="$t('moveUp')" :aria-label="$t('moveUp')" :disabled="idx === 0" @click="moveDomain(idx, -1)">
                    <Icon icon="mingcute:up-line" width="16" height="16"/>
                  </button>
                  <button type="button" class="domain-icon-button domain-step" :title="$t('moveDown')" :aria-label="$t('moveDown')" :disabled="idx === managedDomainsData.length - 1" @click="moveDomain(idx, 1)">
                    <Icon icon="mingcute:down-line" width="16" height="16"/>
                  </button>
                <el-switch
                  v-model="item.enabled"
                  :active-value="true"
                  :inactive-value="false"
                  :aria-label="item.domain"
                />
                <button type="button" class="domain-icon-button" :aria-label="$t('domainActionsFor', { domain: item.domain })" aria-haspopup="menu" :aria-expanded="domainMenuVisible && menuDomain === item.domain" @click="openDomainMenu(item.domain, $event)" @keydown.down.prevent="openDomainMenu(item.domain, $event)"><Icon icon="mingcute:more-2-line" width="18" height="18" /></button>
              </div>
            </div>
          </div>

          <el-dropdown ref="domainMenu" :virtual-ref="domainMenuAnchor" virtual-triggering :trigger="[]" :persistent="false" popper-class="sys-setting-popper" @visible-change="domainMenuVisible = $event" @command="command => handleDomainAction(menuDomain, command)">
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="first" :disabled="menuDomainIndex <= 0">{{ $t('domainMoveFirst') }}</el-dropdown-item>
                <el-dropdown-item command="last" :disabled="menuDomainIndex === managedDomainsData.length - 1">{{ $t('domainMoveLast') }}</el-dropdown-item>
                <el-dropdown-item command="position">{{ $t('domainMoveToPosition') }}</el-dropdown-item>
                <el-dropdown-item command="delete" divided>{{ $t('delete') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <div class="domain-save-row">
            <el-button @click="resetManagedDomains">{{ $t('reset') }}</el-button>
            <el-button type="primary" :loading="settingLoading" @click="saveDomains">{{ $t('save') }}</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="moveDomainShow" :title="$t('domainMoveToPosition')" class="sys-setting-dialog domain-move-dialog" width="360">
      <p class="domain-move-name">{{ movingDomain }}</p>
      <label class="domain-position-field">
        <span>{{ $t('domainTargetPosition') }}</span>
        <el-input-number v-model="targetPosition" :min="1" :max="managedDomainsData.length" :precision="0" controls-position="right" :aria-label="$t('domainTargetPosition')" @keyup.enter="confirmDomainMove" />
      </label>
      <p class="domain-position-hint">{{ $t('domainPositionHint', { total: managedDomainsData.length }) }}</p>
      <template #footer>
        <el-button @click="moveDomainShow = false">{{ $t('cancel') }}</el-button>
        <el-button type="primary" :disabled="!Number.isInteger(targetPosition)" @click="confirmDomainMove">{{ $t('confirm') }}</el-button>
      </template>
    </el-dialog>

    <div class="settings-card">
      <div class="card-title">{{ $t('domainMapping') }}</div>
      <div class="card-content">
        <div class="settings-inline-field">
      <p>{{ $t('domainMappingDesc') }}</p>
      <div class="mapping-list">
        <div v-for="(val, key) in domainMappingData" :key="key" class="mapping-row">
          <el-tag size="small" type="info" class="mapping-source">{{ key }}</el-tag>
          <Icon icon="mingcute:arrow-right-line" width="14" height="14" style="flex-shrink: 0; color: var(--el-text-color-secondary);" />
          <el-input v-model="domainMappingData[key]" :placeholder="$t('displayDomain')" style="flex: 1;" />
          <el-button type="danger" link :aria-label="$t('delete') + ' ' + key" @click="delete domainMappingData[key]">
            <Icon icon="mingcute:delete-2-line" width="16" height="16"/>
          </el-button>
        </div>
        <div class="mapping-row">
          <el-select popper-class="sys-setting-popper"
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
          <el-input v-model="newMappingDisplay" :placeholder="$t('displayDomain')" style="flex: 1;" />
          <el-button type="primary" link :aria-label="$t('add')" @click="addDomainMapping">
            <Icon icon="mingcute:add-line" width="16" height="16"/>
          </el-button>
        </div>
        <div class="settings-inline-actions"><el-button @click="resetDomainMapping">{{ $t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="settingLoading" @click="saveDomainMapping">{{ $t('settingsInlineSave') }}</el-button></div>
      </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, defineOptions, nextTick, reactive, ref, shallowRef, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-domain'
})

const {t} = useI18n()
const {setting, settingStore, settingLoading, editSetting, onSettingsLoaded, onSettingsDirty} = useSysSetting()

const managedDomainsData = ref([])
const newDomainInput = ref('')
const domainSearch = ref('')
const domainListEl = ref(null)
const moveDomainShow = ref(false)
const movingDomain = ref('')
const targetPosition = ref(1)
const domainMenu = ref(null), domainMenuAnchor = shallowRef(null)
const menuDomain = ref(''), domainMenuVisible = ref(false)
const menuDomainIndex = computed(() => managedDomainsData.value.findIndex(item => item.domain === menuDomain.value))
async function openDomainMenu(domain, event) {
  if (domainMenuVisible.value && menuDomain.value === domain) { domainMenu.value?.handleClose();return }
  menuDomain.value = domain
  domainMenuAnchor.value = event.currentTarget
  await nextTick()
  domainMenu.value?.handleOpen()
}
watch(domainSearch, () => domainMenu.value?.handleClose())
const visibleDomains = computed(() => {
  const query = domainSearch.value.trim().replace(/^@/, '').toLowerCase()
  return managedDomainsData.value.map((item, index) => ({ item, index })).filter(({ item }) => item.domain.toLowerCase().includes(query))
})
const dragIndex = ref(null)
const dragOverIndex = ref(null)

const domainMappingData = reactive({})
let domainsBaseline, mappingBaseline
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
  domainSearch.value = ''
  moveDomainShow.value = false
  const stored = setting.value.managedDomains
  if (stored && stored.length > 0) {
    managedDomainsData.value = stored.map(d => typeof d === 'string' ? {domain: d, enabled: true} : {...d})
  } else {
    managedDomainsData.value = (setting.value.domainList || []).map(d => ({
      domain: d.replace(/^@/, ''),
      enabled: true
    }))
  }
  domainsBaseline = JSON.stringify(managedDomainsData.value)
}

function resetDomainMapping() {
  Object.keys(domainMappingData).forEach(key => delete domainMappingData[key])
  Object.assign(domainMappingData, setting.value.domainMapping || {})
  newMappingSource.value = ''
  newMappingDisplay.value = ''
  mappingBaseline = JSON.stringify(domainMappingData)
}
onSettingsLoaded(() => {
  if (domainsBaseline === undefined || (JSON.stringify(managedDomainsData.value) === domainsBaseline && !newDomainInput.value.trim())) resetManagedDomains()
  if (mappingBaseline === undefined || (JSON.stringify(domainMappingData) === mappingBaseline && !newMappingSource.value && !newMappingDisplay.value)) resetDomainMapping()
})
onSettingsDirty(() => (domainsBaseline !== undefined && JSON.stringify(managedDomainsData.value) !== domainsBaseline) || (mappingBaseline !== undefined && JSON.stringify(domainMappingData) !== mappingBaseline) || !!(newDomainInput.value.trim() || newMappingSource.value || newMappingDisplay.value), () => { resetManagedDomains();resetDomainMapping() })

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
  moveDomainTo(idx, idx + offset)
}

function moveDomainTo(from, target) {
  const list = managedDomainsData.value
  if (!Number.isInteger(from) || !Number.isInteger(target) || from < 0 || from >= list.length || target < 0 || target >= list.length || from === target) return
  const [moved] = list.splice(from, 1)
  list.splice(target, 0, moved)
  nextTick(() => {
    const container = domainListEl.value
    const row = container?.querySelector(`[data-domain-index="${target}"]`)
    if (!row) return
    if (row.offsetTop < container.scrollTop) container.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > container.scrollTop + container.clientHeight) {
      container.scrollTop = row.offsetTop + row.offsetHeight - container.clientHeight
    }
  })
}

function handleDomainAction(domain, command) {
  const from = managedDomainsData.value.findIndex(item => item.domain === domain)
  if (from < 0) return
  if (command === 'first') moveDomainTo(from, 0)
  else if (command === 'last') moveDomainTo(from, managedDomainsData.value.length - 1)
  else if (command === 'delete') managedDomainsData.value.splice(from, 1)
  else if (command === 'position') {
    movingDomain.value = domain
    targetPosition.value = from + 1
    moveDomainShow.value = true
  }
}

function confirmDomainMove() {
  if (!Number.isInteger(targetPosition.value) || targetPosition.value < 1 || targetPosition.value > managedDomainsData.value.length) return
  moveDomainTo(managedDomainsData.value.findIndex(item => item.domain === movingDomain.value), targetPosition.value - 1)
  moveDomainShow.value = false
}

function onDragStart(idx, event) {
  dragIndex.value = idx
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', managedDomainsData.value[idx].domain)
}

function onDrop(idx) {
  const from = dragIndex.value
  if (from === null || from === idx) return
  moveDomainTo(from, idx)
  onDragEnd()
}

function onDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

async function saveDomains() {
  if (newDomainInput.value.trim()) {
    addDomain()
    if (newDomainInput.value.trim()) return
  }
  const saved = managedDomainsData.value.filter(d => d.domain).map(d=>({...d}))
  if (await editSetting({managedDomains:saved})) domainsBaseline = JSON.stringify(saved)
}

function addDomainMapping() {
  if (newMappingSource.value && newMappingDisplay.value) {
    domainMappingData[newMappingSource.value] = newMappingDisplay.value
    newMappingSource.value = ''
    newMappingDisplay.value = ''
  }
}

async function saveDomainMapping() {
  if (!!newMappingSource.value !== !!newMappingDisplay.value) { ElMessage.warning(t('settingsMappingIncomplete'));return }
  if (newMappingSource.value && newMappingDisplay.value) addDomainMapping()
  const saved = {...domainMappingData}
  if (await editSetting({domainMapping:saved}, true)) mappingBaseline = JSON.stringify(saved)
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
  position: relative;
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
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: var(--el-text-color-placeholder);
  }
}

.domain-name {
  font-size: 14px;
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
  .el-button + .el-button { margin-left: 0; }
  @media (max-width: 600px) { .domain-step { display: none; } }
}
.domain-icon-button { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; padding:0; border:0; border-radius:5px; background:transparent; color:var(--el-text-color-regular); cursor:pointer; }
.domain-icon-button:hover:not(:disabled) { background:var(--el-fill-color); color:var(--el-color-primary); }
.domain-icon-button:disabled { color:var(--el-text-color-placeholder); cursor:not-allowed; }
.domain-icon-button:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:1px; }
@media(max-width:680px),(pointer:coarse) { .domain-icon-button { width:36px; height:36px; } }

.domain-move-name { margin: 0 0 16px; overflow-wrap: anywhere; font-weight: 500; }
.domain-position-field { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.domain-position-field .el-input-number { width: 130px; }
.domain-position-hint { margin: 10px 0 0; color: var(--el-text-color-secondary); font-size: 12px; }

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
  font-size: 14px;
}

.domain-count {
  font-size: 14px;
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
  min-width: 0;
  > .el-select, > .el-input { min-width: 0; }
}

.mapping-source {
  min-width: 100px;
  max-width: 40%;
  overflow: hidden;
  text-align: center;
}

:deep(.mapping-dialog.el-dialog) {
  width: 520px !important;

  @media (max-width: 560px) {
    width: calc(100% - 40px) !important;
  }
}
</style>
