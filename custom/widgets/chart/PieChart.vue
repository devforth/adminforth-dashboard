<template>
  <div
    ref="rootEl"
    class="grid h-full min-h-0 w-full gap-5 overflow-hidden"
    :class="isCompact ? 'grid-rows-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(160px,260px)_minmax(0,1fr)] items-center'"
  >
    <div
      ref="chartEl"
      class="relative mx-auto grid min-h-0 w-full place-items-center overflow-hidden"
    >
      <svg
        v-if="size > 0"
        class="shrink-0 -rotate-90 drop-shadow-sm"
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
          :stroke-width="strokeWidth"
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
          :stroke-width="strokeWidth"
        >
          <title>{{ slice.label }}: {{ formatChartValue(slice.value) }} ({{ slice.percentLabel }})</title>
        </circle>
      </svg>

      <div class="absolute inset-0 grid place-items-center text-center">
        <div>
          <div class="text-2xl font-bold text-lightNavbarText dark:text-darkNavbarText">
            {{ formatChartValue(total) }}
          </div>
          <div class="text-xs uppercase tracking-wide text-lightListTableText dark:text-darkListTableText">
            Total
          </div>
        </div>
      </div>
    </div>

    <div class="grid min-w-0 gap-3">
      <div
        v-for="slice in slices"
        :key="`legend-${slice.id}`"
        class="grid min-w-0 grid-cols-[1fr_auto] items-center gap-3 text-sm"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="h-3 w-3 shrink-0 rounded-full"
            :style="{ backgroundColor: slice.color }"
          />
          <span class="truncate font-medium text-lightNavbarText dark:text-darkNavbarText">
            {{ slice.label }}
          </span>
        </div>

        <div class="text-right">
          <div class="font-semibold text-lightNavbarText dark:text-darkNavbarText">
            {{ slice.percentLabel }}
          </div>
          <div class="text-xs text-lightListTableText dark:text-darkListTableText">
            {{ formatChartValue(slice.value) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import { useElementSize } from '../../composables/useElementSize.js'
import { CHART_COLORS, formatChartLabel, formatChartValue, toFiniteNumber } from './chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  colors?: string[]
  height?: number
}>(), {
  height: 240,
})

const { el: rootEl, width: rootWidth } = useElementSize<HTMLDivElement>()
const { el: chartEl, width: chartWidth, height: chartHeight } = useElementSize<HTMLDivElement>()

const isCompact = computed(() => rootWidth.value > 0 && rootWidth.value < 420)

const size = computed(() => {
  const measured = Math.min(chartWidth.value, chartHeight.value)

  if (measured > 0) {
    return Math.min(Math.max(measured, 1), 320)
  }

  return Math.min(Math.max(props.height, 96), 320)
})
const center = computed(() => size.value / 2)
const strokeWidth = computed(() => Math.max(Math.round(size.value * 0.12), 18))
const radius = computed(() => Math.max(size.value / 2 - strokeWidth.value / 2 - 4, 1))
const shouldCountRows = computed(() => /(^|_)id$/i.test(props.valueField))

const pieRows = computed(() => {
  const groupedRows = new Map<string, { label: string, value: number }>()

  for (const row of props.rows) {
    const label = formatChartLabel(row[props.labelField])
    const item = groupedRows.get(label) ?? { label, value: 0 }
    item.value += shouldCountRows.value ? 1 : toFiniteNumber(row[props.valueField])
    groupedRows.set(label, item)
  }

  return Array.from(groupedRows.values())
})

const total = computed(() => pieRows.value.reduce((sum, row) => sum + row.value, 0))

const slices = computed(() => {
  let offset = 0

  return pieRows.value.map((row, index) => {
    const value = row.value
    const share = total.value > 0 ? value / total.value : 0
    const percent = share * 100
    const slice = {
      id: `${row.label}-${index}`,
      label: row.label,
      value,
      share,
      percentLabel: `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(percent)}%`,
      dashArray: `${Math.max(percent - 0.6, 0)} ${100 - Math.max(percent - 0.6, 0)}`,
      dashOffset: -offset,
      color: props.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length],
    }

    offset += percent
    return slice
  })
})
</script>
