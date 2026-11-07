<template>
  <el-config-provider size="default">
  <div class="sys-setting" :class="{'settings-single-layout':layout === 'single'}">
    <div class="loading" :class="firstLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>
    <template v-if="!firstLoading">
      <el-scrollbar class="settings-body" ref="bodyRef">
      <div class="settings-heading">
        <div>
          <router-link v-if="!isOverview && layout === 'overview'" class="settings-back" :to="{name:'sys-setting-overview'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h15" /></svg>{{ $t('settingsBackHome') }}</router-link>
          <h1 v-else>{{ $t('settingsHome') }}</h1>
          <p v-if="isOverview || layout === 'single'">{{ $t('settingsHomeDescription') }}</p>
        </div>
        <div class="settings-layout-switch" role="group" :aria-label="$t('settingsLayout')">
          <button type="button" :class="{active:layout === 'overview'}" :aria-pressed="layout === 'overview'" @click="setLayout('overview')">{{ $t('settingsOverviewLayout') }}</button>
          <button type="button" :class="{active:layout === 'single'}" :aria-pressed="layout === 'single'" @click="setLayout('single')">{{ $t('settingsSingleLayout') }}</button>
        </div>
      </div>
      <SettingsSearch :sections="sections" @select="openSetting" />
        <div class="sb-inner">
          <div v-if="isOverview || layout === 'single'" class="settings-groups" :class="{'is-single':layout === 'single'}">
            <section v-for="group in groups" :key="group.id" class="settings-group">
              <div class="settings-group-header"><span class="settings-group-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><template v-if="group.id === 'site'"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></template><template v-else-if="group.id === 'mail'"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></template><template v-else-if="group.id === 'security'"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></template><template v-else><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/></template></svg></span><div><h2>{{ $t(group.label) }}</h2><p>{{ $t(group.description) }}</p></div></div>
              <div v-for="item in group.items" :key="item.key" class="settings-group-item" :data-setting-key="item.key" :data-expanded="layout === 'single' && openKeys.has(item.key)">
                <button type="button" class="settings-entry" :aria-expanded="layout === 'single' ? openKeys.has(item.key) : undefined" @click="openItem(item)">
                  <span><strong>{{ $t(item.title) }}</strong><small>{{ $t(item.description) }}</small></span>
                  <svg class="settings-entry-arrow" :class="{expanded:layout === 'single' && openKeys.has(item.key)}" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                </button>
                <div v-if="layout === 'single' && mountedKeys.has(item.key)" v-show="openKeys.has(item.key)" class="settings-entry-content" :class="{'hide-repeated-title':item.id === 'security' || (['website','registration'].includes(item.id) && !item.find)}"><component :is="sectionComponents[item.id]" v-bind="componentProps(item)" /></div>
              </div>
            </section>
          </div>
          <router-view v-if="layout === 'overview' && !isOverview" />
        </div>
      </el-scrollbar>
      <button v-if="layout === 'single' && openKeys.size" type="button" class="settings-collapse-all" @click="collapseAll">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5-5 5 5M7 19l5-5 5 5" /></svg>
        {{ $t('settingsCollapseAll') }}
      </button>
    </template>
  </div>
  </el-config-provider>
</template>

<script setup>
import {computed, defineOptions, nextTick, onUnmounted, ref, watch} from "vue";
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from "vue-router";
import loading from "@/components/loading/index.vue";
import {useServerStore} from "@/store/server.js";
import {useSysSetting} from "./use-sys-setting.js";
import SettingsSearch from './components/settings-search.vue';
import {SETTINGS_SEARCH_KEYS} from '@/config/settings-search.js';
import {useI18n} from 'vue-i18n';

defineOptions({
  name: 'sys-setting'
})

const route = useRoute()
const router = useRouter(), {t} = useI18n()
const serverStore = useServerStore()
const {firstLoading, getSettings, hasUnsavedChanges, discardUnsavedChanges} = useSysSetting()

const bodyRef = ref(null)
const isOverview = computed(() => route.name === 'sys-setting-overview')
const layoutKey = 'xi-mail:system-settings-layout'
let savedLayout = 'overview'
try { if (localStorage.getItem(layoutKey) === 'single') savedLayout = 'single' } catch {}
const layout = ref(savedLayout)
const openKeys = ref(new Set()), mountedKeys = ref(new Set())
// Load section code with this settings route, without mounting hidden forms or
// triggering their API requests. First expansion needs no extra chunk round trip.
const modules = import.meta.glob('./sections/*.vue', {eager:true, import:'default'})
const sectionComponents = Object.fromEntries(Object.entries(modules).map(([path,component]) => [path.split('/').at(-1).replace('.vue',''),component]))

