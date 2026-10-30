<template>
  <div class="setting-item">
    <div><span>{{ $t('wecomBot') }}</span></div>
    <div class="forward">
      <span>{{ loaded ? $t(config.enabled ? 'enabled' : 'disabled') : '—' }}</span>
      <el-button class="opt-button" size="small" type="primary" :loading="loading"
                 :aria-label="$t('wecomBot')" @click="open">
        <Icon icon="mingcute:settings-3-line" width="18" height="18"/>
      </el-button>
    </div>
  </div>

  <el-dialog v-model="visible" class="sys-setting-dialog wecom-dialog" :title="$t('wecomBot')"
             width="500px" :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy"
             @closed="webhookUrl = ''">
    <form class="wecom-form" @submit.prevent="save">
      <p>{{ $t('wecomDesc') }}</p>
      <label for="wecom-webhook">{{ $t('wecomWebhook') }}</label>
      <el-input id="wecom-webhook" v-model="webhookUrl" type="password" show-password
                autocomplete="new-password" :disabled="busy" :maxlength="500"
                :placeholder="$t(config.hasWebhook ? 'wecomKeepWebhook' : 'wecomWebhookPlaceholder')"/>
      <p class="wecom-hint">{{ $t(config.hasWebhook ? 'wecomConfigured' : 'wecomSetupHint') }}</p>
      <el-switch v-model="enabled" :disabled="busy" :aria-label="$t('wecomBot')"
                 :active-text="$t('enable')" :inactive-text="$t('disable')"/>
      <p class="wecom-hint">{{ $t('wecomTestHint') }}</p>
      <div class="wecom-actions">
        <el-button :loading="testing" :disabled="saving || (!webhookUrl.trim() && !config.hasWebhook)"
                   @click="test">{{ $t('wecomTest') }}</el-button>
        <el-button type="primary" native-type="submit" :loading="saving" :disabled="testing">{{ $t('save') }}</el-button>
      </div>
    </form>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { wecomQuery, wecomSet, wecomTest } from '@/request/setting.js'

const { t } = useI18n()
const config = reactive({ enabled: false, hasWebhook: false })
const loaded = ref(false)
const loading = ref(false)
const visible = ref(false)
const enabled = ref(false)
const webhookUrl = ref('')
const saving = ref(false)
const testing = ref(false)
const busy = computed(() => saving.value || testing.value)

async function load() {
  Object.assign(config, await wecomQuery())
  loaded.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    await load()
  } catch {
    // Leave the status unknown until the next successful load.
  } finally {
    loading.value = false
  }
})

async function open() {
  if (loading.value) return
  loading.value = true
  try {
    await load()
    enabled.value = config.enabled
    webhookUrl.value = ''
    visible.value = true
  } catch {
    // The request client displays API failures.
  } finally {
    loading.value = false
  }
}

async function save() {
  if (busy.value) return
  if (enabled.value && !webhookUrl.value.trim() && !config.hasWebhook) {
    ElMessage.warning(t('wecomWebhookRequired'))
    return
  }
  saving.value = true
  try {
    const url = webhookUrl.value.trim()
    await wecomSet({ enabled: enabled.value, ...(url ? { webhookUrl: url } : {}) })
    Object.assign(config, { enabled: enabled.value, hasWebhook: config.hasWebhook || !!url })
    webhookUrl.value = ''
    visible.value = false
    ElMessage.success(t('saveSuccessMsg'))
  } catch {
    // Keep the draft open so the administrator can correct it.
  } finally {
    saving.value = false
  }
}

async function test() {
  if (busy.value) return
  testing.value = true
  try {
    await wecomTest({ webhookUrl: webhookUrl.value.trim() })
    ElMessage.success(t('wecomTestSuccess'))
  } catch {
    // The request client displays API failures.
  } finally {
    testing.value = false
  }
}
</script>

<style scoped lang="scss">
.wecom-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  p { margin: 0; line-height: 1.6; overflow-wrap: anywhere; }
  .wecom-hint { font-size: 13px; color: var(--el-text-color-secondary); }
}
.wecom-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button { margin: 0; }
}
</style>

<style lang="scss">
.el-dialog.wecom-dialog {
  max-width: calc(100% - 32px);
}
</style>
