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
    eq: z.unknown().optional(),
    neq: z.unknown().optional(),
    gt: z.unknown().optional(),
    gte: z.unknown().optional(),
    lt: z.unknown().optional(),
    lte: z.unknown().optional(),
    in: z.array(z.unknown()).optional(),
    not_in: z.array(z.unknown()).optional(),
    like: z.unknown().optional(),
    ilike: z.unknown().optional(),
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
  grain: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional(),
}).strict()

const QueryAggregateSelectItemSchema = z.object({
  agg: QueryAggregateOperationSchema,
  field: z.string().optional(),
  as: z.string(),
  filters: FilterExpressionSchema.optional(),
}).strict().superRefine((item, ctx) => {
  if (!['count'].includes(item.agg) && !item.field) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
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
    grain: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional(),
    timezone: z.string().optional(),
  }).strict(),
])

const QueryOrderByItemSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).optional(),
}).strict()

const TimeSeriesConfigSchema = z.object({
  field: z.string(),
  grain: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']),
  timezone: z.string().optional(),
}).strict()

const PeriodConfigSchema = z.object({
  field: z.string(),
  gte: z.unknown().optional(),
  lt: z.unknown().optional(),
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

const FormattingConfigSchema = z.record(z.string(), z.unknown())
const VariablesConfigSchema = z.record(z.string(), z.unknown())

export const QueryConfigSchema = z.object({
  resource: z.string(),
  select: z.array(QuerySelectItemSchema).optional(),
  filters: FilterExpressionSchema.optional(),
  groupBy: z.array(QueryGroupByItemSchema).optional(),
  orderBy: z.array(QueryOrderByItemSchema).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  timeSeries: TimeSeriesConfigSchema.optional(),
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

const WidgetBaseSchema = z.object({
  id: z.string().optional(),
  group_id: z.string().optional(),
  label: z.string().optional(),
  variables: VariablesConfigSchema.optional(),
  size: DashboardWidgetSizeSchema.optional(),
  width: z.number().positive('Width must be greater than 0').optional(),
  height: z.number().positive('Height must be greater than 0').optional(),
  minWidth: z.number().nonnegative('Min width must be a non-negative number').optional(),
  maxWidth: z.number().nonnegative('Max width must be a non-negative number').nullable().optional(),
  order: z.number().optional(),
})

const TableViewConfigSchema = z.object({
  columns: z.array(FieldRefSchema).optional(),
  pagination: z.boolean().optional(),
  pageSize: z.number().int().positive().optional(),
}).strict()

const ChartBaseSchema = z.object({
  title: z.string().optional(),
})

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
  comparison: z.unknown().optional(),
  sparkline: z.unknown().optional(),
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
    valueField: z.string(),
    targetValue: z.number().optional(),
    targetField: z.string().optional(),
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

export const EmptyWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('empty'),
})

const TableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('table'),
  table: TableViewConfigSchema.optional(),
  query: QueryConfigSchema,
})

const ChartWidgetTargetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: ChartConfigSchema,
  query: z.union([QueryConfigSchema, FunnelQueryConfigSchema]),
}).superRefine((widget, ctx) => {
  const isFunnelChart = widget.chart.type === 'funnel'
  const isFunnelQuery = 'steps' in widget.query

  if (isFunnelChart && !isFunnelQuery) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['query'],
      message: 'Funnel charts must use steps query',
    })
  }
})

const KpiCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('kpi_card'),
  card: KpiCardViewConfigSchema,
  query: QueryConfigSchema,
})

const GaugeCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('gauge_card'),
  card: GaugeCardViewConfigSchema,
  query: QueryConfigSchema,
})

const PivotTableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot: PivotTableViewConfigSchema,
  query: QueryConfigSchema,
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
