<template>
  <div v-if="analysisLoading" class="analysis-loading">
    <loading/>
  </div>
  <el-scrollbar v-else style="height: 100%;">
    <div class="analysis" :key="boxKey">
      <section class="analysis-overview" :aria-label="$t('totalReceived')">
        <article class="overview-card">
          <div class="overview-label"><span class="overview-mark received-mark"><Icon icon="mingcute:mailbox-line" width="17" height="17" /></span>{{ $t('totalReceived') }}</div>
          <el-statistic :formatter="value => Math.round(value)" :value="receiveData" />
          <div class="overview-meta"><span>{{ $t('active') }} <b class="normal">{{ numberCount.normalReceiveTotal }}</b></span><span>{{ $t('deleted') }} <b class="deleted">{{ numberCount.delReceiveTotal }}</b></span></div>
        </article>
        <article class="overview-card">
          <div class="overview-label"><span class="overview-mark sent-mark"><Icon icon="mingcute:send-plane-line" width="17" height="17" /></span>{{ $t('totalSent') }}</div>
          <el-statistic :formatter="value => Math.round(value)" :value="sendData" />
          <div class="overview-meta"><span>{{ $t('active') }} <b class="normal">{{ numberCount.normalSendTotal }}</b></span><span>{{ $t('deleted') }} <b class="deleted">{{ numberCount.delSendTotal }}</b></span></div>
        </article>
        <article class="overview-card">
          <div class="overview-label"><span class="overview-mark account-mark"><Icon icon="mingcute:mail-line" width="17" height="17" /></span>{{ $t('totalMailboxes') }}</div>
          <el-statistic :formatter="value => Math.round(value)" :value="accountData" />
          <div class="overview-meta"><span>{{ $t('active') }} <b class="normal">{{ numberCount.normalAccountTotal }}</b></span><span>{{ $t('deleted') }} <b class="deleted">{{ numberCount.delAccountTotal }}</b></span></div>
        </article>
        <article class="overview-card">
          <div class="overview-label"><span class="overview-mark user-mark"><Icon icon="mingcute:user-3-line" width="17" height="17" /></span>{{ $t('totalUsers') }}</div>
          <el-statistic :formatter="value => Math.round(value)" :value="userData" />
          <div class="overview-meta"><span>{{ $t('active') }} <b class="normal">{{ numberCount.normalUserTotal }}</b></span><span>{{ $t('deleted') }} <b class="deleted">{{ numberCount.delUserTotal }}</b></span></div>
        </article>
      </section>

      <section class="analysis-primary-grid">
        <article class="analysis-panel trend-panel">
          <header class="panel-heading"><div><h2>{{ $t('emailGrowth') }}</h2><span>{{ $t('analysisRecentDays') }}</span></div><span class="panel-index">01</span></header>
          <div class="email-column"></div>
        </article>
        <article class="analysis-panel source-panel">
          <header class="panel-heading"><div><h2>{{ $t('emailSource') }}</h2><span>{{ $t('analysisTopSenders') }}</span></div><span class="panel-index">02</span></header>
          <div class="sender-pie"></div>
        </article>
      </section>

      <section class="analysis-secondary-grid">
        <article class="analysis-panel growth-panel">
          <header class="panel-heading"><div><h2>{{ $t('userGrowth') }}</h2><span>{{ $t('analysisRecentDays') }}</span></div><span class="panel-index">03</span></header>
          <div class="increase-line"></div>
        </article>
        <article class="analysis-panel suffix-panel">
          <header class="panel-heading">
            <div>
              <h2>{{ $t('analysisPopularSuffixes') }}</h2>
              <span>{{ $t('analysisSuffixRankingScope') }}</span>
            </div>
          </header>
          <ol v-if="suffixRanking.length" class="suffix-ranking">
            <li v-for="(row, index) in suffixRanking" :key="row.suffix" class="suffix-row">
              <span class="suffix-position" aria-hidden="true">{{ index + 1 }}</span>
              <span class="suffix-name" :title="'@' + row.suffix">@{{ row.suffix }}</span>
              <strong class="suffix-count">{{ formatCount.format(row.total) }}</strong>
              <span class="suffix-track" aria-hidden="true">
                <span :style="{width: (row.total / suffixRanking[0].total * 100) + '%'}"></span>
              </span>
            </li>
          </ol>
          <p v-else class="suffix-empty">{{ $t('analysisNoSuffixes') }}</p>
        </article>
      </section>
    </div>
  </el-scrollbar>
