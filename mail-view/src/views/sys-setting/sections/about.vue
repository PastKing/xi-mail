<template>
  <div class="sys-setting-section">
    <div class="settings-card about">
      <div class="card-title">{{ $t('about') }}</div>
      <div class="card-content">
        <div class="concerning-item">
          <span>{{ $t('version') }} :</span>
          <el-badge is-dot :hidden="!hasUpdate">
            <el-button @click="jump('https://github.com/PastKing/xi-mail/releases')">
              {{ currentVersion }}
              <template #icon>
                <Icon icon="mingcute:git-branch-line" style="font-size: 20px" color="#1890FF"/>
              </template>
            </el-button>
          </el-badge>
        </div>
        <div class="concerning-item">
          <span>{{ $t('community') }} : </span>
          <div class="community">
            <el-button @click="jump('https://github.com/PastKing/xi-mail')">
              Github
              <template #icon>
                <Icon icon="mingcute:github-line" width="22" height="22"/>
              </template>
            </el-button>
            <el-button @click="jump('https://t.me/pk_oa')">
              Telegram
              <template #icon>
                <Icon icon="mingcute:telegram-line" width="22" height="22"/>
              </template>
            </el-button>
          </div>
        </div>
        <div class="concerning-item">
          <span>{{ $t('donate') }} : </span>
          <div class="donate-box">
            <div class="donate-row" v-for="wallet in wallets" :key="wallet.chain">
              <span class="donate-chain" :class="wallet.chain.toLowerCase()">{{ wallet.chain }}</span>
              <code class="donate-addr" @click="copyAddr(wallet.address)">{{ wallet.address }}</code>
              <el-tooltip :content="$t('copy')">
                <el-button circle size="small" plain @click="copyAddr(wallet.address)">
                  <Icon icon="mingcute:copy-2-line" width="13" height="13"/>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {defineOptions, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import axios from "axios";
import {SYS_SETTING_VERSION} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-about'
})

const {t} = useI18n()
const currentVersion = SYS_SETTING_VERSION
const hasUpdate = ref(false)

const wallets = [
  {chain: 'BEP20', address: '0x555390f5c07cf76cc344f42612196e8669e3586b'},
  {chain: 'TRC20', address: 'TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G'},
]

let retryCount = 0

function checkUpdate() {
  if (retryCount > 5) return
  axios.get('https://api.github.com/repos/PastKing/xi-mail/releases/latest').then(({data}) => {
    hasUpdate.value = data.name !== currentVersion
  }).catch(e => {
    retryCount++
    setTimeout(checkUpdate, 2000)
    console.error('检查更新失败：', e)
  })
}

checkUpdate()

function jump(href) {
  const doc = document.createElement('a')
  doc.href = href
  doc.target = '_blank'
  doc.click()
}

function copyAddr(addr) {
  navigator.clipboard.writeText(addr).then(() => {
    ElMessage.success(t('copySuccess'))
  }).catch(() => {
    ElMessage.error(t('copyFail'))
  })
}
</script>

<style scoped lang="scss">
.concerning-item {
  display: flex;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: none;
  }

  .community {
    display: flex;
    row-gap: 10px;
    flex-wrap: wrap;
  }

  :deep(.el-button) {
    padding: 0 10px;
    font-weight: normal;

    i {
      font-size: 22px;
    }
  }

  > span:first-child {
    font-weight: normal;
    padding-right: 20px;
    white-space: nowrap;
    padding-top: 4px;
  }
}

.donate-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.donate-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .donate-chain {
    flex-shrink: 0;
    display: inline-block;
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;

    &.bep20 {
      background: #FEF3C7;
      color: #D97706;
    }

    &.trc20 {
      background: #DCFCE7;
      color: #16A34A;
    }
  }

  .donate-addr {
    flex: 1;
    min-width: 0;
    font-family: 'Courier New', monospace;
    font-size: 11.5px;
    color: var(--el-text-color-regular);
    word-break: break-all;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}
</style>
