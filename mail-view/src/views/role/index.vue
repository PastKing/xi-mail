<template>
  <div class="perm-box">
    <div class="header-actions">
      <Icon class="icon" icon="ion:add-outline" width="23" height="23" @click="openAddRole"/>
      <Icon class="icon" icon="ion:reload" width="18" height="18" @click="refresh"/>
    </div>
    <el-scrollbar class="perm-scrollbar">
      <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'"
           :style="first ? 'background: transparent' : ''">
        <loading/>
      </div>

      <!-- 桌面端：表格 -->
      <el-table v-if="!isMobile" :data="roles" style="height: 100%;" :empty-text="''">
        <el-table-column width="10"/>
        <el-table-column :label="$t('role')" prop="name" min-width="200">
          <template #default="props">
            <div class="role-name">
              <span>{{ props.row.name }}</span>
              <span v-if="props.row.isDefault"><el-tag class="def-tag">{{ $t('default') }}</el-tag></span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('order')" width="80" prop="sort"/>
        <el-table-column :label="$t('permLevel')" width="80" prop="level"/>
        <el-table-column v-if="desShow" :label="$t('description')" min-width="200" prop="description">
          <template #default="props">
            <div class="description"><span>{{ props.row.description }}</span></div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('tabSetting')" width="90">
          <template #default="props">
            <el-dropdown trigger="click">
              <el-button size="small" type="primary">{{ $t('action') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openRoleSet(props.row)">{{ $t('change') }}</el-dropdown-item>
                  <el-dropdown-item @click="setDef(props.row)">{{ $t('default') }}</el-dropdown-item>
                  <el-dropdown-item @click="delRole(props.row)">{{ $t('delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 移动端：卡片列表 -->
      <div v-else class="role-card-list">
        <div v-for="row in roles" :key="row.roleId" class="role-card">
          <div class="role-card-main">
            <div class="role-card-name">
              <span>{{ row.name }}</span>
              <el-tag v-if="row.isDefault" class="def-tag" size="small">{{ $t('default') }}</el-tag>
            </div>
            <div class="role-card-meta">
              <span class="meta-item">
                <span class="meta-label">{{ $t('permLevel') }}</span>
                <span class="meta-value">{{ row.level }}</span>
              </span>
              <span v-if="row.description" class="meta-item meta-desc">{{ row.description }}</span>
            </div>
          </div>
          <div class="role-card-actions">
            <el-dropdown trigger="click">
              <el-button size="small" type="primary">{{ $t('action') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openRoleSet(row)">{{ $t('change') }}</el-dropdown-item>
                  <el-dropdown-item @click="setDef(row)">{{ $t('default') }}</el-dropdown-item>
                  <el-dropdown-item @click="delRole(row)">{{ $t('delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <div v-if="!tableLoading && roles.length === 0" class="role-empty">{{ $t('noMessagesFound') }}</div>
      </div>
    </el-scrollbar>
    <el-dialog top="5vh" class="dialog" v-model="roleFormShow" @closed="resetForm" :width="dialogWidth">
      <template #header>
        <span style="font-size: 18px">{{ dialogType.title }}</span>
        <el-popover
            width="340"
            :title="t('featDesc')"
            placement="bottom"
        >
          <template #reference>
            <Icon class="warning" icon="fe:warning" width="18" height="18"/>
          </template>
          <div style="font-weight: bold;;margin-bottom: 2px;">{{ t('emailInterception') }}</div>
          <div>{{ t('emailInterceptionDesc') }}</div>
          <div style="font-weight: bold;;margin-top: 10px;margin-bottom: 2px;">{{ t('availableDomains') }}</div>
          <div>
            {{ t('availableDomainsDesc') }}
          </div>
        </el-popover>
      </template>
      <div class="dialog-box">
        <el-input class="dialog-input" v-model="form.name" type="text" :maxlength="12" :placeholder="$t('roleName')"
                  autocomplete="off"/>
        <el-input class="dialog-input" v-model="form.description" :maxlength="30" type="text"
                  :placeholder="$t('description')" autocomplete="off"/>
        <el-input-tag class="dialog-input" tag-type="warning" v-model="form.banEmail"
                      @add-tag="banEmailAddTag" type="text" :placeholder="$t('emailInterception')" autocomplete="off"/>
        <el-select
            class="dialog-input"
            v-model="form.availDomain"
            multiple
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            tag-type="success"
            :placeholder="$t('availableDomains')"
            @change="availDomainChange"
        >
          <el-option
              v-for="item in domainOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
          />
        </el-select>
        <div class="dialog-input labeled-input">
          <span class="input-label">{{ $t('order') }}</span>
          <el-input-number :min="0" :max="9999" v-model.number="form.sort"
                           controls-position="right" autocomplete="off"/>
        </div>
        <div class="dialog-input labeled-input">
          <div class="label-with-desc">
            <span class="input-label">{{ $t('permLevel') }}</span>
            <span class="input-desc">{{ $t('permLevelDesc') }}</span>
          </div>
          <el-input-number :min="1" :max="9999" v-model.number="form.level"
                           controls-position="right" autocomplete="off"/>
        </div>
        <el-radio-group v-model="expand" size="small" @change="expandChange" class="perm-expand">
          <el-radio-button :label="$t('expand')" :value="true"/>
          <el-radio-button :label="$t('collapse')" :value="false"/>
        </el-radio-group>
        <el-tree
            :expand-on-click-node="false"
            :check-on-click-node="false"
            ref="tree"
            :data="treeList"
            show-checkbox
            node-key="permId"
            :default-expand-all="expand"
            :props="{
              label: 'name'
            }"
        >
          <template #default="{ node, data }">
            <div>
              <span>{{ node.label }}</span>
              <span class="send-num" v-if="data.permKey === 'email:send'" @click.stop>
                <el-input-number v-if="form.sendType === 'day' || form.sendType === 'count'" v-model="form.sendCount" controls-position="right" :min="0" :max="99999" size="small"
                                 :placeholder="$t('total')">
                </el-input-number>
                  <el-select v-model="form.sendType" placeholder="Select" size="small"
                             :style="`width: ${ locale === 'zh' ? 65 : 85 }px;margin-left: 5px;`">
                    <el-option :label="$t('total')" value="count"/>
                    <el-option :label="$t('daily')" value="day"/>
                    <el-option :label="$t('internal')" value="internal"/>
                    <el-option :label="$t('btnBan')" value="ban"/>
                  </el-select>
              </span>
              <span class="send-num" v-if="data.permKey === 'account:add'" @click.stop>
                <el-input-number v-model="form.accountCount" controls-position="right" :min="0" :max="99999"
                                 size="small" :placeholder="$t('total')">
                </el-input-number>
              </span>
            </div>
          </template>
        </el-tree>
        <el-button class="btn" type="primary" :loading="permLoading" @click="roleFormClick"
        >{{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import {Icon} from "@iconify/vue";
import {defineOptions, nextTick, reactive, ref, computed} from "vue";
import {roleAdd, roleDelete, rolePermTree, roleRoleList, roleSet, roleSetDef} from "@/request/role.js";
import loading from '@/components/loading/index.vue';
import {useRoleStore} from "@/store/role.js";
import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {isEmail, isDomain} from "@/utils/verify-utils.js";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'role'
})

const {domainList} = useSettingStore();
const {t, locale} = useI18n();
const userStore = useUserStore();
const roleStore = useRoleStore();
const roleFormShow = ref(false)
const treeList = reactive([])
const roles = ref([])
const tree = ref({})
const permLoading = ref(false)
const tableLoading = ref(false)
const desShow = ref(true)
const isMobile = ref(false)
const dialogWidth = computed(() => window.innerWidth < 500 ? '95%' : window.innerWidth < 768 ? '85%' : '50%')
const first = ref(true)

const dialogType = reactive({
  title: '',
  type: ''
})

const form = reactive({
  name: null,
  description: null,
  banEmail: [],
  sendType: 'count',
  sendCount: 0,
  accountCount: 0,
  sort: 0,
  level: 100,
  isDefault: 0,
  availDomain: []
})

let domainOptions = []

const expand = ref(false)

let chooseRole = {}

refresh()

rolePermTree().then(tree => {
  treeList.push(...tree)
})

domainOptions = domainList.map(domain => {
  const cleanDomain = domain.replace(/^@/, '');
  return {label: cleanDomain, value: cleanDomain};
});


function availDomainChange() {
  const index = form.availDomain.findIndex(domain => {
    return !domainOptions.map(option => option.value).includes(domain)
  })
  if (index > -1) {
    form.availDomain.splice(index, 1)
  }
}

function banEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  form.banEmail.splice(form.banEmail.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email) || email === '*') && !form.banEmail.includes(email)) {
      form.banEmail.push(email)
    }
  })
}


function roleFormClick() {
  if (dialogType.type === 'add') {
    addRole()
  } else {
    setRole()
  }
}

function setDef(role) {
  roleSetDef(role.roleId).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    getRoleList()
  })
}

function delRole(role) {
  ElMessageBox.confirm(t('delConfirm', {msg: role.name}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('confirm'),
    type: 'warning'
  }).then(() => {
    roleDelete(role.roleId).then(() => {
      ElMessage({
        message: t('copySuccessMsg'),
        type: "success",
        plain: true
      })
      getRoleList()
      userStore.refreshUserList()
      roleStore.refreshSelect()
    })
  });
}

function expandChange(e) {
  if (e) {
    const nodes = tree.value?.store.nodesMap;
    for (const key in nodes) {
      nodes[key].expanded = true;
    }
  } else {
    const nodes = tree.value?.store.nodesMap;
    for (const key in nodes) {
      nodes[key].expanded = false;
    }
  }

}

function setRole() {

  if (!form.name) {
    ElMessage({
      message: t('emptyRoleNameMsg'),
      type: "error",
      plain: true
    })
    return
  }

  const params = {...form, roleId: chooseRole.roleId}
  const checkedId = tree.value.getCheckedKeys()
  const halfId = tree.value.getHalfCheckedKeys()
  params.permIds = [...checkedId, ...halfId]

  permLoading.value = true
  roleSet(params).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })

    const names = roles.value.map(role => role.name)

    if (!names.includes(params.name)) {
      roleStore.refreshSelect()
    }

    roleFormShow.value = false
    getRoleList()
  }).finally(() => {
    permLoading.value = false
  })
}

