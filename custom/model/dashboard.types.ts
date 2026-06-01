import type { ChartWidgetConfig } from '../widgets/chart/chart.types.js'

export type DashboardConfig = {
  version: number
  groups: DashboardGroupConfig[]
  widgets: DashboardWidgetConfig[]
}

export type DashboardVariables = Record<string, unknown>

export type DashboardGroupConfig = {
  id: string
  label: string
  order: number
}

export type DashboardGroupMoveDirection = 'up' | 'down'
export type DashboardWidgetMoveDirection = 'up' | 'down'
export type DashboardWidgetTarget = 'empty' | 'table' | 'chart' | 'kpi_card' | 'pivot_table' | 'gauge_card'
export type DashboardWidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'full'
export type QueryAggregateOperation = 'sum' | 'count' | 'count_distinct' | 'avg' | 'min' | 'max' | 'median'
export type TimeGrain = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
export type ValueFormat =
  | 'number'
  | 'compact_number'
  | 'currency'
  | 'percent'
  | 'percent_delta'
  | 'number_delta'
  | 'currency_delta'

export type WidgetLayout = {
  size?: DashboardWidgetSize
  width?: number
  minWidth?: number
  maxWidth?: number | null
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
  minWidth?: number
  maxWidth?: number | null
  order: number
}

