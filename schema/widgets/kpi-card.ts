import { z } from 'zod'
import {
  QueryConfigSchema,
  ValueFormatSchema,
  WidgetBaseSchema,
} from './common.js'

export const KpiCardViewConfigSchema = z.object({
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
  comparison: z.object({
    field: z.string(),
    format: ValueFormatSchema,
    positive_is_good: z.boolean().optional(),
    compact: z.object({
      show: z.boolean().optional(),
      template: z.string().optional(),
    }).strict().optional(),
    tooltip: z.object({
      label: z.string().optional(),
      template: z.string().optional(),
    }).strict().optional(),
  }).strict().optional(),
  sparkline: z.object({
    type: z.enum(['line']).optional(),
    field: z.string(),
    x: z.string(),
    show_axes: z.boolean().optional(),
    show_labels: z.boolean().optional(),
    fill: z.object({
      type: z.enum(['gradient', 'solid']).optional(),
    }).strict().optional(),
  }).strict().optional(),
}).strict()

export const KpiCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('kpi_card'),
  card: KpiCardViewConfigSchema,
  query: QueryConfigSchema,
})
