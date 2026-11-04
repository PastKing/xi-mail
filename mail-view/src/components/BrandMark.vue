<template>
  <span class="xi-brand-mark" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true" v-html="mark" />
</template>

<script setup>
import mark from '../../public/brand/mark.svg?raw'
defineProps({ size: { type: Number, default: 24 } })
</script>

<style scoped>
.xi-brand-mark { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 0; vertical-align: middle; }
.xi-brand-mark :deep(svg) { width: 100%; height: 100%; display: block; }
</style>
