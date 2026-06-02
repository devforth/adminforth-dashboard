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

      <path
        v-if="fillPath"
        :d="fillPath"
        :fill="chartColor"
        fill-opacity="0.12"
      />
      <path
        v-if="linePath"
        :d="linePath"
        fill="none"
        :stroke="chartColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="5"
      />

      <g>
        <circle
          v-for="point in points"
          :key="`${point.label}-${point.x}`"
          :cx="point.x"
          :cy="point.y"
          :fill="chartColor"
          r="4"
        >
          <title>{{ point.label }}: {{ formatChartValue(point.value) }}</title>
        </circle>
      </g>

      <g class="text-lightListTableText dark:text-darkListTableText">
        <text
          v-for="point in xLabels"
          :key="`x-${point.x}`"
          :x="point.x"
          :y="chartHeight - 10"
          fill="currentColor"
          font-size="11"
          text-anchor="middle"
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
import {
  CHART_COLORS,
  formatChartAxisLabel,
  formatChartLabel,
  formatChartValue,
  getChartYAxisWidth,
  toFiniteNumber,
} from './chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  xField: string
  yField: string
  seriesName?: string
  color?: string
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

const chartColor = computed(() => props.color || CHART_COLORS[0])
const values = computed(() => props.rows.map((row) => toFiniteNumber(row[props.yField])))
const maxValue = computed(() => Math.max(...values.value, 1))
const yTickValues = computed(() => [maxValue.value, maxValue.value * 0.5, 0])
const padding = computed(() => ({
  top: 12,
  right: 6,
  bottom: 24,
  left: getChartYAxisWidth(yTickValues.value, chartWidth.value),
}))
const innerWidth = computed(() => Math.max(chartWidth.value - padding.value.left - padding.value.right, 1))
const innerHeight = computed(() => Math.max(chartHeight.value - padding.value.top - padding.value.bottom, 1))

const points = computed(() => {
  if (props.rows.length === 1) {
    return [{
      x: padding.value.left + innerWidth.value / 2,
      y: padding.value.top + innerHeight.value - (values.value[0] / maxValue.value) * innerHeight.value,
      label: formatChartLabel(props.rows[0][props.xField]),
      axisLabel: formatChartAxisLabel(props.rows[0][props.xField]),
      value: values.value[0],
    }]
  }

  return props.rows.map((row, index) => ({
    x: padding.value.left + (index / (props.rows.length - 1)) * innerWidth.value,
    y: padding.value.top + innerHeight.value - (values.value[index] / maxValue.value) * innerHeight.value,
    label: formatChartLabel(row[props.xField]),
    axisLabel: formatChartAxisLabel(row[props.xField]),
    value: values.value[index],
  }))
})

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

const yTicks = computed(() => [0, 0.5, 1].map((ratio) => ({
  value: maxValue.value * (1 - ratio),
  y: padding.value.top + innerHeight.value * ratio,
})))

const xLabels = computed(() => {
  if (points.value.length <= 4) {
    return points.value
  }

  return [
    points.value[0],
    points.value[Math.floor(points.value.length / 3)],
    points.value[Math.floor((points.value.length * 2) / 3)],
    points.value[points.value.length - 1],
  ]
})
</script>
