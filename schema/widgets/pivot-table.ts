import { z } from 'zod'
import {
  ChartFieldRefSchema,
  QueryConfigSchema,
  ValueFormatSchema,
  WidgetBaseSchema,
} from './common.js'

export const PivotTableViewConfigSchema = z.object({
  rows: z.array(ChartFieldRefSchema).min(1),
  columns: z.array(ChartFieldRefSchema).optional(),
  values: z.array(z.object({
    field: z.string(),
    label: z.string().optional(),
    format: ValueFormatSchema,
    aggregation: z.enum(['sum', 'count', 'avg', 'min', 'max']).optional(),
  }).strict()).min(1),
}).strict()

export const PivotTableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('pivot_table'),
  pivot: PivotTableViewConfigSchema,
  query: QueryConfigSchema,
})
