<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
    <LanguageSwitcher v-if="!route.matched.some(item=>item.name==='layout')" floating />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { watch,ref } from "vue";
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore()
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import {useRoute} from 'vue-router';
const route=useRoute();
import('@/icons/index.js')
const { locale } = useI18n()
const elementLocale=ref(zhCn);
const elementLanguages={
  'zh-TW':()=>import('element-plus/es/locale/lang/zh-tw.mjs'),en:()=>import('element-plus/es/locale/lang/en.mjs'),
  ja:()=>import('element-plus/es/locale/lang/ja.mjs'),ko:()=>import('element-plus/es/locale/lang/ko.mjs'),
  fr:()=>import('element-plus/es/locale/lang/fr.mjs'),de:()=>import('element-plus/es/locale/lang/de.mjs'),
  es:()=>import('element-plus/es/locale/lang/es.mjs'),pt:()=>import('element-plus/es/locale/lang/pt-br.mjs'),
  ru:()=>import('element-plus/es/locale/lang/ru.mjs'),it:()=>import('element-plus/es/locale/lang/it.mjs'),
  ar:()=>import('element-plus/es/locale/lang/ar.mjs'),hi:()=>import('element-plus/es/locale/lang/hi.mjs'),
  id:()=>import('element-plus/es/locale/lang/id.mjs'),vi:()=>import('element-plus/es/locale/lang/vi.mjs'),
  th:()=>import('element-plus/es/locale/lang/th.mjs'),tr:()=>import('element-plus/es/locale/lang/tr.mjs'),
  uk:()=>import('element-plus/es/locale/lang/uk.mjs'),ms:()=>import('element-plus/es/locale/lang/ms.mjs'),
  nl:()=>import('element-plus/es/locale/lang/nl.mjs'),pl:()=>import('element-plus/es/locale/lang/pl.mjs'),
  sv:()=>import('element-plus/es/locale/lang/sv.mjs'),
};
watch(()=>settingStore.lang,async id=>{const value=id==='zh'?zhCn:(await (elementLanguages[id]||elementLanguages[id?.split('-')[0]]||elementLanguages.en)()).default;if(settingStore.lang===id)elementLocale.value=value;},{immediate:true});
locale.value = settingStore.lang
watch(() => settingStore.lang, () => locale.value = settingStore.lang)

// Apply color theme to <html> data attribute so CSS variables cascade
function applyTheme(theme) {
  document.documentElement.dataset.colorTheme = theme || 'indigo'
}
applyTheme(settingStore.settings?.colorTheme)
watch(() => settingStore.settings?.colorTheme, applyTheme)
</script>
