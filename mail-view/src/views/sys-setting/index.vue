<template>
  <div class="settings-container">
    <div class="loading" :class="firstLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>
    <div class="settings-layout" v-if="!firstLoading">

      <!-- Left navigation -->
      <div class="settings-nav">
        <div
          v-for="sec in sections"
          :key="sec.id"
          class="sn-item"
          :class="{ active: activeSection === sec.id }"
          @click="activeSection = sec.id"
        >
          <Icon :icon="sec.icon" width="16" height="16" />
          <span>{{ $t(sec.label) }}</span>
        </div>
      </div>

      <!-- Right content -->
      <el-scrollbar class="settings-body">
        <div class="sb-inner">

          <!-- ── Section: website ── -->
          <div v-show="activeSection === 'website'">
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
              <div class="setting-item" v-if="setting.regKey === 0 || setting.regKey === 2">
                <div>
                  <span>{{ $t('regKeyHint') }}</span>
                  <el-tooltip effect="dark" :content="$t('regKeyHintDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
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
              <div class="setting-item" v-if="setting.regKey === 0 || setting.regKey === 2">
                <div>
                  <span>{{ $t('regKeyLink') }}</span>
                  <el-tooltip effect="dark" :content="$t('regKeyLinkDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
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
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
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
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          </div><!-- /section website -->

          <!-- ── Section: security ── -->
          <div v-show="activeSection === 'security'">
            <div class="settings-card">
              <div class="card-title">{{ $t('securitySetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('autoBan') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoBanDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="auto-ban-right">
                  <el-input-number v-model="setting.autoBanMonths" @change="change" :min="0" :max="120" :step="1" style="width: 110px;" />
                  <span class="ban-unit">{{ $t('month') }}</span>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('banMessage') }}</span>
                  <el-tooltip effect="dark" :content="$t('banMessageDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-input v-model="setting.banMessage" @change="change" style="width: 200px;" />
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('emailKeywordBlacklist') }}</span>
                  <el-tooltip effect="dark" :content="$t('emailKeywordBlacklistDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="keywordBlacklistShow = true">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('senderDomainBlacklist') }}</span>
                  <el-tooltip effect="dark" :content="$t('senderDomainBlacklistDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="senderDomainBlacklistShow = true">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>

            </div>
          </div>

          <!-- Global API Token Card -->
          <div class="settings-card">
            <div class="card-title">
              <div class="card-title-row">
                <span>{{ $t('globalToken') }}</span>
                <el-switch v-model="globalTokenEnabled" @change="onGlobalTokenEnabledChange" />
              </div>
            </div>
            <div class="card-content">
              <p class="global-token-desc">{{ $t('globalTokenDesc') }}</p>

              <template v-if="globalTokenEnabled">
                <!-- Token field -->
                <div class="gt-field-row">
                  <div class="gt-token-box">
                    <Icon icon="mdi:key-variant" width="15" height="15" class="gt-key-icon"/>
                    <span class="gt-token-text" :class="{ masked: !globalTokenVisible }">
                      {{ globalTokenVisible ? (globalToken || $t('noToken')) : (globalToken ? '•'.repeat(32) : $t('noToken')) }}
                    </span>
                  </div>
                  <div class="gt-actions">
                    <el-tooltip :content="globalTokenVisible ? $t('hide') : $t('show')">
                      <el-button size="small" circle plain @click="globalTokenVisible = !globalTokenVisible">
                        <Icon :icon="globalTokenVisible ? 'mdi:eye-off-outline' : 'mdi:eye-outline'" width="14" height="14"/>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip :content="$t('copy')" v-if="globalToken">
                      <el-button size="small" circle plain @click="copyGlobalToken">
                        <Icon icon="mdi:content-copy" width="14" height="14"/>
                      </el-button>
                    </el-tooltip>
                    <el-button size="small" type="primary" @click="onGenerateGlobalToken" :loading="globalTokenGenerating">
                      <Icon :icon="globalToken ? 'mdi:refresh' : 'mdi:plus'" width="14" height="14" style="margin-right:4px"/>
                      {{ globalToken ? $t('regenerate') : $t('generate') }}
                    </el-button>
                  </div>
                </div>

                <!-- API reference -->
                <div class="gt-api-box">
                  <div class="gt-api-title">{{ $t('globalTokenApiHint') }}</div>
                  <div class="gt-api-line">
                    <span class="gt-method">GET</span>
                    <code>/api/admin/mails?limit=20&amp;offset=0&amp;address=xxx@domain.com</code>
                  </div>
                  <div class="gt-api-line">
                    <span class="gt-header-label">Header</span>
                    <code>x-admin-auth: {{ globalTokenVisible && globalToken ? globalToken : '&lt;your-token&gt;' }}</code>
                  </div>
                  <div class="gt-api-line">
                    <span class="gt-header-label">{{ $t('globalTokenResp') }}</span>
                    <code>{ "results": [...], "count": N }</code>
                  </div>
                </div>
              </template>

              <div v-else class="gt-disabled-tip">
                <Icon icon="mdi:lock-outline" width="16" height="16"/>
                <span>{{ $t('globalTokenDisabledTip') }}</span>
              </div>
            </div>
          </div>

          </div><!-- /section security -->

          <!-- ── Section: registration ── -->
          <div v-show="activeSection === 'registration'">
            <div class="settings-card">
              <div class="card-title">{{ $t('emailAddressSetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('emailPrefix') }}</span>
                </div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="openEmailPrefix">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('randomPrefixLength') }}</span>
                  <el-tooltip effect="dark" :content="$t('randomPrefixDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-input-number size="small" v-model="setting.randomPrefixLength" @change="change" :min="4" :max="32" :step="1" style="width: 120px;" />
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('domainMapping') }}</span>
                  <el-tooltip effect="dark" :content="$t('domainMappingDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="domainMappingShow = true">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Email Sending Settings Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('emailSetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('receiveEmail') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.receive"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('autoRefresh') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoRefreshDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                      v-model="setting.autoRefresh"
                      placeholder="Select"
                  >
                    <el-option
                        v-for="item in authRefreshOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('sendEmail') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.send"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('noRecipientTitle') }}</span>
                  <el-tooltip effect="dark" :content="$t('noRecipientDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.noRecipient"/>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('resendToken') }}</span></div>
                <div>
                  <el-button class="opt-button" style="margin-top: 0" @click="openResendList" size="small"
                             type="primary">
                    <Icon icon="ic:round-list" width="18" height="18"/>
                  </el-button>
                  <el-button class="opt-button" style="margin-top: 0" @click="openResendForm" size="small"
                             type="primary">
                    <Icon icon="material-symbols:add-rounded" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          </div><!-- /section registration -->

          <!-- ── Section: domain ── -->
          <div v-show="activeSection === 'domain'">
            <div class="settings-card">
              <div class="card-title">{{ $t('domainManagement') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('domainList') }}</span>
                  <el-tooltip effect="dark" :content="$t('domainManagementDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="forward">
                  <span class="domain-count">{{ managedDomainsData.length }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openDomainManagement">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          </div><!-- /section domain -->

          <!-- ── Section: integration ── -->
          <div v-show="activeSection === 'integration'">
            <div class="settings-card">
              <div class="card-title">{{ $t('oss') }}</div>
            <div class="card-content">
              <div class="r2domain-item">
                <div>
                  <span>{{ $t('osDomain') }}</span>
                  <el-tooltip effect="dark" :content="$t('ossDomainDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="r2domain">
                  <span>{{ setting.r2Domain || '' }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="r2DomainShow = true">
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('s3Configuration') }}</span>
                </div>
                <div class="r2domain">
                  <el-button class="opt-button" size="small" type="primary" @click="addS3Show = true">
                    <Icon icon="fluent:settings-48-regular" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('storageType') }}</span>
                </div>
                <div class="r2domain">
                  <div class="storage-type">
                    <el-tag>{{ setting.storageType }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-title">{{ $t('emailPush') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('tgBot') }}</span></div>
                <div class="forward">
                  <span>{{ setting.tgBotStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openTgSetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('otherEmail') }}</span></div>
                <div class="forward">
                  <span>{{ setting.forwardStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openThirdEmailSetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('forwardingRules') }}</span></div>
                <div class="forward">
                  <span>{{ setting.ruleType === 0 ? $t('forwardAll') : $t('rules') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openForwardRules">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Turnstile Verification Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('turnstileSetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('signUpVerification') }}</span></div>
                <div>
                  <el-button class="opt-button" size="small" type="primary" @click="openRegVerifyCount">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                      v-model="setting.registerVerify"
                      placeholder="Select"
                      class="bot-verify-select"
                  >
                    <el-option key="1" :value="0" :label="$t('enable')"/>
                    <el-option key="1" :value="1" :label="$t('disable')"/>
                    <el-option key="1" :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('addEmailVerification') }}</span></div>
                <div>
                  <el-button class="opt-button" size="small" type="primary" @click="openAddVerifyCount">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                      v-model="setting.addEmailVerify"
                      placeholder="Select"
                      class="bot-verify-select"
                  >
                    <el-option key="1" :value="0" :label="$t('enable')"/>
                    <el-option key="1" :value="1" :label="$t('disable')"/>
                    <el-option key="1" :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>Site Key</span></div>
                <div class="bot-verify">
                  <span>{{ setting.siteKey }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="turnstileShow = true">
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>Secret Key</span></div>
                <div class="bot-verify">
                  <span> {{ setting.secretKey }} </span>
                  <el-button class="opt-button" size="small" type="primary" @click="turnstileShow = true">
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-title">{{ $t('noticeTitle') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('noticePopup') }}</span></div>
                <div class="forward">
                  <span>{{ setting.notice === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openNoticePopupSetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('popUp') }}</span></div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="openNoticePopup">
                    <Icon icon="mynaui:click-solid" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          </div><!-- /section integration -->

          <!-- ── Section: appearance ── -->
          <div v-show="activeSection === 'appearance'">
            <div class="settings-card appearance-card">
            <div class="card-title">{{ $t('appearance') }}</div>
            <div class="card-content">
              <!-- Color themes -->
              <div class="setting-item appearance-block">
                <div><span>{{ $t('colorTheme') }}</span></div>
                <div class="theme-swatches">
                  <button
                    v-for="theme in colorThemes"
                    :key="theme.id"
                    :class="['swatch', { active: setting.colorTheme === theme.id }]"
                    :style="{ background: theme.color }"
                    :title="theme.label"
                    @click="applyColorTheme(theme.id)"
                  >
                    <Icon v-if="setting.colorTheme === theme.id" icon="mingcute:check-fill" width="14" height="14" color="#fff" />
                  </button>
                </div>
              </div>
              <!-- Layout mode -->
              <div class="setting-item appearance-block">
                <div><span>{{ $t('layoutMode') }}</span></div>
                <div class="layout-options">
                  <button
                    v-for="mode in layoutModes"
                    :key="mode.id"
                    :class="['layout-opt', { active: setting.layoutMode === mode.id }]"
                    @click="applyLayoutMode(mode.id)"
                  >
                    <!-- default: full sidebar preview -->
                    <div v-if="mode.id === 'default'" class="layout-preview lp-default">
                      <div class="lp-sidebar">
                        <div class="lp-sb-item lp-sb-full"></div>
                        <div class="lp-sb-item lp-sb-full"></div>
                        <div class="lp-sb-item lp-sb-full"></div>
                      </div>
                      <div class="lp-content">
                        <div class="lp-top-bar"></div>
                        <div class="lp-body"></div>
                      </div>
                    </div>
                    <!-- compact: icon-only sidebar preview -->
                    <div v-else-if="mode.id === 'compact'" class="layout-preview lp-compact">
                      <div class="lp-sidebar lp-sidebar-sm">
                        <div class="lp-sb-item lp-sb-dot"></div>
                        <div class="lp-sb-item lp-sb-dot"></div>
                        <div class="lp-sb-item lp-sb-dot"></div>
                      </div>
                      <div class="lp-content">
                        <div class="lp-top-bar"></div>
                        <div class="lp-body"></div>
                      </div>
                    </div>
                    <!-- top: horizontal nav preview -->
                    <div v-else class="layout-preview lp-top">
                      <div class="lp-full-col">
                        <div class="lp-hbar">
                          <div class="lp-h-dot"></div>
                          <div class="lp-h-dot"></div>
                          <div class="lp-h-dot"></div>
                          <div class="lp-h-dot"></div>
                        </div>
                        <div class="lp-top-bar"></div>
                        <div class="lp-body"></div>
                      </div>
                    </div>
                    <span class="tpl-label">{{ mode.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Login templates -->
              <div class="setting-item appearance-block">
                <div><span>{{ $t('loginTemplate') }}</span></div>
                <div class="template-previews">
                  <button
                    v-for="tpl in loginTemplates"
                    :key="tpl.id"
                    :class="['tpl-card', { active: setting.loginTemplate === tpl.id }]"
                    @click="applyLoginTemplate(tpl.id)"
                  >
                    <!-- Gradient preview -->
                    <div v-if="tpl.id === 'gradient'" class="tpl-preview tpl-gradient">
                      <div class="tpl-orb tpl-orb-1"></div>
                      <div class="tpl-orb tpl-orb-2"></div>
                      <div class="tpl-card-inner"></div>
                    </div>
                    <!-- Minimal preview -->
                    <div v-else-if="tpl.id === 'minimal'" class="tpl-preview tpl-minimal">
                      <div class="tpl-card-inner tpl-minimal-card"></div>
                    </div>
                    <!-- Split preview -->
                    <div v-else class="tpl-preview tpl-split">
                      <div class="tpl-split-left"></div>
                      <div class="tpl-split-right">
                        <div class="tpl-card-inner tpl-split-card"></div>
                      </div>
                    </div>
                    <span class="tpl-label">{{ tpl.label }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          </div><!-- /section appearance -->

          <!-- ── Section: sub-workers ── -->
          <div v-show="activeSection === 'sub-workers'">
            <div class="settings-card">
              <div class="card-title">{{ $t('subWorkerManage') }}</div>
              <div class="card-content">
                <div class="sub-worker-toolbar">
                  <span class="domain-count">{{ subWorkers.length }} {{ $t('subWorkerManage') }}</span>
                  <el-button type="primary" size="small" @click="subWorkerDialogShow = true">
                    <Icon icon="mingcute:add-line" width="14" height="14" style="margin-right: 4px;" />
                    {{ $t('subWorkerAdd') }}
                  </el-button>
                </div>

                <div v-if="subWorkers.length === 0" class="domain-empty">{{ $t('subWorkerEmpty') }}</div>

                <div v-else class="domain-list">
                  <div v-for="sw in subWorkers" :key="sw.id" class="domain-row">
                    <div class="sw-info">
                      <span class="domain-name">{{ sw.name }}</span>
                      <span class="sw-domains-tag" v-for="d in sw.domains" :key="d">{{ d }}</span>
                    </div>
                    <div class="domain-actions">
                      <el-tag :type="sw.status ? 'success' : 'info'" size="small">
                        {{ sw.status ? $t('subWorkerEnabled') : $t('subWorkerDisabled') }}
                      </el-tag>
                      <el-switch
                        :model-value="!!sw.status"
                        size="small"
                        @change="toggleSubWorkerStatus(sw)"
                      />
                      <el-button size="small" type="danger" plain @click="deleteSubWorker(sw)">
                        <Icon icon="mingcute:delete-2-line" width="14" height="14" />
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div><!-- /section sub-workers -->

          <!-- ── Section: servers (standalone only) ── -->
          <div v-show="activeSection === 'servers'">
            <div class="settings-card">
              <div class="card-title">{{ $t('serverManage') }}</div>
              <div class="card-content">
                <ServerManager />
              </div>
            </div>
          </div><!-- /section servers -->

          <!-- ── Section: about ── -->
          <div v-show="activeSection === 'about'">
            <div class="settings-card about">
              <div class="card-title">{{ $t('about') }}</div>
            <div class="card-content">
              <div class="concerning-item">
                <span>{{ $t('version') }} :</span>
                <el-badge is-dot :hidden="!hasUpdate">
                  <el-button @click="jump('https://github.com/PastKing/xi-mail/releases')">
                    {{ currentVersion }}
                    <template #icon>
                      <Icon icon="qlementine-icons:version-control-16" style="font-size: 20px" color="#1890FF"/>
                    </template>
                  </el-button>
                </el-badge>
              </div>
              <div class="concerning-item">
                <span>{{ $t('community') }} : </span>
                <div class="community">
                  <el-button @click="jump('https://github.com/PastKing/xi-mail')">
                    Github
                    <template #icon>
                      <Icon icon="codicon:github-inverted" width="22" height="22"/>
                    </template>
                  </el-button>
                  <el-button @click="jump('https://t.me/pk_oa')">
                    Telegram
                    <template #icon>
                      <Icon icon="logos:telegram" width="30" height="30"/>
                    </template>
                  </el-button>
                </div>
              </div>
              <div class="concerning-item">
                <span>{{ $t('donate') }} : </span>
                <div class="donate-box">
                  <div class="donate-row">
                    <span class="donate-chain bep20">BEP20</span>
                    <code class="donate-addr" @click="copyAddr('0x555390f5c07cf76cc344f42612196e8669e3586b')">
                      0x555390f5c07cf76cc344f42612196e8669e3586b
                    </code>
                    <el-tooltip :content="$t('copy')">
                      <el-button circle size="small" plain @click="copyAddr('0x555390f5c07cf76cc344f42612196e8669e3586b')">
                        <Icon icon="mdi:content-copy" width="13" height="13"/>
                      </el-button>
                    </el-tooltip>
                  </div>
                  <div class="donate-row">
                    <span class="donate-chain trc20">TRC20</span>
                    <code class="donate-addr" @click="copyAddr('TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G')">
                      TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G
                    </code>
                    <el-tooltip :content="$t('copy')">
                      <el-button circle size="small" plain @click="copyAddr('TVqK4thJCsaaWvp1Dah9F5CFZ1iqw75f4G')">
                        <Icon icon="mdi:content-copy" width="13" height="13"/>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div><!-- /about card -->
          </div><!-- /section about -->

        </div><!-- /sb-inner -->
      </el-scrollbar><!-- /settings-body -->
    </div><!-- /settings-layout -->

    <!-- Dialogs -->
      <el-dialog v-model="editTitleShow" :title="$t('changeTitle')" width="340" @closed="editTitle = setting.title">
        <form>
          <el-input type="text" :placeholder="$t('websiteTitle')" v-model="editTitle"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTitle">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="resendTokenFormShow" :title="$t('resendToken')" width="340" @closed="cleanResendTokenForm">
        <form>
          <el-select style="margin-bottom: 15px" v-model="resendTokenForm.domain" placeholder="Select">
            <el-option
                v-for="item in settingStore.domainList"
                :key="item"
                :label="item"
                :value="item"
            />
          </el-select>
          <el-input type="text" :placeholder="$t('addResendTokenDesc')" v-model="resendTokenForm.token"/>
          <el-button type="primary" :loading="settingLoading" @click="saveResendToken">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="r2DomainShow" :title="$t('addOsDomain')" width="340"
                 @closed="r2DomainInput = setting.r2Domain">
        <form>
          <el-input type="text" :placeholder="$t('domainDesc')" v-model="r2DomainInput"/>
          <el-button type="primary" :loading="settingLoading" @click="saveR2domain">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="turnstileShow" :title="$t('addTurnstileSecret')" width="340"
                 @closed="turnstileForm.secretKey = '';turnstileForm.siteKey = ''">
        <form>
          <el-input type="text" placeholder="Site Key" v-model="turnstileForm.siteKey"/>
          <el-input type="text" style="margin-top: 15px" placeholder="Secret Key" v-model="turnstileForm.secretKey"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTurnstileKey">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog
          v-model="tgSettingShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('tgBot') }}</span>
            <el-tooltip effect="dark" :content="$t('tgBotDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="$t('tgBotToken')" v-model="tgBotToken"></el-input>
          <el-input-tag tag-type="warning" :placeholder="$t('toBotTokenDesc')" v-model="tgChatId"
                        @add-tag="addChatTag"></el-input-tag>
          <el-input tag-type="warning" :placeholder="$t('customDomainDesc')" v-model="customDomain" ></el-input>
          <div class="tg-msg-label">
            <span>{{t('from')}}</span>
            <el-select  v-model="tgMsgFrom" >
              <el-option
                  v-for="item in tgMsgFromOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('recipient')}}</span>
            <el-select  v-model="tgMsgTo" >
              <el-option
                  v-for="item in tgMsgToOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('emailText')}}</span>
            <el-select  v-model="tgMsgText" >
              <el-option
                  v-for="item in tgMsgTextOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="tgBotStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="tgBotSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="thirdEmailShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('otherEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('otherEmailDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input-tag tag-type="warning" :placeholder="$t('otherEmailInputDesc')" v-model="forwardEmail"
                        @add-tag="emailAddTag"></el-input-tag>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="forwardStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="forwardEmailSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="forwardRulesShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('forwardingRules') }}</span>
            <el-tooltip effect="dark" :content="$t('forwardingRulesDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input-tag :placeholder="$t('ruleEmailsInputDesc')" tag-type="success" v-model="ruleEmail"
                        @add-tag="ruleEmailAddTag"/>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-radio-group v-model="ruleType">
              <el-radio :value="0">{{ $t('forwardAll') }}</el-radio>
              <el-radio :value="1">{{ $t('rules') }}</el-radio>
            </el-radio-group>
            <el-button :loading="settingLoading" type="primary" @click="ruleEmailSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog class="resend-table" v-model="showResendList" :title="$t('resendTokenList')">
        <el-table :data="resendList">
          <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column :width="tokenColumnWidth" property="value" label="Token" fixed="right"
                           :show-overflow-tooltip="true"/>
        </el-table>
      </el-dialog>
      <el-dialog v-model="regVerifyCountShow" :title="$t('rulesVerifyTitle',{count: regVerifyCount})"
                 @closed="regVerifyCount = setting.regVerifyCount">
        <form>
          <el-input-number type="text" v-model="regVerifyCount" :min="1">
          </el-input-number>
          <el-button type="primary" :loading="settingLoading" @click="saveRegVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="addVerifyCountShow" :title="$t('rulesVerifyTitle',{count: addVerifyCount})"
                 @closed="addVerifyCount = setting.addVerifyCount">
        <form>
          <el-input-number type="text" v-model="addVerifyCount" :min="1"/>
          <el-button type="primary" :loading="settingLoading" @click="saveAddVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog top="5vh" v-model="noticePopupShow" :title="$t('noticePopup')" class="notice-popup"
                 @closed="resetNoticeForm">
        <form>
          <div class="notice-form-row">
            <span class="notice-form-label">{{ $t('title') }}</span>
            <el-input v-model="noticeForm.noticeTitle" :placeholder="t('titleDesc')"/>
          </div>
          <div class="notice-form-row">
            <span class="notice-form-label">{{ $t('width') }}</span>
            <el-input-number v-model="noticeForm.noticeWidth" :min="300" :max="1200" style="width:100%">
              <template #suffix>px</template>
            </el-input-number>
          </div>
          <div class="notice-popup-item">
            <el-input
                v-model="noticeForm.noticeContent"
                :autosize="{ minRows: 15, maxRows: 25 }"
                type="textarea"
                :placeholder="t('noticeContentDesc')"
            />
          </div>
        </form>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="noticeForm.notice" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div>
              <el-button @click="previewNoticePopup">
                {{ $t('preview') }}
              </el-button>
              <el-button :loading="settingLoading" type="primary" @click="saveNoticePopup">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog v-model="addS3Show" :title="t('s3Configuration')" width="340" @closed="resetAddS3Form">
        <form>
          <el-input class="dialog-input" type="text" placeholder="Bucket" v-model="s3.bucket"/>
          <el-input class="dialog-input" type="text" placeholder="Endpoint" v-model="s3.endpoint"/>
          <el-input class="dialog-input" type="text" placeholder="Region" v-model="s3.region"/>
          <el-input class="dialog-input" type="text" :placeholder="setting.s3AccessKey || 'Access Key'"
                    v-model="s3.s3AccessKey"/>
          <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.s3SecretKey || 'Secret Key'" v-model="s3.s3SecretKey"/>
          <div class="force-path-style">
            <div class="force-path-style-left">
              <span>ForcePathStyle</span>
              <el-tooltip effect="dark" :content="$t('forcePathStyleDesc')">
                <Icon class="warning" icon="fe:warning" width="18" height="18"/>
              </el-tooltip>
            </div>
            <el-switch :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="s3.forcePathStyle"/>
          </div>
          <div class="s3-button">
            <el-button :loading="clearS3Loading" @click="clearS3">{{ t('clear') }}</el-button>
            <el-button type="primary" :loading="settingLoading && !clearS3Loading" @click="saveS3">{{ t('save') }}</el-button>
          </div>
        </form>
      </el-dialog>
      <el-dialog v-model="domainManagementShow" :title="$t('domainManagement')" width="460" @closed="resetDomainForm">
        <div class="domain-management">
          <div class="domain-add-row">
            <el-input
              v-model="newDomainInput"
              :placeholder="$t('domainPlaceholder')"
              @keyup.enter="addDomain"
              style="flex:1"
            />
            <el-button type="primary" @click="addDomain">{{ $t('add') }}</el-button>
          </div>
          <div v-if="managedDomainsData.length === 0" class="domain-empty">{{ $t('noDomains') }}</div>
          <div v-else class="domain-list">
            <div v-for="(item, idx) in managedDomainsData" :key="item.domain" class="domain-row">
              <span class="domain-name">{{ item.domain }}</span>
              <div class="domain-actions">
                <el-switch
                  v-model="item.enabled"
                  :active-value="true"
                  :inactive-value="false"
                  size="small"
                  @change="() => domainItemChange()"
                />
                <el-button size="small" type="danger" text @click="removeDomain(idx)">
                  <Icon icon="material-symbols:delete-outline-rounded" width="16" height="16"/>
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="domainManagementShow = false">{{ $t('cancel') }}</el-button>
            <el-button type="primary" :loading="settingLoading" @click="saveDomains">{{ $t('save') }}</el-button>
          </div>
        </template>
      </el-dialog>

      <el-dialog v-model="emailPrefixShow" :title="t('emailPrefix')"  @closed="resetEmailPrefix"  >
        <div class="email-prefix">
          <div>{{ t('atLeast') }}</div>
          <el-input-number v-model="minEmailPrefix" :min="1" :max="20" style="width: 150px" >
            <template #suffix>
              <span>{{ t('character') }}</span>
            </template>
          </el-input-number>
        </div>
        <div class="prefix-filter">
          <div style="margin-bottom: 10px;">{{ t('mustNotContain') }}</div>
          <el-input-tag style="margin-bottom: 10px;" v-model="emailPrefixFilter" :placeholder="t('mustNotContainDesc')"  />
        </div>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveEmailPrefix">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="domainMappingShow" :title="t('domainMapping')" class="mapping-dialog">
        <div class="mapping-list">
          <div v-for="(val, key) in domainMappingData" :key="key" class="mapping-row">
            <el-tag size="small" type="info" class="mapping-source">{{ key }}</el-tag>
            <Icon icon="mingcute:arrow-right-line" width="14" height="14" style="flex-shrink: 0; color: var(--el-text-color-secondary);" />
            <el-input size="small" v-model="domainMappingData[key]" :placeholder="t('displayDomain')" style="flex: 1;" />
            <el-button size="small" type="danger" link @click="delete domainMappingData[key]">
              <Icon icon="material-symbols:delete-outline-rounded" width="16" height="16"/>
            </el-button>
          </div>
          <div class="mapping-row">
            <el-select
                size="small"
                v-model="newMappingSource"
                filterable
                allow-create
                default-first-option
                :placeholder="t('sourceDomain')"
                style="flex: 1;"
            >
              <el-option
                  v-for="d in systemDomains"
                  :key="d"
                  :label="d"
                  :value="d"
                  :disabled="!!domainMappingData[d]"
              />
            </el-select>
            <Icon icon="mingcute:arrow-right-line" width="14" height="14" style="flex-shrink: 0; color: var(--el-text-color-secondary);" />
            <el-input size="small" v-model="newMappingDisplay" :placeholder="t('displayDomain')" style="flex: 1;" />
            <el-button size="small" type="primary" link @click="addDomainMapping">
              <Icon icon="material-symbols:add-rounded" width="16" height="16"/>
            </el-button>
          </div>
          <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveDomainMapping">{{ $t('save') }}</el-button>
        </div>
      </el-dialog>
      <el-dialog v-model="keywordBlacklistShow" :title="t('emailKeywordBlacklist')" @closed="resetKeywordBlacklist">
        <div class="keyword-blacklist">
          <div style="margin-bottom: 10px; font-size: 13px; color: var(--el-text-color-secondary);">{{ t('emailKeywordBlacklistHint') }}</div>
          <el-input-tag style="margin-bottom: 10px;" v-model="keywordBlacklistData" :placeholder="t('emailKeywordBlacklistPlaceholder')" />
          <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveKeywordBlacklist">{{ $t('save') }}</el-button>
        </div>
      </el-dialog>
      <el-dialog v-model="senderDomainBlacklistShow" :title="t('senderDomainBlacklist')" @closed="resetSenderDomainBlacklist">
        <div class="keyword-blacklist">
          <div style="margin-bottom: 10px; font-size: 13px; color: var(--el-text-color-secondary);">{{ t('senderDomainBlacklistHint') }}</div>
          <el-input-tag style="margin-bottom: 10px;" v-model="senderDomainBlacklistData" :placeholder="t('senderDomainBlacklistPlaceholder')" />
          <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveSenderDomainBlacklist">{{ $t('save') }}</el-button>
        </div>
      </el-dialog>

      <!-- Sub-worker add dialog -->
      <el-dialog v-model="subWorkerDialogShow" :title="t('subWorkerAdd')" width="420" @closed="resetSubWorkerForm">
        <div class="sub-worker-form">
          <div class="setup-field">
            <label>{{ $t('subWorkerName') }}</label>
            <el-input v-model="subWorkerForm.name" :placeholder="$t('subWorkerNamePlaceholder')" />
          </div>
          <div class="setup-field">
            <label>{{ $t('subWorkerUrl') }}</label>
            <el-input v-model="subWorkerForm.url" :placeholder="$t('subWorkerUrlPlaceholder')" />
          </div>
          <div class="setup-field">
            <label>{{ $t('subWorkerToken') }}</label>
            <el-input v-model="subWorkerForm.apiToken" :placeholder="$t('subWorkerTokenPlaceholder')" show-password />
          </div>
          <div class="sub-worker-form-actions">
            <el-button @click="testSubWorker" :loading="subWorkerTesting" :disabled="!subWorkerForm.url || !subWorkerForm.apiToken">
              {{ $t('subWorkerTestConnect') }}
            </el-button>
            <el-button type="primary" @click="addSubWorker" :loading="subWorkerAdding" :disabled="!subWorkerForm.url || !subWorkerForm.apiToken || !subWorkerForm.name">
              {{ $t('save') }}
            </el-button>
          </div>
        </div>
      </el-dialog>
  </div>
</template>

<script setup>
import {computed, defineOptions, reactive, ref} from "vue";
import {settingQuery, settingSet, getGlobalToken, setGlobalTokenEnabled, generateGlobalToken} from "@/request/setting.js";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useAccountStore} from "@/store/account.js";
import {Icon} from "@iconify/vue";
import {storeToRefs} from "pinia";
import {isEmail} from "@/utils/verify-utils.js";
import loading from "@/components/loading/index.vue";
import {getTextWidth} from "@/utils/text.js";
import {useI18n} from 'vue-i18n';
import axios from "axios";
import {useServerStore as useServerStoreRef} from "@/store/server.js";
import ServerManager from "@/components/server-manager/index.vue";
import {subWorkerList, subWorkerAdd as subWorkerAddApi, subWorkerTest as subWorkerTestApi, subWorkerDelete as subWorkerDeleteApi, subWorkerSetStatus} from "@/request/sub-worker.js";

defineOptions({
  name: 'sys-setting'
})

const currentVersion = 'v3.1.0'

/* ── Settings navigation ── */
const activeSection = ref('website')

const serverStoreRef = useServerStoreRef()
const sections = computed(() => {
  const list = [
    { id: 'website',     icon: 'mingcute:home-4-line',      label: 'websiteSetting' },
    { id: 'security',    icon: 'mingcute:shield-line',       label: 'securitySetting' },
    { id: 'registration',icon: 'mingcute:user-add-line',     label: 'emailAddressSetting' },
    { id: 'domain',      icon: 'mingcute:world-2-line',      label: 'domainManagement' },
    { id: 'integration', icon: 'mingcute:plug-2-line',       label: 'integration' },
    { id: 'sub-workers', icon: 'mingcute:server-line',       label: 'subWorkerManage' },
    { id: 'appearance',  icon: 'mingcute:palette-line',      label: 'appearance' },
  ]
  if (serverStoreRef.isStandalone) {
    list.push({ id: 'servers', icon: 'mingcute:cloud-line', label: 'serverManage' })
  }
  list.push({ id: 'about', icon: 'mingcute:information-line', label: 'about' })
  return list
})
const hasUpdate = ref(false)
let getUpdateErrorCount = 1;
const {t, locale} = useI18n();
const firstLoading = ref(true)
const accountStore = useAccountStore();
const userStore = useUserStore();
const editTitleShow = ref(false)
const resendTokenFormShow = ref(false)
const r2DomainShow = ref(false)
const turnstileShow = ref(false)
const tgSettingShow = ref(false)
const noticePopupShow = ref(false)
const thirdEmailShow = ref(false)
const forwardRulesShow = ref(false)
const emailPrefixShow = ref(false)
const showResendList = ref(false)
const settingStore = useSettingStore();
const uiStore = useUiStore();
const {settings: setting} = storeToRefs(settingStore);
const editTitle = ref('')
const settingLoading = ref(false)
const clearS3Loading = ref(false)
const r2DomainInput = ref('')
const minEmailPrefix = ref(0)
const emailPrefixFilter = ref([])
const domainMappingShow = ref(false)
const domainMappingData = reactive({})
const newMappingSource = ref('')
const newMappingDisplay = ref('')
const keywordBlacklistShow = ref(false)
const keywordBlacklistData = ref([])
const senderDomainBlacklistShow = ref(false)
const senderDomainBlacklistData = ref([])
const subWorkerDialogShow = ref(false)
const subWorkerTesting = ref(false)
const subWorkerAdding = ref(false)
const subWorkers = ref([])
const subWorkerForm = reactive({ name: '', url: '', apiToken: '' })
const domainManagementShow = ref(false)
const managedDomainsData = ref([])
const newDomainInput = ref('')

const systemDomains = computed(() => {
  return (settingStore.domainList || []).map(d => d.replace(/^@/, ''))
})

const colorThemes = computed(() => [
  { id: 'indigo',  color: '#6366f1', label: 'Indigo'  },
  { id: 'rose',    color: '#f43f5e', label: 'Rose'    },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'amber',   color: '#f59e0b', label: 'Amber'   },
  { id: 'sky',     color: '#0ea5e9', label: 'Sky'     },
  { id: 'purple',  color: '#a855f7', label: 'Purple'  },
])

const loginTemplates = computed(() => [
  { id: 'gradient', label: t('templateGradient') },
  { id: 'minimal',  label: t('templateMinimal')  },
  { id: 'split',    label: t('templateSplit')     },
])

function applyColorTheme(id) {
  setting.value.colorTheme = id
  document.documentElement.dataset.colorTheme = id
  editSetting({ colorTheme: id })
}

function applyLoginTemplate(id) {
  setting.value.loginTemplate = id
  editSetting({ loginTemplate: id })
}

const layoutModes = computed(() => [
  { id: 'default', label: t('layoutDefault') },
  { id: 'compact', label: t('layoutCompact') },
  { id: 'top',     label: t('layoutTop') },
])

function applyLayoutMode(id) {
  setting.value.layoutMode = id
  editSetting({ layoutMode: id })
}
let regVerifyCount = ref(1)
let addVerifyCount = ref(1)
let backup = '{}'
const addS3Show = ref(false)
const addVerifyCountShow = ref(false)
const regVerifyCountShow = ref(false)

const globalToken = ref('')
const globalTokenEnabled = ref(false)
const globalTokenVisible = ref(false)
const globalTokenGenerating = ref(false)
const resendTokenForm = reactive({
  domain: '',
  token: '',
})
const turnstileForm = reactive({
  siteKey: '',
  secretKey: ''
})

const s3 = reactive({
  bucket: '',
  endpoint: '',
  region: '',
  s3AccessKey: '',
  s3SecretKey: '',
  forcePathStyle: 1
})

const noticeForm = reactive({
  noticeTitle: '',
  noticeContent: '',
  noticeType: '',
  noticeDuration: '',
  noticePosition: '',
  noticeOffset: 0,
  notice: 0,
  noticeWidth: 0
})

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

const authRefreshOptions = computed(() => [
  {label: t('disable'), value: 0},
  {label: '3s', value: 3},
  {label: '5s', value: 5},
  {label: '10s', value: 10},
  {label: '15s', value: 15},
  {label: '20s', value: 20},
])

const tgChatId = ref([])
const customDomain = ref('')
const tgBotStatus = ref(0)
const tgBotToken = ref('')
const forwardEmail = ref([])
const forwardStatus = ref(0)
const emailColumnWidth = ref(0)
const tokenColumnWidth = ref(0)
const ruleType = ref(0)
const ruleEmail = ref([])
const tgMsgFrom = ref('')
const tgMsgTo = ref('')
const tgMsgText = ref('')

const tgMsgFromOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}, {label: t('onlyName'), value:'only-name'}]
const tgMsgToOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgTextOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgLabelWidth = computed(() => locale.value === 'en' ? '120px' : '100px');

getSettings()
getUpdate()
loadGlobalToken()

function loadGlobalToken() {
  getGlobalToken().then(data => {
    globalToken.value = data.token || ''
    globalTokenEnabled.value = !!data.enabled
  }).catch(() => {})
}

function onGlobalTokenEnabledChange(val) {
  setGlobalTokenEnabled(val).catch(() => {
    globalTokenEnabled.value = !val
    ElMessage.error(t('saveFail'))
  })
}

async function onGenerateGlobalToken() {
  globalTokenGenerating.value = true
  try {
    const data = await generateGlobalToken()
    globalToken.value = data.token
    globalTokenVisible.value = true
    ElMessage.success(t('generateSuccess'))
  } catch {
    ElMessage.error(t('saveFail'))
  } finally {
    globalTokenGenerating.value = false
  }
}

function copyGlobalToken() {
  if (!globalToken.value) return
  navigator.clipboard.writeText(globalToken.value).then(() => {
    ElMessage.success(t('copySuccess'))
  }).catch(() => {
    ElMessage.error(t('copyFail'))
  })
}

function copyAddr(addr) {
  navigator.clipboard.writeText(addr).then(() => {
    ElMessage.success(t('copySuccess'))
  }).catch(() => {
    ElMessage.error(t('copyFail'))
  })
}

function getSettings() {
  settingQuery().then(settingData => {
    setting.value = settingData
    settingStore.domainList = settingData.domainList;
    Object.assign(domainMappingData, setting.value.domainMapping || {})
    keywordBlacklistData.value = Array.isArray(setting.value.emailKeywordBlacklist)
      ? [...setting.value.emailKeywordBlacklist]
      : (setting.value.emailKeywordBlacklist || '').split(',').filter(Boolean)
    senderDomainBlacklistData.value = Array.isArray(setting.value.senderDomainBlacklist)
      ? [...setting.value.senderDomainBlacklist]
      : (setting.value.senderDomainBlacklist || '').split(',').filter(Boolean)
    resendTokenForm.domain = setting.value.domainList[0]
    minEmailPrefix.value = setting.value.minEmailPrefix
    // Init managed domains: use stored list or seed from env domainList
    if (setting.value.managedDomains && setting.value.managedDomains.length > 0) {
      managedDomainsData.value = setting.value.managedDomains.map(d =>
        typeof d === 'string' ? { domain: d, enabled: true } : { ...d }
      )
    } else {
      managedDomainsData.value = (setting.value.domainList || []).map(d => ({
        domain: d.replace(/^@/, ''),
        enabled: true
      }))
    }
    firstLoading.value = false
    // Apply saved color theme immediately in settings page
    if (setting.value.colorTheme) {
      document.documentElement.dataset.colorTheme = setting.value.colorTheme
    }
    editTitle.value = setting.value.title
    r2DomainInput.value = setting.value.r2Domain
    addVerifyCount.value = setting.value.addVerifyCount
    regVerifyCount.value = setting.value.regVerifyCount
    resetNoticeForm()
    resetAddS3Form()
    resetEmailPrefix()
  })
}


function openDomainManagement() {
  domainManagementShow.value = true
}

function resetDomainForm() {
  newDomainInput.value = ''
}

function addDomain() {
  const d = newDomainInput.value.trim().replace(/^@/, '').toLowerCase()
  if (!d) return
  if (managedDomainsData.value.some(item => item.domain === d)) {
    ElMessage.warning(t('domainExists'))
    return
  }
  managedDomainsData.value.push({ domain: d, enabled: true })
  newDomainInput.value = ''
}

function removeDomain(idx) {
  managedDomainsData.value.splice(idx, 1)
}

function domainItemChange() {
  // no-op, reactive binding handles it
}

function saveDomains() {
  const domains = managedDomainsData.value.filter(d => d.domain)
  editSetting({ managedDomains: domains })
  domainManagementShow.value = false
}

function openNoticePopup() {
  uiStore.showNotice()
}

function openAddVerifyCount() {
  if (settingLoading.value) return
  addVerifyCountShow.value = true
}

function openRegVerifyCount() {
  if (settingLoading.value) return
  regVerifyCountShow.value = true
}

function resetAddS3Form() {
  s3.bucket = setting.value.bucket
  s3.endpoint = setting.value.endpoint
  s3.region = setting.value.region
  s3.s3AccessKey = ''
  s3.s3SecretKey = ''
  s3.forcePathStyle = setting.value.forcePathStyle
}

const resendList = computed(() => {

  let list = Object.keys(setting.value.resendTokens).map(key => {
    return {
      key: key,
      value: setting.value.resendTokens[key]
    };
  })

  if (list.length > 0) {

    const key = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'key')).key;
    emailColumnWidth.value = getTextWidth(key) + 30;

    const value = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'value')).value;
    tokenColumnWidth.value = getTextWidth(value) + 30;

  }

  return list;
});

