<template>
  <div class="content-box" ref="contentBox">
    <iframe ref="frame" class="content-html" title="Email content" scrolling="no"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer" :srcdoc="documentHtml" @load="onLoad" />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { emailDocument } from '@/utils/email-html'

const props = defineProps({ html: { type: String, required: true } })
const frame = ref(null)
const contentBox = ref(null)
const documentHtml = computed(() => emailDocument(props.html))
let observer
let contentObserver
let mutationObserver
let cleanupDocument
let observedDocument
let observedBody
let animation
let documentAnimation
let disposed = false

function scheduleFit() {
  if (disposed) return
  cancelAnimationFrame(animation)
  animation = requestAnimationFrame(fit)
}

function observeDocument(doc) {
  if (observedDocument === doc && observedBody === doc.body) return
  cleanupDocument?.()
  contentObserver?.disconnect()
  mutationObserver?.disconnect()
  observedDocument = doc
  observedBody = doc.body
  // Same-origin access is layout-only; the sandbox and CSP still forbid scripts.
  // Start as soon as the body exists. iframe load waits for every remote image
  // and font, even though the text can already be displayed and resized.
  doc.addEventListener('load', scheduleFit, true)
  doc.addEventListener('error', scheduleFit, true)
  doc.fonts?.addEventListener('loadingdone', scheduleFit)
  doc.fonts?.addEventListener('loadingerror', scheduleFit)
  cleanupDocument = () => {
    doc.removeEventListener('load', scheduleFit, true)
    doc.removeEventListener('error', scheduleFit, true)
    doc.fonts?.removeEventListener('loadingdone', scheduleFit)
    doc.fonts?.removeEventListener('loadingerror', scheduleFit)
  }
  contentObserver = new ResizeObserver(scheduleFit)
  contentObserver.observe(doc.body)
  contentObserver.observe(doc.documentElement)
  mutationObserver = new MutationObserver(scheduleFit)
  mutationObserver.observe(doc.documentElement, { childList: true, subtree: true, characterData: true })
  doc.fonts?.ready.then(() => { if (observedDocument === doc) scheduleFit() })
}

function fit() {
  if (disposed) return
  const element = frame.value
  const doc = element?.contentDocument
  if (!doc?.body || doc.URL !== 'about:srcdoc') return
  observeDocument(doc)
  if (!contentBox.value?.clientWidth) return
  const width = contentBox.value.clientWidth
  // The body box can be short even when floats/positioned newsletter content
  // extends far below it. Collapse the viewport only during this synchronous
  // measurement so scrollHeight reflects content rather than the previous
  // iframe height (which otherwise grows on every fit and cannot shrink).
  const box = contentBox.value
  const previousHeight = box.style.height
  // Hold the outer layout steady while measuring the smaller iframe viewport;
  // otherwise a forced layout clamps a reader's scroll position back to zero.
  box.style.height = Math.ceil(box.getBoundingClientRect().height) + 'px'
  try {
    element.style.height = '1px'
    doc.body.style.zoom = 1
    const naturalWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth)
    const zoom = Math.min(1, width / Math.max(1, naturalWidth))
    doc.body.style.zoom = zoom
    const extent = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight * zoom, doc.body.getBoundingClientRect().bottom)
    const height = Math.min(100000, Math.max(32, Math.ceil(extent) + 16))
    element.style.height = height + 'px'
  } finally {
    box.style.height = previousHeight
  }
}

function onLoad() {
  fit()
}

function watchDocument() {
  cancelAnimationFrame(documentAnimation)
  const previous = observedDocument
  let attempts = 0
  const probe = () => {
    if (disposed) return
    const doc = frame.value?.contentDocument
    fit()
    if (doc?.URL === 'about:srcdoc' && doc.body && doc !== previous) return
    // srcdoc navigation replaces the Document asynchronously, without resizing
    // the outer element. Catch that replacement independently of iframe load.
    if (++attempts < 60) documentAnimation = requestAnimationFrame(probe)
  }
  probe()
}

watch(documentHtml, watchDocument, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(scheduleFit)
  observer.observe(contentBox.value)
  watchDocument()
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  contentObserver?.disconnect()
  mutationObserver?.disconnect()
  cleanupDocument?.()
  cancelAnimationFrame(animation)
  cancelAnimationFrame(documentAnimation)
})
</script>

<style scoped>
.content-box { width: 100%; overflow: hidden; }
.content-html { display: block; width: 100%; height: 32px; border: 0; background: #fff; }
</style>
