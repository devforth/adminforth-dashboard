<template>
  <div class="h-full min-h-0 overflow-hidden rounded-lg bg-lightTableBackground p-3 dark:bg-darkTableBackground">
    <div
      v-if="isLoading"
      class="text-sm text-lightListTableText dark:text-darkListTableText"
    >
      Loading...
    </div>

    <div
      v-else-if="error"
      class="text-sm text-lightInputErrorColor"
    >
      Failed to load chart data
    </div>

    <div
      v-else-if="!rows.length"
      class="text-sm text-lightListTableText dark:text-darkListTableText"
    >
      No data available
    </div>

    <LineChart
      v-else-if="chartConfig?.type === 'line'"
      :rows="rows"
      :x-field="xField"
      :y-field="yField"
      :series-name="lineSeriesName"
      :color="chartConfig.color"
      :height="chartHeight"
    />

    <PieChart
      v-else-if="chartConfig?.type === 'pie'"
      :rows="pieRows"
      :label-field="pieLabelField"
      :value-field="pieValueField"
      :colors="chartConfig.colors"
      :height="chartHeight"
    />

    <BarChart
      v-else-if="chartConfig?.type === 'bar' || chartConfig?.type === 'histogram'"
      :rows="barRows"
      :label-field="barLabelField"
      :value-field="barValueField"
      :color="chartConfig.color"
      :height="chartHeight"
    />

    <FunnelChart
      v-else-if="chartConfig?.type === 'funnel'"
      :rows="rows"
      :label-field="labelField"
      :value-field="valueField"
      :colors="chartConfig.colors"
      :height="chartHeight"
    />

    <StackedBarChart
      v-else-if="chartConfig?.type === 'stacked_bar'"
      :rows="stackedBarRows"
      :x-field="xField"
      :y-field="stackedBarYField"
      :series-field="stackedBarSeriesField"
      :colors="chartConfig.colors"
      :height="chartHeight"
    />

    <div
      v-else
      class="text-sm text-lightListTableText dark:text-darkListTableText"
    >
      Unsupported chart type
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../../queries/useWidgetData.js'
import type { ChartDashboardWidgetConfig, DashboardWidgetTableData } from '../../model/dashboard.types.js'
import BarChart from './BarChart.vue'
import FunnelChart from './FunnelChart.vue'
import LineChart from './LineChart.vue'
import PieChart from './PieChart.vue'
import StackedBarChart from './StackedBarChart.vue'
import { toFiniteNumber } from './chart.utils.js'

const DEFAULT_WIDGET_HEIGHT = 500

const props = defineProps<{
  dashboardSlug: string
  widget: ChartDashboardWidgetConfig
}>()

const dashboardSlugRef = computed(() => props.dashboardSlug)
const widgetIdRef = computed(() => props.widget.id)
const {
  data,
  isLoading,
  error,
  refetch,
} = useWidgetData(dashboardSlugRef, widgetIdRef)

watch(
  () => props.widget,
  () => {
    void refetch()
  },
  { deep: true },
)

const chartData = computed(() => data.value?.data as DashboardWidgetTableData | null)
const rows = computed(() => chartData.value?.rows ?? [])
const columns = computed(() => chartData.value?.columns ?? [])
const chartConfig = computed(() => props.widget.chart)

function resolveChartDimensionField(field: string | undefined, fallbackField: string | undefined) {
  const resolvedField = field ?? fallbackField

  if (!resolvedField) {
    return ''
  }

  if (columns.value.includes(resolvedField)) {
    return resolvedField
  }

  return resolvedField
}

const firstYField = computed(() => {
  const y = chartConfig.value?.y
  return Array.isArray(y) ? y[0]?.field : y?.field
})
const xField = computed(() => resolveChartDimensionField(chartConfig.value?.x?.field, columns.value[0]))
const yField = computed(() => firstYField.value || columns.value[1])
const labelField = computed(() => resolveChartDimensionField(chartConfig.value?.label?.field, columns.value[0] || 'name'))
const valueField = computed(() => chartConfig.value?.value?.field || columns.value[1] || 'value')
const pieRows = computed(() => rows.value)
const pieLabelField = computed(() => labelField.value)
const pieValueField = computed(() => valueField.value)
const stackedBarYItems = computed(() => {
  const y = chartConfig.value?.y
  return Array.isArray(y) ? y : []
})
const stackedBarRows = computed(() => {
  if (chartConfig.value?.type !== 'stacked_bar' || !stackedBarYItems.value.length) {
    return rows.value
  }

  return rows.value.flatMap((row) => stackedBarYItems.value.map((item) => ({
    [xField.value]: row[xField.value],
    __series: item.label ?? item.field,
    __value: row[item.field],
  })))
})
const barRows = computed(() => {
  const bucketField = chartConfig.value?.type === 'histogram'
    ? chartConfig.value.x?.field
    : undefined

  if (!bucketField) {
    return rows.value
  }

  const buckets = chartConfig.value?.buckets ?? []

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: rows.value.filter((row) => {
      const value = toFiniteNumber(row[bucketField])
      return (bucket.min === undefined || value >= bucket.min)
        && (bucket.max === undefined || value < bucket.max)
    }).length,
  }))
})
const barLabelField = computed(() => chartConfig.value?.type === 'histogram' && chartConfig.value.buckets ? 'label' : xField.value)
const barValueField = computed(() => chartConfig.value?.type === 'histogram' && chartConfig.value.buckets ? 'count' : yField.value)
const seriesField = computed(() => chartConfig.value?.series?.field || columns.value[2] || '')
const stackedBarYField = computed(() => stackedBarYItems.value.length ? '__value' : yField.value)
const stackedBarSeriesField = computed(() => stackedBarYItems.value.length ? '__series' : seriesField.value)
const lineSeriesName = computed(() => {
  const y = chartConfig.value?.y
  return Array.isArray(y) ? y[0]?.label : undefined
})

const chartHeight = computed(() => {
  return Math.max((props.widget.height ?? DEFAULT_WIDGET_HEIGHT) - 24, 96)
})
</script>
