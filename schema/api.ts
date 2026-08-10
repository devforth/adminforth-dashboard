import { z } from 'zod'
import {
  BarChartSchema,
  FunnelChartSchema,
  GaugeCardViewConfigSchema,
  HistogramResourceQueryConfigSchema,
  HistogramChartSchema,
  KpiCardViewConfigSchema,
  LineChartSchema,
  PieChartSchema,
  PivotTableViewConfigSchema,
  QueryConfigSchema,
  StackedBarChartSchema,
  TableViewConfigSchema,
  WidgetEditableBaseSchema,
  WidgetConfigSchema,
} from './widget.js'

export const DashboardErrorResponseZodSchema = z.object({
  error: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
})

export const DashboardGroupZodSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
}).strict()

export const DashboardConfigZodSchema = z.object({
  version: z.number(),
  icon: z.string().optional(),
  groups: z.array(DashboardGroupZodSchema),
  widgets: z.array(WidgetConfigSchema),
}).strict()

export const DashboardResponseZodSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  revision: z.number(),
  config: DashboardConfigZodSchema,
})

export const DashboardApiResponseZodSchema = z.union([
  DashboardResponseZodSchema,
  DashboardErrorResponseZodSchema,
])

export const DashboardWidgetDataResponseZodSchema = z.union([
  z.object({
    widget: WidgetConfigSchema,
    data: z.unknown(),
  }),
  DashboardErrorResponseZodSchema,
])

export const SlugRequestZodSchema = z.object({
  slug: z.string(),
}).strict()

export const EditableDashboardConfigZodSchema = z.object({
  label: z.string().trim().min(1),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain lowercase letters, numbers, and hyphens only'),
  icon: z.string().trim().min(1).optional(),
}).strict()

export const SetDashboardConfigRequestZodSchema = z.object({
  slug: z.string(),
  config: EditableDashboardConfigZodSchema,
}).strict()

export const GetSlugsResponseZodSchema = z.array(z.object({
  slug: z.string(),
  label: z.string(),
}))

export const GroupIdRequestZodSchema = z.object({
  slug: z.string(),
  groupId: z.string(),
}).strict()

export const MoveGroupRequestZodSchema = z.object({
  slug: z.string(),
  groupId: z.string(),
  direction: z.enum(['up', 'down']),
}).strict()

export const EditableDashboardGroupConfigZodSchema = z.object({
  label: z.string(),
}).strict()

export const SetGroupConfigRequestZodSchema = z.object({
  slug: z.string(),
  groupId: z.string(),
  config: EditableDashboardGroupConfigZodSchema,
}).strict()

export const WidgetIdRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
}).strict()

export const WidgetDataRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }).optional(),
}).strict()

export const MoveWidgetRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
  direction: z.enum(['up', 'down']),
}).strict()

const ConfigurableTableWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('table'),
  table: TableViewConfigSchema.optional(),
  query: QueryConfigSchema,
})

const ConfigurableKpiCardWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('kpi_card'),
  card: KpiCardViewConfigSchema,
  query: QueryConfigSchema,
})

const ConfigurableGaugeCardWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('gauge_card'),
  card: GaugeCardViewConfigSchema,
  query: QueryConfigSchema,
})

const ConfigurableLineChartWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('chart'),
  chart: LineChartSchema,
  query: QueryConfigSchema,
})

const ConfigurableBarChartWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('chart'),
  chart: BarChartSchema,
  query: QueryConfigSchema,
})

const ConfigurableStackedBarChartWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('chart'),
  chart: StackedBarChartSchema,
  query: QueryConfigSchema,
})

const ConfigurablePieChartWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('chart'),
  chart: PieChartSchema,
  query: QueryConfigSchema,
})

const ConfigurableHistogramChartWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('chart'),
  chart: HistogramChartSchema,
  query: HistogramResourceQueryConfigSchema,
})

const ConfigurableFunnelChartWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('chart'),
  chart: FunnelChartSchema,
  query: QueryConfigSchema,
})

const ConfigurablePivotTableWidgetConfigSchema = WidgetEditableBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot: PivotTableViewConfigSchema,
  query: QueryConfigSchema,
})

const ConfigurableChartWidgetConfigSchema = z.union([
  ConfigurableLineChartWidgetConfigSchema,
  ConfigurableBarChartWidgetConfigSchema,
  ConfigurableStackedBarChartWidgetConfigSchema,
  ConfigurablePieChartWidgetConfigSchema,
  ConfigurableHistogramChartWidgetConfigSchema,
  ConfigurableFunnelChartWidgetConfigSchema,
])

export const ConfigurableWidgetConfigSchema = z.union([
  ConfigurableTableWidgetConfigSchema,
  ConfigurableKpiCardWidgetConfigSchema,
  ConfigurableGaugeCardWidgetConfigSchema,
  ConfigurableChartWidgetConfigSchema,
  ConfigurablePivotTableWidgetConfigSchema,
])

export const SetWidgetConfigRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
  config: ConfigurableWidgetConfigSchema,
}).strict()

function configureWidgetRequestSchema<T extends z.ZodTypeAny>(configSchema: T) {
  return z.object({
    slug: z.string(),
    widgetId: z.string(),
    config: configSchema,
  }).strict()
}

export const ConfigureTableWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableTableWidgetConfigSchema)
export const ConfigureKpiCardWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableKpiCardWidgetConfigSchema)
export const ConfigureGaugeCardWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableGaugeCardWidgetConfigSchema)
export const ConfigureLineChartWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableLineChartWidgetConfigSchema)
export const ConfigureBarChartWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableBarChartWidgetConfigSchema)
export const ConfigureStackedBarChartWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableStackedBarChartWidgetConfigSchema)
export const ConfigurePieChartWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurablePieChartWidgetConfigSchema)
export const ConfigureHistogramChartWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableHistogramChartWidgetConfigSchema)
export const ConfigureFunnelChartWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurableFunnelChartWidgetConfigSchema)
export const ConfigurePivotTableWidgetRequestZodSchema = configureWidgetRequestSchema(ConfigurablePivotTableWidgetConfigSchema)

export const DashboardMutationResponseZodSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  groupId: z.string().optional(),
  widgetId: z.string().optional(),
}).strict()