</template>

<script setup>
import {Icon} from "@iconify/vue";
import {useTransition} from "@vueuse/core";
import {defineOptions, onActivated, onDeactivated, onMounted, reactive, ref, watch, computed} from "vue";
import echarts from "@/echarts/index.js";
import dayjs from "dayjs";
import {analysisEcharts} from "@/request/analysis.js";
import {useUiStore} from "@/store/ui.js";
import {debounce} from "lodash-es";
import loading from "@/components/loading/index.vue";
import {useRoute} from "vue-router";
import {useI18n} from 'vue-i18n';

defineOptions({
  name: 'analysis'
})

const {t, locale} = useI18n();
const route = useRoute();
const uiStore = useUiStore()
const receiveTotal = ref(0)
const sendTotal = ref(0)
const accountTotal = ref(0)
const userTotal = ref(0)
const analysisLoading = ref(true)

const numberCount = reactive({
  normalReceiveTotal: 0,
  normalSendTotal: 0,
  normalAccountTotal: 0,
  normalUserTotal: 0,
  delReceiveTotal: 0,
  delSendTotal: 0,
  delAccountTotal: 0,
  delUserTotal: 0
})


const receiveData = useTransition(receiveTotal, {
  duration: 1500,
})

const sendData = useTransition(sendTotal, {
  duration: 1500,
})

const accountData = useTransition(accountTotal, {
  duration: 1500,
})

const userData = useTransition(userTotal, {
  duration: 1500,
})

const senderData = ref(null)
const userLineData = reactive({
  xdata: [],
  sdata: []
})
const suffixRanking = ref([])
const formatCount = computed(() => new Intl.NumberFormat(locale.value))

const emailColumnData = {
  receiveData: [],
  sendData: [],
  daysData: []
}

const topic = computed(() => ({
  color: uiStore.dark ? '#E5EAF3' : '#303133',
  background: uiStore.dark ? '#141414' : '#FFFFFF',
  borderColor: uiStore.dark ? '#141414' : '#FFFFFF',
  scaleLineColor: uiStore.dark ? '#636466' : '#CDD0D6',
  crossColor: uiStore.dark ? '#8D9095' : '#A8ABB2',
  axisColor: uiStore.dark ? '#A3A6AD' : '#909399',
  splitLineColor: uiStore.dark ? '#58585B' : '#D4D7DE',
  gaugeSplitLine: uiStore.dark ? '#CFD3DC' : '#606266',
  containerBackground: uiStore.dark ? '#6C6E72' : '#E6EBF8'
}))
let leaveWidth = 0
let senderPie = null
let increaseLine = null
let emailColumn = null
let first = true
let boxKey = ref(0)
let analysisDark = uiStore.dark

onMounted(() => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  analysisEcharts(timeZone).then(data => {
    receiveTotal.value = data.numberCount.receiveTotal
    sendTotal.value = data.numberCount.sendTotal
    accountTotal.value = data.numberCount.accountTotal
    userTotal.value = data.numberCount.userTotal
    numberCount.normalReceiveTotal = data.numberCount.normalReceiveTotal
    numberCount.normalSendTotal = data.numberCount.normalSendTotal
    numberCount.normalAccountTotal = data.numberCount.normalAccountTotal
    numberCount.normalUserTotal = data.numberCount.normalUserTotal
    numberCount.delReceiveTotal = data.numberCount.delReceiveTotal
    numberCount.delSendTotal = data.numberCount.delSendTotal
    numberCount.delAccountTotal = data.numberCount.delAccountTotal
    numberCount.delUserTotal = data.numberCount.delUserTotal
    senderData.value = data.receiveRatio.nameRatio.map(item => {
      return {
        name: item.name || ' ',
        value: item.total
      }
    })

    userLineData.xdata = data.userDayCount.map(item => dayjs(item.date).format("M.D"));
    userLineData.sdata = data.userDayCount.map(item => item.total)
    suffixRanking.value = data.mailboxSuffixRanking ?? []

    emailColumnData.daysData = data.emailDayCount.receiveDayCount.map(item => dayjs(item.date).format("M.D"))
    emailColumnData.receiveData = data.emailDayCount.receiveDayCount.map(item => item.total)
    emailColumnData.sendData = data.emailDayCount.sendDayCount.map(item => item.total)
    analysisLoading.value = false
    initPicture();
    first = false
  })

})

const widthChange = debounce(initPicture, 500, {
  leading: false,
  trailing: true
})


