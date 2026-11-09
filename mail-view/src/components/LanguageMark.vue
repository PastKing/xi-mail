<template>
  <span class="language-mark" :style="{width:`${size}px`,height:`${size}px`}" aria-hidden="true">
    <Icon v-if="mark" :icon="mark.icon" :width="size" :height="size" :data-language-flag="mark.key"/>
    <span v-else class="language-mark-neutral">{{ initials }}</span>
  </span>
</template>
<script setup>
import {computed} from 'vue';
import {Icon} from '@iconify/vue';
import {languageMark} from '@/utils/language-mark.js';
const props=defineProps({language:Object,size:{type:Number,default:22}});
const mark=computed(()=>languageMark(props.language));
const initials=computed(()=>String(props.language?.id||'··').split('-')[0].slice(0,2).toUpperCase());
</script>
<style scoped>
.language-mark{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle;border-radius:50%;overflow:hidden}
.language-mark-neutral{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font:600 10px/1 system-ui,sans-serif;color:var(--el-text-color-secondary);background:var(--el-fill-color);letter-spacing:-.4px}
</style>
