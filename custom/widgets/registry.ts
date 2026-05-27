import type { DashboardWidgetTarget } from '../model/dashboard.types.js'

export type DashboardWidgetType = DashboardWidgetTarget

export type DashboardWidgetRegistration = {
  type: DashboardWidgetType
  label: string
}

export const widgetRegistry: DashboardWidgetRegistration[] = [
  {
    type: 'table',
    label: 'Table',
  },
  {
    type: 'chart',
    label: 'Chart',
  },
  {
    type: 'kpi_card',
    label: 'KPI Card',
  },
  {
    type: 'pivot_table',
    label: 'Pivot Table',
  },
  {
    type: 'gauge_card',
    label: 'Gauge Card',
  },
]
