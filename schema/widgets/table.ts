import { z } from 'zod'
import {
  ChartFieldRefSchema,
  QueryConfigSchema,
  WidgetBaseSchema,
} from './common.js'

export const TableViewConfigSchema = z.object({
  columns: z.array(ChartFieldRefSchema).optional(),
  pagination: z.boolean().optional(),
  page_size: z.number().int().positive().optional(),
}).strict()

export const TableWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('table'),
  table: TableViewConfigSchema.optional(),
  query: QueryConfigSchema,
})
