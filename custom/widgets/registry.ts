import type { Component } from 'vue'
import type { DashboardWidgetTarget } from '../model/dashboard.types.js'
import { DEFAULT_WIDGET_HEIGHT } from './chart/chart.utils.js'
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
  // Height in px when the widget config has no `height`; without it the widget fits its content.
  // Fixed-height widgets share one value so widgets placed side by side line up.
  defaultHeight?: number
}

export const widgetRegistry: DashboardWidgetRegistration[] = [
  {
    type: 'table',
    label: 'Table',
    component: TableWidget,
    defaultHeight: DEFAULT_WIDGET_HEIGHT,
  },
  {
    type: 'chart',
    label: 'Chart',
    component: ChartWidget,
    defaultHeight: DEFAULT_WIDGET_HEIGHT,
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
    defaultHeight: DEFAULT_WIDGET_HEIGHT,
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

export function getWidgetDefaultHeight(type: DashboardWidgetType) {
  return getWidgetRegistration(type)?.defaultHeight
}

export function getWidgetLabel(type: DashboardWidgetType) {
  return getWidgetRegistration(type)?.label || type.replaceAll('_', ' ')
}
