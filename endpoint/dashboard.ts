import type { AdminUser, IHttpServer } from 'adminforth';
import { z } from 'zod';
import type { DashboardConfig, EditableDashboardConfig } from '../custom/model/dashboard.types.js';
import {
  GetSlugsResponseZodSchema,
  SetDashboardConfigRequestZodSchema,
  SlugRequestZodSchema,
} from '../schema/api.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';

type DashboardEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  getAllDashboardRecords: () => Promise<DashboardRecord[]>;
  parseStoredDashboardConfig: (config: unknown) => DashboardConfig;
  updateDashboardDetails: (
    slug: string,
    details: EditableDashboardConfig,
  ) => Promise<PersistedDashboardResponse | 'slug-exists' | null>;
};

export function registerDashboardEndpoints(
  server: IHttpServer,
  ctx: DashboardEndpointsContext,
) {
  server.endpoint({
    method: 'POST',
    path: '/dashboard/set_dashboard_config',
    agent: {
      isDangerous: true,
    },
    description: 'Updates a dashboard label, slug, and sidebar icon. Available to configured dashboard editor roles.',
    request_schema: SetDashboardConfigRequestZodSchema,
    response_schema: z.unknown(),
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { error: 'Dashboard edit is not allowed' };
      }

      const updatedDashboard = await ctx.updateDashboardDetails(body.slug, body.config);

      if (!updatedDashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      if (updatedDashboard === 'slug-exists') {
        response.setStatus(409);
        return { error: 'A dashboard with this slug already exists' };
      }

      return updatedDashboard;
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/get-config',
    description: 'Loads one dashboard configuration by slug for rendering or editing.',
    request_schema: SlugRequestZodSchema,
    response_schema: z.unknown(),
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
    response_schema: GetSlugsResponseZodSchema,
    handler: async () => {
      const dashboards = await ctx.getAllDashboardRecords();
      return dashboards.map((dashboard) => ({
        slug: dashboard.slug,
        label: dashboard.label,
      }));
    },
  });
}
