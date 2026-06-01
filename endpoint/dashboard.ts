import type { AdminUser, IHttpServer } from 'adminforth';
import { normalizeDashboardConfig } from '../custom/model/dashboard.types.js';
import type { DashboardConfig, DashboardWidgetConfig } from '../custom/model/dashboard.types.js';
import {
  DashboardApiResponseSchema,
  DashboardConfigZodSchema,
  SetDashboardConfigRequestSchema,
  SlugRequestSchema,
} from '../schema/api.js';
import type { DashboardWidgetConfigValidationError } from '../schema/widget.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';
import { buildDashboardResponse } from '../services/dashboardConfigService.js';

type DashboardEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  validateDashboardWidgetApiConfig: (
    widget: DashboardWidgetConfig,
  ) => DashboardWidgetConfigValidationError[];
};

function formatDashboardConfigValidationErrors(error: { issues: { path: PropertyKey[], message: string }[] }) {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.map(String).join('.') : 'config',
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
      const slug = String(body?.slug || 'default');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      return buildDashboardResponse(dashboard);
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

      const slug = String(body?.slug || 'default');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const normalizedConfig = normalizeDashboardConfig(body?.config);
      const parsedConfig = DashboardConfigZodSchema.safeParse(normalizedConfig);

      if (!parsedConfig.success) {
        response.setStatus(422);
        return {
          error: 'Invalid dashboard config',
          validationErrors: formatDashboardConfigValidationErrors(parsedConfig.error),
        };
      }

      const widgetValidationErrors = parsedConfig.data.widgets.flatMap((widget, index) => (
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

      return ctx.persistDashboardConfig(dashboard, parsedConfig.data as DashboardConfig);
    },
  });
}
