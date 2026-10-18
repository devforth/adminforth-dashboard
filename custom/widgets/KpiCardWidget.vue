<template>
  <div class="af-dashboard-kpi">
    <WidgetState
      :is-loading="isLoading"
      :error="error ? errorMessage : ''"
    >
      <div class="grid gap-3">
        <div class="grid gap-1">
          <div class="text-3xl font-semibold tracking-tight tabular-nums text-lightCardTitle dark:text-darkCardTitle">
            {{ formattedValue }}
          </div>
          <div class="flex flex-wrap items-center gap-2 text-sm text-lightCardDescription dark:text-darkCardDescription">
            <span v-if="label">{{ label }}</span>
            <span
              v-if="comparison"
              class="inline-flex h-5 items-center whitespace-nowrap rounded-full border px-2 text-xs font-medium tabular-nums"
              :class="comparisonClass"
              :title="comparison.tooltip"
            >
              {{ comparison.label }}
            </span>
          </div>
        </div>
        <svg
          v-if="sparklinePoints"
          class="h-12 w-full overflow-visible"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs v-if="usesSparklineGradient">
            <linearGradient
              :id="sparklineGradientId"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stop-color="currentColor"
                stop-opacity="0.24"
              />
              <stop
                offset="100%"
                stop-color="currentColor"
                stop-opacity="0"
              />
            </linearGradient>
          </defs>
          <polygon
            v-if="usesSparklineGradient"
            class="text-lightPrimary dark:text-darkPrimary"
            :points="sparklineFillPoints"
            :fill="`url(#${sparklineGradientId})`"
          />
          <polyline
            class="text-lightPrimary dark:text-darkPrimary"
            :points="sparklinePoints"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    </WidgetState>
  </div>
</template>



<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../queries/useWidgetData.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../model/dashboard.types.js'
import { formatValue, toFiniteNumber } from './chart/chart.utils.js'
import WidgetState from './WidgetState.vue'

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
  errorMessage,
  refetch,
} = useWidgetData(dashboardSlugRef, widgetIdRef)

watch(
  () => props.widget,
  () => {
    void refetch()
  },
  { deep: true },
)

const kpiConfig = computed(() => props.widget.target === 'kpi_card' ? props.widget.card : undefined)
const widgetData = computed(() => data.value?.data as DashboardWidgetTableData | null)
const columns = computed(() => widgetData.value?.columns ?? [])
const firstRow = computed(() => widgetData.value?.values ?? widgetData.value?.rows[0] ?? {})
const valueField = computed(() => kpiConfig.value?.value.field || columns.value[0])
const value = computed(() => toFiniteNumber(firstRow.value[valueField.value]))
const label = computed(() => kpiConfig.value?.subtitle?.field
  ? [kpiConfig.value.subtitle.text, formatValue(firstRow.value[kpiConfig.value.subtitle.field], kpiConfig.value.value.format)]
      .filter(Boolean)
      .join(': ')
  : kpiConfig.value?.subtitle?.text)
const formattedValue = computed(() => `${kpiConfig.value?.value.prefix ?? ''}${formatValue(value.value, kpiConfig.value?.value.format)}${kpiConfig.value?.value.suffix ?? ''}`)
const comparisonValue = computed(() => kpiConfig.value?.comparison?.field
  ? value.value - toFiniteNumber(firstRow.value[kpiConfig.value.comparison.field])
  : 0)
const comparison = computed(() => {
  const config = kpiConfig.value?.comparison

  if (!config) {
    return null
  }

  const template = config.compact?.template ?? '{sign}{value}'
  const tooltipTemplate = config.tooltip?.template
  const valueText = formatValue(Math.abs(comparisonValue.value), config.format, { compactTemplate: true })
  const sign = comparisonValue.value > 0 ? '+' : comparisonValue.value < 0 ? '-' : ''

  return {
    value: comparisonValue.value,
    label: config.compact?.show === false ? valueText : applyTemplate(template, sign, valueText),
    tooltip: tooltipTemplate
      ? applyTemplate(tooltipTemplate, sign, valueText)
      : config.tooltip?.label,
    positiveIsGood: config.positive_is_good ?? true,
  }
})
const comparisonClass = computed(() => {
  if (!comparison.value || comparison.value.value === 0) {
    return 'border-transparent bg-lightSecondaryDarken text-lightInputIconColor dark:bg-darkSecondaryLighten dark:text-darkInputIconColor'
  }

  const isGood = comparison.value.positiveIsGood
    ? comparison.value.value > 0
    : comparison.value.value < 0

  return isGood
    ? 'border-lightSuccessBorder bg-lightSuccessSoft text-lightSuccess dark:border-darkSuccessBorder dark:bg-darkSuccessSoft dark:text-darkSuccess'
    : 'border-lightDangerBorder bg-lightDangerSoft text-lightDanger dark:border-darkDangerBorder dark:bg-darkDangerSoft dark:text-darkDanger'
})
const sparklineRows = computed(() => widgetData.value?.rows ?? [])
const sparklineConfig = computed(() => kpiConfig.value?.sparkline)
const sparklineGradientId = computed(() => `kpi-sparkline-${props.widget.id}`)
const usesSparklineGradient = computed(() => sparklineConfig.value?.fill?.type === 'gradient')
const sparklineCoordinates = computed(() => {
  const field = sparklineConfig.value?.field

  if (!field || sparklineRows.value.length < 2) {
    return []
  }

  const values = sparklineRows.value.map((row) => toFiniteNumber(row[field]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values.map((item, index) => ({
    x: (index / Math.max(values.length - 1, 1)) * 100,
    y: 30 - ((item - min) / range) * 28,
  }))
})
const sparklinePoints = computed(() => sparklineCoordinates.value.length
  ? sparklineCoordinates.value.map((point) => `${point.x},${point.y}`).join(' ')
  : '')
const sparklineFillPoints = computed(() => sparklineCoordinates.value.length
  ? `0,32 ${sparklinePoints.value} 100,32`
  : '')

function applyTemplate(template: string, sign: string, value: string) {
  return template
    .replaceAll('{sign}', sign)
    .replaceAll('{value}', value)
}
</script>
