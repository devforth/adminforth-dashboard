import { z } from 'zod'
import {
  QueryConfigSchema,
  ValueFormatSchema,
  WidgetBaseSchema,
} from './common.js'

export const GaugeCardViewConfigSchema = z.object({
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

export const GaugeCardWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('gauge_card'),
  card: GaugeCardViewConfigSchema,
  query: QueryConfigSchema,
})