watch(() => uiStore.asideShow, () => {
  if (window.innerWidth > 1024) {
    widthChange()
  }
})

onActivated(() => {
  if (first) return
  if (window.innerWidth !== leaveWidth && leaveWidth !== 0) {
    widthChange()
  } else if (!senderPie) {
    widthChange()
  } else if (analysisDark !== uiStore.dark) {
    initPicture()
    analysisDark = uiStore.dark
  }
})

onDeactivated(() => {
  leaveWidth = window.innerWidth
})

window.onresize = () => {
  setStyle()
  widthChange()
}

watch(() => uiStore.dark, () => {
  if (route.name !== 'analysis') return
  analysisDark = uiStore.dark
  initPicture()
})

function initPicture() {
  if (route.name !== 'analysis') return
  boxKey.value++
  setTimeout(() => {
    createSenderPie()
    createIncreaseLine()
    createEmailColumnChart();
  })
}

function setStyle() {
  emailColumnData.barWidth = window.innerWidth > 767 ? '40%' : '60%'
}

const measureCtx = document.createElement('canvas').getContext('2d');
measureCtx.font = '12px sans-serif';

function truncateTextByWidth(text, maxWidth = 140) {

  let width = measureCtx.measureText(text).width;
  if (width <= maxWidth) return text;

  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += text[i];
    if (measureCtx.measureText(result + '…').width > maxWidth) {
      return result.slice(0, -1) + '…';
    }
  }
  return text;
}

function createSenderPie() {

  if (senderPie) {
    senderPie.dispose()
  }
  senderPie = echarts.init(document.querySelector(".sender-pie"))
  const total = (senderData.value || []).reduce((sum, item) => sum + Number(item.value || 0), 0)
  const option = {
    tooltip: {
      trigger: 'item',
      confine: true,
      textStyle: {
        color: topic.value.color
      },
      backgroundColor: topic.value.background,
      formatter: params => {
        const percent = total ? (Number(params.value) * 100 / total).toFixed(1).replace(/\.0$/, '') : '0'
        return `${params.marker} ${escapeTooltipText(params.name)}： ${params.value} (${percent}%)`;
      }
    },
    grid: {top: 8, right: 34, bottom: 18, left: 8, containLabel: true},
    xAxis: {
      type: 'value',
      min: 0,
      axisLabel: {show: false},
      axisTick: {show: false},
      axisLine: {show: false},
      splitLine: {lineStyle: {color: topic.value.scaleLineColor, type: 'dashed'}},
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: (senderData.value || []).map(item => item.name),
      axisLabel: {
        color: topic.value.color,
        fontSize: 11,
        margin: 10,
        formatter: value => truncateTextByWidth(value, Math.max(76, senderPie.getWidth() * 0.34)),
      },
      axisTick: {show: false},
      axisLine: {show: false},
    },
    series: [
      {
        data: senderData.value || [],
        type: 'bar',
        barMaxWidth: 17,
        showBackground: true,
        backgroundStyle: {color: topic.value.containerBackground, borderRadius: [0, 8, 8, 0]},
        itemStyle: {
          borderRadius: [0, 7, 7, 0],
          color: params => params.dataIndex === 0 ? '#4f76e8' : '#8ca5e8',
        },
        label: {
          show: true,
          position: 'right',
          color: topic.value.color,
          fontSize: 11,
        },
      }
    ]
  }
  senderPie.setOption(option)
}

