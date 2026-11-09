<template>
  <button type="button" class="navigation-toggle" :aria-label="$t('toggleNavigation')" @click="toggleClick">
    <svg
      :class="{'is-active':isActive}"
      class="hamburger"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M408 442h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm-8 204c0 4.4 3.6 8 8 8h480c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H408c-4.4 0-8 3.6-8 8v56zm504-486H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 632H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM142.4 642.1L298.7 519a8.84 8.84 0 0 0 0-13.9L142.4 381.9c-5.8-4.6-14.4-.5-14.4 6.9v246.3a8.9 8.9 0 0 0 14.4 7z" />
    </svg>
  </button>
</template>

<script setup>
defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits()
const toggleClick = () => {
  emit('toggleClick');
}
</script>

<style scoped>
.navigation-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 50px;
  height: 36px;
  padding: 0 15px;
  margin: 0;
  border: 0;
  border-radius: var(--xi-radius, 8px);
  background: transparent;
  color: inherit;
  line-height: 1;
  cursor: pointer;
}
.navigation-toggle:hover { background: var(--el-fill-color-light); }
.navigation-toggle:focus-visible { outline: 2px solid var(--el-color-primary-light-5); outline-offset: -2px; }
.hamburger {
  display: block;
  width: 20px;
  height: 20px;
}

.hamburger.is-active {
  transform: rotate(180deg);
}
</style>
