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
      :aria-label="seriesName || yField"
    >
      <g class="text-lightCardDescription dark:text-darkCardDescription">
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
        v-if="fillPath"
        :d="fillPath"
        :style="{ fill: chartColor }"
        fill-opacity="0.1"
      />
      <path
        v-if="linePath"
        :d="linePath"
        fill="none"
        :style="{ stroke: chartColor }"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      />

      <g class="stroke-lightCardBackground dark:stroke-darkCardBackground">
        <circle
          v-for="point in markedPoints"
          :key="`${point.label}-${point.x}`"
          :cx="point.x"
          :cy="point.y"
          :style="{ fill: chartColor }"
          r="4"
          stroke-width="2"
        >
          <title>{{ point.label }}: {{ formatValue(point.value, format) }}</title>
        </circle>
      </g>

      <g class="text-lightCardDescription dark:text-darkCardDescription">
        <text
          v-for="point in xLabels"
          :key="`x-${point.x}`"
          :x="point.x"
          :y="padding.top + innerHeight + 20"
          fill="currentColor"
          font-size="11"
          :text-anchor="point.anchor"
        >
          {{ point.axisLabel }}
        </text>
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
  getChartYAxisWidth,
  getNiceScale,
  toFiniteNumber,
} from './chart.utils.js'

// Dense series show only the end dot, sparse ones mark every point
const MAX_MARKED_POINTS = 16

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  xField: string
  yField: string
  seriesName?: string
  color?: string
  format?: ValueFormat
  height?: number
}>(), {
  height: 240,
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
const values = computed(() => props.rows.map((row) => toFiniteNumber(row[props.yField])))
const scale = computed(() => getNiceScale(Math.max(...values.value, 1)))
const tickLabels = computed(() => scale.value.ticks.map((value) => formatValue(value, props.format, { compact: true })))
const padding = computed(() => ({
  top: 12,
  right: 6,
  bottom: 30,
  left: getChartYAxisWidth(tickLabels.value, chartWidth.value),
}))
const innerWidth = computed(() => Math.max(chartWidth.value - padding.value.left - padding.value.right, 1))
const innerHeight = computed(() => Math.max(chartHeight.value - padding.value.top - padding.value.bottom, 1))

function getPointY(value: number) {
  return padding.value.top + innerHeight.value - (value / scale.value.max) * innerHeight.value
}

const points = computed(() => {
  if (props.rows.length === 1) {
    return [{
      x: padding.value.left + innerWidth.value / 2,
      y: getPointY(values.value[0]),
      label: formatChartLabel(props.rows[0][props.xField]),
      axisLabel: formatChartAxisLabel(props.rows[0][props.xField]),
      value: values.value[0],
    }]
  }

  return props.rows.map((row, index) => ({
    x: padding.value.left + (index / (props.rows.length - 1)) * innerWidth.value,
    y: getPointY(values.value[index]),
    label: formatChartLabel(row[props.xField]),
    axisLabel: formatChartAxisLabel(row[props.xField]),
    value: values.value[index],
  }))
})

const markedPoints = computed(() => points.value.length <= MAX_MARKED_POINTS
  ? points.value
  : points.value.slice(-1))

const linePath = computed(() => points.value
  .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
  .join(' '))

const fillPath = computed(() => {
  if (!points.value.length) {
    return ''
  }

  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L ${last.x} ${padding.value.top + innerHeight.value} L ${first.x} ${padding.value.top + innerHeight.value} Z`
})

const yTicks = computed(() => scale.value.ticks.map((value, index) => ({
  label: tickLabels.value[index],
  y: getPointY(value),
})))

// The first and last labels hug the plot edges so they are not clipped by the chart bounds
const xLabels = computed(() => {
  const labeledPoints = points.value.length <= 4
    ? points.value
    : [
        points.value[0],
        points.value[Math.floor(points.value.length / 3)],
        points.value[Math.floor((points.value.length * 2) / 3)],
        points.value[points.value.length - 1],
      ]

  return labeledPoints.map((point, index) => ({
    ...point,
    anchor: labeledPoints.length === 1
      ? 'middle'
      : index === 0 ? 'start' : index === labeledPoints.length - 1 ? 'end' : 'middle',
  }))
})
</script>