function escapeTooltipText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function createIncreaseLine() {

  if (increaseLine) {
    increaseLine.dispose()
  }

  increaseLine = echarts.init(document.querySelector(".increase-line"))

  let option = {
    tooltip: {
      trigger: 'axis', // 设置触发方式为 'axis'，在坐标轴上显示信息
      axisPointer: {
        type: 'cross', // 指示器的类型为交叉型，适用于折线图等
        crossStyle: {
          color: topic.value.crossColor// 设置指示器线的颜色
        },
        lineStyle: {
          color: topic.value.crossColor         // ← 竖线颜色
        },
        axis: 'x',
      },
      formatter: function (params) {
        let result = ''
        params.forEach(item => {
          result = `${item.marker} ${t('growthTotalUsers')} ${item.value}`;
        });
        return result;
      },
      backgroundColor: topic.value.background,  // 设置背景颜色
      borderColor: topic.value.splitLineColor,      // 设置边框颜色
      borderWidth: 1,           // 设置边框宽度
      padding: 10,              // 设置内边距
      textStyle: {
        color: topic.value.color,          // 设置文字颜色
      }
    },
    grid: {
      top: '8%',
      right: '20',
      left: '35',
      bottom: '35'
    },
    xAxis: {
      type: 'category',
      data: userLineData.xdata,
      axisTick: {
        show: false,
        alignWithLabel: false,  // 刻度线与标签对齐,
        lineStyle: {
          color: topic.value.axisColor,
        }
      },
      axisPointer: {
        label: {
          show: false
        }
      },
      axisLine: {
        lineStyle: {
          color: topic.value.axisColor,
          width: 1,
          type: 'solid'
        }
      },
      axisLabel: {
        formatter: function (value, index) {
          if (index === 0) {
            return '      ' + value;
          }
          if (index === userLineData.xdata.length - 1) {
            return value + '   '
          }
          return value;
        },

      },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        margin: 5, // 增加y轴刻度数字与网格线之间的间距
      },
      boundaryGap: [0, 0.1],
      max: (params) => {
        if (params.max < 8) {
          return 10
        }
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: topic.value.axisColor,
          width: 1,
        }
      },
      axisPointer: {
        label: {
          show: true,
          formatter: (e) => {
            return Math.round(e.value)
          }
        }
      },
      splitLine: {
        show: true, // 显示网格线
        lineStyle: {
          type: 'dashed', // 设置网格线为虚线
          color: topic.value.scaleLineColor   // 设置虚线的颜色
        }
      }
    },
    series: [
      {

        data: userLineData.sdata,
        type: 'line',
        smooth: 0.1,
        symbol: 'none',
        lineStyle: {
          color: '#1D84FF',
          width: 2.5
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(29, 132, 255, 0.3)'
            },
            {
              offset: 1,
              color: 'rgba(29, 132, 255, 0.03)'
            }
          ])
        },
        color: ['#1D84FF'],
      }
    ]
  };
  increaseLine.setOption(option);

  let max = increaseLine.getModel().getComponent('yAxis', 0).axis.scale.getExtent()[1];

  let left = 35

  if (max > 99) left = 42
  if (max > 999) left = 51
  if (max > 9999) left = 58
  if (max > 99999) left = 66

  increaseLine.setOption({
    grid: {
      left: left
    }
  });
}

function createEmailColumnChart() {

  if (emailColumn) {
    emailColumn.dispose()
  }

  emailColumn = echarts.init(document.querySelector(".email-column"));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {type: 'line', lineStyle: {color: topic.value.crossColor}},
      textStyle: {
        color: topic.value.color
      },
      backgroundColor: topic.value.background,
      formatter: function (params) {
        const rows = Array.isArray(params) ? params : [params]
        return rows.map(item => `${item.marker} ${escapeTooltipText(item.seriesName)}：${item.value}`).join('<br>')
      }
    },
    legend: {
      data: [t('emailReceived'), t('emailSent')],
      top: '0',
      textStyle: {
        color: topic.value.color,  // 图例文字颜色
      }
    },
    grid: {
      left: 12,
      right: 14,
      bottom: 18,
      top: 46,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: emailColumnData.daysData,
      axisTick: {
        show: false,
      },
      axisLine: {lineStyle: {color: topic.value.axisColor}},
      axisLabel: {hideOverlap: true, color: topic.value.axisColor},
    },
    yAxis: {
      max: (params) => {
        if (params.max < 8) {
          return 10
        }
      },
      minInterval: 1,
      splitLine: {
        show: true,
        lineStyle: {
          color: topic.value.splitLineColor,
          type: 'dashed',
          width: 1
        }
      },
      axisLine: {show: false},
      axisLabel: {color: topic.value.axisColor},
      axisTick: {show: false},
      type: 'value',
      boundaryGap: [0, 0.1],
    },
    series: [
      {
        name: t('emailReceived'),
        type: 'line',
        smooth: 0.28,
        showSymbol: false,
        lineStyle: {width: 2.5, color: '#4f76e8'},
        itemStyle: {color: '#4f76e8'},
        areaStyle: {color: 'rgba(79, 118, 232, 0.09)'},
        data: emailColumnData.receiveData,
      },
      {
        name: t('emailSent'),
        type: 'line',
        smooth: 0.28,
        showSymbol: false,
        lineStyle: {width: 2.5, color: '#24a88b'},
        itemStyle: {color: '#24a88b'},
        data: emailColumnData.sendData,
      }
    ]
  };

  emailColumn.setOption(option);
}

</script>
<style>
.percentage-value {
  display: block;
  margin-top: 10px;
  font-size: 28px;
}