function loadSubWorkers() {
  subWorkerList().then(list => { subWorkers.value = list || [] }).catch(() => {})
}
loadSubWorkers()

function resetSubWorkerForm() {
  subWorkerForm.name = ''
  subWorkerForm.url = ''
  subWorkerForm.apiToken = ''
}

function testSubWorker() {
  subWorkerTesting.value = true
  subWorkerTestApi({ url: subWorkerForm.url, apiToken: subWorkerForm.apiToken }).then(data => {
    const domains = data?.domains || []
    ElMessage({ message: t('subWorkerTestSuccess', { count: domains.length }), type: 'success', plain: true })
  }).catch(() => {
    ElMessage({ message: t('subWorkerTestFail'), type: 'error', plain: true })
  }).finally(() => { subWorkerTesting.value = false })
}

function addSubWorker() {
  subWorkerAdding.value = true
  subWorkerAddApi(subWorkerForm).then(() => {
    ElMessage({ message: t('subWorkerAddSuccess'), type: 'success', plain: true })
    subWorkerDialogShow.value = false
    loadSubWorkers()
  }).catch(() => {}).finally(() => { subWorkerAdding.value = false })
}

function deleteSubWorker(sw) {
  ElMessageBox.confirm(t('subWorkerDeleteConfirm'), { type: 'warning' }).then(() => {
    subWorkerDeleteApi(sw.id).then(() => { loadSubWorkers() })
  }).catch(() => {})
}