const sections = computed(() => {
  const list = [
    { id: 'website',      routeName: 'sys-setting-website',      icon: 'mingcute:home-4-line',   label: 'websiteSetting' },
    { id: 'security',     routeName: 'sys-setting-security',     icon: 'mingcute:shield-line',   label: 'securitySetting' },
    { id: 'registration', routeName: 'sys-setting-registration', icon: 'mingcute:user-add-line', label: 'emailAddressSetting' },
    { id: 'domain',       routeName: 'sys-setting-domain',       icon: 'mingcute:world-2-line',  label: 'domainManagement' },
    { id: 'integration',  routeName: 'sys-setting-integration',  icon: 'mingcute:plugin-2-line',   label: 'integration' },
    { id: 'oauth',        routeName: 'sys-setting-oauth',        icon: 'mingcute:key-2-line',      label: 'oauthIntegration' },
    { id: 'sub-workers',  routeName: 'sys-setting-sub-workers',  icon: 'mingcute:server-line',   label: 'subWorkerManage' },
    { id: 'appearance',   routeName: 'sys-setting-appearance',   icon: 'mingcute:palette-line',  label: 'appearance' },
  ]
  if (serverStore.isStandalone) {
    list.push({ id: 'servers', routeName: 'sys-setting-servers', icon: 'mingcute:cloud-line', label: 'serverManage' })
  }
  list.push({ id: 'about', routeName: 'sys-setting-about', icon: 'mingcute:information-line', label: 'about' })
  return list
})

const groupSpecs = [
  {id:'site',label:'settingsGroupSite',description:'settingsGroupSiteDesc',items:[['website','websiteSetting','settingsWebsiteDesc'],['appearance','appearance','settingsAppearanceDesc'],['integration','settingsNoticeTitle','settingsNoticeDesc','noticePopup'],['oauth','oauthIntegration','settingsOAuthDesc']]},
  {id:'mail',label:'settingsGroupMail',description:'settingsGroupMailDesc',items:[['registration','settingsAddressTitle','settingsAddressDesc'],['domain','domainManagement','settingsDomainDesc'],['registration','sendProvider','settingsSendingDesc','sendProvider'],['integration','resendWebhookTitle','settingsWebhookDesc','resendWebhookTitle'],['integration','forwardingRules','settingsForwardDesc','forwardingRules']]},
  {id:'security',label:'settingsGroupSecurity',description:'settingsGroupSecurityDesc',items:[['security','settingsFilterTitle','settingsFilterDesc','senderDomainBlacklist'],['security','settingsAccessTitle','settingsAccessDesc','autoBan'],['security','settingsRetentionTitle','settingsRetentionDesc','autoCleanEmail'],['integration','signUpVerification','settingsVerifyDesc','signUpVerification']]},
  {id:'service',label:'settingsGroupService',description:'settingsGroupServiceDesc',items:[['integration','settingsStorageTitle','settingsStorageDesc','s3Configuration'],['sub-workers','subWorkerManage','settingsWorkersDesc'],['servers','serverManage','settingsServersDesc'],['about','about','settingsAboutDesc']]},
]
const groups = computed(() => groupSpecs.map(group => ({...group,items:group.items.map(([id,title,description,find]) => {
  const section = sections.value.find(item=>item.id === id)
  return section ? {...section,title,description,find,key:`${group.id}:${id}:${find || ''}`} : null
}).filter(Boolean)})))
const activeItem = computed(() => {
  if (isOverview.value) return null
  const items = groups.value.flatMap(group=>group.items).filter(item=>item.routeName === route.name)
  let anchor = route.query.find
  if (route.name === 'sys-setting-security') {
    if (['senderDomainBlacklist','emailKeywordBlacklist'].includes(anchor)) anchor = 'senderDomainBlacklist'
    else if (['autoBan','banMessage','globalToken'].includes(anchor)) anchor = 'autoBan'
    else if (['syncDelete','autoCleanEmail','newEmailNotify'].includes(anchor)) anchor = 'autoCleanEmail'
  }
  if (route.name === 'sys-setting-integration') {
    if (['tgBot','otherEmail','forwardingRules'].includes(anchor)) anchor = 'forwardingRules'
    else if (['signUpVerification','addEmailVerification'].includes(anchor)) anchor = 'signUpVerification'
    else if (['noticeTitle','noticePopup','popUp'].includes(anchor)) anchor = 'noticePopup'
    else if (['workersAi','aiModel','aiCodeEnable','s3Configuration','storageType'].includes(anchor)) anchor = 's3Configuration'
  }
  return items.find(item=>item.find && item.find === anchor) || items.find(item=>!item.find) || items[0] || null
})
async function setLayout(value) {
  if (layout.value === value) return
  if (!await confirmNavigation()) return
  discardUnsavedChanges()
  clearPendingTagInputs()
  layout.value = value
  if (value === 'overview') { openKeys.value = new Set();mountedKeys.value = new Set() }
  try { localStorage.setItem(layoutKey,value) } catch {}
}
function ensureOpen(item) {
  mountedKeys.value = new Set([...mountedKeys.value,item.key])
  openKeys.value = new Set([...openKeys.value,item.key])
}
function collapseAll() {
  clearHighlight()
  openKeys.value = new Set()
  // Only fold panels: retain drafts and let the scroll container keep its position.
}
function componentProps(item) {
  if (item.id === 'security') return {settingsArea:({senderDomainBlacklist:'filter',autoBan:'accounts',autoCleanEmail:'retention'})[item.find] || ''}
  if (item.id === 'integration') return {settingsArea:({forwardingRules:'forward',signUpVerification:'verify',noticePopup:'notice',s3Configuration:'storage',resendWebhookTitle:'webhook'})[item.find] || ''}
  if (item.id === 'registration') return {settingsArea:item.find === 'sendProvider' ? 'delivery' : 'address'}
  return {}
}
function openItem(item) {
  if (layout.value === 'single') {
    if (openKeys.value.has(item.key)) { const next = new Set(openKeys.value);next.delete(item.key);openKeys.value = next }
    else ensureOpen(item)
    return
  }
  return router.push({name:item.routeName,query:item.find ? {find:item.find} : {}})
}

