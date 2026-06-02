import type { AdminUser, IHttpServer } from 'adminforth';
import { ZodError } from 'zod';
import type { DashboardConfig, DashboardWidgetConfig } from '../custom/model/dashboard.types.js';
import { toInternalDashboardConfigShape } from '../custom/model/dashboardConfigFormat.js';
import {
  DashboardApiResponseSchema,
  DashboardConfigZodSchema,
  SetDashboardConfigRequestSchema,
  SlugRequestSchema,
} from '../schema/api.js';
import type { DashboardWidgetConfigValidationError } from '../schema/widget.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';

type DashboardEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: (config: unknown) => DashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  validateDashboardWidgetApiConfig: (
    widget: DashboardWidgetConfig,
  ) => DashboardWidgetConfigValidationError[];
};

function normalizeZodValidationErrors(error: ZodError, fieldPrefix = 'config') {
  return error.issues.map((issue) => ({
    field: issue.path.length ? `${fieldPrefix}.${issue.path.join('.')}` : fieldPrefix,
    message: issue.message,
  }));
}

export function registerDashboardEndpoints(
  server: IHttpServer,
  ctx: DashboardEndpointsContext,
) {
  server.endpoint({
    method: 'POST',
    path: '/dashboard/get-config',
    description: 'Loads one dashboard configuration by slug for rendering or editing.',
    request_schema: SlugRequestSchema,
    response_schema: DashboardApiResponseSchema,
    handler: async ({ body, response }) => {
      const dashboard = await ctx.getDashboardRecord(body.slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      return {
        id: dashboard.id,
        slug: dashboard.slug,
        label: dashboard.label,
        revision: dashboard.revision,
        config: ctx.parseStoredDashboardConfig(dashboard.config),
      };
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/set_dashboard_config',
    description: 'Replaces one dashboard configuration, including groups and widgets. Superadmin only.',
    request_schema: SetDashboardConfigRequestSchema,
    response_schema: DashboardApiResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { error: 'Dashboard edit is not allowed' };
      }

      const dashboard = await ctx.getDashboardRecord(body.slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      let config: DashboardConfig;

      try {
        config = DashboardConfigZodSchema.parse(
          toInternalDashboardConfigShape(body.config),
        ) as DashboardConfig;
      } catch (error) {
        if (error instanceof ZodError) {
          response.setStatus(422);
          return {
            error: 'Invalid dashboard config',
            validationErrors: normalizeZodValidationErrors(error),
          };
        }

        throw error;
      }

      const widgetValidationErrors = config.widgets.flatMap((widget, index) => (
        ctx.validateDashboardWidgetApiConfig(widget as DashboardWidgetConfig).map((error) => ({
          ...error,
          field: `widgets.${index}.${error.field}`,
        }))
      ));

      if (widgetValidationErrors.length) {
        response.setStatus(422);
        return {
          error: 'Invalid dashboard config',
          validationErrors: widgetValidationErrors,
        };
      }

      return ctx.persistDashboardConfig(dashboard, config);
    },
  });
}