function toggleSubWorkerStatus(sw) {
  subWorkerSetStatus(sw.id, sw.status ? 0 : 1).then(() => { loadSubWorkers() })
}

function getUpdate() {
  if (getUpdateErrorCount > 5 || !getUpdateErrorCount) return
  axios.get('https://api.github.com/repos/PastKing/xi-mail/releases/latest').then(({data}) => {
    hasUpdate.value = data.name !== currentVersion
    getUpdateErrorCount = 0
  }).catch(e => {
    getUpdateErrorCount++
    setTimeout(() => {
      getUpdate()
    }, 2000)
    console.error('检查更新失败：', e)
  })
}

function saveAddVerifyCount() {
  if (!addVerifyCount.value) {
    addVerifyCount.value = 1
  }
  editSetting({addVerifyCount: addVerifyCount.value})
}

function saveRegVerifyCount() {
  if (!regVerifyCount.value) {
    regVerifyCount.value = 1
  }
  editSetting({regVerifyCount: regVerifyCount.value})
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};


function openTgSetting() {
  tgBotStatus.value = setting.value.tgBotStatus
  tgBotToken.value = setting.value.tgBotToken
  customDomain.value = setting.value.customDomain
  tgMsgFrom.value = setting.value.tgMsgFrom
  tgMsgText.value = setting.value.tgMsgText
  tgMsgTo.value = setting.value.tgMsgTo
  tgChatId.value = []
  if (setting.value.tgChatId) {
    const list = setting.value.tgChatId.split(',')
    tgChatId.value.push(...list)
  }
  tgSettingShow.value = true
}

