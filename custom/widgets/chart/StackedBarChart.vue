<template>
  <div
    ref="rootEl"
    class="relative grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden"
    @mouseleave="hideTooltip"
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
            {{ tick.label }}
          </text>
        </g>

        <g
          v-for="(bar, barIndex) in bars"
          :key="bar.label"
        >
          <path
            v-for="shape in bar.shapes"
            :key="shape.id"
            :d="shape.path"
            :style="{ fill: shape.color }"
            @mouseenter="showTooltip($event, bar)"
            @mousemove="moveTooltip($event)"
          />

          <text
            v-if="visibleLabelIndexes.has(barIndex)"
            :x="bar.x + band.barWidth / 2"
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

    <Teleport to="body">
      <div
        v-if="tooltip"
        class="pointer-events-none fixed z-[1000] min-w-44 rounded border border-lightTableBorder bg-lightTableBackground px-3 py-2 text-xs leading-5 text-lightListTableText shadow-lg dark:border-darkTableBorder dark:bg-darkTableBackground dark:text-darkListTableText"
        :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
      >
        <div
          v-for="line in tooltip.lines"
          :key="line"
          class="whitespace-nowrap"
        >
          {{ line }}
        </div>
      </div>
    </Teleport>
  </div>
</template>



<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementSize } from '../../composables/useElementSize.js'
import type { ValueFormat } from '../../model/dashboard.types.js'
import {
  CHART_COLORS,
  formatChartAxisLabel,
  formatChartLabel,
  formatValue,
  getBarBand,
  getBarPath,
  getChartYAxisWidth,
  getNiceScale,
  getVisibleLabelIndexes,
  toFiniteNumber,
} from './chart.utils.js'

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  xField: string
  yField: string
  seriesField: string
  colors?: string[]
  format?: ValueFormat
  height?: number
}>(), {
  height: 280,
})

const { el: rootEl, width: rootWidth } = useElementSize<HTMLDivElement>()
const { el: svgEl, width: svgWidth, height: svgHeight } = useElementSize<HTMLDivElement>()

// Empty space between stacked segments, so neighbors read as separate without an outline
const SEGMENT_GAP = 2

type StackedBarTooltipBar = {
  label: string
  total: number
  segments: Array<{ name: string, value: number }>
}

const tooltip = ref<{
  x: number
  y: number
  lines: string[]
} | null>(null)
const seriesNames = computed(() => Array.from(new Set(props.rows.map((row) => formatSeriesLabel(row[props.seriesField])))))
const normalizedSeries = computed(() => seriesNames.value.map((name, index) => ({
  name,
  color: props.colors?.[index] || CHART_COLORS[index % CHART_COLORS.length],
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
const groupedRows = computed(() => {
  const grouped = new Map<string, Record<string, unknown>>()

  for (const row of props.rows) {
    const label = formatChartLabel(row[props.xField])
    const item = grouped.get(label) ?? { [props.xField]: label }
    const seriesName = formatSeriesLabel(row[props.seriesField])

    item[seriesName] = toFiniteNumber(item[seriesName]) + toFiniteNumber(row[props.yField])

    grouped.set(label, item)
  }

  return Array.from(grouped.values())
})
const totals = computed(() => groupedRows.value.map((row) => normalizedSeries.value.reduce(
  (sum, series) => sum + toFiniteNumber(row[series.name]),
  0,
)))
const scale = computed(() => getNiceScale(Math.max(...totals.value, 1)))
const tickLabels = computed(() => scale.value.ticks.map((value) => formatValue(value, props.format, { compact: true })))
const padding = computed(() => ({
  top: 24,
  right: 6,
  bottom: 34,
  left: getChartYAxisWidth(tickLabels.value, chartWidth.value),
}))
const innerWidth = computed(() => Math.max(chartWidth.value - padding.value.left - padding.value.right, 1))
const innerHeight = computed(() => Math.max(chartHeight.value - padding.value.top - padding.value.bottom, 1))
const band = computed(() => getBarBand(innerWidth.value, groupedRows.value.length))

const bars = computed(() => groupedRows.value.map((row, rowIndex) => {
  const x = padding.value.left + rowIndex * band.value.slotWidth + (band.value.slotWidth - band.value.barWidth) / 2
  let y = padding.value.top + innerHeight.value

  const segments = normalizedSeries.value.map((series) => {
    const value = toFiniteNumber(row[series.name])
    const height = (value / scale.value.max) * innerHeight.value
    y -= height

    return {
      id: `${rowIndex}-${series.name}`,
      name: series.name,
      value,
      color: series.color,
      y,
      height,
    }
  })
  const visibleSegments = segments.filter((segment) => segment.height > 0)

  return {
    label: String(row[props.xField]),
    axisLabel: formatChartAxisLabel(row[props.xField]),
    x,
    total: totals.value[rowIndex],
    segments,
    // Every segment above the bottom one gives up SEGMENT_GAP at its base, only the topmost gets the rounded end
    shapes: visibleSegments.map((segment, index) => ({
      id: segment.id,
      color: segment.color,
      path: getBarPath(
        x,
        segment.y,
        band.value.barWidth,
        Math.max(segment.height - (index > 0 ? SEGMENT_GAP : 0), 0),
        index === visibleSegments.length - 1,
      ),
    })),
  }
}))

const visibleLabelIndexes = computed(() => getVisibleLabelIndexes(bars.value.length, innerWidth.value))

const yTicks = computed(() => scale.value.ticks.map((value, index) => ({
  label: tickLabels.value[index],
  y: padding.value.top + innerHeight.value - (value / scale.value.max) * innerHeight.value,
})))

function showTooltip(event: MouseEvent, bar: StackedBarTooltipBar) {
  tooltip.value = {
    ...getTooltipPosition(event),
    lines: getBarTooltipLines(bar),
  }
}

function moveTooltip(event: MouseEvent) {
  if (!tooltip.value) {
    return
  }

  tooltip.value = {
    ...tooltip.value,
    ...getTooltipPosition(event),
  }
}

function hideTooltip() {
  tooltip.value = null
}

function getTooltipPosition(event: MouseEvent) {
  return {
    x: event.clientX + 12,
    y: event.clientY + 12,
  }
}

function getBarTooltipLines(bar: StackedBarTooltipBar) {
  const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

  const segmentLines = bar.segments.map((segment) => {
    const share = bar.total > 0
      ? (segment.value / bar.total) * 100
      : 0

    return `${segment.name}: ${formatValue(segment.value, props.format)} (${percentFormatter.format(share)}%)`
  })

  return [
    `${bar.label}`,
    `Total: ${formatValue(bar.total, props.format)}`,
    ...segmentLines,
  ]
}

function formatSeriesLabel(value: unknown) {
  return typeof value === 'string' ? value : String(value)
}
</script>
