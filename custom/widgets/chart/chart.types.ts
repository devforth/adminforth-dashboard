import type { ValueFormat } from '../../model/dashboard.types.js'

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

export type ChartFieldRef = {
  field: string
  label?: string
  format?: ValueFormat
}

export type ChartWidgetSeriesConfig = {
  field: string
  label?: string
  color?: string
}

export type ChartWidgetConfig = {
  type: ChartWidgetType
  title?: string
  x?: ChartFieldRef
  y?: ChartFieldRef | ChartFieldRef[]
  label?: ChartFieldRef
  value?: ChartFieldRef
  buckets?: ChartWidgetBucketConfig[]
  series?: ChartWidgetSeriesConfig
  color?: string
  colors?: string[]
}
