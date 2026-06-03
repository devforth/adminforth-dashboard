import type { Component } from 'vue'
import type { DashboardWidgetTarget } from '../model/dashboard.types.js'
import ChartWidget from './chart/ChartWidget.vue'
import GaugeCardWidget from './GaugeCardWidget.vue'
import KpiCardWidget from './KpiCardWidget.vue'
import PivotTableWidget from './PivotTableWidget.vue'
import TableWidget from './TableWidget.vue'

export type DashboardWidgetType = DashboardWidgetTarget

export type DashboardWidgetRegistration = {
  type: DashboardWidgetType
  label: string
  component?: Component
}

export const widgetRegistry: DashboardWidgetRegistration[] = [
  {
    type: 'table',
    label: 'Table',
    component: TableWidget,
  },
  {
    type: 'chart',
    label: 'Chart',
    component: ChartWidget,
  },
  {
    type: 'kpi_card',
    label: 'KPI Card',
    component: KpiCardWidget,
  },
  {
    type: 'pivot_table',
    label: 'Pivot Table',
    component: PivotTableWidget,
  },
  {
    type: 'gauge_card',
    label: 'Gauge Card',
    component: GaugeCardWidget,
  },
]

export function getWidgetRegistration(type: DashboardWidgetType) {
  return widgetRegistry.find((widget) => widget.type === type)
}

export function getWidgetLabel(type: DashboardWidgetType) {
  return getWidgetRegistration(type)?.label || type.replaceAll('_', ' ')
}
