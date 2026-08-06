<template>
  <div class="sys-setting-section">
    <div class="settings-card">
      <div class="card-title">{{ $t('websiteSetting') }}</div>
      <div class="card-content">
        <div class="setting-item">
          <div><span>{{ $t('websiteReg') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.register"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('loginDomain') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.loginDomain"/>
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('regKey') }}</span></div>
          <div>
            <el-select
                @change="change"
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
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item" v-if="regKeyEnabled">
          <div>
            <span>{{ $t('regKeyHintEn') }}</span>
            <el-tooltip effect="dark" :content="$t('regKeyHintEnDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div class="forward">
            <el-input
              v-model="setting.regKeyHintEn"
              :placeholder="$t('regKeyHintEnPlaceholder')"
              style="width: 200px;"
              clearable
              @change="change"
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
              @change="change"
            />
          </div>
        </div>
        <div class="setting-item">
          <div><span>{{ $t('addAccount') }}</span></div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.addEmail"/>
          </div>
        </div>
        <div class="setting-item">
          <div>
            <span>{{ $t('multipleEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('multipleEmailDesc')">
              <Icon class="warning" icon="mingcute:information-line" width="18" height="18"/>
            </el-tooltip>
          </div>
          <div>
            <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="setting.manyEmail"/>
          </div>
        </div>
        <div class="setting-item">
          <div class="title-item"><span>{{ $t('websiteTitle') }}</span></div>
          <div class="email-title">
            <span>{{ setting.title }}</span>
            <el-button class="opt-button" size="small" type="primary" @click="editTitleShow = true">
              <Icon icon="mingcute:edit-2-line" width="16" height="16"/>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog class="sys-setting-dialog ss-dialog-sm" v-model="editTitleShow" :title="$t('changeTitle')"
               @closed="editTitle = setting.title">
      <form>
        <el-input type="text" :placeholder="$t('websiteTitle')" v-model="editTitle"/>
        <el-button type="primary" :loading="settingLoading" @click="saveTitle">{{ $t('save') }}</el-button>
      </form>
    </el-dialog>
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
const {setting, settingLoading, editSetting, change, beforeChange, onSettingsLoaded} = useSysSetting()

const editTitleShow = ref(false)
const editTitle = ref('')

const regKeyEnabled = computed(() => setting.value.regKey === 0 || setting.value.regKey === 2)

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

onSettingsLoaded(() => {
  editTitle.value = setting.value.title
})

function saveTitle() {
  editSetting({title: editTitle.value}).then(ok => {
    if (ok) editTitleShow.value = false
  })
}
</script>

<style scoped lang="scss">
.email-title {
  font-weight: normal !important;
  display: flex;
  gap: 12px;
  align-items: center;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    padding: 6px 12px;
    border-radius: 6px;
    font-family: inherit;
  }

  .el-button {
    margin-top: 0;
  }
}
</style>
