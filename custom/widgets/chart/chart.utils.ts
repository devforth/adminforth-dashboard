import type { ValueFormat } from '../../model/dashboard.types.js'

export const DEFAULT_WIDGET_HEIGHT = 400

// Single-series charts use the theme primary color. Multi-series charts use a fixed categorical
// order validated for color-vision deficiency on the light and dark card surfaces.
// Both are CSS variables defined in DashboardRuntime.vue, so they must be applied through `style`.
export const CHART_PRIMARY_COLOR = 'var(--dashboard-primary)'
export const CHART_COLORS = Array.from({ length: 8 }, (_, index) => `var(--dashboard-series-${index + 1})`)

const MAX_BAR_WIDTH = 24
const BAR_CORNER_RADIUS = 4
const APPROX_AXIS_LABEL_WIDTH = 52

export const COMPACT_NUMBER_FORMAT: Intl.NumberFormatOptions = {
  notation: 'compact',
  maximumFractionDigits: 1,
}

const CURRENCY_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
}

const VALUE_FORMAT_OPTIONS: Record<ValueFormat, Intl.NumberFormatOptions> = {
  number: {},
  integer: { maximumFractionDigits: 0 },
  compact_number: COMPACT_NUMBER_FORMAT,
  currency: CURRENCY_FORMAT,
  currency_delta: CURRENCY_FORMAT,
  percent: { maximumFractionDigits: 1 },
  percent_delta: { maximumFractionDigits: 1 },
  number_delta: { maximumFractionDigits: 2 },
}

export function toFiniteNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

// Values from 100 up drop decimals, smaller ones keep up to two, unless options say otherwise
export function formatChartValue(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    ...options,
  }).format(value)
}

// `compact` shortens values from 1,000 up (1.2K, $3.4M) for axis ticks and labels in tight spaces
export function formatValue(
  rawValue: unknown,
  format: ValueFormat = 'number',
  options: { compact?: boolean, compactTemplate?: boolean } = {},
) {
  const value = toFiniteNumber(rawValue)
  const formatOptions = options.compact
    ? {
        ...VALUE_FORMAT_OPTIONS[format],
        ...(Math.abs(value) >= 1000 ? COMPACT_NUMBER_FORMAT : {}),
        minimumFractionDigits: 0,
      }
    : VALUE_FORMAT_OPTIONS[format]
  const formattedValue = formatChartValue(value, formatOptions)

  if ((format === 'percent' || format === 'percent_delta') && !options.compactTemplate) {
    return `${formattedValue}%`
  }

  return formattedValue
}

// Rounds the axis maximum up to a clean step (1, 2 or 5 × 10^n) so every tick lands on a readable value.
// The thresholds pick the step closest to the rough one on a log scale, same as d3's tickStep.
export function getNiceScale(maxValue: number, targetTickCount = 4) {
  const roughStep = maxValue / targetTickCount
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const residual = roughStep / magnitude
  const step = (residual >= Math.sqrt(50) ? 10 : residual >= Math.sqrt(10) ? 5 : residual >= Math.sqrt(2) ? 2 : 1) * magnitude
  const tickCount = Math.ceil(maxValue / step)

  return {
    max: tickCount * step,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => index * step),
  }
}

export function getChartYAxisWidth(labels: string[], chartWidth: number) {
  const maxLabelLength = Math.max(...labels.map((label) => label.length), 1)
  const estimatedWidth = Math.ceil(maxLabelLength * 6.5) + 18
  const responsiveMaxWidth = Math.max(Math.floor(chartWidth * 0.36), 38)

  return Math.min(Math.max(estimatedWidth, 38), responsiveMaxWidth, 120)
}

// Splits the plot into equal slots and centers a thin bar in each, the rest of the slot stays empty
export function getBarBand(innerWidth: number, count: number) {
  const slotWidth = innerWidth / Math.max(count, 1)

  return {
    slotWidth,
    barWidth: Math.max(Math.min(slotWidth * 0.6, MAX_BAR_WIDTH), 2),
  }
}

// Bar with a rounded data end and a square baseline
export function getBarPath(x: number, y: number, width: number, height: number, roundTop = true) {
  const radius = roundTop ? Math.min(BAR_CORNER_RADIUS, width / 2, height) : 0
  const bottom = y + height

  return [
    `M ${x} ${bottom}`,
    `V ${y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    `H ${x + width - radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + width} ${y + radius}`,
    `V ${bottom}`,
    'Z',
  ].join(' ')
}

// Shows every axis label when they fit, otherwise an evenly spaced subset
export function getVisibleLabelIndexes(count: number, innerWidth: number) {
  const maxLabels = Math.max(2, Math.floor(innerWidth / APPROX_AXIS_LABEL_WIDTH))

  if (count <= maxLabels) {
    return new Set(Array.from({ length: count }, (_, index) => index))
  }

  const indexes = new Set<number>()
  const step = (count - 1) / (maxLabels - 1)

  for (let index = 0; index < maxLabels; index += 1) {
    indexes.add(Math.round(index * step))
  }

  return indexes
}

// date keys as the data service returns them: 2024-03 for a month bucket, 2024-03-04 for a day or week bucket,
// or a full timestamp. A year bucket (2024) and every other value is shown as it is.
const MONTH_KEY_RE = /^\d{4}-\d{2}$/
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T/

// bucket keys are UTC dates, formatting them in the local time zone would move them a day back west of Greenwich
function formatDateKey(value: string, dayOptions: Intl.DateTimeFormatOptions) {
  if (MONTH_KEY_RE.test(value)) {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', timeZone: 'UTC' })
      .format(new Date(`${value}-01T00:00:00Z`))
  }

  if (DAY_KEY_RE.test(value)) {
    return new Intl.DateTimeFormat(undefined, { ...dayOptions, timeZone: 'UTC' })
      .format(new Date(`${value}T00:00:00Z`))
  }

  const timestamp = TIMESTAMP_RE.test(value) ? Date.parse(value) : NaN

  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, dayOptions).format(new Date(timestamp))
    : value
}

export function formatChartLabel(value: unknown) {
  if (typeof value !== 'string') {
    return String(value)
  }

  return formatDateKey(value, { year: 'numeric', month: 'short', day: '2-digit' })
}

export function formatChartAxisLabel(value: unknown, maxLength = 12) {
  const label = formatDateKey(String(value), { month: 'short', day: 'numeric' })

  if (label.length <= maxLength) {
    return label
  }

  return `${label.slice(0, Math.max(maxLength - 1, 1))}…`
}

// a field name as a column header: production_year → Production year
export function formatFieldName(field: string) {
  const words = field.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
