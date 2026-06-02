import { Filters } from 'adminforth';
import type { IAdminForth } from 'adminforth';
import type { DashboardConfig, DashboardWidgetConfig } from '../custom/model/dashboard.types.js';
import { getDashboardConfigUpdatedTopic } from '../custom/model/dashboardTopics.js';
import { DashboardConfigZodSchema } from '../schema/api.js';

export type DashboardRecord = {
  id: string;
  slug: string;
  label: string;
  revision: number;
  config: unknown;
};

export function parseStoredDashboardConfig(config: unknown): DashboardConfig {
  const parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;

  return DashboardConfigZodSchema.parse(parsedConfig) as DashboardConfig;
}

export type PersistedDashboardResponse = {
  id: string;
  slug: string;
  label: string;
  revision: number;
  config: DashboardConfig;
};

type DashboardConfigMutator = (
  config: DashboardConfig,
  dashboard: DashboardRecord,
) => DashboardConfig | null | Promise<DashboardConfig | null>;

const dashboardConfigUpdateQueues = new Map<string, Promise<void>>();

async function runDashboardConfigUpdateQueued<T>(
  dashboardSlug: string,
  callback: () => Promise<T>,
): Promise<T> {
  const previousUpdate = dashboardConfigUpdateQueues.get(dashboardSlug) ?? Promise.resolve();
  let releaseCurrentUpdate!: () => void;
  const currentUpdate = new Promise<void>((resolve) => {
    releaseCurrentUpdate = resolve;
  });
  const queuedUpdate = previousUpdate.then(() => currentUpdate, () => currentUpdate);

  dashboardConfigUpdateQueues.set(dashboardSlug, queuedUpdate);

  await previousUpdate.catch(() => undefined);

  try {
    return await callback();
  } finally {
    releaseCurrentUpdate();

    if (dashboardConfigUpdateQueues.get(dashboardSlug) === queuedUpdate) {
      dashboardConfigUpdateQueues.delete(dashboardSlug);
    }
  }
}

function normalizeDashboardOrder(config: DashboardConfig): DashboardConfig {
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

  await adminforth.websocket.publish(getDashboardConfigUpdatedTopic(dashboard.slug), {
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

export async function updateDashboardConfig(
  adminforth: IAdminForth,
  dashboardConfigsResourceId: string,
  slug: string,
  mutateConfig: DashboardConfigMutator,
): Promise<PersistedDashboardResponse | null> {
  return runDashboardConfigUpdateQueued(slug, async () => {
    const dashboard = await getDashboardRecord(adminforth, dashboardConfigsResourceId, slug);

    if (!dashboard) {
      return null;
    }

    const config = parseStoredDashboardConfig(dashboard.config);
    const nextConfig = await mutateConfig(config, dashboard);

    if (nextConfig === null) {
      return {
        id: dashboard.id,
        slug: dashboard.slug,
        label: dashboard.label,
        revision: dashboard.revision,
        config,
      };
    }

    return persistDashboardConfig(adminforth, dashboardConfigsResourceId, dashboard, nextConfig);
  });
}

export type DashboardConfigService = {
  getDashboardRecord: (slug: string) => Promise<DashboardRecord | null>;
  parseStoredDashboardConfig: typeof parseStoredDashboardConfig;
  persistDashboardConfig: (
    dashboard: DashboardRecord,
    config: DashboardConfig,
  ) => Promise<PersistedDashboardResponse>;
  updateDashboardConfig: (
    slug: string,
    mutateConfig: DashboardConfigMutator,
  ) => Promise<PersistedDashboardResponse | null>;
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
    updateDashboardConfig: (slug, mutateConfig) => updateDashboardConfig(
      adminforth,
      dashboardConfigsResourceId,
      slug,
      mutateConfig,
    ),
  };
}
