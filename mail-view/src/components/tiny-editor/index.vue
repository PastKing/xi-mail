<template>
  <div class="editor-box" :class="showLoading ? 'editor-box-loading' : ''">
    <loading class="loading" v-if="showLoading"/>
    <textarea v-else style="outline: none" :id="editorId" ref="editorRef"></textarea>
  </div>
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch, nextTick, shallowRef, defineEmits, computed} from 'vue';
import loading from "@/components/loading/index.vue";
import {useI18n} from 'vue-i18n'
import {ElMessage} from 'element-plus'
import {useUiStore} from '@/store/ui.js'
import {useSettingStore} from '@/store/setting.js'
import {compressImage, fileToBase64} from '@/utils/file-utils.js'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const COMPRESS_THRESHOLD = 1024 * 1024

defineExpose({
  clearEditor,
  focus,
  getContent
})

const props = defineProps({
  defValue: {
    type: String,
    default: ''
  },
  editorId: {
    type: String,
    default: () => `editor-${Date.now()}`
  }
});


const {locale, t} = useI18n()
const emit = defineEmits(['change','focus']);
const editor = shallowRef(null);
const isInitialized = ref(false);
const editorRef = ref(null);
const showLoading = ref(false);
const uiStore = useUiStore();
const settingStore = useSettingStore();
let keepContent = null;

onMounted(() => {
  initTinyMCE();
});

onBeforeUnmount(() => {
  destroyEditor();
});

watch(() => props.defValue, (newValue) => {
  if (editor.value && editor.value.getContent() !== newValue) {
    editor.value.setContent(newValue);
  }
});

watch(() => [uiStore.dark, settingStore.lang], () => {
  // 重建编辑器会丢掉正文和 blob 图片缓存，先把当前内容取出来带过去
  keepContent = editor.value ? editor.value.getContent() : null;
  destroyEditor();
  initEditor();
});

const language = computed(() => {
  if (locale.value === 'zh') {
    return 'zh_CN'
  }

  return 'en'
})

function clearEditor() {
  if (editor.value) {
    editor.value.setContent('');
  }
}

function initTinyMCE() {
  if (window.tinymce) {
    initEditor();
  } else {
    showLoading.value = true;
    const script = document.createElement('script');
    script.src = '/tinymce/tinymce.min.js';
    script.onload = () => initEditor();
    document.head.appendChild(script);
    showLoading.value = false;
  }
}

function initEditor() {
  window.tinymce.init({
    selector: `#${props.editorId}`,
    statusbar: false,
    height: "100%",
    auto_focus: true,
    //relative_urls: false,  //阻止 img标签域名和网站域名相同 自动把链接转换相对路径
    //remove_script_host: false, // 阻止删除 URL 中的域名
    forced_root_block: 'div',
    skin: `${uiStore.dark ? 'oxide-dark' : 'oxide'}`,
    content_css: `/tinymce/css/index.css,${uiStore.dark ? 'dark' : 'default'}`,
    content_style: `:root {
         --scrollbar-track-color: ${uiStore.dark ? '#141414' : '#FFFFFF'};
         --scrollbar-thumb-color: ${uiStore.dark ? '#8D9095' : '#A8ABB2'};
    }`,
    plugins: 'link image advlist lists  emoticons fullscreen  table preview code',
    toolbar: 'bold emoticons forecolor backcolor italic fontsize | alignleft aligncenter alignright alignjustify | outdent indent |  bullist numlist | link uploadimage  | table code preview fullscreen',
    toolbar_mode: 'scrolling',
    font_size_formats: '8px 10px 12px 14px 16px 18px 24px 36px',
    emoticons_search: false,
    language: language.value,
    language_load: true,
    menubar: false,
    license_key: 'gpl',
    noneditable_class: 'mceNonEditable',
    setup: (ed) => {
      editor.value = ed;

      ed.ui.registry.addButton('uploadimage', {
        icon: 'image',
        tooltip: t('insertImage'),
        onAction: () => pickImages(ed)
      });

      ed.on('init', () => {
        ed.setContent(keepContent ?? props.defValue);
        keepContent = null;
        isInitialized.value = true;
      });
      ed.on('input change', () => {
        const content = ed.getContent();
        const text = ed.getContent({format: 'text'});
        emit('change', content, text);
      });
      ed.on('focus', () => {
        emit('focus', focus);
      })
    },
    autofocus: true,
    branding: false,
    file_picker_types: 'image',
    image_dimensions: false,
    image_description: false,
    link_title: false,
    dialog_type: 'none',
    file_picker_callback: (callback) => {
      chooseImageFiles(false).then(async (files) => {
        const dataUrl = await toImageDataUrl(files[0]);
        if (dataUrl) {
          callback(dataUrl, {title: files[0].name});
        }
      });
    }
  });
}

// input 必须挂到文档上，否则 iOS Safari 和部分安卓 WebView 不会触发 change
function chooseImageFiles(multiple) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    const cleanup = () => input.remove();

    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      cleanup();
      resolve(files);
    });

    input.addEventListener('cancel', () => {
      cleanup();
      resolve([]);
    });

    input.click();
  });
}

async function toImageDataUrl(file) {
  if (!file) {
    return null;
  }

  if (!file.type.startsWith('image/')) {
    ElMessage({message: t('onlyImageMsg'), type: 'error', plain: true});
    return null;
  }

  let target = file;

  if (file.size > COMPRESS_THRESHOLD) {
    try {
      target = await compressImage(file, {quality: 0.8, convertSize: COMPRESS_THRESHOLD});
    } catch (e) {
      target = file;
    }
  }

  if (target.size > MAX_IMAGE_SIZE) {
    ElMessage({message: t('imageTooLargeMsg'), type: 'error', plain: true});
    return null;
  }

  const base64 = await fileToBase64(target);
  return `data:${target.type || file.type};base64,${base64}`;
}

// 直接插入正文，不再让用户在对话框里多点一次保存
async function pickImages(ed) {
  const files = await chooseImageFiles(true);

  if (files.length === 0) {
    return;
  }

  for (const file of files) {
    const dataUrl = await toImageDataUrl(file);
    if (dataUrl) {
      ed.insertContent(`<img src="${dataUrl}" style="max-width: 100%;">`);
    }
  }

  ed.focus();
  emit('change', ed.getContent(), ed.getContent({format: 'text'}));
}

function focus() {
  nextTick(() => {
    editor.value.focus()
  })
}

function getContent() {
  return editor.value.getContent()
}


function destroyEditor() {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
}
</script>

<style lang="scss" scoped>
.editor-box {
  height: 100%;
  width: 100%;
}

.loading {
  margin: auto;
}

.editor-box-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.tox-tbtn.tox-tbtn--select.tox-tbtn--bespoke) {
  width: 80px !important;
}

:deep(.tox.tox-tinymce.tox-fullscreen) {
  padding-right: 15px;
  padding-left: 15px;
  padding-bottom: 15px;
  background: var(--el-bg-color);
  @media (max-width: 767px) {
    padding-right: 10px;
    padding-left: 10px;
    padding-bottom: 10px;
  }
}

:deep(.tox-tinymce) {
  border: none;
  border-radius: 0;
}

:deep(.tox-toolbar__group) {
  padding-left: 0 !important;
  margin: 0 !important;
}

:deep(.tox-tbtn) {
  margin: 0 !important;
}

:deep(.tox .tox-edit-area::before) {
  display: none;
}

</style>
