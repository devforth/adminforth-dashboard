import type { AdminUser, IHttpServer } from 'adminforth';
import { randomUUID } from 'crypto';
import type {
  DashboardConfig,
  EditableDashboardGroupConfig,
  DashboardGroupConfig,
} from '../custom/model/dashboard.types.js';
import {
  DashboardMutationResponseSchema,
  GroupIdRequestSchema,
  MoveGroupRequestSchema,
  SetGroupConfigRequestSchema,
  SlugRequestSchema,
} from '../schema/api.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';

type GroupEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: (config: unknown) => DashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  updateDashboardConfig: (
    slug: string,
    mutateConfig: (config: DashboardConfig, dashboard: DashboardRecord) => DashboardConfig | null | Promise<DashboardConfig | null>,
  ) => Promise<PersistedDashboardResponse | null>;
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
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      let groupId: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const nextOrder = config.groups.length + 1;
        const group: DashboardGroupConfig = {
          id: `group_${randomUUID()}`,
          label: 'New group',
          order: nextOrder,
        };
        groupId = group.id;

        return {
          ...config,
          groups: [...config.groups, group],
        };
      });

      if (!updatedDashboard) {
        response.setStatus(404);
        return { ok: false, error: 'Dashboard not found' };
      }

      return { ok: true, groupId };
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/set_dashboard_group_config',
    agent: {
      isDangerous: true,
    },
    description: 'Replaces editable JSON configuration for a dashboard group while preserving group id and order. Superadmin only.',
    request_schema: SetGroupConfigRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      const groupId = body.groupId;
      let mutationError: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const group = config.groups.find((item) => item.id === groupId);

        if (!group) {
          mutationError = 'Dashboard group not found';
          return null;
        }

        const nextGroup: DashboardGroupConfig = {
          ...(body.config as EditableDashboardGroupConfig),
          id: group.id,
          order: group.order,
        };

        return {
          ...config,
          groups: config.groups.map((item) => item.id === groupId
            ? nextGroup
            : item),
        };
      });

      if (!updatedDashboard) {
        response.setStatus(404);
        return { ok: false, error: 'Dashboard not found' };
      }

      if (mutationError) {
        response.setStatus(404);
        return { ok: false, error: mutationError };
      }

      return { ok: true };
    },
  });
  
  server.endpoint({
    method: 'POST',
    path: '/dashboard/move_dashboard_group',
    description: 'Moves a dashboard group up or down in its dashboard. Superadmin only.',
    request_schema: MoveGroupRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      let mutationError: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const sortedGroups = [...config.groups].sort((a, b) => a.order - b.order);
        const currentIndex = sortedGroups.findIndex((group) => group.id === body.groupId);

        if (currentIndex === -1) {
          mutationError = 'Dashboard group not found';
          return null;
        }

        const targetIndex = body.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= sortedGroups.length) {
          return null;
        }

        const reorderedGroups = [...sortedGroups];
        const [group] = reorderedGroups.splice(currentIndex, 1);
        reorderedGroups.splice(targetIndex, 0, group);

        return {
          ...config,
          groups: reorderedGroups,
        };
      });

      if (!updatedDashboard) {
        response.setStatus(404);
        return { ok: false, error: 'Dashboard not found' };
      }

      if (mutationError) {
        response.setStatus(404);
        return { ok: false, error: mutationError };
      }

      return { ok: true };
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/remove_dashboard_group',
    agent: {
      isDangerous: true,
    },
    description: 'Removes a dashboard group and all widgets inside it. Superadmin only.',
    request_schema: GroupIdRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      const groupId = body.groupId;
      let mutationError: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const nextGroups = config.groups.filter((group) => group.id !== groupId);

        if (nextGroups.length === config.groups.length) {
          mutationError = 'Dashboard group not found';
          return null;
        }

        return {
          ...config,
          groups: nextGroups,
          widgets: config.widgets.filter((widget) => widget.group_id !== groupId),
        };
      });

      if (!updatedDashboard) {
        response.setStatus(404);
        return { ok: false, error: 'Dashboard not found' };
      }

      if (mutationError) {
        response.setStatus(404);
        return { ok: false, error: mutationError };
      }

      return { ok: true };
    },
  });

}
