<template>
  <div
    ref="rootEl"
    class="h-full min-h-0 w-full overflow-hidden"
  >
    <svg
      v-if="chartWidth > 0 && chartHeight > 0"
      class="block h-full w-full"
      :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
      role="img"
      :aria-label="valueField"
    >
      <g class="text-lightListTableText dark:text-darkListTableText">
        <line
          v-for="tick in yTicks"
          :key="tick.y"
          :x1="padding.left"
          :x2="chartWidth - padding.right"
          :y1="tick.y"
          :y2="tick.y"
          stroke="currentColor"
          stroke-opacity="0.14"
        />
        <text
          v-for="tick in yTicks"
          :key="`label-${tick.y}`"
          :x="padding.left - 8"
          :y="tick.y + 4"
          fill="currentColor"
          font-size="11"
          text-anchor="end"
        >
          {{ tick.label }}
        </text>
      </g>

      <path
        v-for="bar in bars"
        :key="bar.label"
        :d="bar.path"
        :style="{ fill: chartColor }"
      >
        <title>{{ bar.label }}: {{ formatValue(bar.value, format) }}</title>
      </path>

      <g class="text-lightListTableText dark:text-darkListTableText">
        <text
          v-for="(bar, barIndex) in bars"
          v-show="visibleLabelIndexes.has(barIndex)"
          :key="`x-${bar.label}`"
          :x="bar.centerX"
          :y="padding.top + innerHeight + 24"
          fill="currentColor"
          font-size="11"
          text-anchor="middle"
        >
          {{ bar.axisLabel }}
        </text>
        <template v-if="valueLabels">
          <text
            v-for="(bar, barIndex) in bars"
            :key="`value-${bar.label}`"
            :x="bar.centerX"
            :y="Math.max(bar.y - 8, 12)"
            fill="currentColor"
            font-size="11"
            font-weight="600"
            text-anchor="middle"
          >
            {{ valueLabels[barIndex] }}
          </text>
        </template>
      </g>
    </svg>
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import { useElementSize } from '../../composables/useElementSize.js'
import type { ValueFormat } from '../../model/dashboard.types.js'
import {
  CHART_PRIMARY_COLOR,
  formatChartAxisLabel,
  formatChartLabel,
  formatValue,
  getBarBand,
  getBarPath,
  getChartYAxisWidth,
  getNiceScale,
  getVisibleLabelIndexes,
  toFiniteNumber,
} from './chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  color?: string
  format?: ValueFormat
  height?: number
}>(), {
  height: 260,
})

const { el: rootEl, width: rootWidth, height: rootHeight } = useElementSize<HTMLDivElement>()

const chartWidth = computed(() => Math.max(rootWidth.value, 1))
const chartHeight = computed(() => {
  if (rootHeight.value > 0) {
    return Math.max(rootHeight.value, 1)
  }

  return Math.max(props.height, 1)
})

const chartColor = computed(() => props.color || CHART_PRIMARY_COLOR)
const values = computed(() => props.rows.map((row) => toFiniteNumber(row[props.valueField])))
const scale = computed(() => getNiceScale(Math.max(...values.value, 1)))
const tickLabels = computed(() => scale.value.ticks.map((value) => formatValue(value, props.format, { compact: true })))
const padding = computed(() => ({
  top: 20,
  right: 6,
  bottom: 34,
  left: getChartYAxisWidth(tickLabels.value, chartWidth.value),
}))
const innerWidth = computed(() => Math.max(chartWidth.value - padding.value.left - padding.value.right, 1))
const innerHeight = computed(() => Math.max(chartHeight.value - padding.value.top - padding.value.bottom, 1))
const band = computed(() => getBarBand(innerWidth.value, props.rows.length))
const valueLabelCharWidth = 7
const visibleLabelIndexes = computed(() => getVisibleLabelIndexes(props.rows.length, innerWidth.value))

// Full values when they fit above the bars, compact (1.2K, 3.4M) when slots get narrow, hidden when even compact would overlap
const valueLabels = computed(() => {
  return [false, true]
    .map((compact) => values.value.map((value) => formatValue(value, props.format, { compact })))
    .find((labels) => labels.every((label) => label.length * valueLabelCharWidth <= band.value.slotWidth))
})

const bars = computed(() => props.rows.map((row, index) => {
  const value = values.value[index]
  const height = (value / scale.value.max) * innerHeight.value
  const x = padding.value.left + index * band.value.slotWidth + (band.value.slotWidth - band.value.barWidth) / 2
  const y = padding.value.top + innerHeight.value - height

  return {
    label: formatChartLabel(row[props.labelField]),
    axisLabel: formatChartAxisLabel(row[props.labelField]),
    value,
    centerX: x + band.value.barWidth / 2,
    y,
    path: getBarPath(x, y, band.value.barWidth, height),
  }
}))

const yTicks = computed(() => scale.value.ticks.map((value, index) => ({
  label: tickLabels.value[index],
  y: padding.value.top + innerHeight.value - (value / scale.value.max) * innerHeight.value,
})))
</script>
