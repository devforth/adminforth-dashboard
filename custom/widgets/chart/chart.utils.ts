export const CHART_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f97316',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
  '#db2777',
]

export function toFiniteNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export function formatChartValue(value: number) {
  return new Intl.NumberFormat().format(value)
}

export function formatChartLabel(value: unknown) {
  if (typeof value !== 'string') {
    return String(value)
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(timestamp))
}

export function formatChartAxisLabel(value: unknown, maxLength = 12) {
  const rawLabel = typeof value === 'string' ? value : String(value)
  const timestamp = Date.parse(rawLabel)
  const label = Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(new Date(timestamp))
    : rawLabel

  if (label.length <= maxLength) {
    return label
  }

  return `${label.slice(0, Math.max(maxLength - 1, 1))}…`
}