function openNoticePopupSetting() {
  noticePopupShow.value = true
}

function openResendList() {
  showResendList.value = true
}

function resetNoticeForm() {
  noticeForm.notice = setting.value.notice
  noticeForm.noticeContent = setting.value.noticeContent
  noticeForm.noticeDuration = setting.value.noticeDuration
  noticeForm.noticeTitle = setting.value.noticeTitle
  noticeForm.noticePosition = setting.value.noticePosition
  noticeForm.noticeType = setting.value.noticeType
  noticeForm.noticeOffset = setting.value.noticeOffset
  noticeForm.noticeWidth = setting.value.noticeWidth
}

function saveNoticePopup() {
  noticeForm.noticeOffset = noticeForm.noticeOffset || 0
  noticeForm.noticeWidth = noticeForm.noticeWidth || 0
  noticeForm.noticeDuration = noticeForm.noticeDuration || 0
  editSetting({...noticeForm})
}

function previewNoticePopup() {
  uiStore.previewNotice({...noticeForm})
}

function openThirdEmailSetting() {
  forwardEmail.value = []
  forwardStatus.value = setting.value.forwardStatus
  if (setting.value.forwardEmail) {
    const list = setting.value.forwardEmail.split(',')
    forwardEmail.value.push(...list)
  }
  thirdEmailShow.value = true
}

