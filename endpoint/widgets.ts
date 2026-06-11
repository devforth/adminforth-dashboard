import type { AdminUser, IHttpServer } from 'adminforth';
import { randomUUID } from 'crypto';
import type {
  ChartDashboardWidgetConfig,
  DashboardConfig,
  DashboardVariables,
  DashboardWidgetConfig,
  GaugeCardWidgetConfig,
  KpiCardWidgetConfig,
  PivotTableWidgetConfig,
  TableWidgetConfig,
} from '../custom/model/dashboard.types.js';
import {
  ConfigureBarChartWidgetRequestSchema,
  ConfigureFunnelChartWidgetRequestSchema,
  ConfigureGaugeCardWidgetRequestSchema,
  ConfigureHistogramChartWidgetRequestSchema,
  ConfigureKpiCardWidgetRequestSchema,
  ConfigureLineChartWidgetRequestSchema,
  ConfigurePieChartWidgetRequestSchema,
  ConfigurePivotTableWidgetRequestSchema,
  ConfigureStackedBarChartWidgetRequestSchema,
  ConfigureTableWidgetRequestSchema,
  DashboardMutationResponseSchema,
  DashboardWidgetDataResponseSchema,
  GroupIdRequestSchema,
  MoveWidgetRequestSchema,
  SetWidgetConfigRequestSchema,
  WidgetDataRequestSchema,
  WidgetIdRequestSchema,
} from '../schema/api.js';
import type { DashboardRecord, PersistedDashboardResponse } from '../services/dashboardConfigService.js';

type ConfigurableWidgetConfig =
  | Omit<TableWidgetConfig, 'id' | 'group_id' | 'order'>
  | Omit<KpiCardWidgetConfig, 'id' | 'group_id' | 'order'>
  | Omit<GaugeCardWidgetConfig, 'id' | 'group_id' | 'order'>
  | Omit<ChartDashboardWidgetConfig, 'id' | 'group_id' | 'order'>
  | Omit<PivotTableWidgetConfig, 'id' | 'group_id' | 'order'>;

type ConfigureWidgetRequest = {
  slug: string;
  widgetId: string;
  config: ConfigurableWidgetConfig;
};

type EndpointRequestSchema = Parameters<IHttpServer['endpoint']>[0]['request_schema'];

type WidgetEndpointsContext = {
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
  getWidgetData: (
    widget: DashboardWidgetConfig,
    options?: {
      pagination?: { page: number, pageSize: number },
      variables?: DashboardVariables,
    },
  ) => Promise<unknown>;
};

async function replaceWidgetConfig(
  ctx: WidgetEndpointsContext,
  slug: string,
  widgetId: string,
  widgetConfig: ConfigurableWidgetConfig,
) {
  let mutationError: string | null = null;
  const updatedDashboard = await ctx.updateDashboardConfig(slug, (config) => {
    const widget = config.widgets.find((item) => item.id === widgetId);

    if (!widget) {
      mutationError = 'Dashboard widget not found';
      return null;
    }

    const nextWidget: DashboardWidgetConfig = {
      ...widgetConfig,
      id: widget.id,
      group_id: widget.group_id,
      order: widget.order,
    } as DashboardWidgetConfig;

    return {
      ...config,
      widgets: config.widgets.map((item) => item.id === widgetId
        ? nextWidget
        : item),
    };
  });

  return {
    updatedDashboard,
    mutationError,
  };
}

