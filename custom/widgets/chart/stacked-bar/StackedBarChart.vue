<script setup lang="ts">
import { computed } from 'vue'
import { useElementSize } from '../../../composables/useElementSize.js'
import type { ChartWidgetSeriesConfig } from '../chart.types.js'
import { CHART_COLORS, formatChartAxisLabel, formatChartLabel, formatChartValue, toFiniteNumber } from '../chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  xField: string
  series: ChartWidgetSeriesConfig[]
  colors?: string[]
  height?: number
}>(), {
  height: 280,
})

const { el: rootEl, width: rootWidth } = useElementSize<HTMLDivElement>()
const { el: svgEl, width: svgWidth, height: svgHeight } = useElementSize<HTMLDivElement>()

const padding = {
  top: 24,
  right: 6,
  bottom: 34,
  left: 38,
}
const barGap = 10
const normalizedSeries = computed(() => props.series.map((series, index) => ({
  ...series,
  color: series.color || props.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length],
})))
const showLegend = computed(() => normalizedSeries.value.length > 0)
const isCompact = computed(() => rootWidth.value > 0 && rootWidth.value < 420)
const chartWidth = computed(() => Math.max(svgWidth.value, 1))
const chartHeight = computed(() => {
  if (svgHeight.value > 0) {
    return Math.max(svgHeight.value, 1)
  }

  return Math.max(props.height - (showLegend.value ? 28 : 0), 96)
})
const innerWidth = computed(() => Math.max(chartWidth.value - padding.left - padding.right, 1))
const innerHeight = computed(() => Math.max(chartHeight.value - padding.top - padding.bottom, 1))
const groupedRows = computed(() => {
  const grouped = new Map<string, Record<string, unknown>>()

  for (const row of props.rows) {
    const label = formatChartLabel(row[props.xField])
    const item = grouped.get(label) ?? { [props.xField]: label }

    for (const series of normalizedSeries.value) {
      item[series.name] = toFiniteNumber(item[series.name])
        + getSeriesContribution(row[series.field], series.name)
    }

    grouped.set(label, item)
  }

  return Array.from(grouped.values())
})
const barWidth = computed(() => {
  const count = Math.max(groupedRows.value.length, 1)
  return Math.max(Math.min((innerWidth.value - barGap * (count - 1)) / count, 80), 4)
})
const totalChartWidth = computed(() => {
  const count = Math.max(groupedRows.value.length, 1)
  return count * barWidth.value + (count - 1) * barGap
})
const chartStartX = computed(() => padding.left + Math.max((innerWidth.value - totalChartWidth.value) / 2, 0))
const totals = computed(() => groupedRows.value.map((row) => normalizedSeries.value.reduce(
  (sum, series) => sum + toFiniteNumber(row[series.name]),
  0,
)))
const maxTotal = computed(() => Math.max(...totals.value, 1))

const bars = computed(() => groupedRows.value.map((row, rowIndex) => {
  let y = padding.top + innerHeight.value

  return {
    label: String(row[props.xField]),
    axisLabel: formatChartAxisLabel(row[props.xField]),
    x: chartStartX.value + rowIndex * (barWidth.value + barGap),
    total: totals.value[rowIndex],
    segments: normalizedSeries.value.map((series) => {
      const value = toFiniteNumber(row[series.name])
      const height = (value / maxTotal.value) * innerHeight.value
      y -= height

      return {
        id: `${rowIndex}-${series.name}`,
        name: series.name,
        value,
        color: series.color,
        y,
        height,
      }
    }),
  }
}))

const visibleLabelIndexes = computed(() => {
  const count = bars.value.length
  const approxLabelWidth = 52
  const maxLabels = Math.max(2, Math.floor(innerWidth.value / approxLabelWidth))

  if (count <= maxLabels || barWidth.value >= 44) {
    return new Set(bars.value.map((_, index) => index))
  }

  const indexes = new Set<number>()
  const step = (count - 1) / (maxLabels - 1)

  for (let index = 0; index < maxLabels; index += 1) {
    indexes.add(Math.round(index * step))
  }

  return indexes
})

const yTicks = computed(() => [0, 0.5, 1].map((ratio) => ({
  value: maxTotal.value * (1 - ratio),
  y: padding.top + innerHeight.value * ratio,
})))

function getSeriesContribution(value: unknown, seriesName: string) {
  if (typeof value === 'boolean') {
    return value === getBooleanSeriesValue(seriesName) ? 1 : 0
  }

  if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
    return (value.toLowerCase() === 'true') === getBooleanSeriesValue(seriesName) ? 1 : 0
  }

  return toFiniteNumber(value)
}

function getBooleanSeriesValue(seriesName: string) {
  const normalizedName = seriesName.toLowerCase()

  if (normalizedName.includes('unlisted') || normalizedName.includes('false')) {
    return false
  }

  return true
}

function getBarTooltip(bar: { label: string, total: number, segments: Array<{ name: string, value: number }> }) {
  const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

  const segmentLines = bar.segments.map((segment) => {
    const share = bar.total > 0
      ? (segment.value / bar.total) * 100
      : 0

    return `${segment.name}: ${formatChartValue(segment.value)} (${percentFormatter.format(share)}%)`
  })

  return [
    `${bar.label}`,
    `Total: ${formatChartValue(bar.total)}`,
    ...segmentLines,
  ].join('\n')
}
</script>

<template>
  <div
    ref="rootEl"
    class="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden"
  >
    <div
      v-if="showLegend"
      class="flex flex-wrap items-center gap-3 text-xs text-lightListTableText dark:text-darkListTableText"
      :class="isCompact ? 'justify-start' : 'justify-end'"
    >
      <div
        v-for="series in normalizedSeries"
        :key="series.name"
        class="flex items-center gap-1.5"
      >
        <span
          class="h-2.5 w-2.5 rounded-full"
          :style="{ backgroundColor: series.color }"
        />
        <span>{{ series.name }}</span>
      </div>
    </div>

    <div
      ref="svgEl"
      class="min-h-0 overflow-hidden"
    >
      <svg
        v-if="chartWidth > 0 && chartHeight > 0"
        class="block h-full w-full"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        role="img"
        :aria-label="xField"
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

        <g
          v-for="(bar, barIndex) in bars"
          :key="bar.label"
        >
          <rect
            v-for="segment in bar.segments"
            :key="segment.id"
            v-show="segment.height > 0"
            :x="bar.x"
            :y="segment.y"
            :width="barWidth"
            :height="segment.height"
            :fill="segment.color"
            rx="3"
          >
            <title>{{ getBarTooltip(bar) }}</title>
          </rect>

          <text
            v-if="visibleLabelIndexes.has(barIndex)"
            :x="bar.x + barWidth / 2"
            :y="padding.top + innerHeight + 24"
            fill="currentColor"
            font-size="11"
            text-anchor="middle"
            class="text-lightListTableText dark:text-darkListTableText"
          >
            {{ bar.axisLabel }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
