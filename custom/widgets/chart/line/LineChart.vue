<template>
  <div class="w-full overflow-hidden">
    <svg
      class="block w-full"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="seriesName || yField"
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
        stroke-width="3"
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
          :y="height - 12"
          fill="currentColor"
          font-size="11"
          text-anchor="middle"
        >
          {{ point.label }}
        </text>
      </g>
    </svg>
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import { CHART_COLORS, formatChartLabel, formatChartValue, toFiniteNumber } from '../chart.utils.js'

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

const padding = {
  top: 18,
  right: 18,
  bottom: 38,
  left: 48,
}
const width = 640

const chartColor = computed(() => props.color || CHART_COLORS[0])
const values = computed(() => props.rows.map((row) => toFiniteNumber(row[props.yField])))
const maxValue = computed(() => Math.max(...values.value, 1))
const innerWidth = computed(() => width - padding.left - padding.right)
const innerHeight = computed(() => props.height - padding.top - padding.bottom)

const points = computed(() => {
  if (props.rows.length === 1) {
    return [{
      x: padding.left + innerWidth.value / 2,
      y: padding.top + innerHeight.value - (values.value[0] / maxValue.value) * innerHeight.value,
      label: formatChartLabel(props.rows[0][props.xField]),
      value: values.value[0],
    }]
  }

  return props.rows.map((row, index) => ({
    x: padding.left + (index / (props.rows.length - 1)) * innerWidth.value,
    y: padding.top + innerHeight.value - (values.value[index] / maxValue.value) * innerHeight.value,
    label: formatChartLabel(row[props.xField]),
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
  return `${linePath.value} L ${last.x} ${padding.top + innerHeight.value} L ${first.x} ${padding.top + innerHeight.value} Z`
})

const yTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
  value: maxValue.value * (1 - ratio),
  y: padding.top + innerHeight.value * ratio,
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
