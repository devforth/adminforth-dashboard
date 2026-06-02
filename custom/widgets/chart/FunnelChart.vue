<template>
  <div
    ref="rootEl"
    class="grid h-full min-h-0 w-full gap-4 overflow-hidden"
    :class="isCompact ? 'grid-rows-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_200px]'"
  >
    <div
      ref="svgEl"
      class="min-h-0 w-full overflow-hidden"
    >
      <svg
        v-if="chartWidth > 0 && chartHeight > 0"
        class="block h-full w-full"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        role="img"
        :aria-label="valueField"
      >
        <path
          v-for="segment in segments"
          :key="segment.id"
          :d="segment.path"
          :fill="segment.color"
          fill-opacity="0.9"
        >
          <title>
            {{ segment.label }}: {{ formatChartValue(segment.value) }} ({{ segment.percentLabel }})
          </title>
        </path>

        <text
          v-for="segment in segments"
          v-show="segment.labelVisible"
          :key="`value-${segment.id}`"
          :x="chartWidth / 2"
          :y="segment.centerY + 4"
          fill="#ffffff"
          font-size="12"
          font-weight="600"
          text-anchor="middle"
        >
          {{ formatChartValue(segment.value) }}
        </text>
      </svg>
    </div>

    <div class="grid min-w-0 gap-2 text-sm">
      <div
        v-for="segment in segments"
        :key="`legend-${segment.id}`"
        class="grid min-h-[34px] min-w-0 grid-cols-[1fr_auto] items-center gap-3"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ backgroundColor: segment.color }"
          />

          <span class="truncate text-lightNavbarText dark:text-darkNavbarText">
            {{ segment.shortLabel }}
          </span>
        </div>

        <div class="text-right">
          <div class="font-semibold text-lightNavbarText dark:text-darkNavbarText">
            {{ formatChartValue(segment.value) }}
          </div>

          <div class="text-xs text-lightListTableText dark:text-darkListTableText">
            {{ segment.percentLabel }}
          </div>
        </div>
      </div>
    </div>
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
  toFiniteNumber,
} from './chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  colors?: string[]
  height?: number
}>(), {
  height: 260,
})

const { el: rootEl, width: rootWidth } = useElementSize<HTMLDivElement>()
const { el: svgEl, width: svgWidth, height: svgHeight } = useElementSize<HTMLDivElement>()

const chartWidth = computed(() => Math.max(svgWidth.value, 1))
const chartHeight = computed(() => {
  if (svgHeight.value > 0) {
    return Math.max(svgHeight.value, 1)
  }

  return Math.max(props.height, 96)
})
const isCompact = computed(() => rootWidth.value > 0 && rootWidth.value < 420)

const shouldCountRows = computed(() => /(^|_)id$/i.test(props.valueField))

const funnelRows = computed(() => {
  const groupedRows = new Map<string, { label: string, value: number }>()

  for (const row of props.rows) {
    const label = formatChartLabel(row[props.labelField])
    const item = groupedRows.get(label) ?? { label, value: 0 }

    item.value += shouldCountRows.value
      ? 1
      : toFiniteNumber(row[props.valueField])

    groupedRows.set(label, item)
  }

  const rows = Array.from(groupedRows.values()).filter((row) => row.value > 0)

  return props.labelField === 'name'
    ? rows
    : rows.sort((left, right) => right.value - left.value)
})

const maxValue = computed(() => {
  return Math.max(...funnelRows.value.map((row) => row.value), 1)
})

const totalValue = computed(() => {
  return funnelRows.value.reduce((sum, row) => sum + row.value, 0)
})

const segmentGap = computed(() => {
  return Math.max(Math.min(Math.floor(chartHeight.value * 0.03), 10), 4)
})

const segmentHeight = computed(() => {
  const count = Math.max(funnelRows.value.length, 1)

  return Math.max((chartHeight.value - (count - 1) * segmentGap.value) / count, 1)
})

const minSegmentWidth = computed(() => {
  return Math.max(Math.floor(chartWidth.value * 0.14), 36)
})

const segments = computed(() => funnelRows.value.map((row, index) => {
  const nextRow = funnelRows.value[index + 1]

  const topWidth = Math.max(
    (row.value / maxValue.value) * chartWidth.value,
    minSegmentWidth.value,
  )

  const bottomWidth = Math.max(
    nextRow ? (nextRow.value / maxValue.value) * chartWidth.value : topWidth * 0.5,
    minSegmentWidth.value,
  )

  const yTop = index * (segmentHeight.value + segmentGap.value)
  const yBottom = yTop + segmentHeight.value

  const xTop = (chartWidth.value - topWidth) / 2
  const xBottom = (chartWidth.value - bottomWidth) / 2

  const percent = totalValue.value > 0
    ? (row.value / totalValue.value) * 100
    : 0

  return {
    id: `${row.label}-${index}`,
    label: row.label,
    shortLabel: formatChartAxisLabel(row.label, 22),
    value: row.value,
    percentLabel: `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
    }).format(percent)}%`,
    color: props.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length],
    path: [
      `M ${xTop} ${yTop}`,
      `L ${xTop + topWidth} ${yTop}`,
      `L ${xBottom + bottomWidth} ${yBottom}`,
      `L ${xBottom} ${yBottom}`,
      'Z',
    ].join(' '),
    centerY: yTop + segmentHeight.value / 2,
    labelVisible: segmentHeight.value >= 24 && Math.min(topWidth, bottomWidth) >= Math.max(chartWidth.value * 0.22, 96),
  }
}))
</script>
