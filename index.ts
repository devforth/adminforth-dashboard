import { AdminForthPlugin } from "adminforth";
import type { AdminForthResource, AdminUser, IAdminForth, IHttpServer } from "adminforth";
import type { PluginOptions } from "./types.js";
import { randomUUID } from 'crypto';
import path from 'path';
import { registerDashboardEndpoints } from './endpoint/dashboard.js';
import { registerGroupEndpoints } from "./endpoint/groups.js";
import { registerWidgetEndpoints } from './endpoint/widgets.js';
import { createDashboardConfigService } from "./services/dashboardConfigService.js";
import { createWidgetDataService } from "./services/widgetDataService.js";

const DEFAULT_DASHBOARD_CONFIG = {
  version: 1,
  groups: [{
    id: 'default',
    label: 'Default Group',
    order: 1,
  }],
  widgets: [],
};

function canEditDashboard(adminUser: AdminUser) {
  return adminUser.dbUser.role === 'superadmin';
}

export default class DashboardPlugin extends AdminForthPlugin {
  options: PluginOptions;
  private didRegisterMenuProvider = false;
  private didInstallSeedHook = false;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
    this.customFolderName = 'custom';
    this.customFolderPath = path.join(this.pluginDir, this.customFolderName);
  }

  async modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);

    if (!this.didRegisterMenuProvider) {
      this.didRegisterMenuProvider = true;

      const adminforthWithDynamicMenu = adminforth as any;
      adminforthWithDynamicMenu.registerMenuContributionProvider(async () => {
        if (this.adminforth.statuses.dbDiscover !== 'done') {
          return [];
        }

        const dashboards = await this.adminforth.resource(this.options.dashboardConfigsResourceId).list([]);

        return [
          {
            item: {
              itemId: 'dashboardMenu',
              type: 'group',
              label: 'Dashboards',
              icon: 'flowbite:chart-pie-solid',
              open: true,
              children: dashboards.map((dashboard: any) => ({
                itemId: `dashboard-${dashboard.id}`,
                type: 'page',
                label: dashboard.label,
                url: `/dashboard/${dashboard.slug}`,
              })),
            },
            placement: { position: 'first' },
          },
        ];
      });
    }

    if (!this.didInstallSeedHook) {
      this.didInstallSeedHook = true;

      const discoverDatabases = adminforth.discoverDatabases.bind(adminforth);
      adminforth.discoverDatabases = async () => {
        await discoverDatabases();
        await this.ensureDefaultDashboardConfig();
      };
    }

    adminforth.config.customization.customPages.push({
      path: '/dashboard/:slug',
      component: {
        file: this.componentPath('runtime/DashboardPage.vue'),
        meta: {
          title: 'Dashboard',
        },
      },
    });
  }

  private async ensureDefaultDashboardConfig() {
    const dashboardConfigs = this.adminforth.resource(this.options.dashboardConfigsResourceId);
    const dashboardsCount = await dashboardConfigs.count();

    if (dashboardsCount > 0) {
      return;
    }

    const createResult = await dashboardConfigs.create({
      id: randomUUID(),
      slug: 'default',
      label: 'Default Dashboard',
      revision: 1,
      config: DEFAULT_DASHBOARD_CONFIG,
    });

    if (!createResult.ok) {
      throw new Error(createResult.error || 'Failed to create default dashboard config');
    }
  }

  setupEndpoints(server: IHttpServer) {
    const dashboardConfigService = createDashboardConfigService(
      this.adminforth,
      this.options.dashboardConfigsResourceId,
    );
    const widgetDataService = createWidgetDataService(this.adminforth);

    const ctx = {
      adminforth: this.adminforth,
      dashboardConfigsResourceId: this.options.dashboardConfigsResourceId,
      canEditDashboard,
      ...dashboardConfigService,
      ...widgetDataService,
    };

    registerDashboardEndpoints(server, ctx);
    registerGroupEndpoints(server, ctx);
    registerWidgetEndpoints(server, ctx);
  }

  instanceUniqueRepresentation(): string {
    return "dashboard";
  }
}
