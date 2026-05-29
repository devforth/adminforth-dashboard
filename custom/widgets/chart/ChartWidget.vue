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
      :series-name="chartConfig.seriesName"
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
      v-else-if="chartConfig?.type === 'bar'"
      :rows="barRows"
      :label-field="barLabelField"
      :value-field="barValueField"
      :color="chartConfig.color"
      :height="chartHeight"
    />

    <HistogramChart
      v-else-if="chartConfig?.type === 'histogram'"
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
      :rows="rows"
      :x-field="xField"
      :series="stackedBarSeries"
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
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../../model/dashboard.types.js'
import { normalizeChartWidgetConfig } from './chart.types.js'
import BarChart from './bar/BarChart.vue'
import FunnelChart from './funnel/FunnelChart.vue'
import HistogramChart from './histogram/HistogramChart.vue'
import LineChart from './line/LineChart.vue'
import PieChart from './pie/PieChart.vue'
import StackedBarChart from './stacked-bar/StackedBarChart.vue'
import { formatChartLabel, toFiniteNumber } from './chart.utils.js'

const DEFAULT_WIDGET_HEIGHT = 500

const props = defineProps<{
  dashboardSlug: string
  widget: DashboardWidgetConfig
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
const chartConfig = computed(() => normalizeChartWidgetConfig(props.widget.chart))
const aggregateGroupField = computed(() => {
  const dataSource = props.widget.dataSource

  if (dataSource?.type !== 'aggregate' || !dataSource.groupBy) {
    return undefined
  }

  return dataSource.groupBy.field
})

function resolveChartDimensionField(field: string | undefined, fallbackField: string | undefined) {
  const resolvedField = field ?? fallbackField

  if (!resolvedField) {
    return ''
  }

  if (columns.value.includes(resolvedField)) {
    return resolvedField
  }

  if (
    aggregateGroupField.value
    && resolvedField === aggregateGroupField.value
    && columns.value.includes('group')
  ) {
    return 'group'
  }

  return resolvedField
}

const xField = computed(() => resolveChartDimensionField(chartConfig.value?.xField, columns.value[0]))
const yField = computed(() => chartConfig.value?.yField || columns.value[1])
const labelField = computed(() => resolveChartDimensionField(chartConfig.value?.labelField, columns.value[0]))
const valueField = computed(() => chartConfig.value?.valueField || columns.value[1])
const pieRows = computed(() => {
  if (chartConfig.value?.valueField) {
    return rows.value
  }

  const groupedRows = new Map<string, { label: string, value: number }>()

  for (const row of rows.value) {
    const label = formatChartLabel(row[labelField.value])
    const item = groupedRows.get(label) ?? { label, value: 0 }
    item.value += 1
    groupedRows.set(label, item)
  }

  return Array.from(groupedRows.values())
})
const pieLabelField = computed(() => chartConfig.value?.valueField ? labelField.value : 'label')
const pieValueField = computed(() => chartConfig.value?.valueField ? valueField.value : 'value')
const barRows = computed(() => {
  const bucketField = chartConfig.value?.bucketField

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
const barLabelField = computed(() => chartConfig.value?.bucketField ? 'label' : labelField.value)
const barValueField = computed(() => chartConfig.value?.bucketField ? 'count' : valueField.value)
const stackedBarSeries = computed(() => {
  if (chartConfig.value?.series?.length) {
    return chartConfig.value.series
  }

  return columns.value
    .filter((column) => column !== xField.value)
    .map((column) => ({
      name: column,
      field: column,
    }))
})

const chartHeight = computed(() => {
  return Math.max((props.widget.height ?? DEFAULT_WIDGET_HEIGHT) - 24, 96)
})
</script>
