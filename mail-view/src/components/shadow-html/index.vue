<template>
  <div class="content-box" ref="contentBox">
    <iframe ref="frame" class="content-html" title="Email content"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer" :srcdoc="documentHtml" @load="onLoad" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { emailDocument } from '@/utils/email-html'

const props = defineProps({ html: { type: String, required: true } })
const frame = ref(null)
const contentBox = ref(null)
const documentHtml = computed(() => emailDocument(props.html))
let observer
let contentObserver
let cleanupLoad
let animation

function scheduleFit() {
  cancelAnimationFrame(animation)
  animation = requestAnimationFrame(fit)
}

function fit() {
  const element = frame.value
  const doc = element?.contentDocument
  if (!doc?.body || !contentBox.value?.clientWidth) return
  const width = contentBox.value.clientWidth
  doc.body.style.zoom = 1
  const naturalWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth)
  doc.body.style.zoom = Math.min(1, width / Math.max(1, naturalWidth))
  const height = Math.min(100000, Math.max(32, Math.ceil(doc.body.getBoundingClientRect().height) + 16))
  if (element.style.height !== height + 'px') element.style.height = height + 'px'
}

function onLoad() {
  cleanupLoad?.()
  contentObserver?.disconnect()
  const doc = frame.value?.contentDocument
  if (!doc?.body) return
  // Same-origin is used only for layout. Scripts are forbidden by sandbox AND CSP.
  doc.addEventListener('load', scheduleFit, true)
  cleanupLoad = () => doc.removeEventListener('load', scheduleFit, true)
  contentObserver = new ResizeObserver(scheduleFit)
  contentObserver.observe(doc.body)
  scheduleFit()
}

onMounted(() => {
  observer = new ResizeObserver(scheduleFit)
  observer.observe(contentBox.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  contentObserver?.disconnect()
  cleanupLoad?.()
  cancelAnimationFrame(animation)
})
</script>

<style scoped>
.content-box { width: 100%; overflow: hidden; }
.content-html { display: block; width: 100%; height: 32px; border: 0; background: #fff; }
</style>
