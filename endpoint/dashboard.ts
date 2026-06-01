import type { IHttpServer } from 'adminforth';
import { DashboardApiResponseSchema, SlugRequestSchema } from '../schema/api.js';
import type { DashboardRecord } from '../services/dashboardConfigService.js';
import { buildDashboardResponse } from '../services/dashboardConfigService.js';

type DashboardEndpointsContext = {
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
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
      const slug = String(body?.slug || 'default');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      return buildDashboardResponse(dashboard);
    },
  });
}
