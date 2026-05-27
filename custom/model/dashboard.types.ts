import type { ChartWidgetConfig } from '../widgets/chart/chart.types.js'

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
  minWidth?: number
  maxWidth?: number | null
}

export type DashboardWidgetConfig = {
  id: string
  group_id: string
  label?: string
  size?: DashboardWidgetSize
  minWidth?: number
  maxWidth?: number | null
  order: number
  target: DashboardWidgetTarget
  chart?: ChartWidgetConfig
  table?: unknown
  kpi_card?: unknown
  pivot_table?: unknown
  gauge_card?: unknown
  query?: unknown
}

export type DashboardWidgetTableData = {
  columns: string[]
  rows: Record<string, unknown>[]
}

export function normalizeDashboardConfig(config: unknown): DashboardConfig {
  const value = isRecord(config) ? config : {}

  return {
    version: typeof value.version === 'number' ? value.version : 1,
    groups: Array.isArray(value.groups) ? (value.groups as DashboardGroupConfig[]) : [],
    widgets: Array.isArray(value.widgets) ? (value.widgets as DashboardWidgetConfig[]) : [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
