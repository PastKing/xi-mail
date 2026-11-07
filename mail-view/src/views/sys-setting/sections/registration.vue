<template>
  <div class="sys-setting-section">
    <div v-if="inArea('address')" class="settings-card">
      <div class="card-title">{{ t('emailAddressSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ t('addAccount') }}</span></div>
          <div><el-switch v-model="setting.addEmail" @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1" /></div>
        </div>
        <div class="setting-item">
          <div><span>{{ t('multipleEmail') }}</span><el-tooltip effect="dark" :content="t('multipleEmailDesc')"><Icon class="warning" icon="mingcute:information-line" width="18" height="18" /></el-tooltip></div>
          <div><el-switch v-model="setting.manyEmail" @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1" /></div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ t('emailPrefix') }}</span><div class="email-prefix"><span>{{ t('atLeast') }}</span><el-input-number v-model="minEmailPrefix" :aria-label="t('emailPrefix')" :min="1" :max="20" style="width: 150px"><template #suffix>{{ t('character') }}</template></el-input-number></div></div>
          <p>{{ t('emailPrefixRulesHint') }}</p>
          <el-input-tag v-model="emailPrefixFilter" :aria-label="t('mustNotContain')" :placeholder="t('emailPrefixFilterPlaceholder')" />
          <div class="settings-inline-actions"><el-button @click="resetEmailPrefix">{{ t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="settingLoading" @click="saveEmailPrefix">{{ t('settingsInlineSave') }}</el-button></div>
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
    <div v-if="inArea('delivery')" class="settings-card">
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
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import { useSysSetting } from '../use-sys-setting.js';
defineOptions({ name: 'sys-setting-registration' });
const props = defineProps({settingsArea:{type:String,default:''}});
const route = useRoute();
const sectionArea = computed(() => {
  if (props.settingsArea) return props.settingsArea;
  if (['emailPrefix','randomPrefixLength','addAccount','multipleEmail'].includes(route.query.find)) return 'address';
  if (['receiveEmail','sendEmail','autoRefresh','noRecipientTitle','sendProvider'].includes(route.query.find)) return 'delivery';
  return '';
});
const inArea = area => !sectionArea.value || sectionArea.value === area;
const { t } = useI18n();
const {
  setting,
  settingStore,
  settingLoading,
  editSetting,
  change,
  beforeChange,
  onSettingsLoaded,
  onSettingsDirty,
} = useSysSetting();
const minEmailPrefix = ref(0),
  emailPrefixFilter = ref([]);
let prefixBaseline;
const prefixSnapshot = () => JSON.stringify({minEmailPrefix:minEmailPrefix.value,emailPrefixFilter:emailPrefixFilter.value});
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
const autoRefreshOptions = computed(() => [
  { label: t('disable'), value: 0 },
  ...[3, 5, 10, 15, 20].map((value) => ({ label: value + 's', value })),
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
  prefixBaseline = prefixSnapshot();
}
onSettingsLoaded(() => { if (prefixBaseline === undefined || prefixSnapshot() === prefixBaseline) resetEmailPrefix(); });
onSettingsDirty(() => prefixBaseline !== undefined && prefixSnapshot() !== prefixBaseline, resetEmailPrefix);
async function saveEmailPrefix() {
  const saved = {minEmailPrefix:minEmailPrefix.value,emailPrefixFilter:[...emailPrefixFilter.value]};
  const ok = await editSetting({
      ...saved,
    });
  if (ok) prefixBaseline = JSON.stringify(saved);
}
</script>
<style scoped lang="scss">
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