function resetForm() {
  form.name = null
  form.description = null
  form.sort = 0
  form.level = 100
  form.sendType = 'count'
  form.sendCount = 0
  form.accountCount = 0
  form.banEmail = []
  form.availDomain = []
  tree.value.setCheckedKeys([])
}

function openRoleSet(role) {
  chooseRole = role
  dialogType.title = t('changeRoleTitle')
  dialogType.type = 'set'
  roleFormShow.value = true
  form.sort = role.sort
  form.level = role.level || 100
  form.name = role.name
  form.description = role.description
  form.sendType = role.sendType
  form.sendCount = role.sendCount
  form.accountCount = role.accountCount
  form.banEmail = role.banEmail
  form.availDomain = role.availDomain
  nextTick(() => {
    tree.value.setCheckedKeys(role.permIds)
  })
}


function openAddRole() {
  dialogType.title = t('addRoleTitle')
  dialogType.type = 'add'
  roleFormShow.value = true
}

function addRole() {
  const params = {...form}
  const checkedId = tree.value.getCheckedKeys()
  const halfId = tree.value.getHalfCheckedKeys()
  params.permIds = [...checkedId, ...halfId]

  permLoading.value = true
  roleAdd(params).then(() => {
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    roleFormShow.value = false
    getRoleList()
    roleStore.refreshSelect()
  }).finally(() => {
    permLoading.value = false
  })
}


