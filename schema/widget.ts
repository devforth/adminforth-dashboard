import { z } from 'zod'
export type { DashboardWidgetConfigValidationError } from '../custom/model/dashboard.types.js'
const DashboardWidgetSizeSchema = z.enum([
  'small',
  'medium',
  'large',
  'wide',
  'full',
])

const ValueFormatSchema = z.enum([
  'number',
  'compact_number',
  'currency',
  'percent',
  'percent_delta',
  'number_delta',
  'currency_delta',
]).optional()

const ChartFieldRefSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
  format: ValueFormatSchema,
}).strict()

const FieldRefSchema = z.union([
  z.string(),
  z.object({
    field: z.string(),
    label: z.string().optional(),
    format: ValueFormatSchema,
  }).strict(),
])

const JsonValueSchema: z.ZodType = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(JsonValueSchema),
  z.record(z.string(), JsonValueSchema),
]))

const FilterExpressionSchema: z.ZodType = z.lazy(() => z.union([
  z.array(FilterExpressionSchema),
  z.object({
    and: z.array(FilterExpressionSchema),
  }).strict(),
  z.object({
    or: z.array(FilterExpressionSchema),
  }).strict(),
  z.object({
    field: z.string(),
    eq: JsonValueSchema.optional(),
    neq: JsonValueSchema.optional(),
    gt: JsonValueSchema.optional(),
    gte: JsonValueSchema.optional(),
    lt: JsonValueSchema.optional(),
    lte: JsonValueSchema.optional(),
    in: z.array(JsonValueSchema).optional(),
    not_in: z.array(JsonValueSchema).optional(),
    like: JsonValueSchema.optional(),
    ilike: JsonValueSchema.optional(),
  }).strict(),
]))

const QueryAggregateOperationSchema = z.enum([
  'sum',
  'count',
  'count_distinct',
  'avg',
  'min',
  'max',
  'median',
])

const QueryFieldSelectItemSchema = z.object({
  field: z.string(),
  as: z.string().optional(),
  grain: z.enum(['day', 'week', 'month', 'year']).optional(),
}).strict()

const QueryAggregateSelectItemSchema = z.object({
  agg: QueryAggregateOperationSchema,
  field: z.string().optional(),
  as: z.string(),
  filters: FilterExpressionSchema.optional(),
}).strict().superRefine((item, ctx) => {
  if (!['count'].includes(item.agg) && !item.field) {
    ctx.addIssue({
      code: 'custom',
      path: ['field'],
      message: `field is required for ${item.agg}`,
    })
  }
})

const QueryCalcSelectItemSchema = z.object({
  calc: z.string(),
  as: z.string(),
}).strict()

const QuerySelectItemSchema = z.union([
  QueryFieldSelectItemSchema,
  QueryAggregateSelectItemSchema,
  QueryCalcSelectItemSchema,
])

const QueryGroupByItemSchema = z.union([
  z.string(),
  z.object({
    field: z.string(),
    as: z.string().optional(),
    grain: z.enum(['day', 'week', 'month', 'year']).optional(),
    timezone: z.string().optional(),
  }).strict(),
])

const QueryOrderByItemSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).optional(),
}).strict()

const TimeSeriesConfigSchema = z.object({
  field: z.string(),
  grain: z.enum(['day', 'week', 'month', 'year']),
  timezone: z.string().optional(),
}).strict()

const PeriodConfigSchema = z.object({
  field: z.string(),
  gte: JsonValueSchema.optional(),
  lt: JsonValueSchema.optional(),
}).strict()

