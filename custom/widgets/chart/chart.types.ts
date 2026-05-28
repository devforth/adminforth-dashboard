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
