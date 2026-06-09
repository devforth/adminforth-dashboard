import { z } from 'zod'
export type { DashboardWidgetConfigValidationError } from '../custom/model/dashboard.types.js'
export {
  BarChartWidgetConfigSchema,
  ChartWidgetTargetConfigSchema,
  BarChartSchema,
  FunnelChartWidgetConfigSchema,
  FunnelChartSchema,
  HistogramChartSchema,
  HistogramChartWidgetConfigSchema,
  LineChartWidgetConfigSchema,
  LineChartSchema,
  PieChartSchema,
  PieChartWidgetConfigSchema,
  StackedBarChartSchema,
  StackedBarChartWidgetConfigSchema,
} from './widgets/charts.js'
export {
  GaugeCardWidgetConfigSchema,
  GaugeCardViewConfigSchema,
} from './widgets/gauge-card.js'
export {
  KpiCardViewConfigSchema,
  KpiCardWidgetConfigSchema,
} from './widgets/kpi-card.js'
export {
  PivotTableViewConfigSchema,
  PivotTableWidgetConfigSchema,
} from './widgets/pivot-table.js'
export {
  TableViewConfigSchema,
  TableWidgetConfigSchema,
} from './widgets/table.js'
export {
  EmptyWidgetConfigSchema,
  HistogramResourceQueryConfigSchema,
  QueryConfigSchema,
  ResourceQueryConfigSchema,
  WidgetEditableBaseSchema,
} from './widgets/common.js'
import { ChartWidgetTargetConfigSchema } from './widgets/charts.js'
import { GaugeCardWidgetConfigSchema } from './widgets/gauge-card.js'
import { KpiCardWidgetConfigSchema } from './widgets/kpi-card.js'
import { PivotTableWidgetConfigSchema } from './widgets/pivot-table.js'
import { TableWidgetConfigSchema } from './widgets/table.js'
import { EmptyWidgetConfigSchema } from './widgets/common.js'

export const WidgetConfigSchema = z.union([
  EmptyWidgetConfigSchema,
  TableWidgetConfigSchema,
  ChartWidgetTargetConfigSchema,
  KpiCardWidgetConfigSchema,
  GaugeCardWidgetConfigSchema,
  PivotTableWidgetConfigSchema,
])