const BucketConfigSchema = z.object({
  field: z.string(),
  buckets: z.array(z.object({
    label: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).strict()),
}).strict()

const QueryCalcItemSchema = z.object({
  calc: z.string(),
  as: z.string(),
}).strict()

const FormattingConfigSchema = z.record(z.string(), JsonValueSchema)
const VariablesConfigSchema = z.record(z.string(), JsonValueSchema)

export const QueryConfigSchema = z.object({
  resource: z.string(),
  select: z.array(QuerySelectItemSchema).optional(),
  filters: FilterExpressionSchema.optional(),
  group_by: z.array(QueryGroupByItemSchema).optional(),
  order_by: z.array(QueryOrderByItemSchema).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  time_series: TimeSeriesConfigSchema.optional(),
  period: PeriodConfigSchema.optional(),
  bucket: BucketConfigSchema.optional(),
  calcs: z.array(QueryCalcItemSchema).optional(),
  formatting: FormattingConfigSchema.optional(),
}).strict()

const FunnelQueryStepSchema = z.object({
  name: z.string(),
  resource: z.string(),
  metric: QueryAggregateSelectItemSchema,
  filters: FilterExpressionSchema.optional(),
}).strict()

export const FunnelQueryConfigSchema = z.object({
  steps: z.array(FunnelQueryStepSchema).min(1),
  calcs: z.array(QueryCalcItemSchema).optional(),
}).strict()

const EditableWidgetBaseSchema = z.object({
  label: z.string().optional(),
  variables: VariablesConfigSchema.optional(),
  size: DashboardWidgetSizeSchema.optional(),
  width: z.number().positive('Width must be greater than 0').optional(),
  height: z.number().positive('Height must be greater than 0').optional(),
  min_width: z.number().nonnegative('Min width must be a non-negative number').optional(),
  max_width: z.number().nonnegative('Max width must be a non-negative number').nullable().optional(),
}).strict()

const StoredWidgetBaseSchema = EditableWidgetBaseSchema.extend({
  id: z.string(),
  group_id: z.string(),
  order: z.number(),
})

const TableViewConfigSchema = z.object({
  columns: z.array(FieldRefSchema).optional(),
  pagination: z.boolean().optional(),
  page_size: z.number().int().positive().optional(),
}).strict()

const ChartBaseSchema = z.object({
  title: z.string().optional(),
}).strict()

const ChartBucketSchema = z.object({
  label: z.string().min(1, 'Bucket label is required'),
  min: z.number().optional(),
  max: z.number().optional(),
}).strict()

const ChartSeriesRefSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
}).strict()

const LineChartSchema = ChartBaseSchema.extend({
  type: z.literal('line'),
  x: ChartFieldRefSchema,
  y: z.array(ChartFieldRefSchema).min(1),
  series: ChartSeriesRefSchema.optional(),
  color: z.string().optional(),
  colors: z.array(z.string()).optional(),
})

const BarChartSchema = ChartBaseSchema.extend({
  type: z.literal('bar'),
  x: ChartFieldRefSchema,
  y: ChartFieldRefSchema,
  color: z.string().optional(),
})

const StackedBarChartSchema = ChartBaseSchema.extend({
  type: z.literal('stacked_bar'),
  x: ChartFieldRefSchema,
  y: z.union([ChartFieldRefSchema, z.array(ChartFieldRefSchema).min(1)]),
  series: ChartSeriesRefSchema.optional(),
  colors: z.array(z.string()).optional(),
})

const PieChartSchema = ChartBaseSchema.extend({
  type: z.literal('pie'),
  label: ChartFieldRefSchema,
  value: ChartFieldRefSchema,
  colors: z.array(z.string()).optional(),
})

const HistogramChartSchema = ChartBaseSchema.extend({
  type: z.literal('histogram'),
  x: ChartFieldRefSchema,
  y: ChartFieldRefSchema,
  buckets: z.array(ChartBucketSchema).optional(),
  color: z.string().optional(),
})