export type FilterExpression =
  | { and: FilterExpression[] }
  | { or: FilterExpression[] }
  | Array<FilterExpression>
  | {
      field: string
      eq?: unknown
      neq?: unknown
      gt?: unknown
      gte?: unknown
      lt?: unknown
      lte?: unknown
      in?: unknown[]
      not_in?: unknown[]
      like?: unknown
      ilike?: unknown
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
  filters?: FilterExpression
  groupBy?: QueryGroupByItem[]
  orderBy?: QueryOrderByItem[]
  limit?: number
  offset?: number
  timeSeries?: {
    field: string
    grain: TimeGrain
    timezone?: string
  }
  period?: {
    field: string
    gte?: unknown
    lt?: unknown
  }
  bucket?: {
    field: string
    buckets: Array<{ label: string, min?: number, max?: number }>
  }
  calcs?: QueryCalcSelectItem[]
  formatting?: Record<string, unknown>
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
  pageSize?: number
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
  comparison?: unknown
  sparkline?: unknown
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
    valueField: string
    targetValue?: number
    targetField?: string
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

export function normalizeDashboardConfig(config: unknown): DashboardConfig {
  const value = isRecord(config) ? config : {}

  return {
    version: typeof value.version === 'number' ? value.version : 1,
    groups: Array.isArray(value.groups) ? (value.groups as DashboardGroupConfig[]) : [],
    widgets: Array.isArray(value.widgets)
      ? value.widgets.map((widget) => normalizeDashboardWidgetConfig(widget) as DashboardWidgetConfig)
      : [],
  }
}

export function normalizeDashboardWidgetConfig(config: unknown) {
  if (!isRecord(config)) {
    return config
  }

  const normalized: Record<string, unknown> = { ...config }
  normalizeWidgetLayoutConfig(normalized)

  if (normalized.query !== undefined) {
    normalized.query = normalizeQueryConfig(normalized.query)
  }

  if (normalized.table !== undefined) {
    normalized.table = normalizeTableConfig(normalized.table)
  }

  if (normalized.card !== undefined) {
    normalized.card = normalizeCardConfig(normalized.card)
  }

  if (normalized.pivot !== undefined) {
    normalized.pivot = normalizePivotConfig(normalized.pivot)
  }

  const target = normalizeDashboardWidgetTarget(normalized.target)

  if (target !== undefined) {
    normalized.target = target
  }

  return normalized
}

export function serializeDashboardWidgetConfigForEditor(widget: DashboardWidgetConfig) {
  const serialized: Record<string, unknown> = { ...widget }

  if (Object.prototype.hasOwnProperty.call(serialized, 'minWidth')) {
    serialized.min_width = widget.minWidth
    delete serialized.minWidth
  }

  if (Object.prototype.hasOwnProperty.call(serialized, 'maxWidth')) {
    serialized.max_width = widget.maxWidth
    delete serialized.maxWidth
  }

  if ('query' in widget) {
    serialized.query = serializeQueryConfigForEditor(widget.query)
  }

  if ('table' in widget && widget.table !== undefined) {
    serialized.table = serializeTableConfigForEditor(widget.table)
  }

  if ('card' in widget && widget.card !== undefined) {
    serialized.card = serializeCardConfigForEditor(widget.card)
  }

  if ('pivot' in widget && widget.pivot !== undefined) {
    serialized.pivot = serializePivotConfigForEditor(widget.pivot)
  }

  return serialized
}

export function getFieldRefField(value: FieldRef | undefined) {
  return typeof value === 'string' ? value : value?.field
}

export function getFieldRefLabel(value: FieldRef | undefined) {
  return typeof value === 'string' ? value : value?.label
}

function normalizeDashboardWidgetTarget(value: unknown): DashboardWidgetTarget | undefined {
  switch (value) {
    case 'empty':
    case 'table':
    case 'chart':
    case 'kpi_card':
    case 'pivot_table':
    case 'gauge_card':
      return value
    default:
      return undefined
  }
}

function normalizeWidgetLayoutConfig(value: Record<string, unknown>) {
  if (value.min_width !== undefined) {
    value.minWidth = value.min_width
  }

  if (value.max_width !== undefined) {
    value.maxWidth = value.max_width
  }
}

function normalizeQueryConfig(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  if (Array.isArray(value.steps)) {
    return removeUndefinedFields({
      steps: value.steps.map((step) => normalizeFunnelQueryStep(step)),
      calcs: Array.isArray(value.calcs) ? value.calcs as QueryCalcSelectItem[] : undefined,
    })
  }

  return {
    ...value,
    ...(Array.isArray(value.group_by) ? { groupBy: value.group_by } : {}),
    ...(Array.isArray(value.order_by) ? { orderBy: value.order_by } : {}),
    ...(value.time_series !== undefined ? { timeSeries: value.time_series } : {}),
  }
}

function normalizeFunnelQueryStep(value: unknown) {
  if (!isRecord(value)) {
    return value
  }

  const { resource_id, ...rest } = value

  return removeUndefinedFields({
    ...rest,
    resource: typeof resource_id === 'string' ? resource_id : rest.resource,
  })
}

function normalizeTableConfig(value: unknown) {
  if (!isRecord(value)) {
    return value
  }

  return {
    ...value,
    ...(value.page_size !== undefined ? { pageSize: value.page_size } : {}),
  }
}

function normalizeCardConfig(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const normalized = { ...value }

  if (isRecord(normalized.progress)) {
    normalized.progress = {
      ...normalized.progress,
      ...(normalized.progress.value_field !== undefined ? { valueField: normalized.progress.value_field } : {}),
      ...(normalized.progress.target_value !== undefined ? { targetValue: normalized.progress.target_value } : {}),
      ...(normalized.progress.target_field !== undefined ? { targetField: normalized.progress.target_field } : {}),
    }
  }

  if (isRecord(normalized.comparison)) {
    normalized.comparison = {
      ...normalized.comparison,
      ...(normalized.comparison.positive_is_good !== undefined ? { positiveIsGood: normalized.comparison.positive_is_good } : {}),
    }
  }

  return normalized
}

function normalizePivotConfig(value: unknown): unknown {
  return value
}

function serializeQueryConfigForEditor(value: QueryConfig | FunnelQueryConfig) {
  if ('steps' in value) {
    return removeUndefinedFields({
      steps: value.steps.map((step) => ({
        ...step,
        resource_id: step.resource,
        resource: undefined,
      })).map((step) => removeUndefinedFields(step)),
      calcs: value.calcs,
    })
  }

  return removeUndefinedFields({
    ...value,
    group_by: value.groupBy,
    groupBy: undefined,
    order_by: value.orderBy,
    orderBy: undefined,
    time_series: value.timeSeries,
    timeSeries: undefined,
  })
}

function serializeTableConfigForEditor(value: TableViewConfig) {
  return removeUndefinedFields({
    ...value,
    page_size: value.pageSize,
    pageSize: undefined,
  })
}

function serializeCardConfigForEditor(value: KpiCardViewConfig | GaugeCardViewConfig) {
  const serialized: Record<string, unknown> = { ...value }

  if (isRecord(serialized.progress)) {
    serialized.progress = removeUndefinedFields({
      ...serialized.progress,
      value_field: serialized.progress.valueField,
      valueField: undefined,
      target_value: serialized.progress.targetValue,
      targetValue: undefined,
      target_field: serialized.progress.targetField,
      targetField: undefined,
    })
  }

  if (isRecord(serialized.comparison)) {
    serialized.comparison = removeUndefinedFields({
      ...serialized.comparison,
      positive_is_good: serialized.comparison.positiveIsGood,
      positiveIsGood: undefined,
    })
  }

  return removeUndefinedFields(serialized)
}

function serializePivotConfigForEditor(value: PivotTableViewConfig) {
  return value
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  )
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}
