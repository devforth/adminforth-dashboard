import { toJSONSchema, z } from 'zod'
import { EditableDashboardWidgetConfigSchema, StoredWidgetConfigSchema } from './widget.js'

function toAdminForthJsonSchema(schema: z.ZodType) {
  return toJSONSchema(schema, { target: 'draft-7' })
}

export const DashboardErrorResponseZodSchema = z.object({
  error: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
})

export const DashboardGroupZodSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
})

export const DashboardConfigZodSchema = z.object({
  version: z.number(),
  groups: z.array(DashboardGroupZodSchema),
  widgets: z.array(StoredWidgetConfigSchema),
})

export const DashboardResponseZodSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  revision: z.number(),
  config: DashboardConfigZodSchema,
})

export const DashboardApiResponseZodSchema = z.union([
  DashboardResponseZodSchema,
  DashboardErrorResponseZodSchema,
])

export const DashboardWidgetDataResponseZodSchema = z.union([
  z.object({
    widget: StoredWidgetConfigSchema,
    data: z.unknown(),
  }),
  DashboardErrorResponseZodSchema,
])

export const SlugRequestZodSchema = z.object({
  slug: z.string(),
}).strict()

export const SetDashboardConfigRequestZodSchema = z.object({
  slug: z.string(),
  config: DashboardConfigZodSchema,
}).strict()

export const GroupIdRequestZodSchema = z.object({
  slug: z.string(),
  groupId: z.string(),
}).strict()

export const MoveGroupRequestZodSchema = z.object({
  slug: z.string(),
  groupId: z.string(),
  direction: z.enum(['up', 'down']),
}).strict()

export const EditableDashboardGroupConfigZodSchema = z.object({
  label: z.string(),
}).strict()

export const SetGroupConfigRequestZodSchema = z.object({
  slug: z.string(),
  groupId: z.string(),
  config: EditableDashboardGroupConfigZodSchema,
}).strict()

export const WidgetIdRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
}).strict()

export const WidgetDataRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }).optional(),
}).strict()

export const MoveWidgetRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
  direction: z.enum(['up', 'down']),
}).strict()

export const SetWidgetConfigRequestZodSchema = z.object({
  slug: z.string(),
  widgetId: z.string(),
  config: EditableDashboardWidgetConfigSchema,
}).strict()

export const DashboardErrorResponseSchema = toAdminForthJsonSchema(DashboardErrorResponseZodSchema)
export const DashboardGroupSchema = toAdminForthJsonSchema(DashboardGroupZodSchema)
export const DashboardConfigSchema = toAdminForthJsonSchema(DashboardConfigZodSchema)
export const DashboardResponseSchema = toAdminForthJsonSchema(DashboardResponseZodSchema)
export const DashboardApiResponseSchema = toAdminForthJsonSchema(DashboardApiResponseZodSchema)
export const DashboardWidgetDataResponseSchema = toAdminForthJsonSchema(DashboardWidgetDataResponseZodSchema)
export const SlugRequestSchema = toAdminForthJsonSchema(SlugRequestZodSchema)
export const SetDashboardConfigRequestSchema = toAdminForthJsonSchema(SetDashboardConfigRequestZodSchema)
export const GroupIdRequestSchema = toAdminForthJsonSchema(GroupIdRequestZodSchema)
export const MoveGroupRequestSchema = toAdminForthJsonSchema(MoveGroupRequestZodSchema)
export const SetGroupConfigRequestSchema = toAdminForthJsonSchema(SetGroupConfigRequestZodSchema)
export const WidgetIdRequestSchema = toAdminForthJsonSchema(WidgetIdRequestZodSchema)
export const WidgetDataRequestSchema = toAdminForthJsonSchema(WidgetDataRequestZodSchema)
export const MoveWidgetRequestSchema = toAdminForthJsonSchema(MoveWidgetRequestZodSchema)
export const SetWidgetConfigRequestSchema = toAdminForthJsonSchema(SetWidgetConfigRequestZodSchema)
