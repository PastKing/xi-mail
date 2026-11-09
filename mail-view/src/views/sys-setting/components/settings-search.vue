<template>
 <div class="settings-search" @focusout="onFocusOut" @keydown.esc.stop="opened=false">
  <el-input v-model="query" clearable :placeholder="$t('settingsSearchPlaceholder')" :aria-label="$t('settingsSearchPlaceholder')" :aria-expanded="showResults" aria-controls="settings-search-results" @focus="opened=true" @keydown.down.prevent="step(1)" @keydown.up.prevent="step(-1)" @keydown.enter.prevent="choose(results[activeIndex])">
   <template #prefix><Icon icon="mingcute:search-line" width="17" height="17" /></template>
  </el-input>
  <div v-if="showResults" id="settings-search-results" class="settings-search-results">
   <p class="settings-search-caption">{{ $t('settingsSearchCount',{count:results.length}) }}</p>
   <button v-for="(item,index) in results" :key="item.section+':'+item.key" type="button" class="settings-search-result" :class="{'is-active':index===activeIndex}" @click="choose(item)">
    <Icon :icon="item.icon" width="16" height="16" /><span>{{ item.label }}</span><small>{{ item.category }}</small><Icon icon="mingcute:arrow-right-line" width="15" height="15" />
   </button>
   <p v-if="!results.length" class="settings-search-empty">{{ $t('settingsSearchEmpty') }}</p>
  </div>
 </div>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import zh from '@/i18n/zh.js';
import { SETTINGS_SEARCH_KEYS, SETTINGS_SEARCH_ALIASES } from '@/config/settings-search.js';
const props = defineProps({sections:{type:Array,required:true}}), emit = defineEmits(['select']);
const {t} = useI18n(), query = ref(''), opened = ref(false), activeIndex = ref(0);
const translated = key => [key,zh[key] || '',t(key)].join(' ');
const results = computed(() => {
 const terms = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
 if (!terms.length) return [];
 return props.sections.flatMap(section => (SETTINGS_SEARCH_KEYS[section.id] || []).map(key => {
  const text = [translated(key),translated(key+'Desc'),translated(section.label),...(SETTINGS_SEARCH_ALIASES[key] || []).map(translated)].join(' ').toLowerCase();
  return {section:section.id,key,routeName:section.routeName,label:t(key),category:t(section.label),icon:section.icon,text};
 })).filter(item => terms.every(term => item.text.includes(term)));
});
const showResults = computed(() => opened.value && !!query.value.trim());
watch(results,()=>activeIndex.value=0);
watch(query,()=>opened.value=true);
async function step(direction) {
 opened.value=true;activeIndex.value=Math.max(0,Math.min(results.value.length-1,activeIndex.value+direction));
 await nextTick();document.querySelector('#settings-search-results .is-active')?.scrollIntoView({block:'nearest'});
}
function choose(item) { if(!item)return;opened.value=false;emit('select',item); }
function onFocusOut(event) { if(!event.currentTarget.contains(event.relatedTarget))opened.value=false; }
</script>