.percentage-label {
  display: block;
  margin-top: 10px;
  font-size: 12px;
}
</style>
<style scoped lang="scss">
.analysis-loading {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analysis {
  min-height: 100%;
  padding: 18px 20px 28px;
  gap: 14px;
  display: grid;
  grid-auto-rows: min-content;
  @media (max-width: 767px) {
    padding: 12px 12px 22px;
    gap: 11px;
  }

  .analysis-overview {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .overview-card, .analysis-panel {
    min-width: 0;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
  }

  .overview-card {
    min-height: 116px;
    padding: 14px 15px 12px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;

    :deep(.el-statistic__content) { line-height: 1.15; }
    :deep(.el-statistic__number) {
      font-size: clamp(19px, 1.65vw, 26px);
      font-weight: 650;
      letter-spacing: -0.045em;
      font-variant-numeric: tabular-nums;
    }
  }

  .overview-label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 9px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .overview-mark {
    width: 29px;
    height: 29px;
    display: inline-grid;
    place-items: center;
    flex: none;
    border-radius: 9px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .sent-mark { color: #18896f; background: rgba(36,168,139,.12); }
  .account-mark { color: #8b64bb; background: rgba(139,100,187,.12); }
  .user-mark { color: #bf7a36; background: rgba(191,122,54,.12); }

  .overview-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 13px;
    margin-top: 8px;
    color: var(--el-text-color-secondary);
    font-size: 11px;
    b { margin-left: 2px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .normal { color: var(--el-color-success); }
    .deleted { color: var(--el-color-danger); }
  }

  .analysis-primary-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(310px, .9fr);
    gap: 12px;
  }

  .analysis-secondary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }

  .analysis-panel {
    padding: 15px 17px 12px;
    overflow: hidden;
  }

  .panel-heading {
    min-height: 35px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    h2 { margin: 0; color: var(--el-text-color-primary); font-size: 14px; line-height: 1.4; font-weight: 620; }
    span:not(.panel-index) { display: block; margin-top: 3px; color: var(--el-text-color-secondary); font-size: 11px; line-height: 1.4; }
  }

  .panel-index {
    color: var(--el-text-color-placeholder);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    letter-spacing: .08em;
  }

  .email-column { height: 296px; }
  .sender-pie { height: 296px; }
  .increase-line { height: 220px; }
  .suffix-ranking {
    display: grid;
    gap: 8px;
    padding: 0;
    margin: 8px 0 0;
    list-style: none;
  }

  .suffix-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: 3px 8px;
    font-size: 13px;
    line-height: 20px;
  }

  .suffix-position, .suffix-count { font-variant-numeric: tabular-nums; }
  .suffix-position { color: var(--el-text-color-secondary); }
  .suffix-count { font-weight: 600; }
  .suffix-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .suffix-track {
    grid-column: 2 / -1;
    height: 4px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    overflow: hidden;
    > span { display: block; height: 100%; border-radius: inherit; background: #8b64bb; }
  }

  .suffix-empty {
    margin: 0;
    padding-block: 50px;
    color: var(--el-text-color-secondary);
    text-align: center;
    font-size: 13px;
  }

  .analysis-primary-grid .analysis-panel { min-height: 366px; }
  .analysis-secondary-grid .analysis-panel { min-height: 270px; }

  @media (max-width: 1180px) {
    .analysis-primary-grid { grid-template-columns: minmax(0, 1.35fr) minmax(270px, .9fr); }
  }
  @media (max-width: 900px) {
    .analysis-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .analysis-primary-grid, .analysis-secondary-grid { grid-template-columns: minmax(0, 1fr); }
    .analysis-primary-grid .analysis-panel { min-height: 335px; }
    .email-column, .sender-pie { height: 276px; }
    .increase-line { height: 210px; }
    .analysis-secondary-grid .suffix-panel { min-height: 0; }
  }
  @media (max-width: 480px) {
    .overview-card { min-height: 106px; padding: 11px 10px 10px; }
    .overview-label { gap: 6px; font-size: 11px; }
    .overview-mark { width: 26px; height: 26px; border-radius: 8px; }
    .overview-meta { gap: 5px 8px; font-size: 10px; }
    .overview-card :deep(.el-statistic__number) { font-size: 20px; }
    .analysis-panel { padding: 13px 12px 10px; }
    .analysis-primary-grid .analysis-panel { min-height: 314px; }
    .email-column, .sender-pie { height: 250px; }
  }
}

</style>




















