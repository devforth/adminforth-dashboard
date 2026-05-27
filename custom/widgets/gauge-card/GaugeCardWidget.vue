<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../../queries/useWidgetData.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../../model/dashboard.types.js'
import { CHART_COLORS, formatChartValue, toFiniteNumber } from '../chart/chart.utils.js'

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

const gaugeConfig = computed(() => props.widget.gauge_card as {
  value_field?: string
  min?: number
  max?: number
  suffix?: string
  color?: string
} | undefined)
const widgetData = computed(() => data.value?.data as DashboardWidgetTableData | null)
const columns = computed(() => widgetData.value?.columns ?? [])
const firstRow = computed(() => widgetData.value?.rows[0] ?? {})
const valueField = computed(() => gaugeConfig.value?.value_field || columns.value[0])
const minValue = computed(() => gaugeConfig.value?.min ?? 0)
const maxValue = computed(() => gaugeConfig.value?.max ?? 100)
const value = computed(() => toFiniteNumber(firstRow.value[valueField.value]))
const progress = computed(() => {
  const range = maxValue.value - minValue.value
  return range > 0 ? Math.min(Math.max((value.value - minValue.value) / range, 0), 1) : 0
})
const radius = 72
const circumference = Math.PI * radius
const strokeDashoffset = computed(() => circumference * (1 - progress.value))
const gaugeColor = computed(() => gaugeConfig.value?.color || CHART_COLORS[0])
</script>

<template>
  <div class="mt-3 rounded-lg border border-lightListBorder bg-lightTableBackground p-4 dark:border-darkListBorder dark:bg-darkTableBackground">
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
      Failed to load gauge data
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-2"
    >
      <svg
        width="180"
        height="104"
        viewBox="0 0 180 104"
        role="img"
        :aria-label="valueField"
      >
        <path
          d="M18 90a72 72 0 0 1 144 0"
          class="text-lightListBorder dark:text-darkListBorder"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="18"
        />
        <path
          d="M18 90a72 72 0 0 1 144 0"
          fill="none"
          :stroke="gaugeColor"
          stroke-linecap="round"
          stroke-width="18"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
        />
      </svg>

      <div class="text-3xl font-bold text-lightNavbarText dark:text-darkNavbarText">
        {{ formatChartValue(value) }}{{ gaugeConfig?.suffix ?? '' }}
      </div>
      <div class="text-sm text-lightListTableText dark:text-darkListTableText">
        {{ formatChartValue(minValue) }} - {{ formatChartValue(maxValue) }}
      </div>
    </div>
  </div>
</template>