function registerConfigureWidgetEndpoint(
  server: IHttpServer,
  ctx: WidgetEndpointsContext,
  options: {
    path: string;
    description: string;
    requestSchema: EndpointRequestSchema;
  },
) {
  server.endpoint({
    method: 'POST',
    path: options.path,
    agent: {
      isDangerous: true,
    },
    description: options.description,
    request_schema: options.requestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      const request = body as ConfigureWidgetRequest;
      const { updatedDashboard, mutationError } = await replaceWidgetConfig(
        ctx,
        request.slug,
        request.widgetId,
        request.config,
      );

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

export function registerWidgetEndpoints(
  server: IHttpServer,
  ctx: WidgetEndpointsContext,
) {
  server.endpoint({
    method: 'POST',
    path: '/dashboard/add_dashboard_widget',
    description: 'Adds a new empty widget to a dashboard group. Superadmin only.',
    request_schema: GroupIdRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      let mutationError: string | null = null;
      let widgetId: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const group = config.groups.find((item) => item.id === body.groupId);

        if (!group) {
          mutationError = 'Dashboard group not found';
          return null;
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
        widgetId = widget.id;

        return {
          ...config,
          widgets: [...config.widgets, widget],
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

      return { ok: true, widgetId };
    },
  });

  server.endpoint({
    method: 'POST',
    path: '/dashboard/move_dashboard_widget',
    description: 'Moves a dashboard widget up or down inside its group. Superadmin only.',
    request_schema: MoveWidgetRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      let mutationError: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const widget = config.widgets.find((item) => item.id === body.widgetId);

        if (!widget) {
          mutationError = 'Dashboard widget not found';
          return null;
        }

        const sortedWidgets = config.widgets
          .filter((item) => item.group_id === widget.group_id)
          .sort((a, b) => a.order - b.order);
        const currentIndex = sortedWidgets.findIndex((item) => item.id === body.widgetId);
        const targetIndex = body.direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= sortedWidgets.length) {
          return null;
        }

        const reorderedWidgets = [...sortedWidgets];
        const [movedWidget] = reorderedWidgets.splice(currentIndex, 1);
        reorderedWidgets.splice(targetIndex, 0, movedWidget);
        const reorderedWidgetIds = new Map(reorderedWidgets.map((item, index) => [item.id, index + 1]));

        return {
          ...config,
          widgets: config.widgets.map((item) => ({
            ...item,
            order: reorderedWidgetIds.get(item.id) ?? item.order,
          })),
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
    path: '/dashboard/remove_dashboard_widget',
    agent: {
      isDangerous: true,
    },
    description: 'Removes one dashboard widget by id. Superadmin only.',
    request_schema: WidgetIdRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      let mutationError: string | null = null;
      const updatedDashboard = await ctx.updateDashboardConfig(body.slug, (config) => {
        const nextWidgets = config.widgets.filter((item) => item.id !== body.widgetId);

        if (nextWidgets.length === config.widgets.length) {
          mutationError = 'Dashboard widget not found';
          return null;
        }

        return {
          ...config,
          widgets: nextWidgets,
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
    path: '/dashboard/set_widget_config',
    agent: {
      isDangerous: true,
    },
    description: 'Replaces editable JSON configuration for a dashboard widget while preserving widget id, group id, and order. Superadmin only.',
    request_schema: SetWidgetConfigRequestSchema,
    response_schema: DashboardMutationResponseSchema,
    handler: async ({ body, adminUser, response }) => {
      if (!ctx.canEditDashboard(adminUser)) {
        response.setStatus(403);
        return { ok: false, error: 'Dashboard edit is not allowed' };
      }

      const request = body as ConfigureWidgetRequest;
      const { updatedDashboard, mutationError } = await replaceWidgetConfig(ctx, request.slug, request.widgetId, request.config);

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

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_table_widget',
    description: 'Configures an existing dashboard widget as a table. Superadmin only.',
    requestSchema: ConfigureTableWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_kpi_card_widget',
    description: 'Configures an existing dashboard widget as a KPI card. Superadmin only.',
    requestSchema: ConfigureKpiCardWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_gauge_card_widget',
    description: 'Configures an existing dashboard widget as a gauge card. Superadmin only.',
    requestSchema: ConfigureGaugeCardWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_pivot_table_widget',
    description: 'Configures an existing dashboard widget as a pivot table. Superadmin only.',
    requestSchema: ConfigurePivotTableWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_line_chart_widget',
    description: 'Configures an existing dashboard widget as a line chart. Superadmin only.',
    requestSchema: ConfigureLineChartWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_bar_chart_widget',
    description: 'Configures an existing dashboard widget as a bar chart. Superadmin only.',
    requestSchema: ConfigureBarChartWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_stacked_bar_chart_widget',
    description: 'Configures an existing dashboard widget as a stacked bar chart. Superadmin only.',
    requestSchema: ConfigureStackedBarChartWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_pie_chart_widget',
    description: 'Configures an existing dashboard widget as a pie chart. Superadmin only.',
    requestSchema: ConfigurePieChartWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_histogram_chart_widget',
    description: 'Configures an existing dashboard widget as a histogram chart. Superadmin only.',
    requestSchema: ConfigureHistogramChartWidgetRequestSchema,
  });

  registerConfigureWidgetEndpoint(server, ctx, {
    path: '/dashboard/configure_funnel_chart_widget',
    description: 'Configures an existing dashboard widget as a funnel chart. Superadmin only.',
    requestSchema: ConfigureFunnelChartWidgetRequestSchema,
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
