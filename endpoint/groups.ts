import type { AdminUser, IHttpServer } from 'adminforth';
import { randomUUID } from 'crypto';
import type {
  DashboardConfig,
  DashboardGroupConfig,
} from '../custom/model/dashboard.types.js';
import {
  DashboardApiResponseSchema,
  GroupIdRequestSchema,
  MoveGroupRequestSchema,
  SetGroupConfigRequestSchema,
  SlugRequestSchema,
} from '../schema/api.js';
import { parseStoredDashboardConfig, buildDashboardResponse } from '../services/dashboardConfigService.js';

type DashboardRecord = {
  id: string;
  slug: string;
  label: string;
  revision: number;
  config: string;
};

type GroupEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: (config: string) => DashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<{
    id: string;
    slug: string;
    label: string;
    revision: number;
    config: DashboardConfig;
  }>;
  buildDashboardResponse: (dashboard: DashboardRecord) => {
    id: string;
    slug: string;
    label: string;
    revision: number;
    config: DashboardConfig;
  };
};

export function registerGroupEndpoints(
  server: IHttpServer,
  ctx: GroupEndpointsContext,
) {
  server.endpoint({
    method: 'POST',
    path: '/dashboard/add_dashboard_group',
    description: 'Adds a new group to a dashboard configuration. Superadmin only.',
    request_schema: SlugRequestSchema,
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

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const nextOrder = config.groups.length + 1;

      const group: DashboardGroupConfig = {
        id: `group_${randomUUID()}`,
        label: 'New group',
        order: nextOrder,
      };

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        groups: [...config.groups, group],
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/set_dashboard_group_config',
    description: 'Replaces editable JSON configuration for a dashboard group while preserving group id and order. Superadmin only.',
    request_schema: SetGroupConfigRequestSchema,
    response_schema: DashboardApiResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { error: 'Dashboard edit is not allowed' };
      }

      const slug = String(body?.slug || 'default');
      const groupId = String(body?.groupId || '');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = parseStoredDashboardConfig(dashboard.config);
      const group = config.groups.find((item) => item.id === groupId);

      if (!group) {
        response.setStatus(404);
        return { error: 'Dashboard group not found' };
      }

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        groups: config.groups.map((item) => item.id === groupId
          ? {
              ...(body.config as DashboardGroupConfig),
              id: group.id,
              order: group.order,
            }
          : item),
      });
    },
  });
  server.endpoint({
    method: 'POST',
    path: '/dashboard/add_dashboard_group',
    description: 'Adds a new group to a dashboard configuration. Superadmin only.',
    request_schema: SlugRequestSchema,
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

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const nextOrder = config.groups.length + 1;
      const group: DashboardGroupConfig = {
        id: `group_${randomUUID()}`,
        label: 'New group',
        order: nextOrder,
      };

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        groups: [...config.groups, group],
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/move_dashboard_group',
    description: 'Moves a dashboard group up or down in its dashboard. Superadmin only.',
    request_schema: MoveGroupRequestSchema,
    response_schema: DashboardApiResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { error: 'Dashboard edit is not allowed' };
      }

      const slug = String(body?.slug || 'default');
      const groupId = String(body?.groupId || '');
      const direction = body?.direction === 'down' ? 'down' : 'up';
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const sortedGroups = [...config.groups].sort((a, b) => a.order - b.order);
      const currentIndex = sortedGroups.findIndex((group) => group.id === groupId);

      if (currentIndex === -1) {
        response.setStatus(404);
        return { error: 'Dashboard group not found' };
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sortedGroups.length) {
        return buildDashboardResponse(dashboard);
      }

      const reorderedGroups = [...sortedGroups];
      const [group] = reorderedGroups.splice(currentIndex, 1);
      reorderedGroups.splice(targetIndex, 0, group);

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        groups: reorderedGroups,
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/remove_dashboard_group',
    description: 'Removes a dashboard group and all widgets inside it. Superadmin only.',
    request_schema: GroupIdRequestSchema,
    response_schema: DashboardApiResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { error: 'Dashboard edit is not allowed' };
      }

      const slug = String(body?.slug || 'default');
      const groupId = String(body?.groupId || '');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const nextGroups = config.groups.filter((group) => group.id !== groupId);

      if (nextGroups.length === config.groups.length) {
        response.setStatus(404);
        return { error: 'Dashboard group not found' };
      }

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        groups: nextGroups,
        widgets: config.widgets.filter((widget) => widget.group_id !== groupId),
      });
    },
  });

}