function openEmailPrefix() {
  emailPrefixShow.value = true
}

function openForwardRules() {
  ruleType.value = setting.value.ruleType
  ruleEmail.value = []
  if (setting.value.ruleEmail) {
    const list = setting.value.ruleEmail.split(',')
    ruleEmail.value.push(...list)
  }
  forwardRulesShow.value = true
}

function emailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  forwardEmail.value.splice(forwardEmail.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !forwardEmail.value.includes(email)) {
      forwardEmail.value.push(email)
    }
  })
}

function ruleEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  ruleEmail.value.splice(ruleEmail.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !ruleEmail.value.includes(email)) {
      ruleEmail.value.push(email)
    }
  })
}

function addChatTag(val) {

  const chatIds = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  tgChatId.value.splice(tgChatId.value.length - 1, 1)

  chatIds.forEach(id => {
    if (!isNaN(Number(id))) {
      tgChatId.value.push(id)
    }
  })
}

function clearS3() {

  const form = {
    bucket: '',
    endpoint: '',
    region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    forcePathStyle: 1
  }
  clearS3Loading.value = true
  editSetting(form)
}

function saveS3() {

  const form = {
    bucket: s3.bucket,
    endpoint: s3.endpoint,
    region: s3.region,
    forcePathStyle: s3.forcePathStyle
  }

  if (s3.s3AccessKey) form.s3AccessKey = s3.s3AccessKey
  if (s3.s3SecretKey) form.s3SecretKey = s3.s3SecretKey

  editSetting(form)
}