const FunnelChartSchema = ChartBaseSchema.extend({
  type: z.literal('funnel'),
  label: ChartFieldRefSchema.optional(),
  value: ChartFieldRefSchema.optional(),
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

const KpiCardViewConfigSchema = z.object({
  title: z.string().optional(),
  value: z.object({
    field: z.string(),
    format: ValueFormatSchema,
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }).strict(),
  subtitle: z.object({
    text: z.string().optional(),
    field: z.string().optional(),
  }).strict().optional(),
  comparison: JsonValueSchema.optional(),
  sparkline: JsonValueSchema.optional(),
}).strict()

const GaugeCardViewConfigSchema = z.object({
  title: z.string().optional(),
  value: z.object({
    field: z.string(),
    format: ValueFormatSchema,
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  }).strict(),
  target: z.object({
    value: z.number().optional(),
    field: z.string().optional(),
    label: z.string().optional(),
  }).strict().optional(),
  progress: z.object({
    value_field: z.string(),
    target_value: z.number().optional(),
    target_field: z.string().optional(),
    format: ValueFormatSchema,
  }).strict().optional(),
  color: z.string().optional(),
}).strict()

const PivotTableViewConfigSchema = z.object({
  rows: z.array(FieldRefSchema).min(1),
  columns: z.array(FieldRefSchema).optional(),
  values: z.array(z.object({
    field: z.string(),
    label: z.string().optional(),
    format: ValueFormatSchema,
    aggregation: z.enum(['sum', 'count', 'avg', 'min', 'max']).optional(),
  }).strict()).min(1),
}).strict()

const EditableEmptyWidgetConfigSchema = EditableWidgetBaseSchema.extend({
  target: z.literal('empty'),
})

export const EmptyWidgetConfigSchema = StoredWidgetBaseSchema.extend({
  target: z.literal('empty'),
})

const EditableTableWidgetConfigSchema = EditableWidgetBaseSchema.extend({
  target: z.literal('table'),
  table: TableViewConfigSchema.optional(),
  query: QueryConfigSchema,
})

const TableWidgetConfigSchema = StoredWidgetBaseSchema.extend({
  target: z.literal('table'),
  table: TableViewConfigSchema.optional(),
  query: QueryConfigSchema,
})

const EditableChartWidgetTargetConfigSchema = EditableWidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: ChartConfigSchema,
  query: z.union([QueryConfigSchema, FunnelQueryConfigSchema]),
}).superRefine((widget, ctx) => {
  const isFunnelChart = widget.chart.type === 'funnel'
  const isFunnelQuery = 'steps' in widget.query

  if (isFunnelChart && !isFunnelQuery) {
    ctx.addIssue({
      code: 'custom',
      path: ['query'],
      message: 'Funnel charts must use steps query',
    })
  }
})

const ChartWidgetTargetConfigSchema = StoredWidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: ChartConfigSchema,
  query: z.union([QueryConfigSchema, FunnelQueryConfigSchema]),
}).superRefine((widget, ctx) => {
  const isFunnelChart = widget.chart.type === 'funnel'
  const isFunnelQuery = 'steps' in widget.query

  if (isFunnelChart && !isFunnelQuery) {
    ctx.addIssue({
      code: 'custom',
      path: ['query'],
      message: 'Funnel charts must use steps query',
    })
  }
})

const EditableKpiCardWidgetConfigSchema = EditableWidgetBaseSchema.extend({
  target: z.literal('kpi_card'),
  card: KpiCardViewConfigSchema,
  query: QueryConfigSchema,
})

const KpiCardWidgetConfigSchema = StoredWidgetBaseSchema.extend({
  target: z.literal('kpi_card'),
  card: KpiCardViewConfigSchema,
  query: QueryConfigSchema,
})

const EditableGaugeCardWidgetConfigSchema = EditableWidgetBaseSchema.extend({
  target: z.literal('gauge_card'),
  card: GaugeCardViewConfigSchema,
  query: QueryConfigSchema,
})

const GaugeCardWidgetConfigSchema = StoredWidgetBaseSchema.extend({
  target: z.literal('gauge_card'),
  card: GaugeCardViewConfigSchema,
  query: QueryConfigSchema,
})

const EditablePivotTableWidgetConfigSchema = EditableWidgetBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot: PivotTableViewConfigSchema,
  query: QueryConfigSchema,
})

const PivotTableWidgetConfigSchema = StoredWidgetBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot: PivotTableViewConfigSchema,
  query: QueryConfigSchema,
})

export const EditableDashboardWidgetConfigSchema = z.discriminatedUnion('target', [
  EditableEmptyWidgetConfigSchema,
  EditableTableWidgetConfigSchema,
  EditableChartWidgetTargetConfigSchema,
  EditableKpiCardWidgetConfigSchema,
  EditableGaugeCardWidgetConfigSchema,
  EditablePivotTableWidgetConfigSchema,
])

export const WidgetConfigSchema = z.discriminatedUnion('target', [
  EditableTableWidgetConfigSchema,
  EditableChartWidgetTargetConfigSchema,
  EditableKpiCardWidgetConfigSchema,
  EditableGaugeCardWidgetConfigSchema,
  EditablePivotTableWidgetConfigSchema,
])

export const StoredWidgetConfigSchema = z.discriminatedUnion('target', [
  EmptyWidgetConfigSchema,
  TableWidgetConfigSchema,
  ChartWidgetTargetConfigSchema,
  KpiCardWidgetConfigSchema,
  GaugeCardWidgetConfigSchema,
  PivotTableWidgetConfigSchema,
])
