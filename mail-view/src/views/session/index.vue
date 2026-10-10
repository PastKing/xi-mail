<template>
  <div class="session-box">
    <div class="header-actions">
      <el-tooltip :content="$t('refresh')" placement="bottom">
        <Icon class="icon" icon="mingcute:refresh-2-line" width="18" height="18" @click="load" />
      </el-tooltip>
    </div>

    <div class="session-body" v-loading="loading" element-loading-background="transparent">
      <div class="hero">
        <div class="hero-icon">
          <Icon icon="mingcute:device-line" width="26" height="26" />
        </div>
        <div class="hero-text">
          <div class="hero-title">{{ $t('loginSessions') }}</div>
          <div class="hero-desc">{{ $t('loginSessionsDesc') }}</div>
        </div>
        <div class="hero-side">
          <div class="hero-stat">
            <span class="stat-num">{{ sessions.length }}</span>
            <span class="stat-label">{{ $t('sessionActiveCount') }}</span>
          </div>
          <el-button
            type="danger"
            plain
            :disabled="others.length === 0"
            :loading="othersLoading"
            @click="doRevokeOthers"
          >
            <Icon icon="mingcute:exit-line" width="15" height="15" style="margin-right:5px" />
            {{ $t('sessionRevokeOthers') }}
          </el-button>
        </div>
      </div>

      <template v-if="current">
        <div class="section-title">
          <Icon icon="mingcute:check-circle-line" width="14" height="14" />
          {{ $t('sessionCurrent') }}
        </div>
        <div class="session-card current">
          <div class="card-head">
            <div class="card-avatar">
              <Icon :icon="deviceIcon(current)" width="20" height="20" />
            </div>
            <div class="card-title">{{ deviceTitle(current) }}</div>
            <el-tag type="success" size="small" round>{{ $t('sessionCurrent') }}</el-tag>
          </div>
          <div class="card-meta wide">
            <div v-for="meta in metaList(current)" :key="meta.label" class="meta-item">
              <Icon :icon="meta.icon" width="14" height="14" />
              <span class="meta-label">{{ meta.label }}</span>
              <span class="meta-value">{{ meta.value }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="section-title">
        <Icon icon="mingcute:computer-line" width="14" height="14" />
        {{ $t('sessionOthers') }}
        <span v-if="others.length" class="section-count">{{ others.length }}</span>
      </div>
      <div v-if="!loading && others.length === 0" class="empty-card">
        <Icon icon="mingcute:shield-shape-line" width="28" height="28" />
        <span>{{ $t('sessionNoOthers') }}</span>
      </div>
      <div v-else class="session-grid">
        <div v-for="item in others" :key="item.sid" class="session-card">
          <div class="card-head">
            <div class="card-avatar">
              <Icon :icon="deviceIcon(item)" width="20" height="20" />
            </div>
            <div class="card-title">{{ deviceTitle(item) }}</div>
            <el-button size="small" type="danger" text bg :loading="revoking === item.sid" @click="doRevoke(item)">
              {{ $t('sessionRevoke') }}
            </el-button>
          </div>
          <div v-if="item.activeTime" class="card-meta">
            <div v-for="meta in metaList(item)" :key="meta.label" class="meta-item">
              <Icon :icon="meta.icon" width="14" height="14" />
              <span class="meta-label">{{ meta.label }}</span>
              <span class="meta-value">{{ meta.value }}</span>
            </div>
          </div>
          <div v-else class="card-legacy">{{ $t('sessionLegacyHint') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineOptions } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sessionList, sessionRevoke, sessionRevokeOthers } from '@/request/my.js'
import { tzDayjs } from '@/utils/day.js'

defineOptions({ name: 'session' })

const { t } = useI18n()

const sessions = ref([])
const loading = ref(false)
const othersLoading = ref(false)
const revoking = ref(null)

const current = computed(() => sessions.value.find(item => item.current))
const others = computed(() => sessions.value.filter(item => !item.current))

async function load() {
  loading.value = true
  try {
    sessions.value = await sessionList()
  } finally {
    loading.value = false
  }
}

function deviceIcon(item) {
  const mobile = /mobile|tablet/i.test(item.device || '') || /android|ios/i.test(item.os || '')
  return mobile ? 'mingcute:cellphone-line' : 'mingcute:computer-line'
}

function deviceTitle(item) {
  const browser = (item.browser || '').replace(/^(\S+ \d+)[\d.]*$/, '$1')
  const parts = [browser, item.os].filter(Boolean)
  if (item.device && item.device !== 'Desktop') parts.push(item.device)
  return parts.length ? parts.join(' · ') : t('sessionUnknownDevice')
}

function methodLabel(method) {
  if (method === 'password') return t('sessionMethodPassword')
  if (method === 'oauth') return t('sessionMethodOauth')
  return t('sessionMethodUnknown')
}

function relativeTime(time) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(time).getTime()) / 60000))
  if (minutes < 1) return t('timeJustNow')
  if (minutes < 60) return t('timeMinutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('timeHoursAgo', { n: hours })
  return t('timeDaysAgo', { n: Math.floor(hours / 24) })
}

