<template>
  <div class="notice-editor">
    <div class="ne-toolbar">
      <el-tooltip v-for="tool in tools" :key="tool.key" :content="tool.label" placement="top" :show-after="300">
        <button type="button" class="ne-tool" @click="tool.run">
          <Icon :icon="tool.icon" width="16" height="16" />
        </button>
      </el-tooltip>

      <el-dropdown trigger="click" @command="insertColor">
        <el-tooltip :content="$t('neColor')" placement="top" :show-after="300">
          <button type="button" class="ne-tool">
            <Icon icon="mingcute:font-line" width="16" height="16" />
          </button>
        </el-tooltip>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="c in colors" :key="c.value" :command="c.value">
              <span class="ne-color-dot" :style="{ background: c.value }"></span>{{ $t(c.label) }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <span class="ne-sep"></span>

      <el-dropdown trigger="click" @command="applyTemplate">
        <button type="button" class="ne-tool ne-text-tool">
          <Icon icon="mingcute:layout-line" width="15" height="15" />
          <span>{{ $t('neTemplate') }}</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="tpl in templates" :key="tpl.key" :command="tpl.key">{{ $t(tpl.label) }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <span class="ne-hint">{{ $t('neHint') }}</span>
    </div>

    <div class="ne-panes">
      <el-input
          ref="inputRef"
          :model-value="modelValue"
          @update:model-value="val => emit('update:modelValue', val)"
          type="textarea"
          class="ne-input"
          resize="none"
          :placeholder="$t('noticeContentDesc')"
      />
      <div class="ne-preview">
        <div class="ne-preview-label">{{ $t('preview') }}</div>
        <div v-if="rendered" class="notice-body" v-html="rendered"></div>
        <div v-else class="ne-empty">{{ $t('neEmpty') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import { renderNotice } from '@/utils/notice.js'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const { t, locale } = useI18n()

const inputRef = ref()
const rendered = computed(() => renderNotice(props.modelValue))

const colors = [
  { value: '#f56c6c', label: 'neColorRed' },
  { value: '#e6a23c', label: 'neColorOrange' },
  { value: '#67c23a', label: 'neColorGreen' },
  { value: '#409eff', label: 'neColorBlue' },
  { value: '#909399', label: 'neColorGray' },
]

const tools = [
  { key: 'bold', icon: 'mingcute:bold-line', label: t('neBold'), run: () => wrap('<strong>', '</strong>') },
  { key: 'heading', icon: 'mingcute:heading-1-line', label: t('neHeading'), run: () => wrapLine('<h3>', '</h3>') },
  { key: 'list', icon: 'mingcute:list-check-line', label: t('neList'), run: insertList },
  { key: 'link', icon: 'mingcute:link-line', label: t('neLink'), run: insertLink },
  { key: 'image', icon: 'mingcute:pic-line', label: t('neImage'), run: insertImage },
  { key: 'quote', icon: 'mingcute:quote-left-line', label: t('neQuote'), run: () => wrapLine('<blockquote>', '</blockquote>') },
  { key: 'hr', icon: 'mingcute:line-line', label: t('neDivider'), run: () => insert('\n<hr>\n') },
  { key: 'br', icon: 'mingcute:corner-down-left-line', label: t('neBreak'), run: () => insert('<br>\n') },
]

const templateHtml = {
  zh: {
    maintain: '<p>为提升服务质量，系统将于 <strong>X月X日 XX:00 - XX:00</strong> 进行维护。</p>\n<p>维护期间可能无法正常收发邮件，给您带来不便，敬请谅解。</p>',
    release: '<h3>新功能上线</h3>\n<ul>\n  <li>功能一</li>\n  <li>功能二</li>\n</ul>\n<p>如有问题欢迎反馈。</p>',
    contact: '<p>使用中遇到问题，可以通过以下方式联系我们：</p>\n<ul>\n  <li>邮箱：<a href="mailto:admin@example.com">admin@example.com</a></li>\n  <li>Telegram：<a href="https://t.me/xxx" target="_blank">@xxx</a></li>\n</ul>',
  },
  en: {
    maintain: '<p>The system will be under maintenance on <strong>MMM DD, HH:00 - HH:00</strong>.</p>\n<p>Sending and receiving mail may be unavailable during this time. Sorry for the inconvenience.</p>',
    release: '<h3>What\'s new</h3>\n<ul>\n  <li>Feature one</li>\n  <li>Feature two</li>\n</ul>\n<p>Feedback is welcome.</p>',
    contact: '<p>Need help? Reach us here:</p>\n<ul>\n  <li>Email: <a href="mailto:admin@example.com">admin@example.com</a></li>\n  <li>Telegram: <a href="https://t.me/xxx" target="_blank">@xxx</a></li>\n</ul>',
  },
}

const templates = [
  { key: 'maintain', label: 'neTplMaintain' },
  { key: 'release', label: 'neTplRelease' },
  { key: 'contact', label: 'neTplContact' },
]

function textarea() {
  return inputRef.value?.textarea
}

function update(value, cursorStart, cursorEnd = cursorStart) {
  emit('update:modelValue', value)
  nextTick(() => {
    const el = textarea()
    if (!el) return
    el.focus()
    el.setSelectionRange(cursorStart, cursorEnd)
  })
}

function selection() {
  const el = textarea()
  const value = props.modelValue || ''
  const start = el ? el.selectionStart : value.length
  const end = el ? el.selectionEnd : value.length
  return { value, start, end, selected: value.slice(start, end) }
}

function insert(text) {
  const { value, start, end } = selection()
  update(value.slice(0, start) + text + value.slice(end), start + text.length)
}

function wrap(before, after) {
  const { value, start, end, selected } = selection()
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  update(next, start + before.length, start + before.length + selected.length)
}

// 没选中文字时作用于光标所在整行
function wrapLine(before, after) {
  const { value, start, end } = selection()
  if (start !== end) return wrap(before, after)
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEndIndex = value.indexOf('\n', start)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  const line = value.slice(lineStart, lineEnd)
  const next = value.slice(0, lineStart) + before + line + after + value.slice(lineEnd)
  update(next, lineStart + before.length, lineStart + before.length + line.length)
}

function insertColor(color) {
  wrap(`<span style="color:${color}">`, '</span>')
}

function insertList() {
  const { value, start, end, selected } = selection()
  const lines = selected ? selected.split(/\r?\n/).filter(Boolean) : ['']
  const html = '<ul>\n' + lines.map(line => `  <li>${line}</li>`).join('\n') + '\n</ul>\n'
  const next = value.slice(0, start) + html + value.slice(end)
  const cursor = selected ? start + html.length : start + '<ul>\n  <li>'.length
  update(next, cursor)
}

async function promptUrl(title) {
  try {
    const { value } = await ElMessageBox.prompt(title, {
      inputPlaceholder: 'https://',
      inputPattern: /^(https?:\/\/|mailto:|\/)\S+$/i,
      inputErrorMessage: t('neUrlInvalid'),
    })
    return value.trim()
  } catch {
    return null
  }
}

async function insertLink() {
  const { selected } = selection()
  const url = await promptUrl(t('neLinkPrompt'))
  if (!url) return
  wrap(`<a href="${url}" target="_blank">`, `${selected ? '' : url}</a>`)
}

async function insertImage() {
  const url = await promptUrl(t('neImagePrompt'))
  if (!url) return
  insert(`<img src="${url}" alt="">\n`)
}

async function applyTemplate(key) {
  const tpl = templates.find(item => item.key === key)
  if (!tpl) return
  if (props.modelValue?.trim()) {
    try {
      await ElMessageBox.confirm(t('neTemplateReplace'), { type: 'warning' })
    } catch {
      return
    }
  }
  const html = (templateHtml[locale.value] || templateHtml.zh)[key]
  update(html, html.length)
}
</script>

<style lang="scss" scoped>
.notice-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.ne-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.ne-tool {
  height: 28px;
  min-width: 28px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-regular);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: var(--el-fill-color);
    color: var(--el-text-color-primary);
  }
}

.ne-sep {
  width: 1px;
  height: 16px;
  margin: 0 6px;
  background: var(--el-border-color);
}

.ne-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding-right: 4px;

  @media (max-width: 640px) {
    display: none;
  }
}

.ne-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  display: inline-block;
}

.ne-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 420px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    height: auto;
  }
}

.ne-input {
  height: 100%;

  :deep(.el-textarea__inner) {
    height: 100% !important;
    min-height: 240px !important;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    padding: 12px 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.7;
  }
}

.ne-preview {
  border-left: 1px solid var(--el-border-color-lighter);
  padding: 12px 16px;
  overflow-y: auto;
  min-width: 0;

  @media (max-width: 768px) {
    border-left: 0;
    border-top: 1px solid var(--el-border-color-lighter);
    max-height: 320px;
  }

  .ne-preview-label {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 8px;
  }

  .notice-body {
    max-height: none;
  }
}

.ne-empty {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
</style>
