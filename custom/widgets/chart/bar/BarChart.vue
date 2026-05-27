<template>
  <div class="w-full overflow-hidden">
    <svg
      class="block w-full"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="valueField"
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

      <rect
        v-for="bar in bars"
        :key="bar.label"
        :x="bar.x"
        :y="bar.y"
        :width="barWidth"
        :height="bar.height"
        :fill="chartColor"
        rx="4"
      >
        <title>{{ bar.label }}: {{ formatChartValue(bar.value) }}</title>
      </rect>

      <g class="text-lightListTableText dark:text-darkListTableText">
        <text
          v-for="bar in bars"
          :key="`x-${bar.label}`"
          :x="bar.x + barWidth / 2"
          :y="height - 28"
          fill="currentColor"
          font-size="11"
          text-anchor="middle"
        >
          {{ bar.label }}
        </text>
        <text
          v-for="bar in bars"
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
import { CHART_COLORS, formatChartLabel, formatChartValue, toFiniteNumber } from '../chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  color?: string
  height?: number
}>(), {
  height: 260,
})

const padding = {
  top: 18,
  right: 18,
  bottom: 54,
  left: 48,
}
const width = 640

const chartColor = computed(() => props.color || CHART_COLORS[0])
const values = computed(() => props.rows.map((row) => toFiniteNumber(row[props.valueField])))
const maxValue = computed(() => Math.max(...values.value, 1))
const innerWidth = computed(() => width - padding.left - padding.right)
const innerHeight = computed(() => props.height - padding.top - padding.bottom)
const barGap = 12
const barWidth = computed(() => {
  const count = Math.max(props.rows.length, 1)
  return Math.max((innerWidth.value - barGap * (count - 1)) / count, 1)
})

const bars = computed(() => props.rows.map((row, index) => {
  const value = values.value[index]
  const height = (value / maxValue.value) * innerHeight.value

  return {
    label: formatChartLabel(row[props.labelField]),
    value,
    x: padding.left + index * (barWidth.value + barGap),
    y: padding.top + innerHeight.value - height,
    height,
  }
}))

const yTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
  value: maxValue.value * (1 - ratio),
  y: padding.top + innerHeight.value * ratio,
})))
</script>