function tgBotSave() {
  const form = {
    tgBotToken: tgBotToken.value,
    customDomain: customDomain.value,
    tgBotStatus: tgBotStatus.value,
    tgChatId: tgChatId.value + '',
    tgMsgFrom: tgMsgFrom.value,
    tgMsgText: tgMsgText.value,
    tgMsgTo: tgMsgTo.value
  }
  editSetting(form)
}

function forwardEmailSave() {
  const form = {
    forwardStatus: forwardStatus.value,
    forwardEmail: forwardEmail.value + ''
  }
  editSetting(form)
}


function ruleEmailSave() {
  const form = {
    ruleEmail: ruleEmail.value + '',
    ruleType: ruleType.value
  }
  editSetting(form)
}

function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix
  emailPrefixFilter.value = setting.value.emailPrefixFilter
}

function saveEmailPrefix() {
  const form = {}
  form.minEmailPrefix = minEmailPrefix.value
  form.emailPrefixFilter = emailPrefixFilter.value
  editSetting(form, true)
}

function addDomainMapping() {
  if (newMappingSource.value && newMappingDisplay.value) {
    domainMappingData[newMappingSource.value] = newMappingDisplay.value
    newMappingSource.value = ''
    newMappingDisplay.value = ''
  }
}

function saveDomainMapping() {
  editSetting({ domainMapping: { ...domainMappingData } }, true)
  domainMappingShow.value = false
}

