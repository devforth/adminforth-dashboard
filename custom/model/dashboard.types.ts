import type { ChartWidgetConfig } from '../widgets/chart/chart.types.js'

export type DashboardConfig = {
  version: number
  groups: DashboardGroupConfig[]
  widgets: DashboardWidgetConfig[]
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type DashboardVariables = Record<string, JsonValue>

export type DashboardGroupConfig = {
  id: string
  label: string
  order: number
}

export type EditableDashboardGroupConfig = Pick<DashboardGroupConfig, 'label'>

export type DashboardGroupMoveDirection = 'up' | 'down'
export type DashboardWidgetMoveDirection = 'up' | 'down'
export type DashboardWidgetTarget = 'empty' | 'table' | 'chart' | 'kpi_card' | 'pivot_table' | 'gauge_card'
export type DashboardWidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'full'
export type DashboardWidgetConfigValidationError = {
  field: string
  message: string
}
export type QueryAggregateOperation = 'sum' | 'count' | 'count_distinct' | 'avg' | 'min' | 'max' | 'median'
export type TimeGrain = 'day' | 'week' | 'month' | 'year'
export type ValueFormat =
  | 'number'
  | 'integer'
  | 'compact_number'
  | 'currency'
  | 'percent'
  | 'percent_delta'
  | 'number_delta'
  | 'currency_delta'

export type WidgetLayout = {
  size?: DashboardWidgetSize
  width?: number
  min_width?: number
  max_width?: number | null
  height?: number
}

export type WidgetBaseConfig = {
  id: string
  group_id: string
  label?: string
  variables?: DashboardVariables
  size?: DashboardWidgetSize
  width?: number
  height?: number
  min_width?: number
  max_width?: number | null
  order: number
}

export type FilterExpression =
  | { and: FilterExpression[] }
  | { or: FilterExpression[] }
  | Array<FilterExpression>
  | {
      field: string
      eq?: JsonValue
      neq?: JsonValue
      gt?: JsonValue
      gte?: JsonValue
      lt?: JsonValue
      lte?: JsonValue
      in?: JsonValue[]
      not_in?: JsonValue[]
      like?: JsonValue
      ilike?: JsonValue
    }

export type QueryFieldSelectItem = {
  field: string
  as?: string
  grain?: TimeGrain
}

export type QueryAggregateSelectItem = {
  agg: QueryAggregateOperation
  field?: string
  as: string
  filters?: FilterExpression
}

export type QueryCalcSelectItem = {
  calc: string
  as: string
}

export type QuerySelectItem = QueryFieldSelectItem | QueryAggregateSelectItem | QueryCalcSelectItem

export type QueryGroupByItem =
  | string
  | {
      field: string
      as?: string
      grain?: TimeGrain
      timezone?: string
    }

export type QueryOrderByItem = {
  field: string
  direction?: 'asc' | 'desc'
}

export type QueryConfig = {
  resource: string
  select?: QuerySelectItem[]
  sparkline?: {
    field: string
    grain: TimeGrain
    as: string
    fill_missing?: Record<string, JsonValue>
  }
  filters?: FilterExpression
  group_by?: QueryGroupByItem[]
  order_by?: QueryOrderByItem[]
  limit?: number
  offset?: number
  bucket?: {
    field: string
    buckets: Array<{ label: string, min?: number, max?: number }>
  }
  calcs?: QueryCalcSelectItem[]
  formatting?: Record<string, JsonValue>
}

export type FunnelQueryConfig = {
  steps: FunnelQueryStep[]
  calcs?: QueryCalcSelectItem[]
}

export type FunnelQueryStep = {
  name: string
  resource: string
  metric: QueryAggregateSelectItem
  filters?: FilterExpression
}

export type FieldRef = string | {
  field: string
  label?: string
  format?: ValueFormat
}

export type TableViewConfig = {
  columns?: FieldRef[]
  pagination?: boolean
  page_size?: number
}

export type KpiCardViewConfig = {
  title?: string
  value: {
    field: string
    format?: ValueFormat
    prefix?: string
    suffix?: string
  }
  subtitle?: {
    text?: string
    field?: string
  }
  comparison?: {
    field: string
    format?: ValueFormat
    positive_is_good?: boolean
    compact?: {
      show?: boolean
      template?: string
    }
    tooltip?: {
      label?: string
      template?: string
    }
  }
  sparkline?: {
    type?: 'line'
    field: string
    x: string
    show_axes?: boolean
    show_labels?: boolean
    fill?: {
      type?: 'gradient' | 'solid'
    }
  }
}

export type GaugeCardViewConfig = {
  title?: string
  value: {
    field: string
    format?: ValueFormat
    prefix?: string
    suffix?: string
  }
  target?: {
    value?: number
    field?: string
    label?: string
  }
  progress?: {
    value_field: string
    target_value?: number
    target_field?: string
    format?: ValueFormat
  }
  color?: string
}

export type PivotTableViewConfig = {
  rows: FieldRef[]
  columns?: FieldRef[]
  values: Array<{
    field: string
    label?: string
    format?: ValueFormat
    aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max'
  }>
}

export type EmptyWidgetConfig = WidgetBaseConfig & {
  target: 'empty'
}

export type TableWidgetConfig = WidgetBaseConfig & {
  target: 'table'
  table?: TableViewConfig
  query: QueryConfig
}

export type ChartDashboardWidgetConfig = WidgetBaseConfig & {
  target: 'chart'
  chart: ChartWidgetConfig
  query: QueryConfig | FunnelQueryConfig
}

export type KpiCardWidgetConfig = WidgetBaseConfig & {
  target: 'kpi_card'
  card: KpiCardViewConfig
  query: QueryConfig
}

export type GaugeCardWidgetConfig = WidgetBaseConfig & {
  target: 'gauge_card'
  card: GaugeCardViewConfig
  query: QueryConfig
}

export type PivotTableWidgetConfig = WidgetBaseConfig & {
  target: 'pivot_table'
  pivot: PivotTableViewConfig
  query: QueryConfig
}

export type DashboardWidgetConfig =
  | EmptyWidgetConfig
  | TableWidgetConfig
  | ChartDashboardWidgetConfig
  | KpiCardWidgetConfig
  | GaugeCardWidgetConfig
  | PivotTableWidgetConfig

export type DashboardWidgetTableData = {
  kind?: 'table'
  columns: string[]
  rows: Record<string, unknown>[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type DashboardWidgetAggregateData = {
  kind: 'aggregate'
  columns: string[]
  rows: Record<string, unknown>[]
  values?: Record<string, unknown>
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type DashboardWidgetData = DashboardWidgetTableData | DashboardWidgetAggregateData

export function serializeDashboardWidgetConfigForEditor(
  widget: DashboardWidgetConfig,
): unknown {
  const {
    id: _id,
    group_id: _groupId,
    order: _order,
    ...editableWidgetConfig
  } = widget

  return editableWidgetConfig
}

export function getFieldRefField(value: FieldRef | undefined) {
  return typeof value === 'string' ? value : value?.field
}