function refresh() {
  tableLoading.value = true
  roles.length = 0
  getRoleList()
}

function getRoleList() {
  roleRoleList().then(list => {
    roles.value = list
  }).finally(() => {
    tableLoading.value = false
    setTimeout(() => {
      first.value = false
    }, 200)
  })
}

function adjustWidth() {
  const w = window.innerWidth
  desShow.value = w > 767
  isMobile.value = w <= 640
}

adjustWidth()

window.onresize = () => {
  adjustWidth()
};


</script>
<style scoped lang="scss">

.perm-box {
  height: 100%;
  overflow: hidden;
  width: 100%;

  .perm-scrollbar {
    height: 100%;
  }
}

.role-card-list {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  gap: 12px;

  .role-card-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .role-card-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 500;
    color: var(--el-text-color-primary);

    span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .role-card-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .meta-label {
    color: var(--el-text-color-placeholder);
  }

  .meta-value {
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  .meta-desc {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
  }

  .role-card-actions {
    flex-shrink: 0;
  }
}

.role-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.send-num {
  margin-left: 10px;

  .el-input-number {
    width: 95px;
  }
}

.def-tag {
  margin-left: 10px;
  height: 20px;
}

.header-actions {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 18px;

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

.warning {
  position: relative;
  left: 5px;
  top: 2px;
  color: gray;
  cursor: pointer;
}

:deep(.description) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loading {
  height: calc(100% - 41px);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  background: var(--loadding-background);
  z-index: 2;
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

.role-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


:deep(.el-segmented--small .el-segmented__item) {
  border-radius: 8px !important;
  overflow: hidden;
}

.dialog-box {
  .dialog-input {
    margin-bottom: 15px !important;
  }
}

.labeled-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .el-input-number {
    width: 150px;
    flex-shrink: 0;
  }
}

.label-with-desc {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.input-label {
  font-size: 14px;
  white-space: nowrap;
}

.input-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
}

.perm-expand {
  margin-bottom: 5px;
  --el-border-radius-base: 4px;
  position: relative;
  bottom: 5px;
}


:deep(.el-dialog) {
  margin-bottom: 20px !important;
  width: 460px !important;
  @media (max-width: 500px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;

  }
}

:deep(.el-scrollbar__view) {
  height: 100%;
}

.btn {
  width: 100%;
  margin-top: 15px;
}
</style>
