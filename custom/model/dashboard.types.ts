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
  query?: unknown
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
  const target = normalizeDashboardWidgetTarget(normalized.target ?? normalized.type)

  if (target && normalized.target === undefined) {
    normalized.target = target
  }

  if (target === 'kpi_card') {
    const kpiCardConfig = normalizeKpiCardConfig(normalized)

    if (kpiCardConfig !== undefined) {
      normalized.kpi_card = kpiCardConfig
    }
  }

  if (target === 'gauge_card') {
    const gaugeCardConfig = normalizeGaugeCardConfig(normalized)

    if (gaugeCardConfig !== undefined) {
      normalized.gauge_card = gaugeCardConfig
    }
  }

  return normalized
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

function normalizeKpiCardConfig(value: Record<string, unknown>) {
  const config = isRecord(value.kpi_card) ? { ...value.kpi_card } : {}

  if (typeof value.valueField === 'string' && config.value_field === undefined) {
    config.value_field = value.valueField
  }

  if (typeof value.labelField === 'string' && config.label_field === undefined) {
    config.label_field = value.labelField
  }

  if (typeof value.prefix === 'string' && config.prefix === undefined) {
    config.prefix = value.prefix
  }

  if (typeof value.suffix === 'string' && config.suffix === undefined) {
    config.suffix = value.suffix
  }

  return Object.keys(config).length ? config : value.kpi_card
}

function normalizeGaugeCardConfig(value: Record<string, unknown>) {
  const config = isRecord(value.gauge_card) ? { ...value.gauge_card } : {}

  if (typeof value.valueField === 'string' && config.value_field === undefined) {
    config.value_field = value.valueField
  }

  if (value.min !== undefined && config.min === undefined) {
    config.min = value.min
  }

  if (value.max !== undefined && config.max === undefined) {
    config.max = value.max
  }

  if (typeof value.minField === 'string' && config.min_field === undefined) {
    config.min_field = value.minField
  }

  if (typeof value.maxField === 'string' && config.max_field === undefined) {
    config.max_field = value.maxField
  }

  if (typeof value.suffix === 'string' && config.suffix === undefined) {
    config.suffix = value.suffix
  }

  if (typeof value.color === 'string' && config.color === undefined) {
    config.color = value.color
  }

  return Object.keys(config).length ? config : value.gauge_card
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
