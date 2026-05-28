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

export const DashboardWidgetQuerySchema = z.object({
  resource: z.string().min(1, 'Query resource must be a non-empty string'),
  select: z.array(z.string()).optional(),
  order: z.object({
    field: z.string().min(1, 'Order field is required'),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
  limit: z.number().optional(),
})

export const EmptyWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('empty'),
})

const TableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('table'),
  table: z.unknown().optional(),
  query: DashboardWidgetQuerySchema.optional(),
})

const ChartWidgetTargetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: ChartConfigSchema,
  query: DashboardWidgetQuerySchema,
})

const KpiCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('kpi_card'),
  kpi_card: z.unknown().optional(),
  query: DashboardWidgetQuerySchema.optional(),
})

const GaugeCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('gauge_card'),
  gauge_card: z.unknown().optional(),
  query: DashboardWidgetQuerySchema.optional(),
})

const PivotTableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot_table: z.unknown().optional(),
  query: DashboardWidgetQuerySchema.optional(),
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
