export type ChartWidgetType =
  | 'line'
  | 'pie'
  | 'bar'
  | 'stacked_bar'
  | 'funnel'
  | 'histogram'

export type ChartWidgetBucketConfig = {
  label: string
  min?: number
  max?: number
}

export type ChartWidgetSeriesConfig = {
  name: string
  field: string
  color?: string
}

export type ChartWidgetConfig = {
  type: ChartWidgetType
  title?: string
  x_field?: string
  y_field?: string
  label_field?: string
  value_field?: string
  bucket_field?: string
  buckets?: ChartWidgetBucketConfig[]
  series?: ChartWidgetSeriesConfig[]
  series_name?: string
  color?: string
  colors?: string[]
}

export type NormalizedChartWidgetConfig = {
  type: ChartWidgetType
  title?: string
  xField?: string
  yField?: string
  labelField?: string
  valueField?: string
  bucketField?: string
  buckets?: ChartWidgetBucketConfig[]
  series?: ChartWidgetSeriesConfig[]
  seriesName?: string
  color?: string
  colors?: string[]
}

export function normalizeChartWidgetConfig(value: unknown): NormalizedChartWidgetConfig | undefined {
  const config = asChartWidgetConfigRecord(value)

  if (!config) {
    return undefined
  }

  const type = normalizeChartWidgetType(config.type)

  if (!type) {
    return undefined
  }

  const xField = getStringField(config, 'x_field')
  const yField = getStringField(config, 'y_field')
  const labelField = getStringField(config, 'label_field')
  const valueField = getStringField(config, 'value_field')
  const bucketField = getStringField(config, 'bucket_field')
  const seriesName = getStringField(config, 'series_name')
  const title = getStringField(config, 'title')
  const color = getStringField(config, 'color')
  const colors = Array.isArray(config.colors) ? config.colors as string[] : undefined
  const buckets = Array.isArray(config.buckets) ? config.buckets as ChartWidgetBucketConfig[] : undefined
  const series = Array.isArray(config.series) ? config.series as ChartWidgetSeriesConfig[] : undefined

  return {
    type,
    ...(title !== undefined ? { title } : {}),
    ...(xField !== undefined ? { xField } : {}),
    ...(yField !== undefined ? { yField } : {}),
    ...(labelField !== undefined ? { labelField } : {}),
    ...(valueField !== undefined ? { valueField } : {}),
    ...(bucketField !== undefined ? { bucketField } : {}),
    ...(buckets !== undefined ? { buckets } : {}),
    ...(series !== undefined ? { series } : {}),
    ...(seriesName !== undefined ? { seriesName } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(colors !== undefined ? { colors } : {}),
  }
}

function normalizeChartWidgetType(value: unknown): ChartWidgetType | undefined {
  switch (value) {
    case 'line':
    case 'pie':
    case 'bar':
    case 'stacked_bar':
    case 'funnel':
    case 'histogram':
      return value
    default:
      return undefined
  }
}

function asChartWidgetConfigRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function getStringField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
