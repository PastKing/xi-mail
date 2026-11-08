<template>
  <svg class="user-avatar" viewBox="0 0 64 64" :width="size" :height="size" aria-hidden="true">
    <rect width="64" height="64" :fill="avatar.background" />
    <path d="M8 66c1-13 10-19 24-19s23 6 24 19" :fill="avatar.shirt" />
    <g :transform="`rotate(${avatar.tilt} 32 35)`">
      <path d="M28 45h8v10c-2 3-6 3-8 0Z" :fill="avatar.skin" />
      <path d="M12 33V26c0-12 8-19 20-19s20 7 20 19v16H12Z" :fill="avatar.hair" />
      <circle cx="14" cy="34" r="4" :fill="avatar.skin" /><circle cx="50" cy="34" r="4" :fill="avatar.skin" />
      <path d="M15 27c0-10 8-14 17-14s17 4 17 14v8c0 12-8 18-17 18S15 47 15 35Z" :fill="avatar.skin" />
      <path v-if="avatar.hairstyle === 0" d="M13 29V23c0-10 8-16 19-16s19 6 19 16v7c-8-1-15-7-17-13-5 8-12 11-21 12Z" :fill="avatar.hair" />
      <path v-else-if="avatar.hairstyle === 1" d="M12 30V24C12 13 21 7 33 7c13 0 20 8 19 21l-7-7-3 5-7-5-5 5-8-5-4 9Z" :fill="avatar.hair" />
      <path v-else-if="avatar.hairstyle === 2" d="M13 30V24c0-12 10-18 21-17 12 1 18 9 17 21l-6-2-2-8c-7 5-16 7-24 7l-2 7Z" :fill="avatar.hair" />
      <path v-else d="M13 30V24C13 12 22 6 32 7c11-1 20 5 20 17v6l-6-6V18c-9 3-19 3-28 0v7Z" :fill="avatar.hair" />
      <circle cx="25.5" cy="34.5" r="1.7" fill="#302c2c" /><circle cx="38.5" cy="34.5" r="1.7" fill="#302c2c" />
      <path :d="avatar.smile" fill="none" stroke="#75483e" stroke-width="1.8" stroke-linecap="round" />
    </g>
  </svg>
</template>

<script setup>
import {computed} from 'vue';
import {createAvatar} from '@/utils/avatar.js';
const props = defineProps({seed:{type:String,required:true},size:{type:Number,default:32}});
const avatar = computed(() => createAvatar(props.seed));
</script>

<style scoped>
.user-avatar { display:block; flex-shrink:0; overflow:hidden; border-radius:inherit; }
</style>