function resetKeywordBlacklist() {
  keywordBlacklistData.value = Array.isArray(setting.value.emailKeywordBlacklist)
    ? [...setting.value.emailKeywordBlacklist]
    : (setting.value.emailKeywordBlacklist || '').split(',').filter(Boolean)
}

function saveKeywordBlacklist() {
  editSetting({ emailKeywordBlacklist: keywordBlacklistData.value }, true)
  keywordBlacklistShow.value = false
}

function resetSenderDomainBlacklist() {
  senderDomainBlacklistData.value = Array.isArray(setting.value.senderDomainBlacklist)
    ? [...setting.value.senderDomainBlacklist]
    : (setting.value.senderDomainBlacklist || '').split(',').filter(Boolean)
}

function saveSenderDomainBlacklist() {
  editSetting({ senderDomainBlacklist: senderDomainBlacklistData.value }, true)
  senderDomainBlacklistShow.value = false
}

function saveTurnstileKey() {
  const settingForm = {}
  settingForm.siteKey = turnstileForm.siteKey
  settingForm.secretKey = turnstileForm.secretKey
  editSetting(settingForm)
}

function saveR2domain() {
  const settingForm = {r2Domain: r2DomainInput.value}
  editSetting(settingForm)
}

function openResendForm() {
  resendTokenFormShow.value = true
}

function saveResendToken() {
  const settingForm = {
    resendTokens: {}
  }
  const domain = resendTokenForm.domain.slice(1)
  settingForm.resendTokens[domain] = resendTokenForm.token
  editSetting(settingForm)
}

function backupSetting() {
  const settingForm = {...setting.value}
  delete settingForm.resendTokens
  delete settingForm.siteKey
  delete settingForm.secretKey
  backup = JSON.stringify(setting.value)
}

function cleanResendTokenForm() {
  resendTokenForm.token = ''
}

function beforeChange() {
  if (settingLoading.value) return false
  backupSetting()
  return true
}

function change(e) {
  const settingForm = {...setting.value}
  delete settingForm.siteKey
  delete settingForm.secretKey
  delete settingForm.s3AccessKey
  delete settingForm.s3SecretKey
  delete settingForm.resendTokens
  editSetting(settingForm, false)
}

function saveTitle() {
  editSetting({title: editTitle.value})
}

function jump(href) {
  const doc = document.createElement('a')
  doc.href = href
  doc.target = '_blank'
  doc.click()
}

function editSetting(settingForm, refreshStatus = true) {
  if (settingLoading.value) return
  settingLoading.value = true

  settingSet(settingForm).then(() => {
    settingLoading.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    if (setting.value.manyEmail === 1) {
      accountStore.currentAccountId = userStore.user.account.accountId;
    }
    if (refreshStatus) {
      getSettings()
    }
    editTitleShow.value = false
    r2DomainShow.value = false
    resendTokenFormShow.value = false
    turnstileShow.value = false
    tgSettingShow.value = false
    thirdEmailShow.value = false
    forwardRulesShow.value = false
    addVerifyCountShow.value = false
    regVerifyCountShow.value = false
    noticePopupShow.value = false
    addS3Show.value = false
    emailPrefixShow.value = false
    keywordBlacklistShow.value = false
    senderDomainBlacklistShow.value = false
  }).catch((e) => {
    setting.value = {...setting.value, ...JSON.parse(backup)}
  }).finally(() => {
    settingLoading.value = false
    clearS3Loading.value = false
  })
}
</script>

<style scoped lang="scss">
/* ══════════════════════════════════════════════════════════════════════════════
   System Settings - Modern Vercel-inspired Design
   ══════════════════════════════════════════════════════════════════════════════ */
.settings-container {
  height: 100%;
  overflow: hidden;
  background: var(--el-bg-color) !important;
  position: relative;

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    z-index: 2;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background: var(--el-bg-color);
  }

  .loading-show {
    transition: all 200ms ease 200ms;
    opacity: 1;
  }

  .loading-hide {
    transition: var(--loading-hide-transition);
    pointer-events: none;
    opacity: 0;
  }
}

/* ── Main Layout ── */
.settings-layout {
  display: flex;
  height: 100%;
  overflow: hidden;

  @media (max-width: 768px) {
    flex-direction: column;
  }
}

/* ── Left Navigation - Vercel Style ── */
.settings-nav {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-lighter);
    padding: 12px 16px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    gap: 4px;
    flex-shrink: 0;
    background: var(--extra-light-fill);

    &::-webkit-scrollbar { display: none; }
  }
}

.sn-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  transition: all 0.15s ease;
  border: 1px solid transparent;

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }

  &.active {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color);
    font-weight: 500;
    border-color: var(--el-border-color-lighter);
  }

  @media (max-width: 768px) {
    flex-shrink: 0;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    font-size: 13px;
    white-space: nowrap;
    gap: 8px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);

    &.active {
      background: var(--el-color-primary);
      color: #fff;
      border-color: var(--el-color-primary);
    }
  }
}

/* ── Right Content Area ── */
.settings-body {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--extra-light-fill);
}

.sb-inner {
  padding: 32px 40px;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 768px) { padding: 20px; gap: 20px; }
  @media (max-width: 480px) { padding: 16px; gap: 16px; }
}

.background {
  width: 240px;
  height: 135px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  object-fit: cover;
  
  @media (max-width: 500px) {
    width: 160px;
    height: 90px;
  }
}

.background-btn {
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.bot-verify-select {
  margin-left: 10px;
}

/* ── Settings Card - Vercel Style ── */
.settings-card {
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
  
  & + .settings-card {
    margin-top: 24px;
  }
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  letter-spacing: -0.01em;
  
  @media (max-width: 480px) {
    padding: 16px;
    font-size: 15px;
  }
}

.card-content {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  font-weight: normal;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  transition: background 0.15s ease;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--el-fill-color-extra-light);
  }
  
  @media (max-width: 480px) {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  font-size: 13.5px;
  align-items: center;

  > div:first-child {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }

  > div:last-child {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    font-weight: normal;
    flex-shrink: 0;
    
    @media (max-width: 480px) {
      width: 100%;
      justify-content: flex-start;
    }
  }
}

.auto-ban-right {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.ban-unit {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

/* ── Global API Token Card ── */
.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.global-token-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.6;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.gt-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.gt-token-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;

  .gt-key-icon {
    flex-shrink: 0;
    color: var(--el-color-primary);
    opacity: 0.8;
  }

  .gt-token-text {
    flex: 1;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    color: var(--el-text-color-primary);
    word-break: break-all;
    line-height: 1.5;

    &.masked {
      letter-spacing: 3px;
      color: var(--el-text-color-placeholder);
      font-size: 12px;
    }
  }
}

.gt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.gt-api-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px;
  background: var(--el-fill-color-extra-light);
  border-radius: 0 0 8px 8px;

  .gt-api-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
}

.gt-api-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;

  code {
    flex: 1;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    color: var(--el-text-color-primary);
    word-break: break-all;
    line-height: 1.6;
    background: var(--el-fill-color);
    padding: 4px 8px;
    border-radius: 4px;
  }
}

.gt-method {
  flex-shrink: 0;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.6;
}

.gt-header-label {
  flex-shrink: 0;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.6;
}

.gt-disabled-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  padding: 20px 24px;
}

.r2domain-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  
  &:last-child {
    border-bottom: none;
  }
  
  > div:first-child {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  > div:last-child {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
  }
}

.warning {
  color: var(--el-text-color-placeholder);
  cursor: help;
  transition: color 0.15s ease;
  margin-left: 2px;
  
  &:hover {
    color: var(--el-color-warning);
  }
}

.opt-button {
  min-width: 36px;
  height: 32px;
}

.forward {
  display: flex;
  align-items: center;
  gap: 10px;
}

.domain-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  padding: 4px 10px;
  border-radius: 12px;
}

.r2domain {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  
  span {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    padding: 4px 10px;
    border-radius: 4px;
  }
}

.storage-type {
  display: flex;
  align-items: center;
}

