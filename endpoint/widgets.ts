import type { AdminUser, IHttpServer } from 'adminforth';
import { randomUUID } from 'crypto';
import type { DashboardConfig, DashboardWidgetConfig } from '../custom/model/dashboard.types.js';
import {
  DashboardApiResponseSchema,
  DashboardWidgetDataResponseSchema,
  GroupIdRequestSchema,
  MoveWidgetRequestSchema,
  SetWidgetConfigRequestSchema,
  WidgetIdRequestSchema,
} from '../schema/api.js';
import type { DashboardWidgetConfigValidationError } from '../schema/widget.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';

type WidgetEndpointsContext = {
  canEditDashboard: (adminUser: AdminUser) => boolean;
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: (config: string) => DashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  buildDashboardResponse: (dashboard: DashboardRecord) => PersistedDashboardResponse;
  validateDashboardWidgetApiConfig: (
    widget: DashboardWidgetConfig,
  ) => DashboardWidgetConfigValidationError[];
  getWidgetData: (widget: DashboardWidgetConfig) => Promise<unknown>;
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

      const slug = String(body?.slug || 'default');
      const groupId = String(body?.groupId || '');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const group = config.groups.find((item) => item.id === groupId);

      if (!group) {
        response.setStatus(404);
        return { error: 'Dashboard group not found' };
      }

      const nextOrder = config.widgets.filter((item) => item.group_id === groupId).length + 1;
      const widget: DashboardWidgetConfig = {
        id: `widget_${randomUUID()}`,
        group_id: groupId,
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

      const slug = String(body?.slug || 'default');
      const widgetId = String(body?.widgetId || '');
      const direction = body?.direction === 'down' ? 'down' : 'up';
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const widget = config.widgets.find((item) => item.id === widgetId);

      if (!widget) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      const sortedWidgets = config.widgets
        .filter((item) => item.group_id === widget.group_id)
        .sort((a, b) => a.order - b.order);
      const currentIndex = sortedWidgets.findIndex((item) => item.id === widgetId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sortedWidgets.length) {
        return ctx.buildDashboardResponse(dashboard);
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

      const slug = String(body?.slug || 'default');
      const widgetId = String(body?.widgetId || '');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const nextWidgets = config.widgets.filter((item) => item.id !== widgetId);

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

      const slug = String(body?.slug || 'default');
      const widgetId = String(body?.widgetId || '');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const widget = config.widgets.find((item) => item.id === widgetId);

      if (!widget) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      const typedWidgetConfig = body.config as DashboardWidgetConfig;
      const apiValidationErrors = ctx.validateDashboardWidgetApiConfig(typedWidgetConfig);

      if (apiValidationErrors.length) {
        response.setStatus(422);
        return {
          error: 'Invalid widget config',
          validationErrors: apiValidationErrors,
        };
      }

      return ctx.persistDashboardConfig(dashboard, {
        ...config,
        widgets: config.widgets.map((item) => item.id === widgetId
          ? {
              ...typedWidgetConfig,
              id: widget.id,
              group_id: widget.group_id,
              order: widget.order,
            }
          : item),
      });
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/get_dashboard_widget_data',
    description: 'Loads query result data for one dashboard widget by dashboard slug and widget id.',
    request_schema: WidgetIdRequestSchema,
    response_schema: DashboardWidgetDataResponseSchema,
    handler: async ({ body, response }) => {
      const slug = String(body?.slug || 'default');
      const widgetId = String(body?.widgetId || '');
      const dashboard = await ctx.getDashboardRecord(slug);

      if (!dashboard) {
        response.setStatus(404);
        return { error: 'Dashboard not found' };
      }

      const config = ctx.parseStoredDashboardConfig(dashboard.config);
      const widget = config.widgets.find((item) => item.id === widgetId);

      if (!widget) {
        response.setStatus(404);
        return { error: 'Dashboard widget not found' };
      }

      return {
        widget,
        data: await ctx.getWidgetData(widget),
      };
    },
  });
}