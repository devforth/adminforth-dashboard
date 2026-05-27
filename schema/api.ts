import { z } from 'zod'
import { StoredWidgetConfigSchema, WidgetConfigSchema } from './widget.js'

export const DashboardErrorResponseSchema = z.object({
  error: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
})

export const DashboardGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
}).loose()

export const DashboardConfigSchema = z.object({
  version: z.number(),
  groups: z.array(DashboardGroupSchema),
  widgets: z.array(StoredWidgetConfigSchema),
})

export const DashboardResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  revision: z.number(),
  config: DashboardConfigSchema,
})

export const DashboardApiResponseSchema = z.union([
  DashboardResponseSchema,
  DashboardErrorResponseSchema,
])

export const DashboardWidgetDataResponseSchema = z.union([
  z.object({
    widget: StoredWidgetConfigSchema,
    data: z.unknown(),
  }),
  DashboardErrorResponseSchema,
])

export const SlugRequestSchema = z.object({
  slug: z.string().optional(),
}).strict()

export const GroupIdRequestSchema = z.object({
  slug: z.string().optional(),
  groupId: z.string(),
}).strict()

export const MoveGroupRequestSchema = z.object({
  slug: z.string().optional(),
  groupId: z.string(),
  direction: z.enum(['up', 'down']),
}).strict()

export const SetGroupConfigRequestSchema = z.object({
  slug: z.string().optional(),
  groupId: z.string(),
  config: DashboardGroupSchema,
}).strict()

export const WidgetIdRequestSchema = z.object({
  slug: z.string().optional(),
  widgetId: z.string(),
}).strict()

export const MoveWidgetRequestSchema = z.object({
  slug: z.string().optional(),
  widgetId: z.string(),
  direction: z.enum(['up', 'down']),
}).strict()

export const SetWidgetConfigRequestSchema = z.object({
  slug: z.string().optional(),
  widgetId: z.string(),
  config: WidgetConfigSchema,
}).strict()
