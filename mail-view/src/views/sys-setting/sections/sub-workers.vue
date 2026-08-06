<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('subWorkerManage') }}</div>
      <div class="card-content">
        <div class="sub-worker-toolbar">
          <span class="sw-count">{{ subWorkers.length }} {{ $t('subWorkerManage') }}</span>
          <el-button type="primary" size="small" @click="subWorkerDialogShow = true">
            <Icon icon="mingcute:add-line" width="14" height="14" style="margin-right: 4px;" />
            {{ $t('subWorkerAdd') }}
          </el-button>
        </div>

        <div v-if="subWorkers.length === 0" class="sw-empty">{{ $t('subWorkerEmpty') }}</div>

        <div v-else class="sw-list">
          <div v-for="sw in subWorkers" :key="sw.id" class="sw-row">
            <div class="sw-info">
              <span class="sw-name">{{ sw.name }}</span>
              <span class="sw-domains-tag" v-for="d in sw.domains" :key="d">{{ d }}</span>
            </div>
            <div class="sw-actions">
              <el-tag :type="sw.status ? 'success' : 'info'" size="small">
                {{ sw.status ? $t('subWorkerEnabled') : $t('subWorkerDisabled') }}
              </el-tag>
              <el-switch :model-value="!!sw.status" size="small" @change="toggleStatus(sw)"/>
              <el-button size="small" type="danger" plain @click="removeSubWorker(sw)">
                <Icon icon="mingcute:delete-2-line" width="14" height="14" />
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="subWorkerDialogShow" :title="$t('subWorkerAdd')" @closed="resetForm">
      <div class="sub-worker-form">
        <div class="sw-field">
          <label>{{ $t('subWorkerName') }}</label>
          <el-input v-model="form.name" :placeholder="$t('subWorkerNamePlaceholder')" />
        </div>
        <div class="sw-field">
          <label>{{ $t('subWorkerUrl') }}</label>
          <el-input v-model="form.url" :placeholder="$t('subWorkerUrlPlaceholder')" />
        </div>
        <div class="sw-field">
          <label>{{ $t('subWorkerToken') }}</label>
          <el-input v-model="form.apiToken" :placeholder="$t('subWorkerTokenPlaceholder')" show-password />
        </div>
        <div class="sw-form-actions">
          <el-button @click="testSubWorker" :loading="testing" :disabled="!form.url || !form.apiToken">
            {{ $t('subWorkerTestConnect') }}
          </el-button>
          <el-button type="primary" @click="addSubWorker" :loading="adding" :disabled="!form.url || !form.apiToken || !form.name">
            {{ $t('save') }}
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {defineOptions, reactive, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {
  subWorkerAdd,
  subWorkerDelete,
  subWorkerList,
  subWorkerSetStatus,
  subWorkerTest
} from "@/request/sub-worker.js";

defineOptions({
  name: 'sys-setting-sub-workers'
})

const {t} = useI18n()

const subWorkers = ref([])
const subWorkerDialogShow = ref(false)
const testing = ref(false)
const adding = ref(false)
const form = reactive({name: '', url: '', apiToken: ''})

function loadSubWorkers() {
  subWorkerList().then(list => { subWorkers.value = list || [] }).catch(() => {})
}

loadSubWorkers()

function resetForm() {
  form.name = ''
  form.url = ''
  form.apiToken = ''
}

function testSubWorker() {
  testing.value = true
  subWorkerTest({url: form.url, apiToken: form.apiToken}).then(data => {
    const domains = data?.domains || []
    ElMessage({message: t('subWorkerTestSuccess', {count: domains.length}), type: 'success', plain: true})
  }).catch(() => {
    ElMessage({message: t('subWorkerTestFail'), type: 'error', plain: true})
  }).finally(() => { testing.value = false })
}

function addSubWorker() {
  adding.value = true
  subWorkerAdd(form).then(() => {
    ElMessage({message: t('subWorkerAddSuccess'), type: 'success', plain: true})
    subWorkerDialogShow.value = false
    loadSubWorkers()
  }).catch(() => {}).finally(() => { adding.value = false })
}

function removeSubWorker(sw) {
  ElMessageBox.confirm(t('subWorkerDeleteConfirm'), {type: 'warning'}).then(() => {
    subWorkerDelete(sw.id).then(loadSubWorkers)
  }).catch(() => {})
}

function toggleStatus(sw) {
  subWorkerSetStatus(sw.id, sw.status ? 0 : 1).then(loadSubWorkers)
}
</script>

<style scoped lang="scss">
.sub-worker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-top: 4px;
}

.sw-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.sw-empty {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px 0;
  font-size: 13px;
}

.sw-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--xi-radius-sm, 6px);
  padding: 4px;
}

.sw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.sw-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.sw-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sw-domains-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.sw-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sub-worker-form {
  display: flex;
  flex-direction: column;
  gap: 14px;

  .sw-field label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    margin-bottom: 4px;
  }
}

.sw-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;

  .el-button {
    width: auto;
    margin: 0;
  }
}
</style>
