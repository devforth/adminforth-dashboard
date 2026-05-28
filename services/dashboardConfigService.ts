import { Filters } from 'adminforth';
import type { IAdminForth } from 'adminforth';
import { normalizeDashboardConfig } from '../custom/model/dashboard.types.js';
import type { DashboardConfig, DashboardWidgetConfig } from '../custom/model/dashboard.types.js';

const DASHBOARD_CONFIG_UPDATED_TOPIC_PREFIX = '/opentopic/dashboard-config-updated';

export type DashboardRecord = {
  id: string;
  slug: string;
  label: string;
  revision: number;
  config: unknown;
};

export function parseStoredDashboardConfig(config: unknown): DashboardConfig {
  if (typeof config === 'string') {
    return normalizeDashboardConfig(JSON.parse(config));
  }

  return normalizeDashboardConfig(config);
}

export function buildDashboardResponse(dashboard: DashboardRecord) {
  return {
    id: dashboard.id,
    slug: dashboard.slug,
    label: dashboard.label,
    revision: dashboard.revision,
    config: parseStoredDashboardConfig(dashboard.config),
  };
}

export type PersistedDashboardResponse = {
  id: string;
  slug: string;
  label: string;
  revision: number;
  config: DashboardConfig;
};

export function dashboardConfigUpdatedTopic(slug: string) {
  return `${DASHBOARD_CONFIG_UPDATED_TOPIC_PREFIX}/${slug}`;
}

export function normalizeDashboardOrder(config: DashboardConfig): DashboardConfig {
  const widgetsByGroupId = new Map<string, DashboardWidgetConfig[]>();

  for (const widget of config.widgets) {
    const groupWidgets = widgetsByGroupId.get(widget.group_id) ?? [];
    groupWidgets.push(widget);
    widgetsByGroupId.set(widget.group_id, groupWidgets);
  }

  for (const [groupId, widgets] of widgetsByGroupId.entries()) {
    widgetsByGroupId.set(groupId, [...widgets].sort((a, b) => a.order - b.order));
  }

  return {
    ...config,
    groups: config.groups.map((group, index) => ({
      ...group,
      order: index + 1,
    })),
    widgets: config.widgets.map((widget) => ({
      ...widget,
      order: widgetsByGroupId.get(widget.group_id)!.findIndex((item) => item.id === widget.id) + 1,
    })),
  };
}

export async function getDashboardRecord(
  adminforth: IAdminForth,
  dashboardConfigsResourceId: string,
  slug: string,
): Promise<DashboardRecord | null> {
  const dashboardConfigs = adminforth.resource(dashboardConfigsResourceId);
  const dashboard = await dashboardConfigs.get(Filters.EQ('slug', slug));

  return dashboard || null;
}

export async function persistDashboardConfig(
  adminforth: IAdminForth,
  dashboardConfigsResourceId: string,
  dashboard: DashboardRecord,
  config: DashboardConfig,
): Promise<PersistedDashboardResponse> {
  const normalizedConfig = normalizeDashboardOrder(config);

  await adminforth.resource(dashboardConfigsResourceId).update(dashboard.id, {
    config: normalizedConfig,
    revision: dashboard.revision + 1,
  });

  await adminforth.websocket.publish(dashboardConfigUpdatedTopic(dashboard.slug), {
    id: dashboard.id,
    slug: dashboard.slug,
    revision: dashboard.revision + 1,
  });

  return {
    id: dashboard.id,
    slug: dashboard.slug,
    label: dashboard.label,
    revision: dashboard.revision + 1,
    config: normalizedConfig,
  };
}

export type DashboardConfigService = {
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: typeof parseStoredDashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  buildDashboardResponse: typeof buildDashboardResponse;
};

export function createDashboardConfigService(
  adminforth: IAdminForth,
  dashboardConfigsResourceId: string,
): DashboardConfigService {
  return {
    getDashboardRecord: (slug) => getDashboardRecord(adminforth, dashboardConfigsResourceId, slug),
    parseStoredDashboardConfig,
    persistDashboardConfig: (dashboard, config) => persistDashboardConfig(
      adminforth,
      dashboardConfigsResourceId,
      dashboard,
      config,
    ),
    buildDashboardResponse,
  };
}
