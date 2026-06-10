import { z } from 'zod'
import {
  ChartFieldRefSchema,
  HistogramResourceQueryConfigSchema,
  QueryConfigSchema,
  WidgetBaseSchema,
} from './common.js'

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

export const LineChartSchema = ChartBaseSchema.extend({
  type: z.literal('line'),
  x: ChartFieldRefSchema,
  y: z.array(ChartFieldRefSchema).min(1),
  series: ChartSeriesRefSchema.optional(),
  color: z.string().optional(),
  colors: z.array(z.string()).optional(),
})

export const BarChartSchema = ChartBaseSchema.extend({
  type: z.literal('bar'),
  x: ChartFieldRefSchema,
  y: ChartFieldRefSchema,
  color: z.string().optional(),
})

export const StackedBarChartSchema = ChartBaseSchema.extend({
  type: z.literal('stacked_bar'),
  x: ChartFieldRefSchema,
  y: z.union([ChartFieldRefSchema, z.array(ChartFieldRefSchema).min(1)]),
  series: ChartSeriesRefSchema.optional(),
  colors: z.array(z.string()).optional(),
})

export const PieChartSchema = ChartBaseSchema.extend({
  type: z.literal('pie'),
  label: ChartFieldRefSchema,
  value: ChartFieldRefSchema,
  colors: z.array(z.string()).optional(),
})

export const HistogramChartSchema = ChartBaseSchema.extend({
  type: z.literal('histogram'),
  x: ChartFieldRefSchema,
  y: ChartFieldRefSchema,
  buckets: z.array(ChartBucketSchema).optional(),
  color: z.string().optional(),
})

export const FunnelChartSchema = ChartBaseSchema.extend({
  type: z.literal('funnel'),
  label: ChartFieldRefSchema.optional(),
  value: ChartFieldRefSchema.optional(),
  colors: z.array(z.string()).optional(),
})

export const LineChartWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: LineChartSchema,
  query: QueryConfigSchema,
})

export const BarChartWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: BarChartSchema,
  query: QueryConfigSchema,
})

export const StackedBarChartWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: StackedBarChartSchema,
  query: QueryConfigSchema,
})

export const PieChartWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: PieChartSchema,
  query: QueryConfigSchema,
})

export const HistogramChartWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: HistogramChartSchema,
  query: HistogramResourceQueryConfigSchema,
})

export const FunnelChartWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('chart'),
  chart: FunnelChartSchema,
  query: QueryConfigSchema,
})

export const ChartWidgetTargetConfigSchema = z.union([
  LineChartWidgetConfigSchema,
  BarChartWidgetConfigSchema,
  StackedBarChartWidgetConfigSchema,
  PieChartWidgetConfigSchema,
  HistogramChartWidgetConfigSchema,
  FunnelChartWidgetConfigSchema,
])