let observer, deadline, highlightTimer, highlighted
function clearHighlight() {
  observer?.disconnect(); clearTimeout(deadline); clearTimeout(highlightTimer);
  highlighted?.classList.remove('setting-search-target'); highlighted=null;
}
async function highlightSetting(fromSearch = false) {
  clearHighlight();
  if (!fromSearch) return;
  const key = route.query.find;
  if (typeof key !== 'string' || !Object.values(SETTINGS_SEARCH_KEYS).some(keys=>keys.includes(key))) return;
  await nextTick();
  const root = bodyRef.value?.$el;
  if (!root) return;
  const reveal = () => {
    const label = [...root.querySelectorAll('span,label,.card-title,h2,h3,.setting-item > div:first-child')].find(node=>node.getClientRects().length && node.textContent.trim()===t(key));
    if (!label) return;
    const target = label.closest('.settings-inline-field,.setting-item,.settings-card') || label;
    const wrap = bodyRef.value.wrapRef;
    bodyRef.value.setScrollTop(wrap.scrollTop + target.getBoundingClientRect().top - wrap.getBoundingClientRect().top - 16);
    highlighted=target;target.classList.add('setting-search-target');observer?.disconnect();clearTimeout(deadline);
    highlightTimer=setTimeout(()=>target.classList.remove('setting-search-target'),4000);
  };
  observer=new MutationObserver(reveal);observer.observe(root,{childList:true,subtree:true});
  deadline=setTimeout(()=>observer?.disconnect(),5000);reveal();
}
async function openSetting(item) {
  await router.push({name:item.routeName,query:{find:item.key}});
  if (layout.value === 'single' && activeItem.value) ensureOpen(activeItem.value)
  highlightSetting(true);
}
async function confirmNavigation() {
  if (!hasUnsavedChanges() && !pendingTagInputs().length) return true
  try { await ElMessageBox.confirm(t('settingsUnsavedDesc'),t('settingsUnsavedTitle'),{type:'warning',confirmButtonText:t('settingsDiscard'),cancelButtonText:t('cancel')});return true }
  catch { return false }
}
function pendingTagInputs() { return [...(bodyRef.value?.$el?.querySelectorAll('.el-input-tag__input') || [])].filter(input=>input.value.trim()) }
function clearPendingTagInputs() { for (const input of pendingTagInputs()) { input.value='';input.dispatchEvent(new Event('input',{bubbles:true})) } }
onBeforeRouteUpdate((to,from) => layout.value === 'single' || (to.path === from.path && !pendingTagInputs().length) ? true : confirmNavigation())
onBeforeRouteLeave(async () => { const allowed = await confirmNavigation();if (allowed) { discardUnsavedChanges();clearPendingTagInputs() }return allowed })
watch(() => [route.fullPath,firstLoading.value,layout.value], () => {
  if (layout.value === 'single' && activeItem.value) ensureOpen(activeItem.value)
  if (layout.value === 'overview') bodyRef.value?.setScrollTop(0)
  else if (!route.query.find && !isOverview.value) nextTick(() => {
    const row = [...(bodyRef.value?.$el?.querySelectorAll('[data-setting-key]') || [])].find(node=>node.dataset.settingKey === activeItem.value?.key), wrap = bodyRef.value?.wrapRef
    if (row && wrap) bodyRef.value.setScrollTop(wrap.scrollTop + row.getBoundingClientRect().top - wrap.getBoundingClientRect().top - 12)
  })
  if(!firstLoading.value)highlightSetting()
},{flush:'post'})
onUnmounted(clearHighlight)

getSettings()
</script>

<style lang="scss">
@use './style.scss';
</style>
