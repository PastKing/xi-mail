<template>
  <div class="setup-page">
    <div class="setup-card">
      <div class="setup-logo">
        <BrandMark :size="38" />
      </div>
      <h1 class="setup-title">{{ $t('setupTitle') }}</h1>
      <p class="setup-desc">{{ $t('setupDesc') }}</p>

      <div class="setup-form">
        <div class="setup-field">
          <label>{{ $t('serverName') }}</label>
          <el-input
            v-model="name"
            :placeholder="$t('serverNamePlaceholder')"
            size="large"
          />
        </div>
        <div class="setup-field">
          <label>{{ $t('serverUrl') }}</label>
          <el-input
            v-model="url"
            :placeholder="$t('serverUrlPlaceholder')"
            size="large"
            @keyup.enter="connect"
          />
        </div>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          :disabled="!url.trim()"
          class="setup-btn"
          @click="connect"
        >
          {{ loading ? $t('serverConnecting') : $t('serverConnect') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import BrandMark from '@/components/BrandMark.vue';
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useServerStore } from '@/store/server.js'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import axios from 'axios'

const { t } = useI18n()
const serverStore = useServerStore()
const router = useRouter()

const name = ref('')
const url = ref('')
const loading = ref(false)

async function connect() {
  const rawUrl = url.value.trim()
  if (!rawUrl) return

  let apiUrl = rawUrl.replace(/\/+$/, '')
  if (!/^https?:\/\//.test(apiUrl)) {
    apiUrl = 'https://' + apiUrl
  }

  loading.value = true
  try {
    const res = await axios.get(apiUrl + '/setting/websiteConfig', { timeout: 10000 })
    if (res.data?.code === 200) {
      const serverName = name.value.trim() || res.data.data?.title || 'Server'
      serverStore.addServer(serverName, apiUrl)
      ElMessage({ message: t('serverConnectSuccess'), type: 'success', plain: true })
      await router.replace('/login')
    } else {
      ElMessage({ message: t('serverConnectFail'), type: 'error', plain: true })
    }
  } catch {
    ElMessage({ message: t('serverConnectFail'), type: 'error', plain: true })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.setup-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  padding: 16px;
}

.setup-card {
  width: 100%;
  max-width: 400px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.setup-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  margin-bottom: 20px;
}

.setup-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.setup-desc {
  font-size: 13.5px;
  color: var(--el-text-color-secondary);
  margin: 0 0 28px;
  line-height: 1.5;
}

.setup-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setup-field {
  text-align: left;

  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    margin-bottom: 6px;
  }
}

.setup-btn {
  width: 100%;
  margin-top: 4px;
  height: 40px;
  font-weight: 600;
}
</style>
