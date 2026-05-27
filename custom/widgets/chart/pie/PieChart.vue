<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
    <svg
      class="shrink-0 -rotate-90"
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      role="img"
      :aria-label="valueField"
    >
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        class="text-lightListBorder dark:text-darkListBorder"
        fill="none"
        stroke="currentColor"
        stroke-width="20"
      />
      <circle
        v-for="slice in slices"
        :key="slice.id"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke="slice.color"
        :stroke-dasharray="slice.dashArray"
        :stroke-dashoffset="slice.dashOffset"
        fill="none"
        pathLength="100"
        stroke-linecap="butt"
        stroke-width="20"
      >
        <title>{{ slice.label }}: {{ formatChartValue(slice.value) }}</title>
      </circle>
    </svg>

    <div class="grid min-w-0 flex-1 gap-2">
      <div
        v-for="slice in slices"
        :key="`legend-${slice.id}`"
        class="flex min-w-0 items-center justify-between gap-3 text-sm"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ backgroundColor: slice.color }"
          />
          <span class="truncate text-lightNavbarText dark:text-darkNavbarText">
            {{ slice.label }}
          </span>
        </div>
        <span class="shrink-0 font-medium text-lightListTableText dark:text-darkListTableText">
          {{ formatChartValue(slice.value) }}
        </span>
      </div>
    </div>
  </div>
</template>



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
  height: 240,
})

const size = computed(() => props.height)
const center = computed(() => size.value / 2)
const radius = computed(() => Math.max(size.value / 2 - 10, 1))

const slices = computed(() => {
  const total = props.rows.reduce((sum, row) => sum + toFiniteNumber(row[props.valueField]), 0)
  let offset = 0

  return props.rows.map((row, index) => {
    const value = toFiniteNumber(row[props.valueField])
    const share = total > 0 ? value / total : 0
    const label = formatChartLabel(row[props.labelField])
    const slice = {
      id: `${label}-${index}`,
      label,
      value,
      share,
      dashArray: `${share * 100} ${100 - share * 100}`,
      dashOffset: -offset,
      color: props.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length],
    }

    offset += share * 100
    return slice
  })
})
</script>