.cropper {
  border-radius: 4px;
  border: 1px solid #D4D7DE;
  height: 397px;
  width: 705px;
  @media (max-width: 767px) {
    width: calc(100vw - 60px);
    height: calc((100vw - 60px) * 9 / 16);
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
}

.notice-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .notice-form-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    min-width: 48px;
  }
  .el-input, .el-input-number {
    flex: 1;
  }
}

.notice-popup-item {
  margin-top: 8px;
}

.notice-line-item {
  margin-top: 15px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;

  > * {
    width: 100%;
  }

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

.background-url {
  width: min(calc(100vw - 70px), 500px);
}


:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.resend-table.el-dialog) {
  min-height: 300px;
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.notice-popup.el-dialog) {
  min-height: 300px;
  width: 820px !important;
  @media (max-width: 860px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.resend-table .el-dialog__header) {
  padding-bottom: 5px;
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

:deep(.cut-dialog.el-dialog) {
  width: fit-content !important;
  height: fit-content !important;
}


:deep(.forward-dialog.el-dialog) {
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.forward-dialog {
  .forward-head {
    display: flex;
    align-items: center;

    .forward-set-title {
      top: 1px;
      padding-right: 5px;
      position: relative;
      font-size: 16px;
      font-weight: bold;;
    }
  }
}

.error-image {
  background: var(--light-ill);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cut-button {
  padding-top: 15px;
  width: 100%;
  display: flex;
  justify-content: space-between;

  .el-button {
    width: fit-content;
  }
}

.bot-verify {
  display: grid;
  grid-template-columns: 1fr auto;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  span {
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.forward-set-body {
  display: flex;
  flex-direction: column;

  .el-switch {
    align-self: end;
  }

  > *:nth-child(-n+2) {
    margin-bottom: 15px;
  }

  .tg-msg-label {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .el-select {
      width: v-bind(tgMsgLabelWidth);
    }
  }
}

.forward {
  span {
    display: flex;
    align-items: center;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.opt-button {
  width: fit-content !important;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mapping-source {
  min-width: 100px;
  text-align: center;
}

:deep(.mapping-dialog.el-dialog) {
  width: 520px !important;
  @media (max-width: 560px) {
    width: calc(100% - 40px) !important;
  }
}

.email-prefix {
  display: flex;
  justify-content: space-between;
}

.prefix-filter {
  display: flex;
  flex-direction: column;
}

.s3-button {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 15px;

  .el-button {
    margin-left: 0;
  }
}

.r2domain {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;

  .storage-type {
    margin-right: 3px;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.personalized {
  align-items: start;

  > div:last-child {
    display: flex;
    justify-content: end;

    .el-button {
      margin-left: 10px;
      margin-top: 0;
    }
  }
}

.dialog-input {
  margin-bottom: 15px;
}

.force-path-style {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  .force-path-style-left {
    padding-left: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
  }
}

.concerning-item {
  display: flex;
  align-items: flex-start;

  .community {
    display: flex;
    row-gap: 10px;
    flex-wrap: wrap;
  }

  :deep(.el-button) {
    padding: 0 10px;
    font-weight: normal;

    i {
      font-size: 22px;
    }
  }

  > span:first-child {
    font-weight: normal;
    padding-right: 20px;
    white-space: nowrap;
    padding-top: 4px;
  }
}

.donate-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.donate-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .donate-chain {
    flex-shrink: 0;
    display: inline-block;
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;

    &.bep20 {
      background: #FEF3C7;
      color: #D97706;
    }

    &.trc20 {
      background: #DCFCE7;
      color: #16A34A;
    }
  }

  .donate-addr {
    flex: 1;
    min-width: 0;
    font-family: 'Courier New', monospace;
    font-size: 11.5px;
    color: var(--el-text-color-regular);
    word-break: break-all;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.email-title {
  font-weight: normal !important;
  display: flex;
  gap: 12px;
  align-items: center;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
  }

  .el-button {
    margin-top: 0;
  }
}

.token-item {
  padding-top: 0;

  div:last-child {
    font-weight: normal;
  }
}

form .el-button {
  margin-top: 10px;
  width: 100%;
}

.el-switch {
  height: 28px;
}


:deep(.el-button--small) {
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  height: 24px;
}

:deep(.el-select__wrapper) {
  min-height: 28px;
}

.domain-management {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.domain-add-row {
  display: flex;
  gap: 8px;
  align-items: center;

  @media (max-width: 480px) {
    flex-wrap: wrap;
    > .el-input { flex: 1; min-width: 140px; }
    > .el-button { flex-shrink: 0; }
  }
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 4px 0;
}

.domain-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.domain-name {
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.domain-empty {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px 0;
  font-size: 13px;
}

.sub-worker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.sw-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.sw-domains-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.sub-worker-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sub-worker-form .setup-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
}

.sub-worker-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.domain-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* ── Appearance Card ── */
.appearance-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: none;
  }

  > div:first-child {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  > div:last-child {
    justify-content: flex-start;
    width: 100%;
    flex-shrink: 1;
  }
}

.theme-swatches {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  outline: none;

  &:hover { transform: scale(1.1); }

  &.active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 4px var(--el-color-primary);
  }
}

.template-previews {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
}

.tpl-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  flex-shrink: 0;

  .tpl-preview {
    width: 100px;
    height: 64px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid var(--el-border-color-lighter);
    transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    position: relative;
  }

  &.active .tpl-preview {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
  }

  &:hover .tpl-preview {
    border-color: var(--el-color-primary-light-5);
    transform: translateY(-2px);
  }
}

.tpl-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

/* gradient preview */
.tpl-gradient {
  background: #0a0a10;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 200%; height: 150%;
    top: -80%; right: -80%;
    background: radial-gradient(circle at 40% 40%,
      var(--xi-orb-1, rgba(99,102,241,0.55)) 0%, transparent 60%
    );
    filter: blur(20px);
  }

  &::after {
    content: '';
    position: absolute;
    width: 160%; height: 140%;
    bottom: -80%; left: -60%;
    background: radial-gradient(circle at 60% 60%,
      var(--xi-orb-2, rgba(139,92,246,0.48)) 0%, transparent 60%
    );
    filter: blur(18px);
  }

  .tpl-orb { display: none; }

  .tpl-card-inner {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 48px; height: 34px;
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(6px);
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.12);
    z-index: 1;
  }
}

/* layout mode selector */
.layout-options {
  display: flex;
  gap: 12px;

  @media (max-width: 480px) {
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
}

.layout-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  outline: none;
  flex-shrink: 0;

  .layout-preview {
    width: 88px;
    height: 56px;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid var(--el-border-color-lighter);
    transition: border-color 0.15s, box-shadow 0.15s;
    display: flex;
    background: var(--el-fill-color-light);
  }

  &.active .layout-preview {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }

  &:hover .layout-preview {
    border-color: var(--el-color-primary-light-3);
  }
}

.lp-sidebar {
  width: 28px;
  background: #1a1a22;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 5px;
}

.lp-sidebar-sm {
  width: 14px;
  align-items: center;
  padding: 8px 3px;
}

.lp-sb-item { border-radius: 2px; background: #3f3f52; }
.lp-sb-full { height: 5px; width: 100%; }
.lp-sb-dot  { height: 5px; width: 5px; border-radius: 50%; }

.lp-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 5px;
  gap: 4px;
}

.lp-top-bar {
  height: 6px;
  background: var(--el-border-color-lighter);
  border-radius: 2px;
}

.lp-body {
  flex: 1;
  background: var(--el-fill-color-extra-light);
  border-radius: 2px;
}

/* top nav layout preview */
.lp-top { flex-direction: column; }

.lp-full-col {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 5px;
  gap: 4px;
}

.lp-hbar {
  height: 8px;
  background: #1a1a22;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  flex-shrink: 0;
}

.lp-h-dot {
  width: 10px;
  height: 3px;
  background: #3f3f52;
  border-radius: 1px;
}

/* minimal preview */
.tpl-minimal {
  background: #f4f5f7;

  .tpl-minimal-card {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 48px; height: 34px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
}

/* split preview */
.tpl-split {
  background: var(--el-bg-color);
  display: flex;

  .tpl-split-left {
    width: 36px;
    background: var(--xi-gradient);
    flex-shrink: 0;
  }
  .tpl-split-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-bg-color);
  }
  .tpl-split-card {
    width: 32px; height: 26px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 3px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
}

</style>

