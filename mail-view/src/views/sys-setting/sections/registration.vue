<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ t('emailAddressSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>
            <span>{{ t('emailPrefix') }}</span>
          </div>
          <div>
            <el-button
              class="opt-button"
              type="primary"
              :aria-label="t('emailPrefix')"
              @click="emailPrefixShow = true"
              ><Icon icon="mingcute:settings-3-line" width="18"
            /></el-button>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ t('randomPrefixLength') }}</span
            ><el-tooltip :content="t('randomPrefixDesc')"
              ><Icon
                class="warning"
                icon="mingcute:information-line"
                width="18"
            /></el-tooltip>
          </div>
          <div>
            <el-input-number
              v-model="setting.randomPrefixLength"
              :aria-label="t('randomPrefixLength')"
              @change="change"
              :min="4"
              :max="32"
              :step="1"
              style="width: 136px"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="settings-card">
      <div class="card-title">{{ t('emailSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div>{{ t('receiveEmail') }}</div>
          <div>
            <el-switch
              v-model="setting.receive"
              :active-value="0"
              :inactive-value="1"
              :before-change="beforeChange"
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item">
          <div>
            {{ t('autoRefresh')
            }}<el-tooltip :content="t('autoRefreshDesc')"
              ><Icon
                class="warning"
                icon="mingcute:information-line"
                width="18"
            /></el-tooltip>
          </div>
          <div>
            <el-select
              v-model="setting.autoRefresh"
              :aria-label="t('autoRefresh')"
              popper-class="sys-setting-popper"
              style="width: 112px"
              @change="change"
              ><el-option
                v-for="item in autoRefreshOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            /></el-select>
          </div>
        </div>
        <div class="setting-item">
          <div>{{ t('sendEmail') }}</div>
          <div>
            <el-switch
              v-model="setting.send"
              :active-value="0"
              :inactive-value="1"
              :before-change="beforeChange"
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item">
          <div>
            {{ t('noRecipientTitle')
            }}<el-tooltip :content="t('noRecipientDesc')"
              ><Icon
                class="warning"
                icon="mingcute:information-line"
                width="18"
            /></el-tooltip>
          </div>
          <div>
            <el-switch
              v-model="setting.noRecipient"
              :active-value="0"
              :inactive-value="1"
              :before-change="beforeChange"
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ t('sendConfigManagement') }}</span></div>
          <div>
            <el-button class="opt-button" style="margin-top: 0" @click="showResendList = true" size="small"
                       type="primary">
              {{ t('manage') }}
            </el-button>
          </div>
        </div>
        <div class="setting-item sending-services">
          <div>
            <span>{{ t('sendProvider') }}</span
            ><el-tooltip :content="t('sendProviderDesc')"
              ><Icon
                class="warning"
                icon="mingcute:information-line"
                width="18"
            /></el-tooltip>
          </div>
          <div>
            <span class="provider-summary">{{
              t('sendingConfigCount', {
                domains: providerDomains.length,
                tokens: configurationCount,
              })
            }}</span
            ><el-button @click="providerDialogShow = true">{{
              t('sendingManage')
            }}</el-button>
          </div>
        </div>
      </div>
    </div>
    <el-dialog
      class="sys-setting-dialog ss-dialog-sm"
      v-model="emailPrefixShow"
      :title="t('emailPrefix')"
      @closed="resetEmailPrefix"
    >
      <div class="email-prefix">
        <span>{{ t('atLeast') }}</span
        ><el-input-number
          v-model="minEmailPrefix"
          :min="1"
          :max="20"
          style="width: 150px"
          ><template #suffix>{{ t('character') }}</template></el-input-number
        >
      </div>
      <div class="prefix-filter">
        <label>{{ t('mustNotContain') }}</label
        ><el-input-tag
          v-model="emailPrefixFilter"
          :placeholder="t('mustNotContainDesc')"
        />
      </div>
      <el-button
        type="primary"
        class="save-prefix"
        :loading="settingLoading"
        @click="saveEmailPrefix"
        >{{ t('save') }}</el-button
      >
    </el-dialog>
    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="resendTokenFormShow"
               :title="editingResendToken ? t('editResendTokenTitle') : t('resendToken')"
               @closed="resetResendTokenForm">
      <form @submit.prevent="saveResendToken">
        <el-select style="margin-bottom: 15px" v-model="resendTokenForm.domain" :disabled="editingResendToken" placeholder="Select">
          <el-option
              v-for="item in settingStore.domainList"
              :key="item"
              :label="item"
              :value="item"
          />
        </el-select>
        <el-input type="password" show-password autocomplete="off" :placeholder="editingResendToken ? t('replaceResendTokenDesc') : t('addResendTokenDesc')" v-model="resendTokenForm.token"/>
        <el-button type="primary" native-type="submit" :loading="settingLoading"
                   :disabled="!resendTokenForm.domain || (editingResendToken && !resendTokenForm.token.trim())">{{ t('save') }}</el-button>
      </form>
    </el-dialog>

    <el-dialog class="sys-setting-dialog send-config-dialog" v-model="showResendList" :title="t('sendConfigManagement')">
      <el-input v-model="domainSearch" clearable :placeholder="t('searchSendingDomain')"
                :aria-label="t('searchSendingDomain')" @input="domainPage = 1" />
      <p class="send-channel-help">{{ t('sendConfigDesc') }}</p>
      <el-table :data="pagedDomains" max-height="430" row-key="key" class="send-channel-table">
        <el-table-column min-width="170" property="key" :label="t('domain')"
                         :show-overflow-tooltip="true"/>
        <el-table-column :label="t('sendChannel')" width="150">
          <template #default="{row}">
            <el-select :key="`${row.key}-${channelVersion}`" :model-value="row.channel" :disabled="settingLoading || !!resendTokenLoading"
                       :aria-label="`${t('sendChannel')} ${row.key}`" @change="saveSendChannel(row.key, $event)">
              <el-option label="Resend" value="resend" />
              <el-option label="Cloudflare" value="cloudflare" :disabled="!setting.hasCloudflareEmail" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column :label="t('resendToken')" min-width="180" show-overflow-tooltip>
          <template #default="{row}">
            <span v-if="row.value">{{ row.value }}</span>
            <span v-else class="send-channel-help">{{ t(row.channel === 'cloudflare' ? 'sendTokenNotRequired' : 'sendTokenMissing') }}</span>
          </template>
        </el-table-column>
        <el-table-column :width="100" :label="t('action')" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" :loading="resendTokenLoading === row.key"
                       v-if="row.channel === 'resend' || row.value"
                       :disabled="settingLoading || !!resendTokenLoading" @click="openResendTokenForm(row)">
               {{ t(row.value ? 'change' : 'add') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="domainPage" :page-size="10" :total="filteredDomains.length"
                     layout="prev, pager, next" class="send-config-pagination" />
      <el-tag :type="setting.hasCloudflareEmail ? 'success' : 'warning'">
        {{ t(setting.hasCloudflareEmail ? 'cloudflareEmailBound' : 'cloudflareEmailNotBound') }}
      </el-tag>
      <p class="send-channel-help">{{ t('cloudflareSendingDesc') }}</p>
    </el-dialog>
    <el-dialog
      class="sys-setting-dialog sending-services-dialog"
      v-model="providerDialogShow"
      :title="t('sendProvider')"
    >
      <div class="provider-toolbar">
        <p>{{ t('sendingServicesHint') }}</p>
        <el-button type="primary" @click="openTokenForm()"
          ><Icon icon="mingcute:add-line" width="18" />{{
            t('sendingAdd')
          }}</el-button
        >
      </div>
      <el-empty
        v-if="!providerDomains.length"
        :description="t('sendProviderEmpty')"
        :image-size="72"
      />
      <div v-else class="provider-domain-list">
        <article
          v-for="row in providerDomains"
          :key="row.domain"
          class="provider-domain-row"
        >
          <div class="provider-domain-info">
            <strong>{{ row.domain }}</strong>
            <div class="provider-credentials">
              <el-button
                v-for="provider in row.providers"
                :key="provider.id"
                @click="openTokenForm(provider.id, row.domain)"
                >{{ provider.name
                }}<Icon icon="mingcute:edit-2-line" width="15"
              /></el-button>
            </div>
          </div>
          <label class="provider-routing"
            ><span>{{ t('sendingDefault') }}</span
            ><el-select
              :model-value="row.value"
              :empty-values="[null, undefined]"
              :aria-label="t('sendingDefault') + ' ' + row.domain"
              :disabled="settingLoading"
              popper-class="sys-setting-popper"
              @change="
                (value) =>
                  editSetting({ sendProviders: { [row.domain]: value } })
              "
              ><el-option :label="t('sendProviderAuto')" value="" /><el-option
                v-for="provider in row.providers"
                :key="provider.id"
                :label="provider.name"
                :value="provider.id" /></el-select
          ></label>
        </article>
      </div>
    </el-dialog>
    <el-dialog
      class="sys-setting-dialog ss-dialog-sm"
      v-model="tokenDialogShow"
      :title="t(tokenForm.existing ? 'sendingEdit' : 'sendingAdd')"
      @closed="tokenForm.token = ''"
    >
      <el-form label-position="top" @submit.prevent="saveToken">
        <el-form-item :label="t('sendingService')"
          ><el-select
            v-model="tokenForm.service"
            :aria-label="t('sendingService')"
            :disabled="tokenForm.existing"
            popper-class="sys-setting-popper"
            ><el-option
              v-for="provider in providers"
              :key="provider.id"
              :label="provider.name"
              :value="provider.id" /></el-select
        ></el-form-item>
        <el-form-item :label="t('domain')"
          ><el-select
            v-model="tokenForm.domain"
            :aria-label="t('domain')"
            :disabled="tokenForm.existing"
            popper-class="sys-setting-popper"
            ><el-option
              v-for="domain in availableDomains"
              :key="domain"
              :label="domain"
              :value="domain" /></el-select
        ></el-form-item>
        <el-form-item label="API Token"
          ><el-input
            v-model="tokenForm.token"
            type="password"
            show-password
            autocomplete="off"
            :aria-label="'API Token'"
            :placeholder="
              t(
                tokenForm.existing
                  ? 'sendingReplaceToken'
                  : 'sendingTokenPlaceholder',
              )
            "
        /></el-form-item>
        <div class="provider-form-actions">
          <el-button
            v-if="tokenForm.existing"
            type="danger"
            plain
            :loading="settingLoading"
            @click="deleteToken"
            >{{ t('delete') }}</el-button
          ><el-button
            type="primary"
            native-type="submit"
            :loading="settingLoading"
            :disabled="!tokenForm.domain || !tokenForm.token.trim()"
            >{{ t('save') }}</el-button
          >
        </div>
      </el-form>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, defineOptions, reactive, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { useSysSetting } from '../use-sys-setting.js';
import { getResendToken } from '@/request/setting.js';
import { useUserStore } from '@/store/user.js';

defineOptions({
  name: 'sys-setting-registration',
});

const { t } = useI18n();
const userStore = useUserStore();
const {
  setting,
  settingStore,
  settingLoading,
  editSetting,
  change,
  beforeChange,
  onSettingsLoaded,
} = useSysSetting();

const emailPrefixShow = ref(false);
const minEmailPrefix = ref(0);
const emailPrefixFilter = ref([]);

const resendTokenFormShow = ref(false);
const editingResendToken = ref(false);
const resendTokenLoading = ref('');
const showResendList = ref(false);
const resendTokenForm = reactive({ domain: '', token: '' });
const domainSearch = ref('');
const domainPage = ref(1);
const channelVersion = ref(0);
const filteredDomains = computed(() =>
  (settingStore.domainList || [])
    .map((domain) => domain.replace(/^@/, ''))
    .filter((domain) =>
      domain.toLowerCase().includes(domainSearch.value.trim().toLowerCase()),
    )
    .map((key) => ({
      key,
      channel: setting.value.sendChannels?.[key] || 'resend',
      value: setting.value.resendTokens?.[key] || '',
    })),
);
const pagedDomains = computed(() =>
  filteredDomains.value.slice((domainPage.value - 1) * 10, domainPage.value * 10),
);
watch(() => filteredDomains.value.length, count => {
  domainPage.value = Math.min(
    domainPage.value,
    Math.max(1, Math.ceil(count / 10)),
  );
});

function saveSendChannel(domain, channel) {
  return editSetting({
    sendChannels: { ...setting.value.sendChannels, [domain]: channel },
  }).finally(() => channelVersion.value++);
}

const authRefreshOptions = computed(() => [
  { label: t('disable'), value: 0 },
  ...[3, 5, 10, 15, 20].map((value) => ({
    label: value + 's',
    value,
  })),
]);

const providerDialogShow = ref(false),
  tokenDialogShow = ref(false);
const providers = [
  { id: 'resend', name: 'Resend', field: 'resendTokens' },
  { id: 'queensmtp', name: 'QueenSMTP', field: 'queenTokens' },
  { id: 'sendflare', name: 'SendFlare', field: 'sendflareTokens' },
];
const tokenForm = reactive({
  service: 'resend',
  domain: '',
  token: '',
  existing: false,
});
const providerDomains = computed(() => {
  const domains = [
    ...new Set(
      providers.flatMap((provider) =>
        Object.keys(setting.value[provider.field] || {}),
      ),
    ),
  ];
  return domains.map((domain) => ({
    domain,
    providers: providers.filter(
      (provider) => !!setting.value[provider.field]?.[domain],
    ),
    value: setting.value.sendProviders?.[domain] || '',
  }));
});
const configurationCount = computed(() =>
  providerDomains.value.reduce((count, row) => count + row.providers.length, 0),
);
const availableDomains = computed(() => [
  ...new Set([
    ...(settingStore.domainList || []).map((domain) =>
      domain.replace(/^@/, ''),
    ),
    ...providerDomains.value.map((row) => row.domain),
  ]),
]);
function openTokenForm(service = 'resend', domain = '') {
  Object.assign(tokenForm, {
    service,
    domain: domain || availableDomains.value[0] || '',
    token: '',
    existing: !!domain,
  });
  tokenDialogShow.value = true;
}
async function saveToken() {
  const provider = providers.find((item) => item.id === tokenForm.service);
  if (!provider || !tokenForm.domain || !tokenForm.token.trim()) return;
  const ok = await editSetting({
    [provider.field]: { [tokenForm.domain]: tokenForm.token.trim() },
  });
  if (ok) {
    tokenForm.token = '';
    tokenDialogShow.value = false;
  }
}
async function deleteToken() {
  const provider = providers.find((item) => item.id === tokenForm.service);
  if (!provider) return;
  try {
    await ElMessageBox.confirm(
      t('sendingDeleteConfirm', {
        service: provider.name,
        domain: tokenForm.domain,
      }),
      {
        type: 'warning',
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
      },
    );
  } catch {
    return;
  }
  const payload = { [provider.field]: { [tokenForm.domain]: '' } };
  if (setting.value.sendProviders?.[tokenForm.domain] === provider.id)
    payload.sendProviders = { [tokenForm.domain]: '' };
  if (await editSetting(payload)) tokenDialogShow.value = false;
}
function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix;
  emailPrefixFilter.value = [...(setting.value.emailPrefixFilter || [])];
}

onSettingsLoaded(resetEmailPrefix);

async function saveEmailPrefix() {
  if (
    await editSetting(
      {
        minEmailPrefix: minEmailPrefix.value,
        emailPrefixFilter: emailPrefixFilter.value,
      },
      true,
    )
  ) {
    emailPrefixShow.value = false;
  }
}

async function openResendTokenForm(row) {
  if (settingLoading.value || resendTokenLoading.value) return
  let token = ''
  if (row?.value && userStore.user.type === 0) {
    resendTokenLoading.value = row.key
    try {
      token = (await getResendToken(row.key)).token
    } catch {
      return
    } finally {
      resendTokenLoading.value = ''
    }
    // Discard the response if the user closed the list while it was loading.
    if (!showResendList.value) return
  }
  editingResendToken.value = !!row?.value
  resendTokenForm.domain = row ? `@${row.key}` : (settingStore.domainList || [])[0] || ''
  resendTokenForm.token = token
  resendTokenFormShow.value = true
}

function resetResendTokenForm() {
  resendTokenForm.token = ''
  resendTokenForm.domain = ''
  editingResendToken.value = false
}

function saveResendToken() {
  const token = resendTokenForm.token.trim()
  if (!resendTokenForm.domain || (editingResendToken.value && !token)) return
  const domain = resendTokenForm.domain.replace(/^@/, '')
  return editSetting({resendTokens: {[domain]: token}}).then(ok => {
    if (ok) resendTokenFormShow.value = false
  })
}
</script>
<style scoped lang="scss">
.send-channel-help {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.send-channel-table {
  margin-bottom: 16px;

  @media (max-width: 660px) {
    :deep(.el-table__header-wrapper), :deep(colgroup) {
      display: none;
    }
    :deep(.el-table__body) {
      width: 100% !important;
    }
    :deep(.el-table__row) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 70px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      padding: 8px 0;
    }
    :deep(.el-table__cell) {
      display: block;
      position: static !important;
      width: auto !important;
      border-bottom: 0;
    }
    :deep(.el-table__cell:nth-child(-n+2)) {
      grid-column: 1 / -1;
    }
    :deep(.el-table__cell:first-child) {
      font-weight: 600;
    }
    :deep(.el-table__cell .cell) {
      padding: 0 4px;
    }
    :deep(.el-table-fixed-column--right .cell) {
      text-align: right;
    }
    :deep(.el-table__cell::before) {
      display: none;
    }
  }
}

.send-config-pagination {
  justify-content: center;
  margin-bottom: 16px;
}

.email-prefix {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.prefix-filter {
  display: grid;
  gap: 10px;
  margin: 18px 0;
}
.save-prefix {
  width: 100%;
}
.provider-summary {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
.provider-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 18px;
}
:deep(.send-config-dialog.el-dialog) {
  min-height: 300px;
  width: min(850px, calc(100% - 40px)) !important;

  @media (max-width: 660px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }

  .el-dialog__header {
    padding-bottom: 5px;
  }
}
.provider-toolbar p {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.7;
  margin: 0;
}
.provider-toolbar > .el-button {
  flex-shrink: 0;
}
.provider-domain-list {
  border-top: 1px solid var(--el-border-color-lighter);
  max-height: min(60vh, 520px);
  overflow-y: auto;
}
.provider-domain-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.provider-domain-info {
  min-width: 0;
}
.provider-domain-info > strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.provider-credentials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.provider-credentials .el-button {
  margin-left: 0;
  gap: 6px;
}
.provider-credentials .el-button :deep(svg) { margin-left: 6px; }
.provider-toolbar .el-button :deep(svg) { margin-right: 6px; }
.provider-routing {
  display: grid;
  flex: 0 0 168px;
  gap: 8px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
.provider-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.provider-form-actions .el-button + .el-button {
  margin-left: 0;
}
@media (max-width: 540px) {
  .provider-toolbar {
    flex-direction: column;
    gap: 12px;
  }
  .provider-domain-row {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }
  .provider-routing {
    flex-basis: auto;
  }
}
</style>
