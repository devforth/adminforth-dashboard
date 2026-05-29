import { z } from 'zod'

export type DashboardWidgetConfigValidationError = {
  field: string
  message: string
}

const DashboardWidgetSizeSchema = z.enum([
  'small',
  'medium',
  'large',
  'wide',
  'full',
])

export const AggregationOperationZodSchema = z.enum([
  'sum',
  'count',
  'avg',
  'min',
  'max',
  'median',
])

export const AggregationRuleZodSchema = z.object({
  operation: AggregationOperationZodSchema,
  field: z.string().optional(),
}).superRefine((rule, ctx) => {
  if (rule.operation !== 'count' && !rule.field) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['field'],
      message: `field is required for ${rule.operation}`,
    })
  }
})

export const GroupByRuleZodSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('field'),
    field: z.string(),
  }),
  z.object({
    type: z.literal('date_trunc'),
    field: z.string(),
    truncation: z.enum(['day', 'week', 'month', 'year']),
    timezone: z.string().optional(),
  }),
])

export const AggregateDataSourceZodSchema = z.object({
  type: z.literal('aggregate'),
  resourceId: z.string(),
  aggregations: z.record(z.string(), AggregationRuleZodSchema),
  groupBy: GroupByRuleZodSchema.optional(),
  filters: z.unknown().optional(),
}).strict()

export const ResourceDataSourceZodSchema = z.object({
  type: z.literal('resource'),
  resourceId: z.string(),
  columns: z.array(z.string()).optional(),
  filters: z.unknown().optional(),
  sort: z.unknown().optional(),
}).strict()

export const WidgetDataSourceZodSchema = z.discriminatedUnion('type', [
  ResourceDataSourceZodSchema,
  AggregateDataSourceZodSchema,
])

const WidgetBaseSchema = z.object({
  id: z.string().optional(),
  group_id: z.string().optional(),
  label: z.string().optional(),
  size: DashboardWidgetSizeSchema.optional(),
  width: z.number().positive('Width must be greater than 0').optional(),
  height: z.number().positive('Height must be greater than 0').optional(),
  minWidth: z.number().nonnegative('Min width must be a non-negative number').optional(),
  maxWidth: z.number().nonnegative('Max width must be a non-negative number').nullable().optional(),
  order: z.number().optional(),
  dataSource: WidgetDataSourceZodSchema.optional(),
})

const ChartBaseSchema = z.object({
  title: z.string().optional(),
})

const ChartBucketSchema = z.object({
  label: z.string().min(1, 'Bucket label is required'),
  min: z.number().optional(),
  max: z.number().optional(),
})

const ChartSeriesSchema = z.object({
  name: z.string().min(1, 'Series name is required'),
  field: z.string().min(1, 'Series field is required'),
  color: z.string().optional(),
})

const LineChartSchema = ChartBaseSchema.extend({
  type: z.literal('line'),
  x_field: z.string().optional(),
  y_field: z.string().optional(),
  series_name: z.string().optional(),
  color: z.string().optional(),
})

const BarChartSchema = ChartBaseSchema.extend({
  type: z.literal('bar'),
  label_field: z.string().optional(),
  value_field: z.string().optional(),
  bucket_field: z.string().optional(),
  buckets: z.array(ChartBucketSchema).optional(),
  color: z.string().optional(),
})

const StackedBarChartSchema = ChartBaseSchema.extend({
  type: z.literal('stacked_bar'),
  x_field: z.string().optional(),
  series: z.array(ChartSeriesSchema).optional(),
  colors: z.array(z.string()).optional(),
})

const PieChartSchema = ChartBaseSchema.extend({
  type: z.literal('pie'),
  label_field: z.string().optional(),
  value_field: z.string().optional(),
  colors: z.array(z.string()).optional(),
})

const HistogramChartSchema = ChartBaseSchema.extend({
  type: z.literal('histogram'),
  label_field: z.string().optional(),
  value_field: z.string().optional(),
  bucket_field: z.string().optional(),
  buckets: z.array(ChartBucketSchema).optional(),
  color: z.string().optional(),
})

const FunnelChartSchema = ChartBaseSchema.extend({
  type: z.literal('funnel'),
  label_field: z.string().optional(),
  value_field: z.string().optional(),
  colors: z.array(z.string()).optional(),
})

export const ChartConfigSchema = z.discriminatedUnion('type', [
  LineChartSchema,
  BarChartSchema,
  StackedBarChartSchema,
  PieChartSchema,
  HistogramChartSchema,
  FunnelChartSchema,
])

export const EmptyWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('empty'),
})

const TableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('table'),
  table: z.unknown().optional(),
}).superRefine((widget, ctx) => {
  if (!widget.dataSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'Table widget must have dataSource config',
    })
  }

  if (widget.dataSource?.type === 'aggregate') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'Table widget dataSource must use resource type',
    })
  }
})

const ChartWidgetTargetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: ChartConfigSchema,
}).superRefine((widget, ctx) => {
  if (!widget.dataSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'Chart widget must have dataSource config',
    })
  }

  if (widget.dataSource?.type === 'resource') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'Chart widget dataSource must use aggregate type',
    })
  }

  if (widget.dataSource?.type === 'aggregate' && !widget.dataSource.groupBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource', 'groupBy'],
      message: 'Chart widget aggregate dataSource must define groupBy',
    })
  }
})

const KpiCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('kpi_card'),
  kpi_card: z.unknown().optional(),
}).superRefine((widget, ctx) => {
  if (!widget.dataSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'KPI card widget must have dataSource config',
    })
  }

  if (widget.dataSource?.type === 'aggregate' && widget.dataSource.groupBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource', 'groupBy'],
      message: 'KPI card aggregate dataSource must not define groupBy',
    })
  }
})

const GaugeCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('gauge_card'),
  gauge_card: z.unknown().optional(),
}).superRefine((widget, ctx) => {
  if (!widget.dataSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'Gauge card widget must have dataSource config',
    })
  }

  if (widget.dataSource?.type === 'aggregate' && widget.dataSource.groupBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource', 'groupBy'],
      message: 'Gauge card aggregate dataSource must not define groupBy',
    })
  }
})

const PivotTableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot_table: z.unknown().optional(),
}).superRefine((widget, ctx) => {
  if (!widget.dataSource) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource'],
      message: 'Pivot table widget must have dataSource config',
    })
  }

  if (widget.dataSource?.type === 'aggregate' && !widget.dataSource.groupBy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataSource', 'groupBy'],
      message: 'Pivot table aggregate dataSource must define groupBy',
    })
  }
})

export const WidgetConfigSchema = z.discriminatedUnion('target', [
  TableWidgetConfigSchema,
  ChartWidgetTargetConfigSchema,
  KpiCardWidgetConfigSchema,
  GaugeCardWidgetConfigSchema,
  PivotTableWidgetConfigSchema,
])

export const StoredWidgetConfigSchema = z.discriminatedUnion('target', [
  EmptyWidgetConfigSchema,
  TableWidgetConfigSchema,
  ChartWidgetTargetConfigSchema,
  KpiCardWidgetConfigSchema,
  GaugeCardWidgetConfigSchema,
  PivotTableWidgetConfigSchema,
])
