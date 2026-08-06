<template>
  <div class="sys-setting">
    <div class="loading" :class="firstLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>
    <div class="settings-layout" v-if="!firstLoading">

      <!-- Left navigation -->
      <div class="settings-nav">
        <router-link
          v-for="sec in sections"
          :key="sec.id"
          class="sn-item"
          active-class="active"
          :to="{ name: sec.routeName }"
        >
          <Icon :icon="sec.icon" width="16" height="16" />
          <span>{{ $t(sec.label) }}</span>
        </router-link>
      </div>

      <!-- Right content -->
      <el-scrollbar class="settings-body" ref="bodyRef">
        <div class="sb-inner">
          <router-view/>
        </div>
      </el-scrollbar>

    </div>
  </div>
</template>

<script setup>
import {computed, defineOptions, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {Icon} from "@iconify/vue";
import loading from "@/components/loading/index.vue";
import {useServerStore} from "@/store/server.js";
import {useSysSetting} from "./use-sys-setting.js";

defineOptions({
  name: 'sys-setting'
})

const route = useRoute()
const serverStore = useServerStore()
const {firstLoading, getSettings} = useSysSetting()

const bodyRef = ref(null)

const sections = computed(() => {
  const list = [
    { id: 'website',      routeName: 'sys-setting-website',      icon: 'mingcute:home-4-line',   label: 'websiteSetting' },
    { id: 'security',     routeName: 'sys-setting-security',     icon: 'mingcute:shield-line',   label: 'securitySetting' },
    { id: 'registration', routeName: 'sys-setting-registration', icon: 'mingcute:user-add-line', label: 'emailAddressSetting' },
    { id: 'domain',       routeName: 'sys-setting-domain',       icon: 'mingcute:world-2-line',  label: 'domainManagement' },
    { id: 'integration',  routeName: 'sys-setting-integration',  icon: 'mingcute:plug-2-line',   label: 'integration' },
    { id: 'sub-workers',  routeName: 'sys-setting-sub-workers',  icon: 'mingcute:server-line',   label: 'subWorkerManage' },
    { id: 'appearance',   routeName: 'sys-setting-appearance',   icon: 'mingcute:palette-line',  label: 'appearance' },
  ]
  if (serverStore.isStandalone) {
    list.push({ id: 'servers', routeName: 'sys-setting-servers', icon: 'mingcute:cloud-line', label: 'serverManage' })
  }
  list.push({ id: 'about', routeName: 'sys-setting-about', icon: 'mingcute:information-line', label: 'about' })
  return list
})

watch(() => route.name, () => {
  bodyRef.value?.setScrollTop(0)
})

getSettings()
</script>

<style lang="scss">
@use './style.scss';
</style>
