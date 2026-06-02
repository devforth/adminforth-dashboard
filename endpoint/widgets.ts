import type { AdminUser, IHttpServer } from 'adminforth';
import { randomUUID } from 'crypto';
import type {
  DashboardConfig,
  DashboardVariables,
  DashboardWidgetConfig,
  EditableDashboardWidgetConfig,
} from '../custom/model/dashboard.types.js';
import {
  DashboardApiResponseSchema,
  DashboardWidgetDataResponseSchema,
  GroupIdRequestSchema,
  MoveWidgetRequestSchema,
  SetWidgetConfigRequestSchema,
  WidgetDataRequestSchema,
  WidgetIdRequestSchema,
} from '../schema/api.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';

type WidgetEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: (config: unknown) => DashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  getWidgetData: (
    widget: DashboardWidgetConfig,
    options?: {
      pagination?: { page: number, pageSize: number },
      variables?: DashboardVariables,
    },
  ) => Promise<unknown>;
};

export function registerWidgetEndpoints(
  server: IHttpServer,
  ctx: WidgetEndpointsContext,
) {
  server.endpoint({
    method: 'POST',
    path: '/dashboard/add_dashboard_widget',
    description: 'Adds a new empty widget to a dashboard group. Superadmin only.',
    request_schema: GroupIdRequestSchema,
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

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const group = config.groups.find((item) => item.id === body.groupId);

      if (!group) {
        response.setStatus(404);
        return { error: 'Dashboard group not found' };
      }

      const nextOrder = config.widgets.filter((item) => item.group_id === body.groupId).length + 1;
      const widget: DashboardWidgetConfig = {
        id: `widget_${randomUUID()}`,
        group_id: body.groupId,
        label: 'New widget',
        size: 'small',
        order: nextOrder,
        target: 'empty',
      };

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        widgets: [...config.widgets, widget],
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/move_dashboard_widget',
    description: 'Moves a dashboard widget up or down inside its group. Superadmin only.',
    request_schema: MoveWidgetRequestSchema,
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

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const widget = config.widgets.find((item) => item.id === body.widgetId);

      if (!widget) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      const sortedWidgets = config.widgets
        .filter((item) => item.group_id === widget.group_id)
        .sort((a, b) => a.order - b.order);
      const currentIndex = sortedWidgets.findIndex((item) => item.id === body.widgetId);
      const targetIndex = body.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sortedWidgets.length) {
        return {
          id: dashboard.id,
          slug: dashboard.slug,
          label: dashboard.label,
          revision: dashboard.revision,
          config: ctx.parseStoredDashboardConfig(dashboard.config),
        };
      }

      const reorderedWidgets = [...sortedWidgets];
      const [movedWidget] = reorderedWidgets.splice(currentIndex, 1);
      reorderedWidgets.splice(targetIndex, 0, movedWidget);
      const reorderedWidgetIds = new Map(reorderedWidgets.map((item, index) => [item.id, index + 1]));

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        widgets: config.widgets.map((item) => ({
          ...item,
          order: reorderedWidgetIds.get(item.id) ?? item.order,
        })),
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/remove_dashboard_widget',
    description: 'Removes one dashboard widget by id. Superadmin only.',
    request_schema: WidgetIdRequestSchema,
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

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const nextWidgets = config.widgets.filter((item) => item.id !== body.widgetId);

      if (nextWidgets.length === config.widgets.length) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        widgets: nextWidgets,
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/set_widget_config',
    description: 'Replaces editable JSON configuration for a dashboard widget while preserving widget id, group id, and order. Superadmin only.',
    request_schema: SetWidgetConfigRequestSchema,
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

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const widget = config.widgets.find((item) => item.id === body.widgetId);

      if (!widget) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      const typedWidgetConfig = body.config as EditableDashboardWidgetConfig;

      const nextWidget: DashboardWidgetConfig = {
        ...typedWidgetConfig,
        id: widget.id,
        group_id: widget.group_id,
        order: widget.order,
      };

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        widgets: config.widgets.map((item) => item.id === body.widgetId
          ? nextWidget
          : item),
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/get_dashboard_widget_data',
    description: 'Loads widget data for one dashboard widget by dashboard slug and widget id.',
    request_schema: WidgetDataRequestSchema,
    response_schema: DashboardWidgetDataResponseSchema,
    handler: async ({ body, response }) => {
      const dashboard = await ctx.getDashboardRecord(body.slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const widget = config.widgets.find((item) => item.id === body.widgetId);

      if (!widget) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      return {
        widget,
        data: await ctx.getWidgetData(widget, {
          pagination: body.pagination,
          variables: widget.variables,
        }),
      };
    },
  });
}
