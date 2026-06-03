import { z } from 'zod'

export const DashboardWidgetSizeSchema = z.enum([
  'small',
  'medium',
  'large',
  'wide',
  'full',
])

export const ValueFormatSchema = z.enum([
  'number',
  'integer',
  'compact_number',
  'currency',
  'percent',
  'percent_delta',
  'number_delta',
  'currency_delta',
]).optional()

export const VariablesConfigSchema = z.record(z.string(), z.unknown())

export const ChartFieldRefSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
  format: ValueFormatSchema,
}).strict()

const RelativeDateValueSchema = z.union([
  z.object({
    now: z.literal(true),
  }).strict(),
  z.object({
    now_minus: z.string().regex(/^\d+(h|d|w|mo|y)$/),
  }).strict(),
])

const FilterValueSchema: z.ZodType = z.lazy(() => z.union([
  RelativeDateValueSchema,
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(FilterValueSchema),
  z.record(z.string(), FilterValueSchema),
]))

export const FilterExpressionSchema: z.ZodType = z.lazy(() => z.union([
  z.array(FilterExpressionSchema),
  z.object({
    and: z.array(FilterExpressionSchema),
  }).strict(),
  z.object({
    or: z.array(FilterExpressionSchema),
  }).strict(),
  z.object({
    field: z.string(),
    eq: FilterValueSchema.optional(),
    neq: FilterValueSchema.optional(),
    gt: FilterValueSchema.optional(),
    gte: FilterValueSchema.optional(),
    lt: FilterValueSchema.optional(),
    lte: FilterValueSchema.optional(),
    in: z.array(FilterValueSchema).optional(),
    not_in: z.array(FilterValueSchema).optional(),
    like: FilterValueSchema.optional(),
    ilike: FilterValueSchema.optional(),
  }).strict(),
]))

export const QueryAggregateOperationSchema = z.enum([
  'sum',
  'count',
  'count_distinct',
  'avg',
  'min',
  'max',
  'median',
])

export const QueryFieldSelectItemSchema = z.object({
  field: z.string(),
  as: z.string().optional(),
  grain: z.enum(['day', 'week', 'month', 'year']).optional(),
}).strict()

export const QueryAggregateSelectItemSchema = z.object({
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

export const QueryCalcSelectItemSchema = z.object({
  calc: z.string(),
  as: z.string(),
}).strict()

export const QuerySelectItemSchema = z.union([
  QueryFieldSelectItemSchema,
  QueryAggregateSelectItemSchema,
  QueryCalcSelectItemSchema,
])

export const QueryGroupByItemSchema = z.union([
  z.string(),
  z.object({
    field: z.string(),
    as: z.string().optional(),
    grain: z.enum(['day', 'week', 'month', 'year']).optional(),
    timezone: z.string().optional(),
  }).strict(),
])

export const QueryOrderByItemSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).optional(),
}).strict()

const BucketConfigSchema = z.object({
  field: z.string(),
  buckets: z.array(z.object({
    label: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).strict()),
}).strict()

export const QueryCalcItemSchema = z.object({
  calc: z.string(),
  as: z.string(),
}).strict()

const ResourceQueryConfigSchema = z.object({
  source: z.literal('resource').optional(),
  resource: z.string(),
  select: z.array(QuerySelectItemSchema).optional(),
  sparkline: z.object({
    field: z.string(),
    grain: z.enum(['day', 'week', 'month', 'year']),
    as: z.string(),
    fill_missing: z.record(z.string(), z.unknown()).optional(),
  }).strict().optional(),
  filters: FilterExpressionSchema.optional(),
  group_by: z.array(QueryGroupByItemSchema).optional(),
  order_by: z.array(QueryOrderByItemSchema).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  bucket: BucketConfigSchema.optional(),
  calcs: z.array(QueryCalcItemSchema).optional(),
  formatting: z.record(z.string(), z.unknown()).optional(),
}).strict()

const StepsQuerySelectStepSchema = z.object({
  name: z.string(),
  resource: z.string(),
  select: z.array(QueryAggregateSelectItemSchema).min(1),
  filters: FilterExpressionSchema.optional(),
}).strict()

export const QueryConfigSchema = z.union([
  ResourceQueryConfigSchema,
  z.object({
    source: z.literal('steps'),
    steps: z.array(StepsQuerySelectStepSchema).min(1),
    calcs: z.array(QueryCalcItemSchema).optional(),
    order_by: z.array(QueryOrderByItemSchema).optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
    formatting: z.record(z.string(), z.unknown()).optional(),
  }).strict(),
])

export const WidgetPersistedFieldsSchema = z.object({
  id: z.string(),
  group_id: z.string(),
  order: z.number(),
}).strict()

export const WidgetEditableBaseSchema = z.object({
  label: z.string().optional(),
  variables: VariablesConfigSchema.optional(),
  size: DashboardWidgetSizeSchema.optional(),
  width: z.number().positive('Width must be greater than 0').optional(),
  height: z.number().positive('Height must be greater than 0').optional(),
  min_width: z.number().nonnegative('Min width must be a non-negative number').optional(),
  max_width: z.number().nonnegative('Max width must be a non-negative number').nullable().optional(),
}).strict()

export const WidgetBaseSchema = WidgetPersistedFieldsSchema.merge(WidgetEditableBaseSchema)

export const EmptyWidgetConfigSchema = WidgetBaseSchema.extend({
  target: z.literal('empty'),
})
