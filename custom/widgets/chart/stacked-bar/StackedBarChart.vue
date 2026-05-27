<script setup lang="ts">
import { computed } from 'vue'
import type { ChartWidgetSeriesConfig } from '../chart.types.js'
import { CHART_COLORS, formatChartLabel, formatChartValue, toFiniteNumber } from '../chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  xField: string
  series: ChartWidgetSeriesConfig[]
  colors?: string[]
  height?: number
}>(), {
  height: 280,
})

const padding = {
  top: 18,
  right: 18,
  bottom: 54,
  left: 48,
}
const width = 640
const innerWidth = computed(() => width - padding.left - padding.right)
const innerHeight = computed(() => props.height - padding.top - padding.bottom)
const barGap = 14
const barWidth = computed(() => {
  const count = Math.max(props.rows.length, 1)
  return Math.max((innerWidth.value - barGap * (count - 1)) / count, 1)
})
const totals = computed(() => props.rows.map((row) => props.series.reduce(
  (sum, series) => sum + toFiniteNumber(row[series.field]),
  0,
)))
const maxTotal = computed(() => Math.max(...totals.value, 1))

const bars = computed(() => props.rows.map((row, rowIndex) => {
  let y = padding.top + innerHeight.value

  return {
    label: formatChartLabel(row[props.xField]),
    x: padding.left + rowIndex * (barWidth.value + barGap),
    segments: props.series.map((series, seriesIndex) => {
      const value = toFiniteNumber(row[series.field])
      const height = (value / maxTotal.value) * innerHeight.value
      y -= height

      return {
        id: `${rowIndex}-${series.field}`,
        name: series.name,
        value,
        color: series.color || props.colors?.[seriesIndex] || CHART_COLORS[seriesIndex % CHART_COLORS.length],
        y,
        height,
      }
    }),
  }
}))

const yTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
  value: maxTotal.value * (1 - ratio),
  y: padding.top + innerHeight.value * ratio,
})))
</script>

<template>
  <div class="w-full overflow-hidden">
    <svg
      class="block w-full"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="xField"
    >
      <g class="text-lightListTableText dark:text-darkListTableText">
        <line
          v-for="tick in yTicks"
          :key="tick.y"
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="tick.y"
          :y2="tick.y"
          stroke="currentColor"
          stroke-opacity="0.16"
        />
        <text
          v-for="tick in yTicks"
          :key="`label-${tick.y}`"
          :x="padding.left - 10"
          :y="tick.y + 4"
          fill="currentColor"
          font-size="11"
          text-anchor="end"
        >
          {{ formatChartValue(tick.value) }}
        </text>
      </g>

      <g
        v-for="bar in bars"
        :key="bar.label"
      >
        <rect
          v-for="segment in bar.segments"
          :key="segment.id"
          :x="bar.x"
          :y="segment.y"
          :width="barWidth"
          :height="segment.height"
          :fill="segment.color"
        >
          <title>{{ bar.label }} · {{ segment.name }}: {{ formatChartValue(segment.value) }}</title>
        </rect>
        <text
          :x="bar.x + barWidth / 2"
          :y="height - 28"
          fill="currentColor"
          font-size="11"
          text-anchor="middle"
          class="text-lightListTableText dark:text-darkListTableText"
        >
          {{ bar.label }}
        </text>
      </g>
    </svg>
  </div>
</template>
