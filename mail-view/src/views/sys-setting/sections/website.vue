<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('websiteSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('websiteReg') }}</span></div>
          <div>
            <el-switch @change="change('register')" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.register"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('loginDomain') }}</span></div>
          <div>
            <el-switch @change="change('loginDomain')" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.loginDomain"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('regKey') }}</span></div>
          <div>
            <el-select popper-class="sys-setting-popper"
                @change="change('regKey')"
                :style="`width: ${ locale === 'en' ?  100 : 80 }px;`"
                v-model="setting.regKey"
                placeholder="Select"
            >
              <el-option
                  v-for="item in regKeyOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <div class="setting-item" v-if="regKeyEnabled">
          <div>
            <span>{{ $t('regKeyHint') }}</span>
            <el-tooltip effect="dark" :content="$t('regKeyHintDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-input
              v-model="setting.regKeyHint"
              :placeholder="$t('regKeyHintPlaceholder')"
              style="width: 200px;"
              clearable
              @change="change('regKeyHint')"
            />
          </div>
        </div>
        <div class="setting-item" v-if="regKeyEnabled">
          <div>
            <span>{{ $t('regKeyLink') }}</span>
            <el-tooltip effect="dark" :content="$t('regKeyLinkDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-input
              v-model="setting.regKeyLink"
              :placeholder="$t('regKeyLinkPlaceholder')"
              style="width: 200px;"
              clearable
              @change="change('regKeyLink')"
            />
          </div>
        </div>
        <div class="setting-item">
          <div class="title-item"><span>{{ $t('websiteTitle') }}</span></div>
          <div class="email-title">
            <el-input v-model="editTitle" :aria-label="$t('websiteTitle')" :placeholder="$t('websiteTitle')" @keyup.enter="saveTitle" />
            <el-button type="primary" :loading="titleSaving" :disabled="titleSaving" @click="saveTitle">{{ $t('save') }}</el-button>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('websiteSubtitle') }}</span><el-tooltip :content="$t('websiteSubtitleDesc')"><Icon icon="mingcute:information-line" width="18" height="18" /></el-tooltip></div>
          <div class="email-title">
            <el-input v-model="editSubtitle" :aria-label="$t('websiteSubtitle')" :placeholder="$t('websiteSubtitlePlaceholder')" :maxlength="100" @keyup.enter="saveSubtitle" />
            <el-button type="primary" :loading="subtitleSaving" :disabled="subtitleSaving" @click="saveSubtitle">{{ $t('save') }}</el-button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import {computed, defineOptions, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {useSysSetting} from "../use-sys-setting.js";

defineOptions({
  name: 'sys-setting-website'
})

const {t, locale} = useI18n()
const {setting, editSetting, change, beforeChange, onSettingsLoaded, onSettingsDirty} = useSysSetting()

const editTitle = ref(''), editSubtitle = ref('')
const titleSaving = ref(false), subtitleSaving = ref(false)
let titleBaseline, subtitleBaseline

const regKeyEnabled = computed(() => setting.value.regKey === 0 || setting.value.regKey === 2)

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

onSettingsLoaded(() => {
  if (titleBaseline === undefined || editTitle.value === titleBaseline) {
    editTitle.value = setting.value.title
    titleBaseline = editTitle.value
  }
  if (subtitleBaseline === undefined || editSubtitle.value === subtitleBaseline) {
    editSubtitle.value = setting.value.subtitle || ''
    subtitleBaseline = editSubtitle.value
  }
})
onSettingsDirty(() => (titleBaseline !== undefined && editTitle.value !== titleBaseline) || (subtitleBaseline !== undefined && editSubtitle.value !== subtitleBaseline), () => {
  editTitle.value = setting.value.title;titleBaseline = editTitle.value
  editSubtitle.value = setting.value.subtitle || '';subtitleBaseline = editSubtitle.value
})

async function saveTitle() {
  if (titleSaving.value) return
  const saved = editTitle.value
  titleSaving.value = true
  try {
    if (await editSetting({title:saved})) titleBaseline = saved
  } finally { titleSaving.value = false }
}
async function saveSubtitle() {
  if (subtitleSaving.value) return
  const saved = editSubtitle.value.trim()
  subtitleSaving.value = true
  try {
    if (await editSetting({subtitle:saved})) {
      subtitleBaseline = saved
      editSubtitle.value = saved
    }
  } finally { subtitleSaving.value = false }
}
</script>

<style scoped lang="scss">
.email-title {
  font-weight: normal !important;
  display: flex;
  gap: 12px;
  align-items: center;
  width: 320px;
  max-width: 100%;
  min-width: 0;

  .el-input {
    flex: 1;
    width: 0;
    min-width: 0;
  }

  .el-button {
    margin-top: 0;
  }
}
</style>
