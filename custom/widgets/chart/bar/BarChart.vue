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
          {{ formatChartValue(tick.value) }}
        </text>
      </g>

      <rect
        v-for="bar in bars"
        :key="bar.label"
        :x="bar.x"
        :y="bar.y"
        :width="barWidth"
        :height="bar.height"
        :fill="chartColor"
        rx="5"
      >
        <title>{{ bar.label }}: {{ formatChartValue(bar.value) }}</title>
      </rect>

      <g class="text-lightListTableText dark:text-darkListTableText">
        <text
          v-for="(bar, barIndex) in bars"
          v-show="visibleLabelIndexes.has(barIndex)"
          :key="`x-${bar.label}`"
          :x="bar.x + barWidth / 2"
          :y="padding.top + innerHeight + 24"
          fill="currentColor"
          font-size="11"
          text-anchor="middle"
        >
          {{ bar.axisLabel }}
        </text>
        <text
          v-for="bar in bars"
          v-show="barWidth >= 18"
          :key="`value-${bar.label}`"
          :x="bar.x + barWidth / 2"
          :y="Math.max(bar.y - 8, 12)"
          fill="currentColor"
          font-size="11"
          font-weight="600"
          text-anchor="middle"
        >
          {{ formatChartValue(bar.value) }}
        </text>
      </g>
    </svg>
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import { useElementSize } from '../../../composables/useElementSize.js'
import { CHART_COLORS, formatChartAxisLabel, formatChartLabel, formatChartValue, toFiniteNumber } from '../chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  color?: string
  height?: number
}>(), {
  height: 260,
})

const { el: rootEl, width: rootWidth, height: rootHeight } = useElementSize<HTMLDivElement>()

const padding = {
  top: 20,
  right: 6,
  bottom: 34,
  left: 38,
}
const chartWidth = computed(() => Math.max(rootWidth.value, 1))
const chartHeight = computed(() => {
  if (rootHeight.value > 0) {
    return Math.max(rootHeight.value, 1)
  }

  return Math.max(props.height, 1)
})

const chartColor = computed(() => props.color || CHART_COLORS[0])
const values = computed(() => props.rows.map((row) => toFiniteNumber(row[props.valueField])))
const maxValue = computed(() => Math.max(...values.value, 1))
const innerWidth = computed(() => Math.max(chartWidth.value - padding.left - padding.right, 1))
const innerHeight = computed(() => Math.max(chartHeight.value - padding.top - padding.bottom, 1))
const barGap = 12
const barWidth = computed(() => {
  const count = Math.max(props.rows.length, 1)
  return Math.max(Math.min((innerWidth.value - barGap * (count - 1)) / count, 80), 4)
})
const totalChartWidth = computed(() => {
  const count = Math.max(props.rows.length, 1)
  return count * barWidth.value + (count - 1) * barGap
})
const chartStartX = computed(() => padding.left + Math.max((innerWidth.value - totalChartWidth.value) / 2, 0))
const visibleLabelIndexes = computed(() => {
  const count = props.rows.length
  const approxLabelWidth = 52
  const maxLabels = Math.max(2, Math.floor(innerWidth.value / approxLabelWidth))

  if (count <= maxLabels || barWidth.value >= 44) {
    return new Set(props.rows.map((_, index) => index))
  }

  const indexes = new Set<number>()
  const step = (count - 1) / (maxLabels - 1)

  for (let index = 0; index < maxLabels; index += 1) {
    indexes.add(Math.round(index * step))
  }

  return indexes
})

const bars = computed(() => props.rows.map((row, index) => {
  const value = values.value[index]
  const height = (value / maxValue.value) * innerHeight.value

  return {
    label: formatChartLabel(row[props.labelField]),
    axisLabel: formatChartAxisLabel(row[props.labelField]),
    value,
    x: chartStartX.value + index * (barWidth.value + barGap),
    y: padding.top + innerHeight.value - height,
    height,
  }
}))

const yTicks = computed(() => [0, 0.5, 1].map((ratio) => ({
  value: maxValue.value * (1 - ratio),
  y: padding.top + innerHeight.value * ratio,
})))
</script>
