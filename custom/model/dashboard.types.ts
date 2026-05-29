import type { ChartWidgetConfig } from '../widgets/chart/chart.types.js'

export type AggregationOperation = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median'

export type AggregationRule = {
  operation: AggregationOperation
  field?: string
}

export type GroupByRule =
  | {
      type: 'field'
      field: string
    }
  | {
      type: 'date_trunc'
      field: string
      truncation: 'day' | 'week' | 'month' | 'year'
      timezone?: string
    }

export type ResourceWidgetDataSource = {
  type: 'resource'
  resourceId: string
  columns?: string[]
  sort?: unknown
  filters?: unknown
}

export type AggregateWidgetDataSource = {
  type: 'aggregate'
  resourceId: string
  aggregations: Record<string, AggregationRule>
  groupBy?: GroupByRule
  filters?: unknown
}

export type WidgetDataSource = ResourceWidgetDataSource | AggregateWidgetDataSource

export type DashboardConfig = {
  version: number
  groups: DashboardGroupConfig[]
  widgets: DashboardWidgetConfig[]
}

export type DashboardGroupConfig = {
  id: string
  label: string
  order: number
}

export type DashboardGroupMoveDirection = 'up' | 'down'

export type DashboardWidgetMoveDirection = 'up' | 'down'

export type DashboardWidgetTarget =
  | 'empty'
  | 'table'
  | 'chart'
  | 'kpi_card'
  | 'pivot_table'
  | 'gauge_card'

export type DashboardWidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'full'

export type WidgetLayout = {
  size?: DashboardWidgetSize
  width?: number
  minWidth?: number
  maxWidth?: number | null
  height?: number
}

export type DashboardWidgetConfig = {
  id: string
  group_id: string
  label?: string
  size?: DashboardWidgetSize
  width?: number
  height?: number
  minWidth?: number
  maxWidth?: number | null
  order: number
  target: DashboardWidgetTarget
  dataSource?: WidgetDataSource
  chart?: ChartWidgetConfig
  table?: unknown
  kpi_card?: unknown
  pivot_table?: unknown
  gauge_card?: unknown
}

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
}

export type DashboardWidgetData = DashboardWidgetTableData | DashboardWidgetAggregateData

export type NormalizedKpiCardWidgetConfig = {
  valueField?: string
  labelField?: string
  prefix?: string
  suffix?: string
}

export type NormalizedGaugeCardWidgetConfig = {
  valueField?: string
  min?: number | string
  max?: number | string
  minField?: string
  maxField?: string
  suffix?: string
  color?: string
}

export type NormalizedPivotTableWidgetConfig = {
  rowField?: string
  columnField?: string
  valueField?: string
  aggregation?: 'count' | 'sum'
}

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

  if (normalized.table !== undefined) {
    normalized.table = normalizeTableConfig(normalized.table)
  }

  if (normalized.data_source !== undefined) {
    normalized.dataSource = normalizeWidgetDataSource(normalized.data_source)
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

  if (widget.table !== undefined) {
    serialized.table = serializeTableConfigForEditor(widget.table)
  }

  if (widget.dataSource !== undefined) {
    serialized.data_source = serializeWidgetDataSourceForEditor(widget.dataSource)
    delete serialized.dataSource
  }

  return serialized
}

export function normalizeKpiCardWidgetConfig(value: unknown): NormalizedKpiCardWidgetConfig | undefined {
  const config = asWidgetConfigRecord(value)

  if (!config) {
    return undefined
  }

  const valueField = getStringField(config, 'value_field')
  const labelField = getStringField(config, 'label_field')
  const prefix = getStringField(config, 'prefix')
  const suffix = getStringField(config, 'suffix')

  return {
    ...(valueField !== undefined ? { valueField } : {}),
    ...(labelField !== undefined ? { labelField } : {}),
    ...(prefix !== undefined ? { prefix } : {}),
    ...(suffix !== undefined ? { suffix } : {}),
  }
}

export function normalizeGaugeCardWidgetConfig(value: unknown): NormalizedGaugeCardWidgetConfig | undefined {
  const config = asWidgetConfigRecord(value)

  if (!config) {
    return undefined
  }

  const valueField = getStringField(config, 'value_field')
  const minField = getStringField(config, 'min_field')
  const maxField = getStringField(config, 'max_field')
  const suffix = getStringField(config, 'suffix')
  const color = getStringField(config, 'color')

  return {
    ...(valueField !== undefined ? { valueField } : {}),
    ...(config.min !== undefined ? { min: config.min as number | string } : {}),
    ...(config.max !== undefined ? { max: config.max as number | string } : {}),
    ...(minField !== undefined ? { minField } : {}),
    ...(maxField !== undefined ? { maxField } : {}),
    ...(suffix !== undefined ? { suffix } : {}),
    ...(color !== undefined ? { color } : {}),
  }
}

