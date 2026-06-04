import type { IHttpServer } from 'adminforth';
import type { DashboardConfig } from '../custom/model/dashboard.types.js';
import {
  DashboardApiResponseSchema,
  GetSlugsResponseSchema,
  SlugRequestSchema,
} from '../schema/api.js';
import type { DashboardRecord } from '../services/dashboardConfigService.js';

type DashboardEndpointsContext = {
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  getAllDashboardRecords: () => Promise<DashboardRecord[]>;
  parseStoredDashboardConfig: (config: unknown) => DashboardConfig;
};

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
    method: 'GET',
    path: '/dashboard/get-slugs',
    description: 'Returns a list of all dashboard slugs and labels for listing purposes.',
    request_schema: undefined,
    response_schema: GetSlugsResponseSchema,
    handler: async () => {
      const dashboards = await ctx.getAllDashboardRecords();
      return dashboards.map((dashboard) => ({
        slug: dashboard.slug,
        label: dashboard.label,
      }));
    },
  });
}
