<template>
 <div class="personal-mail-page">
  <MailSearchBar v-model="searchFilters" :show-unread="false" @search="sendScroll.refreshList?.()" />
  <emailScroll ref="sendScroll"
               :cancel-success="cancelStar"
               :star-success="addStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :star-add="starAdd"
               show-status
               actionLeft="4px"
               :star-cancel="starCancel"
               @jump="jumpContent"
               :time-sort="params.timeSort"
               :type="'send'"
  >
    <template #first>
      <el-tooltip :content="$t('sortByTime')" placement="top">
        <Icon class="icon" @click="changeTimeSort" icon="mingcute:sort-descending-line"
              v-if="params.timeSort === 0" width="18" height="18"/>
        <Icon class="icon" @click="changeTimeSort" icon="mingcute:sort-ascending-line" v-else
              width="18" height="18"/>
      </el-tooltip>
    </template>
  </emailScroll>
 </div>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import emailScroll from "@/components/email-scroll/index.vue"
import MailSearchBar from '@/components/MailSearchBar.vue';
import {emailList, emailDelete} from "@/request/email.js";
import {starAdd, starCancel} from "@/request/star.js";
import {defineOptions, onMounted, reactive, ref, watch} from "vue";
import router from "@/router/index.js";
import {Icon} from "@iconify/vue";

defineOptions({
  name: 'send'
})

const emailStore = useEmailStore();
const accountStore = useAccountStore();
const sendScroll = ref({})
const searchFilters = ref({});
const params = reactive({
  timeSort: 0,
})

onMounted(() => {
  emailStore.sendScroll = sendScroll;
})

watch(() => accountStore.currentAccountId, () => {
  sendScroll.value.refreshList();
})

function changeTimeSort() {
  params.timeSort = params.timeSort ? 0 : 1
  sendScroll.value.refreshList();
}

function jumpContent(email) {
  emailStore.contentData.email = email
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push('/message')
}

function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}

function getEmailList(emailId, size) {
  const accountId =  accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount?.allReceive;
  return emailList(accountId, allReceive, emailId, params.timeSort, size, 1, searchFilters.value).then(data => {
    if (data.latestEmail) { data.latestEmail.reqAccountId = accountId; data.latestEmail.allReceive = allReceive; }
    return data;
  })
}

</script>

<style scoped>
.icon {
  cursor: pointer;
}
</style>