export function normalizePivotTableWidgetConfig(value: unknown): NormalizedPivotTableWidgetConfig | undefined {
  const config = asWidgetConfigRecord(value)

  if (!config) {
    return undefined
  }

  const rowField = getStringField(config, 'row_field')
  const columnField = getStringField(config, 'column_field')
  const valueField = getStringField(config, 'value_field')
  const aggregation = config.aggregation === 'count' || config.aggregation === 'sum'
    ? config.aggregation
    : undefined

  return {
    ...(rowField !== undefined ? { rowField } : {}),
    ...(columnField !== undefined ? { columnField } : {}),
    ...(valueField !== undefined ? { valueField } : {}),
    ...(aggregation !== undefined ? { aggregation } : {}),
  }
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

function normalizeTableConfig(value: unknown) {
  if (!isRecord(value)) {
    return value
  }

  const normalized = { ...value }

  if (normalized.page_size !== undefined) {
    normalized.pageSize = normalized.page_size
  }

  return normalized
}

function normalizeWidgetDataSource(value: unknown) {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return value
  }

  const resourceId = typeof value.resource_id === 'string'
    ? value.resource_id
    : undefined

  if (value.type === 'resource') {
    return {
      type: 'resource',
      ...(resourceId !== undefined ? { resourceId } : {}),
      ...(value.columns !== undefined ? { columns: value.columns } : {}),
      ...(value.filters !== undefined ? { filters: value.filters } : {}),
      ...(value.sort !== undefined ? { sort: value.sort } : {}),
    }
  }

  if (value.type === 'aggregate') {
    const groupBy = normalizeGroupByRule(value.group_by)

    return {
      type: 'aggregate',
      ...(resourceId !== undefined ? { resourceId } : {}),
      ...(value.aggregations !== undefined ? { aggregations: value.aggregations } : {}),
      ...(groupBy !== undefined ? { groupBy } : {}),
      ...(value.filters !== undefined ? { filters: value.filters } : {}),
    }
  }

  return value
}

function normalizeGroupByRule(value: unknown) {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return value
  }

  if (value.type === 'field') {
    return {
      type: 'field',
      ...(value.field !== undefined ? { field: value.field } : {}),
    }
  }

  if (value.type === 'date_trunc') {
    return {
      type: 'date_trunc',
      ...(value.field !== undefined ? { field: value.field } : {}),
      ...(value.truncation !== undefined ? { truncation: value.truncation } : {}),
      ...(value.timezone !== undefined ? { timezone: value.timezone } : {}),
    }
  }

  return value
}

function serializeTableConfigForEditor(value: unknown) {
  if (!isRecord(value)) {
    return value
  }

  const serialized = { ...value }

  if (Object.prototype.hasOwnProperty.call(serialized, 'pageSize')) {
    serialized.page_size = serialized.pageSize
    delete serialized.pageSize
  }

  return serialized
}

function serializeWidgetDataSourceForEditor(value: WidgetDataSource) {
  if (value.type === 'resource') {
    return {
      type: 'resource',
      resource_id: value.resourceId,
      ...(value.columns !== undefined ? { columns: value.columns } : {}),
      ...(value.filters !== undefined ? { filters: value.filters } : {}),
      ...(value.sort !== undefined ? { sort: value.sort } : {}),
    }
  }

  return {
    type: 'aggregate',
    resource_id: value.resourceId,
    aggregations: value.aggregations,
    ...(value.groupBy !== undefined ? { group_by: serializeGroupByRuleForEditor(value.groupBy) } : {}),
    ...(value.filters !== undefined ? { filters: value.filters } : {}),
  }
}

function serializeGroupByRuleForEditor(value: GroupByRule) {
  if (value.type === 'field') {
    return {
      type: 'field',
      field: value.field,
    }
  }

  return {
    type: 'date_trunc',
    field: value.field,
    truncation: value.truncation,
    ...(value.timezone !== undefined ? { timezone: value.timezone } : {}),
  }
}

function asWidgetConfigRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function getStringField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
