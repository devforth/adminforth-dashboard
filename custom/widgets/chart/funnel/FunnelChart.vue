<script setup lang="ts">
import { computed } from 'vue'
import { CHART_COLORS, formatChartLabel, formatChartValue, toFiniteNumber } from '../chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  colors?: string[]
  height?: number
}>(), {
  height: 260,
})

const width = 640
const gap = 8
const segments = computed(() => {
  const values = props.rows.map((row) => toFiniteNumber(row[props.valueField]))
  const maxValue = Math.max(...values, 1)
  const segmentHeight = props.rows.length
    ? (props.height - gap * (props.rows.length - 1)) / props.rows.length
    : props.height

  return props.rows.map((row, index) => {
    const value = values[index]
    const segmentWidth = Math.max((value / maxValue) * width, 24)

    return {
      id: `${String(row[props.labelField])}-${index}`,
      label: formatChartLabel(row[props.labelField]),
      value,
      color: props.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length],
      x: (width - segmentWidth) / 2,
      y: index * (segmentHeight + gap),
      width: segmentWidth,
      height: segmentHeight,
    }
  })
})
</script>

<template>
  <div class="w-full overflow-hidden">
    <svg
      class="block w-full"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="valueField"
    >
      <g
        v-for="segment in segments"
        :key="segment.id"
      >
        <rect
          :x="segment.x"
          :y="segment.y"
          :width="segment.width"
          :height="segment.height"
          :fill="segment.color"
          fill-opacity="0.9"
          rx="6"
        >
          <title>{{ segment.label }}: {{ formatChartValue(segment.value) }}</title>
        </rect>
        <text
          :x="width / 2"
          :y="segment.y + segment.height / 2 + 4"
          fill="#ffffff"
          font-size="12"
          font-weight="600"
          text-anchor="middle"
        >
          {{ segment.label }} · {{ formatChartValue(segment.value) }}
        </text>
      </g>
    </svg>
  </div>
</template>
