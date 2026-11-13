<template>
  <div class="user-box">
    <div class="header-actions">
      <div class="user-filters">
        <div class="search">
          <el-input v-model="params.email" class="search-input" :placeholder="$t('searchByEmail')" @keyup.enter="search" >
          </el-input>
        </div>
        <el-select v-model="params.status" :aria-label="$t('adminStatusFilter')" class="status-select" @change="search">
          <template #prefix>
            <span class="status-label-full">{{ $t('adminStatusFilter') }}</span>
            <span class="status-label-short">{{ $t('userStatusShort') }}</span>
          </template>
          <el-option :key="-1" :label="$t('all')" :value="-1"/>
          <el-option :key="0" :label="$t('active')" :value="0"/>
          <el-option :key="1" :label="$t('banned')" :value="1"/>
          <el-option :key="-2" :label="$t('deleted')" :value="-2"/>
        </el-select>
        <el-select v-model="params.roleId" :aria-label="$t('adminRoleFilter')" :placeholder="$t('adminAllRoles')" class="role-filter" @change="search" filterable>
          <el-option :label="$t('adminAllRoles')" value="" />
          <el-option :label="$t('admin')" :value="0" />
          <el-option v-for="role in roleList" :key="role.roleId" :label="role.name" :value="role.roleId" />
        </el-select>
        <el-select v-model="params.provider" :aria-label="$t('adminProviderFilter')" :placeholder="$t('adminAllProviders')" class="provider-filter" @change="search">
          <el-option :label="$t('adminAllProviders')" value="" />
          <el-option :label="$t('adminHasBindings')" value="bound" />
          <el-option :label="$t('adminNoBindings')" value="unbound" />
          <el-option v-for="provider in OAUTH_PROVIDERS" :key="provider.id" :label="provider.name" :value="provider.id" />
        </el-select>
      </div>
      <div class="user-tools">
        <el-tooltip :content="$t('addUser')" placement="top">
          <button type="button" class="xi-icon-button" :aria-label="$t('addUser')" @click="openAdd" >
            <Icon icon="mingcute:add-line" width="18" height="18" />
          </button>
        </el-tooltip>
        <el-tooltip :content="$t('searchAction')" placement="top">
          <button type="button" class="xi-icon-button" :aria-label="$t('searchAction')" @click="search" >
            <Icon icon="mingcute:search-line" width="18" height="18" />
          </button>
        </el-tooltip>
        <el-tooltip :content="$t('sortByTime')" placement="top">
          <button type="button" class="xi-icon-button" :aria-label="$t('sortByTime')" @click="changeTimeSort" >
            <Icon :icon="params.timeSort === 1 ? 'mingcute:sort-descending-line' : 'mingcute:sort-ascending-line'" width="18" height="18" />
          </button>
        </el-tooltip>
        <el-tooltip :content="$t('sortByLogin')" placement="top">
          <button type="button" class="xi-icon-button" :aria-label="$t('sortByLogin')" @click="changeLoginSort" :class="{ 'is-active': params.loginSort }">
            <Icon icon="mingcute:time-line" width="18" height="18" />
          </button>
        </el-tooltip>
        <el-tooltip :content="$t('refresh')" placement="top">
          <button type="button" class="xi-icon-button" :aria-label="$t('refresh')" @click="refresh" >
            <Icon icon="mingcute:refresh-2-line" width="18" height="18" />
          </button>
        </el-tooltip>
        <div class="user-batch-tools">
          <el-tooltip :content="$t('batchBan')" placement="top">
            <button type="button" class="xi-icon-button" :aria-label="$t('batchBan')" @click="batchBan" >
              <Icon icon="mingcute:forbid-circle-line" width="18" height="18" />
            </button>
          </el-tooltip>
          <el-tooltip :content="$t('batchEnable')" placement="top">
            <button type="button" class="xi-icon-button" :aria-label="$t('batchEnable')" @click="batchEnable" >
              <Icon icon="mingcute:check-circle-line" width="18" height="18" />
            </button>
          </el-tooltip>
          <el-tooltip :content="$t('batchRestore')" placement="top">
            <button type="button" class="xi-icon-button" :aria-label="$t('batchRestore')" @click="batchRestoreUsers" >
              <Icon icon="mingcute:restore-line" width="18" height="18" />
            </button>
          </el-tooltip>
          <el-tooltip :content="$t('delete')" placement="top">
            <button type="button" class="xi-icon-button" :aria-label="$t('delete')" @click="delUser" >
              <Icon icon="mingcute:delete-2-line" width="18" height="18" />
            </button>
          </el-tooltip>
        </div>
        <el-dropdown class="user-batch-menu" trigger="click" placement="bottom-end">
          <button type="button" class="user-batch-trigger" :aria-label="$t('userBatchActions')">
            <Icon icon="mingcute:more-1-line" width="18" height="18" />
            <span>
              {{ $t('userBatchActions') }}
            </span>
            <Icon icon="mingcute:down-small-line" width="16" height="16" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="batchBan">
                <div class="user-menu-item">
                  <Icon icon="mingcute:forbid-circle-line" width="18" height="18" />
                  <span>
                    {{ $t('batchBan') }}
                  </span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item @click="batchEnable">
                <div class="user-menu-item">
                  <Icon icon="mingcute:check-circle-line" width="18" height="18" />
                  <span>
                    {{ $t('batchEnable') }}
                  </span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item @click="batchRestoreUsers">
                <div class="user-menu-item">
                  <Icon icon="mingcute:restore-line" width="18" height="18" />
                  <span>
                    {{ $t('batchRestore') }}
                  </span>
                </div>
              </el-dropdown-item>
              <el-dropdown-item @click="delUser">
                <div class="user-menu-item">
                  <Icon icon="mingcute:delete-2-line" width="18" height="18" />
                  <span>
                    {{ $t('delete') }}
                  </span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <el-scrollbar ref="scrollbarRef" class="scrollbar">
      <div>
        <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'"
             :style="first ? 'background: transparent' : ''">
          <loading/>
        </div>
        <el-table
            @filter-change="tableFilter"
            :empty-text="first ? '' : null"
            :data="users"
            :preserve-expanded-content="preserveExpanded"
            style="width: 100%;"
            ref="tableRef"
            @cell-contextmenu="handleContextmenu"
            :cell-class-name="cellClassName"
        >
          <el-table-column :width="expandWidth" type="selection" :selectable="row => row.type !== 0" />
          <el-table-column show-overflow-tooltip :tooltip-formatter="tableRowFormatter" :label="$t('tabEmailAddress')"
                           :min-width="emailWidth">
            <template #default="props">
              <div style="display: flex;gap: 5px">
                <div class="email-row">{{ props.row.email }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="typeShow" :label="$t('adminProviderFilter')" min-width="125">
            <template #default="props">
              <div v-if="props.row.oauthBindings?.length" class="user-binding-icons">
                <el-tooltip v-for="binding in props.row.oauthBindings" :key="binding.provider" :content="providerName(binding.provider) + (binding.displayName ? ' · ' + binding.displayName : '')">
                  <button type="button" class="user-binding-button" :aria-label="$t('adminBindingDetails') + ' ' + providerName(binding.provider)" @click="openDetails(props.row)"><img :src="providerLogo(binding.provider)" :alt="providerName(binding.provider)" width="18" height="18" /></button>
                </el-tooltip>
              </div>
              <span v-else class="user-binding-empty">{{ $t('oauthUnbound') }}</span>
            </template>
          </el-table-column>
          <el-table-column :formatter="formatterReceive" label-class-name="receive" column-key="receive"
                           :filtered-value="filteredValue" :filters="filters" :width="receiveWidth"
                           :label="$t('tabReceived')"
                           prop="receiveEmailCount"/>
          <el-table-column :formatter="formatterSend" label-class-name="send" column-key="send"
                           :filtered-value="filteredValue" :filters="filters" v-if="sendNumShow" :label="$t('tabSent')"
                           prop="sendEmailCount"/>
          <el-table-column :formatter="formatterAccount" label-class-name="account" column-key="account"
                           :filtered-value="filteredValue" :filters="filters" v-if="accountNumShow"
                           :label="$t('tabMailboxes')"
                           prop="accountCount"/>
          <el-table-column v-if="createTimeShow" :label="$t('tabRegisteredAt')" min-width="160" prop="createTime">
            <template #default="props">
              {{ tzDayjs(props.row.createTime).format('YYYY-MM-DD HH:mm') }}
            </template>
          </el-table-column>
          <el-table-column v-if="createTimeShow" :label="$t('lastLogin')" min-width="160" prop="activeTime">
            <template #default="props">
              {{ props.row.activeTime ? tzDayjs(props.row.activeTime).format('YYYY-MM-DD HH:mm') : $t('neverLogin') }}
            </template>
          </el-table-column>
          <el-table-column v-if="statusShow" min-width="60px" :label="$t('tabStatus')" prop="status">
            <template #default="props">
              <el-tag disable-transitions v-if="props.row.isDel === 1" type="info">{{ $t('deleted') }}</el-tag>
              <el-tag disable-transitions v-else-if="props.row.status === 0" type="primary">{{ $t('active') }}</el-tag>
              <el-tag disable-transitions v-else-if="props.row.status === 1" type="danger">{{ $t('banned') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="typeShow" :label="$t('tabRole')" min-width="140" prop="type">
            <template #default="props">
              <div class="type">
                {{ toRoleName(props.row.type) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('tabSetting')" :width="settingWidth">
            <template #default="props">
              <el-button size="small" type="primary" v-if="(props.row.type === 0 && userStore.user.type !== 0)" >{{ $t('action') }}</el-button>
              <el-dropdown v-else >
                <el-button size="small" type="primary">{{ $t('action') }}</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="openSetPwd(props.row)" >{{ $t('chgPwd') }}</el-dropdown-item>
                    <el-dropdown-item @click="openSetType(props.row)" >{{ $t('perm') }}</el-dropdown-item>
                    <template v-if="props.row.type !== 0">
                      <el-dropdown-item v-if="props.row.isDel !== 1" @click="setStatus(props.row)">
                        {{ setStatusName(props.row) }}
                      </el-dropdown-item>
                      <el-dropdown-item v-else @click="restore(props.row)">{{ $t('restore') }}</el-dropdown-item>
                    </template>
                    <el-dropdown-item @click="openAccountList(props.row.userId)" >{{ $t('account') }}</el-dropdown-item>
                    <el-dropdown-item @click="openDetails(props.row)" >{{ $t('details') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination" v-if="total > 10">
          <el-pagination
              :size="pageSize"
              :current-page="params.num"
              :page-size="params.size"
              :pager-count="pagerCount"
              :page-sizes="[10, 15, 20, 25, 30, 50]"
              background
              :layout="layout"
              :total="total"
              @size-change="sizeChange"
              @current-change="numChange"
          />
          <el-pagination
              v-if="phonePageShow"
              :size="pageSize"
              :current-page="params.num"
              :page-size="params.size"
              :pager-count="pagerCount"
              :page-sizes="[10, 15, 20, 25, 30, 50]"
              background
              layout="sizes, total"
              :total="total"
              @size-change="sizeChange"
              @current-change="numChange"
          />
        </div>
      </div>
    </el-scrollbar>
    <el-dialog class="dialog" v-model="setPwdShow" :title="$t('changePassword')" width="min(420px, calc(100vw - 32px))" @closed="resetUserForm">
      <div class="dialog-box">
        <div class="password-input-row">
          <el-input v-model="userForm.password" type="password" show-password :placeholder="$t('newPassword')" autocomplete="new-password" :disabled="settingLoading"/>
          <el-tooltip :content="$t('randomPassword')" placement="top" :trigger-keys="[]">
            <button type="button" class="xi-icon-button" :aria-label="$t('randomPassword')" :disabled="settingLoading" @click="userForm.password=createRandomPassword()"><Icon icon="mingcute:refresh-2-line" width="16" height="16"/></button>
          </el-tooltip>
        </div>
        <PasswordRequirements :value="userForm.password || ''"/>
        <el-button class="btn" type="primary" :loading="settingLoading" @click="updatePwd"
        >{{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog class="dialog" v-model="setTypeShow" :title="$t('changePerm')" @closed="resetUserForm">
      <div class="dialog-box">
        <el-input disabled :model-value="$t('admin')" v-if="userForm.type === 0"/>
        <el-select v-else v-model="userForm.type" placeholder="Select">
          <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        <el-button :disabled="userForm.type === 0" class="btn" :loading="settingLoading" type="primary" @click="setType"
        >{{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog v-model="showAdd" :title="$t('addUser')" width="min(420px, calc(100vw - 32px))">
      <div class="add-user-form">
        <div class="add-user-field">
          <label class="add-user-label">{{ $t('emailAccount') }}</label>
          <el-input v-model="addForm.email" type="text" :placeholder="$t('emailAccount')" autocomplete="off" />
        </div>
        <div class="add-user-field">
          <label class="add-user-label">{{ $t('select') }}</label>
          <el-select v-model="addForm.suffix" filterable :aria-label="$t('selectEmailSuffix')" style="width: 100%">
            <el-option v-for="item in domainList" :key="item" :label="item" :value="item"/>
          </el-select>
        </div>
        <div class="add-user-field">
          <label class="add-user-label">{{ $t('password') }}</label>
          <div class="password-input-row">
            <el-input type="password" v-model="addForm.password" :placeholder="$t('password')" show-password autocomplete="new-password" :disabled="addLoading"/>
            <el-tooltip :content="$t('randomPassword')" placement="top" :trigger-keys="[]">
              <button type="button" class="xi-icon-button" :aria-label="$t('randomPassword')" :disabled="addLoading" @click="addForm.password=createRandomPassword()"><Icon icon="mingcute:refresh-2-line" width="16" height="16"/></button>
            </el-tooltip>
          </div>
        </div>
        <PasswordRequirements :value="addForm.password || ''"/>
        <div class="add-user-field">
          <label class="add-user-label">{{ $t('perm') }}</label>
          <el-select v-model="addForm.type" :placeholder="$t('perm')" style="width: 100%">
            <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId"/>
          </el-select>
        </div>
        <div class="add-user-preview" v-if="addForm.email||addForm.password">
          <button v-if="addForm.email" type="button" class="add-user-preview-row" :aria-label="$t('copy')+' '+$t('emailAccount')" :title="$t('clickToCopy')" @click="copyCredential(addForm.email+addForm.suffix)">
            <Icon icon="mingcute:mail-line" width="14" height="14"/>
            <span class="credential-copy"><small>{{ $t('emailAccount') }}</small><span class="credential-value">{{ addForm.email }}{{ addForm.suffix }}</span></span>
            <Icon icon="mingcute:copy-2-line" width="14" height="14"/>
          </button>
          <button v-if="addForm.password" type="button" class="add-user-preview-row" :aria-label="$t('copy')+' '+$t('password')" :title="$t('clickToCopy')" @click="copyCredential(addForm.password)">
            <Icon icon="mingcute:lock-line" width="14" height="14"/>
            <span class="credential-copy"><small>{{ $t('password') }}</small><span class="credential-value">{{ addForm.password }}</span></span>
            <Icon icon="mingcute:copy-2-line" width="14" height="14"/>
          </button>
        </div>
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading">{{ $t('add') }}</el-button>
      </div>
    </el-dialog>
    <el-dialog class="account-dialog" v-model="accountShow" :title="t('userAccount')" @closed="resetAccountList" >
      <div class="account-toolbar" v-if="selectedAccounts.length > 0">
        <span class="account-sel-count">{{ $t('selected') }} {{ selectedAccounts.length }}</span>
        <el-button size="small" type="danger" @click="batchDeleteAccounts">{{ $t('delete') }}</el-button>
      </div>
      <el-table :data="accountList" style="height: 480px" v-loading="accountLoading" element-loading-background="transparent" :empty-text="accountLoading ? '' : null" ref="accountTableRef" @selection-change="onAccountSelectionChange">
        <el-table-column type="selection" width="40" />
        <el-table-column property="email" :label="t('emailAccount')" >
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column property="address" :label="t('tabStatus')"  :width="locale === 'en' ? 75 : 65" >
          <template #default="props">
            <el-tag type="primary" disable-transitions v-if="props.row.isDel === 0">{{$t('active')}}</el-tag>
            <el-tag type="info" disable-transitions v-if="props.row.isDel === 1">{{$t('deleted')}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('action')" :width="locale === 'en' ? 75 : 65" >
          <template #default="props">
            <el-button type="danger" size="small" link @click="deleteAccount(props.row)">{{ $t('delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="account-pagination">
        <el-pagination
            :disabled="accountLoading"
            background

            layout="prev, pager, next"
            :pager-count="3"
            :total="accountParams.total"
            @current-change="accountCurChange"
        />
      </div>
    </el-dialog>
    <el-dialog class="account-dialog" v-model="detailsShow" :title="t('userDetails')"  >
      <div class="details">
        <div v-if="userDetails.displayId"><span class="details-item-title">{{ $t('displayId') }}:</span><span style="font-family: monospace; font-size: 13px; letter-spacing: 0.5px;">{{ userDetails.displayId }}</span></div>
        <div class="user-binding-details">
          <span class="details-item-title">{{ $t('adminProviderFilter') }}:</span>
          <span v-if="!userDetails.oauthBindings?.length" class="user-binding-empty">{{ $t('adminNoBindings') }}</span>
          <div v-for="binding in userDetails.oauthBindings || []" :key="binding.provider" class="user-binding-detail">
            <img :src="providerLogo(binding.provider)" :alt="providerName(binding.provider)" width="22" height="22" />
            <div><strong>{{ providerName(binding.provider) }}</strong><span>{{ binding.displayName || $t('oauthBound') }}</span><small>{{ $t('adminBoundAt') }} {{ binding.createTime ? tzDayjs(binding.createTime).format('YYYY-MM-DD HH:mm') : $t('unknown') }}</small></div>
          </div>
        </div>
        <div v-if="!sendNumShow"><span
            class="details-item-title">{{ $t('tabSent') }}:</span>{{ userDetails.sendEmailCount }}
        </div>
        <div v-if="!accountNumShow"><span class="details-item-title">{{ $t('tabMailboxes') }}:</span>{{
            userDetails.accountCount
          }}
        </div>
        <div v-if="!createTimeShow"><span class="details-item-title">{{ $t('tabRegisteredAt') }}:</span>{{
            tzDayjs(userDetails.createTime).format('YYYY-MM-DD HH:mm')
          }}
        </div>
        <div v-if="!typeShow"><span class="details-item-title">{{ $t('perm') }}:</span>
          {{ toRoleName(userDetails.type) }}
        </div>
        <div v-if="!statusShow">
          <span class="details-item-title">{{ $t('tabStatus') }}:</span>
          <el-tag disable-transitions v-if="userDetails.isDel === 1" type="info">{{ $t('deleted') }}</el-tag>
          <el-tag disable-transitions v-else-if="userDetails.status === 0" type="primary">{{ $t('active') }}
          </el-tag>
          <el-tag disable-transitions v-else-if="userDetails.status === 1" type="danger">{{ $t('banned') }}
          </el-tag>
        </div>
        <div><span class="details-item-title">{{ $t('registrationIp') }}:</span>{{
            userDetails.createIp || $t('unknown')
          }}
        </div>
        <div><span class="details-item-title">{{ $t('recentIP') }}:</span>{{
            userDetails.activeIp || $t('unknown')
          }}
        </div>
        <div><span class="details-item-title">{{ $t('recentActivity') }}:</span>{{
            userDetails.activeTime ? tzDayjs(userDetails.activeTime).format('YYYY-MM-DD') : $t('unknown')
          }}
        </div>
        <div><span
            class="details-item-title">{{ $t('loginDevice') }}:</span>{{ userDetails.device || $t('unknown') }}
        </div>
        <div><span class="details-item-title">{{ $t('loginSystem') }}:</span>{{ userDetails.os || $t('unknown') }}
        </div>
        <div><span
            class="details-item-title">{{ $t('browserLogin') }}:</span>{{ userDetails.browser || $t('unknown') }}
        </div>
        <div>
          <span class="details-item-title">{{ $t('sendEmail') }}:</span>
          <span>{{ formatSendCount(userDetails) }}</span>
          <el-tag style="margin-left: 10px" v-if="userDetails.sendAction.hasPerm">
            {{ formatSendType(userDetails) }}
          </el-tag>
          <el-button size="small" style="margin-left: 10px"
                     v-if="userDetails.sendAction.hasPerm && userDetails.sendAction.sendCount"
                     @click="resetSendCount(userDetails)" type="primary">{{ $t('reset') }}
          </el-button>
        </div>
      </div>
    </el-dialog>
    <el-dropdown
        :show-timeout="0"
        :hide-timeout="0"
        ref="dropdownRef"
        @visible-change="visibleChange"
        :virtual-ref="triggerRef"
        :show-arrow="false"
        :popper-options="{
      modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
    }"
        virtual-triggering
        trigger="contextmenu"
        placement="bottom-start"
    >
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="openSetPwd(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <icon icon="mingcute:fingerprint-line" width="18" height="18" />
                <span>{{t('changePassword')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openSetType(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <icon icon="mingcute:lock-line" width="18" height="18" />
                <span>{{ t('setRole') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="rightClickUser.type !== 0">
            <template #default>
              <div class="right-dropdown-item" v-if="rightClickUser.isDel !== 1" @click="setStatus(rightClickUser)" >
                <Icon icon="mingcute:refresh-2-line" v-if="rightClickUser.status" width="18" height="18" />
                <Icon icon="mingcute:forbid-circle-line" v-else width="18" height="18" />
                <span>{{ setRightStatusName(rightClickUser) }}</span>
              </div>
              <div class="right-dropdown-item" v-else @click="restore(rightClickUser)">
                <Icon icon="mingcute:refresh-2-line" width="18" height="18" />
                <span>{{ t('restoreUser') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openAccountList(rightClickUser.userId)" >
            <template #default>
              <div class="right-dropdown-item" >
                <Icon icon="mingcute:mailbox-line" width="18" height="18" />
                <span>{{ t('userEmail') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openDetails(rightClickUser)" >
            <template #default>
              <div class="right-dropdown-item" >
                <Icon icon="mingcute:user-3-line" width="18" height="18" />
                <span>{{ t('userDetails') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="rightClickUser.type !== 0" @click="delOneUser(rightClickUser)" >
            <template #default>
              <div class="right-dropdown-item" >
                <Icon icon="mingcute:delete-2-line" width="18" height="18" />
                <span>{{ t('adminDeleteUser') }}</span>
              </div>
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import {defineOptions, h, reactive, ref, watch} from 'vue'
import {
  userList,
  userDelete,
  userSetPwd,
  userSetStatus,
  userSetType,
  userAdd,
  userRestSendCount,
  userRestore,
  userDeleteAccount,
  userAllAccount,
  userBatchSetStatus,
  userBatchRestore
} from '@/request/user.js'
import {roleSelectUse} from "@/request/role.js";
import {Icon} from "@iconify/vue";
import loading from "@/components/loading/index.vue";
import {tzDayjs} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useRoleStore} from "@/store/role.js";
import {useUserStore} from "@/store/user.js";
import {useI18n} from 'vue-i18n';
import { OAUTH_PROVIDERS } from '@/config/oauth-providers.js';
import {createRandomPassword, isStrongPassword} from '@/utils/password.js';
import PasswordRequirements from '@/components/PasswordRequirements.vue';

defineOptions({
  name: 'user'
})

const {t, locale} = useI18n();
const providerName = id => OAUTH_PROVIDERS.find(provider => provider.id === id)?.name || id
const providerLogo = id => OAUTH_PROVIDERS.find(provider => provider.id === id)?.logo
const roleStore = useRoleStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const filteredValue = ['normal', 'del']
const filters = [{text: t('active'), value: 'normal'}, {text: t('deleted'), value: 'del'}]
const preserveExpanded = ref(false)
const emailWidth = ref(230)
const expandWidth = ref(40)
const settingWidth = ref(null)
const sendNumShow = ref(true)
const accountNumShow = ref(true)
const createTimeShow = ref(true)
const statusShow = ref(true)
const typeShow = ref(true)
const receiveWidth = ref(null)
const phonePageShow = ref(false)
const detailsShow = ref(false);
const layout = ref('prev, pager, next,  sizes, total')
const pageSize = ref('')
const users = ref([])
const tableRef = ref({})
const userDetails = ref({})
const total = ref(0)
const first = ref(true)
const scrollbarRef = ref(null)
const accountLoading = ref(false)
const dropdownRef = ref(null);
const dropdownShow = ref(false);
const rightClickUser = ref({});
const position = ref(
    DOMRect.fromRect({
      x: 0,
      y: 0,
    })
)

const triggerRef = ref({
  getBoundingClientRect() {
    return position.value;
  }
})
const domainList = settingStore.domainList

const addForm = reactive({
  email: '',
  suffix: settingStore.domainList[0],
  password: '',
  type: null,
})

const params = reactive({
  email: '',
  num: 1,
  size: 15,
  timeSort: 0,
  loginSort: 0,
  status: -1,
  roleId: '',
  provider: '',
})
let chooseUser = {}
const userForm = reactive({
  password: null,
  type: -1,
  userId: 0,
})

const showAdd = ref(false)
const accountShow = ref(false)
const addLoading = ref(false);
const setTypeShow = ref(false)
const setPwdShow = ref(false)
const pagerCount = ref(10)
const settingLoading = ref(false)
const tableLoading = ref(true)
let userListRequest = 0
const roleList = reactive([])
const accountList = reactive([])
const accountParams = reactive({
  size: 10,
  num: 0,
  total: 0,
  userId: 0,
})

roleSelectUse().then(list => {
  roleList.length = 0
  roleList.push(...list)
})

const paramsStar = localStorage.getItem('user-params')
if (paramsStar) {
  const localParams = JSON.parse(paramsStar)
  params.num = localParams.num
  params.size = localParams.size
  params.timeSort = localParams.timeSort
  params.loginSort = localParams.loginSort || 0
  params.status = localParams.status
  params.roleId = localParams.roleId ?? ''
  params.provider = localParams.provider || ''
}

watch(() => params, () => {
  localStorage.setItem('user-params', JSON.stringify(params))
}, {
  deep: true
})

watch(() => roleStore.refresh, () => {
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
})

watch(() => userStore.refreshList, () => {
  getUserList(false)
})

getUserList()

const filterItem = reactive({
  send: ['normal', 'del'],
  account: ['normal', 'del'],
  receive: ['normal', 'del']
})

window.addEventListener('wheel', (event) => {
  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
  }
})

function visibleChange(e) {
  dropdownShow.value = e;
  if (!e) {
    rightClickUser.value.checkedClass = '';
  }
}

function cellClassName({ row }) {
  return row.checkedClass;
}

const handleContextmenu = (row, column, cell, event) => {

  if (row.type === 0 && userStore.user.type !== 0) {
    return
  }

  rightClickUser.value.checkedClass = '';

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  })
  event.preventDefault()
  dropdownRef.value?.handleOpen()

  row.checkedClass = 'checked-row';
  rightClickUser.value = row;
}

function deleteAccount(account) {
  ElMessageBox.confirm(t('delConfirm', {msg: account.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDeleteAccount(account.accountId).then(() => {
      getAccountList()
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}
function accountCurChange(e) {
  accountParams.num = e
  getAccountList()
}

const selectedAccounts = ref([]);
const accountTableRef = ref(null);

function onAccountSelectionChange(rows) {
  selectedAccounts.value = rows;
}

function batchDeleteAccounts() {
  if (selectedAccounts.value.length === 0) return;
  const count = selectedAccounts.value.length;
  ElMessageBox.confirm(t('batchDelConfirm', { count }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(async () => {
    for (const acc of selectedAccounts.value) {
      await userDeleteAccount(acc.accountId);
    }
    selectedAccounts.value = [];
    getAccountList();
    ElMessage({ message: t('delSuccessMsg'), type: 'success', plain: true });
  });
}

function resetAccountList() {
  accountList.length = 0
  accountParams.num = 0
  accountParams.size = 10
  accountParams.total = 0
  selectedAccounts.value = [];
}

function openAccountList(userId) {
  accountParams.userId = userId
  getAccountList(true)
  accountShow.value = true
}

function openDetails(user) {
  userDetails.value = user;
  detailsShow.value = true;
}

function getAccountList(loading = false) {
  accountLoading.value = loading
  userAllAccount(accountParams.userId,accountParams.num, accountParams.size).then(({list,total}) => {
    accountList.length = 0
    accountList.push(...list)
    accountParams.total = total
    accountLoading.value = false
  })
}

function tableFilter(e) {

  if (e.send) filterItem.send = e.send
  if (e.account) filterItem.account = e.account
  if (e.receive) filterItem.receive = e.receive

}

function formatterSend(e) {

  if (filterItem.send.length === 2) {
    return e.sendEmailCount + e.delSendEmailCount
  }

  if (filterItem.send.includes('normal')) {
    return e.sendEmailCount
  }

  if (filterItem.send.includes('del')) {
    return e.delSendEmailCount
  }

  return 0
}

function formatterAccount(e) {

  if (filterItem.account.length === 2) {
    return e.accountCount + e.delAccountCount
  }

  if (filterItem.account.includes('normal')) {
    return e.accountCount
  }

  if (filterItem.account.includes('del')) {
    return e.delAccountCount
  }

  return 0
}

function formatterReceive(e) {


  if (filterItem.receive.length === 2) {
    return e.receiveEmailCount + e.delReceiveEmailCount
  }

  if (filterItem.receive.includes('normal')) {
    return e.receiveEmailCount
  }

  if (filterItem.receive.includes('del')) {
    return e.delReceiveEmailCount
  }

  return 0
}

function setStatusName(user) {
  if (user.isDel === 1) return t('restore')
  if (user.status === 0) return t('btnBan')
  if (user.status === 1) return t('enable')
}

function setRightStatusName(user) {
  if (user.isDel === 1) return t('adminDeleteUser')
  if (user.status === 0) return t('banUser')
  if (user.status === 1) return t('enableUser')
}

const tableRowFormatter = (data) => {
  return data.row.email
}



function resetAddForm() {
  addForm.email = ''
  addForm.suffix = settingStore.domainList[0]
  addForm.type = null
  addForm.password = ''
}

function openAdd() {
  showAdd.value = true
}

async function copyCredential(value) {
  try {
    await navigator.clipboard.writeText(value)
    ElMessage({message:t('copySuccessMsg'),type:'success',plain:true})
  } catch {
    ElMessage({message:t('copyFailMsg'),type:'error',plain:true})
  }
}

function submit() {

  if (!addForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!isEmail(addForm.email + addForm.suffix)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!isStrongPassword(addForm.password)) {
    ElMessage({
      message: t('pwdWeakMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.type) {
    ElMessage({
      message: t('emptyRole'),
      type: "error",
      plain: true
    })
    return
  }

  addLoading.value = true
  const form = {...addForm}
  form.email = form.email + form.suffix
  userAdd(form).then(() => {
    addLoading.value = false
    showAdd.value = false
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    resetAddForm()
    getUserList(false)
  }).finally(res => {
    addLoading.value = false
  })
}


function formatSendType(user) {
  if (user.sendAction.sendType === 'day') return t('daily')
  if (user.sendAction.sendType === 'count') return t('total')
  if (user.sendAction.sendType === 'ban') return t('sendBanned')
  if (user.sendAction.sendType === 'internal') return t('sendInternal')
}

function formatSendCount(user) {

  if (!user.sendAction.hasPerm) {
    return t('unauthorized')
  }

  if (!user.sendAction.sendCount) {
    return t('unlimited');
  }

  let count = user.sendCount + '/' + user.sendAction.sendCount

  return count
}

function toRoleName(type) {

  if (type === 0) {
    return t('admin')
  }

  const index = roleList.findIndex(role => role.roleId === type)
  if (index > -1) {
    return roleList[index].name
  }
  return ""
}

function resetSendCount(user) {

  ElMessageBox.confirm(t('reSendConfirm', {msg: user.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userRestSendCount(user.userId).then(() => {
      ElMessage({
        message: t('reSuccessMsg'),
        type: "success",
        plain: true
      })
      user.sendCount = 0
    })
  });
}

function delUser(user) {
  const rows = tableRef.value.getSelectionRows();
  const userIds = rows.map(row => row.userId);
  if (userIds.length === 0) {
    return;
  }
  ElMessageBox.confirm(t('delUsersConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete(userIds).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
      getUserList(true)
    })
  });
}

function batchBan() {
  const rows = tableRef.value.getSelectionRows();
  const userIds = rows.filter(r => r.isDel !== 1 && r.status !== 1).map(row => row.userId);
  if (userIds.length === 0) return;
  ElMessageBox.confirm(t('batchOperationConfirm', { count: userIds.length }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userBatchSetStatus(userIds, 1).then(() => {
      ElMessage({ message: t('saveSuccessMsg'), type: 'success', plain: true });
      getUserList(false);
    });
  });
}

function batchEnable() {
  const rows = tableRef.value.getSelectionRows();
  const userIds = rows.filter(r => r.isDel !== 1 && r.status === 1).map(row => row.userId);
  if (userIds.length === 0) return;
  ElMessageBox.confirm(t('batchOperationConfirm', { count: userIds.length }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userBatchSetStatus(userIds, 0).then(() => {
      ElMessage({ message: t('saveSuccessMsg'), type: 'success', plain: true });
      getUserList(false);
    });
  });
}

function batchRestoreUsers() {
  const rows = tableRef.value.getSelectionRows();
  const userIds = rows.filter(r => r.isDel === 1).map(row => row.userId);
  if (userIds.length === 0) return;
  ElMessageBox.confirm(t('batchOperationConfirm', { count: userIds.length }), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userBatchRestore(userIds).then(() => {
      ElMessage({ message: t('restoreSuccessMsg'), type: 'success', plain: true });
      getUserList(false);
    });
  });
}

function delOneUser(user) {
  ElMessageBox.confirm(t('delConfirm', {msg: user.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete([user.userId]).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
      getUserList(true)
    })
  });
}

function restore(user) {

  const type = ref(0)

  ElMessageBox.confirm(null, {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    message: () => h('div', [
      h('div', {class: 'mb-2'}, t('restoreConfirm', {msg: user.email}))
      // h(ElRadioGroup, {
      //   modelValue: type.value,
      //   'onUpdate:modelValue': (val) => (type.value = val),
      // }, [
      //   h(ElRadio, {label: 'option1', value: 0}, t('normalRestore')),
      //   h(ElRadio, {label: 'option2', value: 1}, t('allRestore')),
      // ])
    ]),
    type: 'warning'
  }).then(() => {
    userRestore(user.userId, type.value).then(() => {
      user.isDel = 0
      ElMessage({
        message: t('restoreSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}

function setStatus(user) {
  httpSetStatus(user);
}

function httpSetStatus(user) {
  let status = user.status ? 0 : 1
  userSetStatus({status: status, userId: user.userId}).then(() => {
    user.status = status
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  })
}

function setType() {
  settingLoading.value = true
  userSetType({type: userForm.type, userId: userForm.userId}).then(() => {
    chooseUser.type = userForm.type
    setTypeShow.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })

  }).finally(() => {
    settingLoading.value = false
  })
}


function resetUserForm() {
  userForm.password = null
  userForm.userId = 0
}

function search() {
  params.num = 1
  getUserList()
}

function updatePwd() {

  if (!userForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!isStrongPassword(userForm.password)) {
    ElMessage({
      message: t('pwdWeakMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  settingLoading.value = true
  userSetPwd({password: userForm.password, userId: userForm.userId}).then(() => {
    setPwdShow.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  }).finally(() => {
    settingLoading.value = false
  })
}

function openSetType(user) {
  chooseUser = user
  userForm.userId = user.userId
  userForm.type = user.type
  setTypeShow.value = true
}

function openSetPwd(user) {
  userForm.userId = user.userId
  setPwdShow.value = true
}

function refresh() {
  params.email = ''
  params.num = 1
  params.status = -1
  params.roleId = ''
  params.provider = ''
  params.timeSort = 0
  params.loginSort = 0
  getUserList();
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
}

function changeTimeSort() {
  params.num = 1
  params.timeSort = params.timeSort ? 0 : 1
  params.loginSort = 0
  getUserList()
}

function changeLoginSort() {
  if (!params.loginSort) params.loginSort = 1
  else if (params.loginSort === 1) params.loginSort = 2
  else params.loginSort = 0
  params.timeSort = 0
  search()
}

function numChange(num) {
  params.num = num
  getUserList()
}

function sizeChange(size) {
  params.size = size
  getUserList()
}

function getUserList(loading = true) {
  const requestId = ++userListRequest
  tableLoading.value = loading
  const newParams = {...params}

  if (newParams.status === -2) {
    delete newParams.status
    newParams.isDel = 1
  }
  userList(newParams).then(data => {
    if (requestId !== userListRequest) return
    users.value = data.list.map(item => ({...item, checkedClass: ''}))
    total.value = data.total
    scrollbarRef.value?.setScrollTop(0);
  }).catch(() => { /* The request interceptor displays the error. */ }).finally(() => {
    if (requestId !== userListRequest) return
    tableLoading.value = false
    setTimeout(() => {
      first.value = false
    }, 200)
  })
}

window.onresize = () => {
  adjustWidth()
};

adjustWidth()

function adjustWidth() {
  const width = window.innerWidth
  statusShow.value = width > 1090
  createTimeShow.value = width > 1367
  accountNumShow.value = width > 650
  sendNumShow.value = width > 685
  typeShow.value = width > 767
  emailWidth.value = width > 480 ? 230 : null
  settingWidth.value = width < 480 ? (locale.value === 'en' ? 85 : 75) : null
  expandWidth.value = width < 480 ? 30 : 35
  pagerCount.value = width < 768 ? 7 : 11
  receiveWidth.value = width < 480 ? 90 : null
  layout.value = width < 768 ? 'pager' : 'prev, pager, next,sizes, total'
  phonePageShow.value = width < 768
  pageSize.value = width < 380 ? 'small' : ''
}

</script>

<style>
.el-message-box__container {
  align-items: start !important;
}

.el-message-box__message {
  word-break: break-all;
}

.el-table-filter__content {
  min-width: 0;
}
</style>
<style lang="scss" scoped>

:deep(.el-table .checked-row) {
  background: var(--el-color-warning-light-9);
}

.user-box {
  overflow: hidden;
  height: 100%;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.account-dialog) {
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.account-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 0 8px;

  .account-sel-count {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.header-actions {
  padding: 10px 16px;
  display: flex;
  gap: 8px 16px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 18px;

  .search-input {
    width: min(200px, calc(100vw - 140px));
  }

  .search {
    :deep(.el-input-group) {
      height: 28px;
    }

    :deep(.el-input__inner) {
      height: 28px;
    }
  }

  .icon {
    cursor: pointer;
    color: var(--el-text-color-secondary);
    transition: color 0.15s;
    &:hover { color: var(--el-text-color-primary); }
  }
}

.user-filters, .user-tools, .user-batch-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.user-tools { gap: 4px; }
.user-batch-tools { gap: 4px; padding-left: 8px; margin-left: 4px; border-left: 1px solid var(--el-border-color-lighter); }
.user-batch-menu { display: none; }
.status-label-short { display: none; }
.user-menu-item { display: flex; align-items: center; gap: 8px; }
.user-batch-trigger { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 10px; border: 1px solid var(--el-border-color); border-radius: 6px; background: var(--el-bg-color); color: var(--el-text-color-regular); font: inherit; font-size: 13px; cursor: pointer; }
.user-batch-trigger:focus-visible { outline: 2px solid var(--el-color-primary-light-5); outline-offset: 1px; }
@media (max-width: 767px) {
  .status-label-full { display: none; }
  .status-label-short { display: inline; }
  .header-actions { display: flex; flex-direction: column; align-items: stretch; padding: 12px; gap: 10px; }
  .user-filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
  .user-filters .search { grid-column: 1 / -1; }
  .header-actions .search-input, .user-filters .status-select, .user-filters .role-filter, .user-filters .provider-filter { width: 100%; }
  .user-filters .provider-filter { grid-column: 1 / -1; }
  .header-actions .search :deep(.el-input__wrapper), .user-filters :deep(.el-select__wrapper) { min-height: 36px; }
  .user-tools { flex-wrap: nowrap; gap: 4px; padding-top: 8px; border-top: 1px solid var(--el-border-color-lighter); }
  .user-batch-tools { display: none; }
  .user-batch-menu { display: inline-flex; margin-left: auto; }
}
@media (max-width: 359px) {
  .user-tools { gap: 2px; }
  .user-batch-trigger { padding: 0; width: 36px; justify-content: center; }
  .user-batch-trigger span, .user-batch-trigger > svg:last-child { display: none; }
}

.container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.choose-star {
  color: var(--el-color-primary)
}

.scrollbar {
  width: 100%;
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.password-input-row { display: flex; align-items: center; gap: 8px; width: 100%; }
.password-input-row .el-input { flex: 1; min-width: 0; }
.password-input-row .xi-icon-button:disabled { opacity: .5; cursor: wait; }

.details {
  padding: 0 10px 10px 10px;
  display: grid;
  gap: 10px;
  .details-item-title {
    white-space: pre;
    color: #909399;
    font-weight: bold;
    padding-right: 10px;
  }
}

:deep(.linuxdo-avatar) {
  position: relative !important;
  top: 10px;
}

.account-pagination {
  display: flex;
  justify-content: end;
  width: 100%;
}

.pagination {
  margin-top: 15px;
  margin-bottom: 20px;
  padding-right: 30px;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: end;
  gap: 10px;
  @media (max-width: 767px) {
    padding-right: 10px;
  }

  .el-pagination {
    align-self: end;
  }
}


.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-select {
  width: 168px;
  :deep(.el-select__wrapper) {
    min-height: 28px;
  }
}
.role-filter { width: 150px; }
.provider-filter { width: 155px; }
.user-binding-icons { display: flex; align-items: center; gap: 5px; }
.user-binding-button { display: grid; place-items: center; width: 28px; height: 28px; padding: 4px; background: var(--el-fill-color-light); border: 1px solid var(--el-border-color-lighter); border-radius: 7px; cursor: pointer; }
.user-binding-button:hover, .user-binding-button:focus-visible { border-color: var(--el-color-primary); outline: none; }
.user-binding-button img, .user-binding-detail > img { object-fit: contain; flex-shrink: 0; }
.user-binding-empty { font-size: 12px; color: var(--el-text-color-secondary); }
.user-binding-details { display: flex; flex-direction: column; gap: 12px; }
.user-binding-detail { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.user-binding-detail > div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.user-binding-detail strong { font-size: 13px; font-weight: 500; }
.user-binding-detail span { font-size: 12px; overflow-wrap: anywhere; }
.user-binding-detail small { color: var(--el-text-color-secondary); font-size: 11px; }

.dialog {
  .dialog-box {
    > .el-button {
      width: 100%;
      margin-top: 15px;
    }
  }
}

.add-user-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 4px;
}

.add-user-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-user-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.add-user-preview {
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}
.add-user-preview-row { display:flex;align-items:center;gap:9px;min-width:0;width:100%;padding:8px 10px;border:0;background:transparent;color:var(--el-text-color-secondary);font:inherit;text-align:start;cursor:pointer; }
.add-user-preview-row+.add-user-preview-row { border-top:1px solid var(--el-border-color-lighter); }
.add-user-preview-row:hover { background:var(--el-color-primary-light-9);color:var(--el-color-primary); }
.add-user-preview-row:focus-visible { outline:2px solid var(--el-color-primary-light-5);outline-offset:-2px; }
.add-user-preview-row>svg { flex-shrink:0; }
.credential-copy { display:flex;flex-direction:column;gap:2px;flex:1;min-width:0; }
.credential-copy small { font-size:11px;line-height:1.4; }
.credential-value { font:12.5px/1.5 monospace;color:var(--el-text-color-primary);white-space:pre-wrap;overflow-wrap:anywhere; }

.loading {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--loadding-background);
  left: 0;
  z-index: 2;
  top: 0;
  width: 100%;
  height: 100%;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}


.right-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1;

  svg {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
  }
}

.btn {
  width: 100%;
}

:deep(.el-pagination .el-select) {
  width: 100px;
  background: var(--el-bg-color);
}

:deep(.el-input-group__append) {
  padding: 0 !important;
  padding-left: 8px !important;
  background: var(--el-bg-color);
}

:deep(.cell) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

:deep(.receive .cell) {
  white-space: nowrap;
}

:deep(.send .cell) {
  white-space: nowrap;
}

:deep(.account .cell) {
  white-space: nowrap;
}

:deep(.el-table) {
  @media (pointer: coarse) {
    /* 触屏 */
    user-select: none;
  }
}

:deep(.el-table th.el-table__cell>.cell.highlight) {
  color: #909399;
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

:deep(.el-message-box__container) {
  align-items: start;
}
</style>