function metaList(item) {
  return [
    { icon: 'mingcute:earth-line', label: 'IP', value: item.ip || '-' },
    { icon: 'mingcute:key-2-line', label: t('sessionMethod'), value: methodLabel(item.method) },
    { icon: 'mingcute:time-line', label: t('sessionLastActive'), value: item.activeTime ? relativeTime(item.activeTime) : '-' },
    { icon: 'mingcute:calendar-line', label: t('sessionExpireTime'), value: item.expireTime ? tzDayjs(item.expireTime).format('YYYY-MM-DD HH:mm') : '-' },
  ]
}

async function doRevoke(item) {
  try {
    await ElMessageBox.confirm(t('sessionRevokeConfirm'), { type: 'warning' })
  } catch {
    return
  }
  revoking.value = item.sid
  try {
    await sessionRevoke(item.sid)
    sessions.value = sessions.value.filter(s => s.sid !== item.sid)
    ElMessage({ message: t('sessionRevokeSuccess'), type: 'success', plain: true })
  } finally {
    revoking.value = null
  }
}

async function doRevokeOthers() {
  try {
    await ElMessageBox.confirm(t('sessionRevokeOthersConfirm'), { type: 'warning' })
  } catch {
    return
  }
  othersLoading.value = true
  try {
    await sessionRevokeOthers()
    sessions.value = sessions.value.filter(s => s.current)
    ElMessage({ message: t('sessionRevokeOthersSuccess'), type: 'success', plain: true })
  } finally {
    othersLoading.value = false
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.session-box {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header-actions {
  padding: 10px 16px;
  display: flex;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 18px;
  flex-shrink: 0;

  .icon {
    cursor: pointer;
    color: var(--el-text-color-secondary);
    transition: color 0.15s;
    &:hover { color: var(--el-text-color-primary); }
  }
}

.session-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
  box-sizing: border-box;

  @media (max-width: 767px) {
    padding: 14px;
  }
}

.hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  margin-bottom: 24px;
  border-radius: var(--xi-radius);
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);

  @media (max-width: 767px) {
    flex-wrap: wrap;
    padding: 16px;
  }
}

.hero-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.hero-text {
  flex: 1;
  min-width: 0;

  .hero-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .hero-desc {
    margin-top: 4px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.hero-side {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;

  @media (max-width: 767px) {
    width: 100%;
    justify-content: space-between;
  }
}

.hero-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;

  .stat-num {
    font-size: 26px;
    font-weight: 700;
    line-height: 1;
    color: var(--el-color-primary);
  }

  .stat-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px;

  .section-count {
    padding: 0 7px;
    border-radius: 10px;
    font-size: 11px;
    line-height: 17px;
    background: var(--el-fill-color);
    color: var(--el-text-color-regular);
  }
}

.session-card.current {
  margin-bottom: 24px;
}

.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
}

.session-card {
  padding: 16px;
  border-radius: var(--xi-radius);
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: var(--xi-shadow-sm);
  }

  &.current {
    border-color: var(--el-color-success-light-5);
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);

  .current & {
    background: var(--el-color-success-light-8);
    color: var(--el-color-success);
  }
}

.card-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-meta {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;

  &.wide {
    grid-template-columns: repeat(4, minmax(0, 1fr));

    @media (max-width: 1100px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 480px) {
    &, &.wide { grid-template-columns: 1fr; }
  }
}

.meta-item {
  display: grid;
  grid-template-columns: 14px 1fr;
  column-gap: 6px;
  row-gap: 2px;
  align-items: center;
  min-width: 0;
  color: var(--el-text-color-placeholder);

  .meta-label {
    font-size: 11px;
  }

  .meta-value {
    grid-column: 2;
    font-size: 13px;
    color: var(--el-text-color-regular);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.card-legacy {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color-lighter);
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 16px;
  border-radius: var(--xi-radius);
  border: 1px dashed var(--el-border-color);
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
