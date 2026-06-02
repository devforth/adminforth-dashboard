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
        {{ gaugeConfig?.value.prefix ?? '' }}{{ formattedValue }}{{ gaugeConfig?.value.suffix ?? '' }}
      </div>
      <div class="text-sm text-lightListTableText dark:text-darkListTableText">
        {{ formattedMinValue }} - {{ formattedMaxValue }}
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../queries/useWidgetData.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../model/dashboard.types.js'
import { CHART_COLORS, formatChartValue, toFiniteNumber } from './chart/chart.utils.js'

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

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function countFractionDigits(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  const normalizedValue = value.toString().toLowerCase()
  const [coefficient, exponentValue] = normalizedValue.split('e')
  const exponent = exponentValue ? Number(exponentValue) : 0
  const decimalDigits = coefficient.split('.')[1]?.length ?? 0

  return Math.max(decimalDigits - exponent, 0)
}

function normalizeDisplayValue(value: number, useWholeNumbers: boolean) {
  return useWholeNumbers ? Math.trunc(value) : value
}

watch(
  () => props.widget,
  () => {
    void refetch()
  },
  { deep: true },
)

const gaugeConfig = computed(() => props.widget.target === 'gauge_card' ? props.widget.card : undefined)
const widgetData = computed(() => data.value?.data as DashboardWidgetTableData | null)
const columns = computed(() => widgetData.value?.columns ?? [])
const firstRow = computed(() => widgetData.value?.rows[0] ?? {})
const valueField = computed(() => gaugeConfig.value?.value.field || columns.value[0])
const targetField = computed(() => gaugeConfig.value?.target?.field ?? gaugeConfig.value?.progress?.target_field)
const minValue = computed(() => {
  return 0
})
const maxValue = computed(() => {
  const dynamicMax = targetField.value ? parseOptionalNumber(firstRow.value[targetField.value]) : undefined
  return dynamicMax ?? parseOptionalNumber(gaugeConfig.value?.target?.value ?? gaugeConfig.value?.progress?.target_value) ?? 100
})
const value = computed(() => toFiniteNumber(firstRow.value[valueField.value]))
const fractionDigits = computed(() => Math.min([
  value.value,
  minValue.value,
  maxValue.value,
].reduce((maxDigits, currentValue) => Math.max(maxDigits, countFractionDigits(currentValue)), 0), 3))
const shouldUseWholeNumbers = computed(() => Math.abs(maxValue.value) >= 1000)
const formattedValue = computed(() => formatChartValue(normalizeDisplayValue(value.value, shouldUseWholeNumbers.value), {
  minimumFractionDigits: shouldUseWholeNumbers.value ? 0 : fractionDigits.value,
  maximumFractionDigits: shouldUseWholeNumbers.value ? 0 : fractionDigits.value,
}))
const formattedMinValue = computed(() => formatChartValue(normalizeDisplayValue(minValue.value, shouldUseWholeNumbers.value), {
  minimumFractionDigits: shouldUseWholeNumbers.value ? 0 : fractionDigits.value,
  maximumFractionDigits: shouldUseWholeNumbers.value ? 0 : fractionDigits.value,
}))
const formattedMaxValue = computed(() => {
  return formatChartValue(normalizeDisplayValue(maxValue.value, shouldUseWholeNumbers.value), {
    minimumFractionDigits: shouldUseWholeNumbers.value ? 0 : fractionDigits.value,
    maximumFractionDigits: shouldUseWholeNumbers.value ? 0 : fractionDigits.value,
  })
})
const progress = computed(() => {
  const range = maxValue.value - minValue.value
  return range > 0 ? Math.min(Math.max((value.value - minValue.value) / range, 0), 1) : 0
})
const radius = 72
const circumference = Math.PI * radius
const strokeDashoffset = computed(() => circumference * (1 - progress.value))
const gaugeColor = computed(() => gaugeConfig.value?.color || CHART_COLORS[0])
</script>
