<template>
  <div class="sys-setting-section">
    <div v-if="inArea('address')" class="settings-card">
      <div class="card-title">{{ t('emailAddressSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ t('addAccount') }}</span></div>
          <div><el-switch v-model="setting.addEmail" @change="change('addEmail')" :before-change="beforeChange" :active-value="0" :inactive-value="1" /></div>
        </div>
        <div class="setting-item">
          <div><span>{{ t('multipleEmail') }}</span><el-tooltip effect="dark" :content="t('multipleEmailDesc')"><Icon class="warning" icon="mingcute:information-line" width="18" height="18" /></el-tooltip></div>
          <div><el-switch v-model="setting.manyEmail" @change="change('manyEmail')" :before-change="beforeChange" :active-value="0" :inactive-value="1" /></div>
        </div>
        <div class="settings-inline-field">
          <div class="settings-inline-heading"><span>{{ t('emailPrefix') }}</span><div class="email-prefix"><span>{{ t('atLeast') }}</span><el-input-number class="settings-number-input" controls-position="right" v-model="minEmailPrefix" :aria-label="t('emailPrefix')" :min="1" :max="20" /><span>{{ t('character') }}</span></div></div>
          <p>{{ t('emailPrefixRulesHint') }}</p>
          <el-input-tag v-model="emailPrefixFilter" :aria-label="t('mustNotContain')" :placeholder="t('emailPrefixFilterPlaceholder')" />
          <div class="settings-inline-actions"><el-button @click="resetEmailPrefix">{{ t('settingsInlineReset') }}</el-button><el-button type="primary" :loading="isSaving('minEmailPrefix','emailPrefixFilter')" :disabled="isSaving('minEmailPrefix','emailPrefixFilter')" @click="saveEmailPrefix">{{ t('settingsInlineSave') }}</el-button></div>
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
              class="settings-number-input"
              controls-position="right"
              :aria-label="t('randomPrefixLength')"
              @change="change('randomPrefixLength')"
              :min="4"
              :max="32"
              :step="1"
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
              @change="change('receive')"
            />
          </div>
        </div>
        <div class="setting-item setting-item--compact">
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
              class="settings-compact-select refresh-interval-select"
              popper-class="sys-setting-popper"
              @change="change('autoRefresh')"
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
              @change="change('send')"
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
              @change="change('noRecipient')"
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
            ><el-button @click="openProviderManager">{{
              t('sendingManage')
            }}</el-button>
          </div>
        </div>
      </div>
    </div>
    <el-dialog
      class="sys-setting-dialog sending-services-dialog"
      :class="{'is-editing': tokenDialogShow}"
      v-model="providerDialogShow"
      :title="tokenDialogShow ? t(tokenForm.existing ? 'sendingEdit' : 'sendingAdd') : t('sendProvider')"
      :close-on-click-modal="false"
      :before-close="closeProviderManager"
      @closed="resetProviderManager"
    >
      <template v-if="!tokenDialogShow">
      <div class="provider-toolbar">
        <el-input v-model="providerSearch" clearable :placeholder="t('sendingSearch')" :aria-label="t('sendingSearch')">
          <template #prefix><Icon icon="mingcute:search-line" width="16" /></template>
        </el-input>
        <el-button type="primary" @click="openTokenForm()"
          ><Icon icon="mingcute:add-line" width="18" />{{
            t('sendingAdd')
          }}</el-button
        >
      </div>
      <el-empty
        v-if="!filteredProviderDomains.length"
        :description="t(providerDomains.length ? 'sendingNoMatches' : 'sendProviderEmpty')"
        :image-size="72"
      />
      <div v-else class="provider-domain-list">
        <article
          v-for="row in pagedProviderDomains"
          :key="row.domain"
          class="provider-domain-row"
        >
          <div class="provider-domain-info">
            <strong :title="row.domain">{{ row.domain }}</strong>
            <div class="provider-credentials">
              <el-button
                v-for="provider in row.providers"
                :key="provider.id"
                :class="{'is-default-provider': effectiveProvider(row) === provider.id}"
                :disabled="settingLoading"
                @click="openTokenForm(provider.id, row.domain)"
                ><span class="provider-dot" :data-provider="provider.id" aria-hidden="true"></span>{{ provider.name
                }}<Icon icon="mingcute:edit-2-line" width="15"
              /></el-button>
              <el-tooltip :content="t('sendingAddForDomain')" :trigger-keys="[]">
                <button type="button" class="xi-icon-button provider-add" :aria-label="t('sendingAddForDomain') + ' ' + row.domain" :disabled="settingLoading" @click="openTokenForm('',row.domain)"><Icon icon="mingcute:add-line" width="16" /></button>
              </el-tooltip>
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
              ><el-option :label="t('sendingAutoChannel', { service: automaticProvider(row) })" value="" /><el-option
                v-for="provider in routeProviders(row)"
                :key="provider.id"
                :label="provider.name"
                :value="provider.id" /></el-select
          ><small v-if="row.value === 'cloudflare' && !setting.cloudflareEmailAvailable" class="provider-unavailable">{{ t('cloudflareEmailUnavailable') }}</small></label>
        </article>
      </div>
      <div class="provider-list-footer"><span>{{ t('sendingConfigCount',{domains:providerDomains.length,tokens:configurationCount}) }}</span><el-pagination v-if="filteredProviderDomains.length > providerPageSize" v-model:current-page="providerPage" :page-size="providerPageSize" :total="filteredProviderDomains.length" layout="prev, pager, next" :pager-count="5" small /></div>
      </template>
      <div v-else class="provider-editor">
      <button type="button" class="provider-back" :disabled="!!tokenAction" @click="backToProviderList"><Icon icon="mingcute:arrow-left-line" width="16" />{{ t('sendingBack') }}</button>
      <el-form label-position="top" @submit.prevent="saveToken">
        <el-form-item :label="t('sendingService')"
          ><el-select
            v-model="tokenForm.service"
            :aria-label="t('sendingService')"
            :disabled="!!tokenAction"
            popper-class="sys-setting-popper"
            ><el-option
              v-for="provider in providers"
              :key="provider.id"
              :label="provider.name"
              :value="provider.id"
              :disabled="provider.id === 'cloudflare' && !setting.cloudflareEmailAvailable" /></el-select
        ></el-form-item>
        <el-form-item :label="t('domain')"
          ><el-select
            v-model="tokenForm.domain"
            :aria-label="t('domain')"
            filterable
            :disabled="tokenForm.existing || !!tokenAction"
            popper-class="sys-setting-popper"
            ><el-option
              v-for="domain in availableDomains"
              :key="domain"
              :label="domain"
              :value="domain" /></el-select
        ></el-form-item>
        <p class="provider-service-hint">{{ t(tokenForm.service === 'cloudflare' ? 'cloudflareEmailDomainHint' : 'sendingTokenHint') }}</p>
        <el-form-item v-if="tokenForm.service !== 'cloudflare'" label="API Token"
          ><el-input
            v-model="tokenForm.token"
            :disabled="!!tokenAction"
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
            :loading="tokenAction === 'delete'"
            :disabled="!!tokenAction && tokenAction !== 'delete'"
            @click="deleteToken"
            >{{ t('delete') }}</el-button
          ><el-button :disabled="!!tokenAction" @click="backToProviderList">{{ t('cancel') }}</el-button><el-button
            type="primary"
            native-type="submit"
            :loading="tokenAction === 'save'"
            :disabled="!!tokenAction && tokenAction !== 'save' || !tokenForm.domain || (tokenForm.service !== 'cloudflare' && !tokenForm.token.trim()) || (tokenForm.service === 'cloudflare' && !setting.cloudflareEmailAvailable)"
            >{{ t('save') }}</el-button
          >
        </div>
      </el-form>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
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
  isSaving,
  settingLoading,
  editSetting,
  change,
  beforeChange,
  onSettingsLoaded,
  onSettingsDirty,
} = useSysSetting();
const autoRefreshOptions = computed(() => [
  { label: t('disable'), value: 0 },
  ...[3, 5, 10, 15, 20].map((value) => ({
    label: value + 's',
    value,
  })),
]);

const minEmailPrefix = ref(0),
  emailPrefixFilter = ref([]);
let prefixBaseline;
const prefixSnapshot = () => JSON.stringify({minEmailPrefix:minEmailPrefix.value,emailPrefixFilter:emailPrefixFilter.value});
const providerDialogShow = ref(false),
  tokenDialogShow = ref(false);
const tokenAction = ref('');
const providerSearch = ref(''), providerPage = ref(1), providerPageSize = 10;
const providers = [
  { id: 'resend', name: 'Resend', field: 'resendTokens' },
  { id: 'queensmtp', name: 'QueenSMTP', field: 'queenTokens' },
  { id: 'sendflare', name: 'SendFlare', field: 'sendflareTokens' },
  { id: 'cloudflare', name: 'Cloudflare Email', field: null },
];
const tokenForm = reactive({
  service: 'resend',
  domain: '',
  token: '',
  existing: false,
  originalService: '',
});
const providerDomains = computed(() => {
  const domains = [
    ...new Set(
      providers.flatMap((provider) => provider.field
        ? Object.keys(setting.value[provider.field] || {})
        : Object.entries(setting.value.sendProviders || {}).filter(([, value]) => value === provider.id).map(([domain]) => domain)),
    ),
  ];
  return domains.filter(domain => providers.some(provider => provider.field ? !!setting.value[provider.field]?.[domain] : setting.value.sendProviders?.[domain] === provider.id)).map((domain) => ({
    domain,
    providers: providers.filter(
      (provider) => provider.field
        ? !!setting.value[provider.field]?.[domain]
        : setting.value.sendProviders?.[domain] === provider.id,
    ),
    value: setting.value.sendProviders?.[domain] || '',
  }));
});
const filteredProviderDomains = computed(() => {
  const query = providerSearch.value.trim().toLowerCase();
  return providerDomains.value.filter(row => !query || row.domain.toLowerCase().includes(query) || row.providers.some(provider => provider.name.toLowerCase().includes(query)));
});
const pagedProviderDomains = computed(() => filteredProviderDomains.value.slice((providerPage.value-1)*providerPageSize,providerPage.value*providerPageSize));
watch(providerSearch,()=>{providerPage.value=1;});
watch(()=>filteredProviderDomains.value.length, length=>{providerPage.value=Math.min(providerPage.value,Math.max(1,Math.ceil(length/providerPageSize)));});
function automaticProvider(row) { return providers.find(provider=>provider.field && row.providers.some(item=>item.id===provider.id))?.name || t('sendingNoChannel'); }
function effectiveProvider(row) { return row.value || providers.find(provider=>provider.field && row.providers.some(item=>item.id===provider.id))?.id; }
function routeProviders(row) {
  return setting.value.cloudflareEmailAvailable && !row.providers.some(provider => provider.id === 'cloudflare')
    ? [...row.providers, providers.find(provider => provider.id === 'cloudflare')]
    : row.providers;
}
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
  const existing = !!service && !!domain;
  service = service || providers.find(provider => !provider.field ? setting.value.cloudflareEmailAvailable && setting.value.sendProviders?.[domain] !== provider.id : !setting.value[provider.field]?.[domain])?.id || 'resend';
  Object.assign(tokenForm, {
    service,
    domain: domain || availableDomains.value[0] || '',
    token: '',
    existing,
    originalService: existing ? service : '',
  });
  tokenDialogShow.value = true;
}
function openProviderManager() {
  resetProviderManager(); providerDialogShow.value = true;
}
function resetProviderManager() {
  tokenForm.token = ''; tokenDialogShow.value = false; providerSearch.value = ''; providerPage.value = 1;
}
async function backToProviderList() {
  if (tokenAction.value) return;
  if (tokenForm.token.trim()) {
    try { await ElMessageBox.confirm(t('sendingDiscardToken'), {confirmButtonText:t('confirm'),cancelButtonText:t('cancel'),type:'warning'}); }
    catch { return; }
  }
  tokenForm.token = ''; tokenDialogShow.value = false;
}
async function closeProviderManager(done) {
  if (tokenAction.value) return;
  if (tokenDialogShow.value) { await backToProviderList(); return; }
  done();
}
async function saveToken() {
  if (tokenAction.value) return;
  const provider = providers.find((item) => item.id === tokenForm.service);
  if (!provider || !tokenForm.domain) return;
  if (provider.id === 'cloudflare' && !setting.value.cloudflareEmailAvailable) return;
  if (provider.field && !tokenForm.token.trim()) return;
  const original = providers.find((item) => item.id === tokenForm.originalService);
  const switching = original && original.id !== provider.id;
  if (provider.field && switching && setting.value[provider.field]?.[tokenForm.domain]) {
    try {
      await ElMessageBox.confirm(t('sendingOverwriteConfirm', {
        service: provider.name,
        domain: tokenForm.domain,
      }), {
        type: 'warning',
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
      });
    } catch {
      return;
    }
  }
  const payload = {};
  if (provider.field) {
    payload[provider.field] = { [tokenForm.domain]: tokenForm.token.trim() };
  }
  if (provider.id === 'cloudflare' || (switching && original?.id === 'cloudflare')) {
    payload.sendProviders = { [tokenForm.domain]: provider.id };
  } else if (switching) {
    if (original?.field) payload[original.field] = { [tokenForm.domain]: '' };
    if (setting.value.sendProviders?.[tokenForm.domain] === original.id)
      payload.sendProviders = { [tokenForm.domain]: provider.id };
  }
  tokenAction.value = 'save';
  let ok;
  try { ok = await editSetting(payload); } finally { tokenAction.value = ''; }
  if (ok) {
    tokenForm.token = '';
    tokenDialogShow.value = false;
  }
}
async function deleteToken() {
  if (tokenAction.value) return;
  const provider = providers.find((item) => item.id === tokenForm.originalService);
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
  const payload = provider.field ? { [provider.field]: { [tokenForm.domain]: '' } } : {};
  if (setting.value.sendProviders?.[tokenForm.domain] === provider.id)
    payload.sendProviders = { [tokenForm.domain]: '' };
  tokenAction.value = 'delete';
  try { if (await editSetting(payload)) { tokenForm.token = ''; tokenDialogShow.value = false; } } finally { tokenAction.value = ''; }
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
  gap: 8px;
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
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.provider-service-hint {
  margin: -6px 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.55;
}
.provider-toolbar .el-input { min-width:0; }
.provider-toolbar > .el-button {
  flex-shrink: 0;
}
.provider-domain-list {
  border-top: 1px solid var(--el-border-color-lighter);
  max-height: min(56vh, 500px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.provider-domain-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 2px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.provider-domain-info {
  min-width: 0;
  flex:1;
}
.provider-domain-info > strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
}
.provider-credentials {
  display: flex;
  flex-wrap: wrap;
  align-items:center;
  gap: 6px;
  margin-top: 7px;
}
.provider-credentials .el-button {
  margin-left: 0;
  gap: 6px;
  padding:5px 8px;
  height:28px;
  border-color:var(--el-border-color-lighter);
  color:var(--el-text-color-regular);
  font-size:12px;
}
.provider-credentials .is-default-provider { background:var(--el-color-primary-light-9); border-color:var(--el-color-primary-light-7); color:var(--el-color-primary); }
.provider-credentials .el-button :deep(svg) { margin-left: 5px; opacity:.6; }
.provider-dot { width:6px; height:6px; margin-right:6px; border-radius:50%; background:var(--el-text-color-placeholder); }
.provider-dot[data-provider=resend] { background:#64748b; }
.provider-dot[data-provider=queensmtp] { background:#9580bd; }
.provider-dot[data-provider=sendflare] { background:#54a696; }
.provider-dot[data-provider=cloudflare] { background:#e49c53; }
.provider-toolbar .el-button :deep(svg) { margin-right: 6px; }
.provider-routing {
  display: grid;
  flex: 0 0 184px;
  gap: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.provider-unavailable { color:var(--el-color-warning); font-size:12px; line-height:1.5; }
.provider-list-footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; padding-top:12px; color:var(--el-text-color-secondary); font-size:12px; }
.provider-editor { max-width:440px; margin:0 auto; }
.provider-back { display:inline-flex; align-items:center; gap:5px; padding:0; border:0; background:none; color:var(--el-text-color-secondary); font:inherit; font-size:13px; cursor:pointer; margin:0 0 16px; }
.provider-back:hover { color:var(--el-color-primary); }
.provider-back:focus-visible { outline:2px solid var(--el-color-primary); outline-offset:4px; }
.provider-form-actions > .el-button:first-child { margin-right:auto; }
.provider-form-actions > .el-button:only-child { margin-right:0; }
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
    gap: 8px;
  }
  .provider-domain-row {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .provider-routing {
    flex-basis: auto;
    grid-template-columns: auto minmax(0,1fr);
    align-items:center;
    gap:8px;
  }
  .provider-routing > small { grid-column:1 / -1; }
  .provider-credentials .el-button { height:32px; }
}
</style>
