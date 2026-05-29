import type { IAdminForth } from 'adminforth';
import type { DashboardWidgetConfig } from '../custom/model/dashboard.types.js';
import { normalizeChartWidgetConfig } from '../custom/widgets/chart/chart.types.js';
import type { DashboardWidgetConfigValidationError } from '../schema/widget.js';

export type WidgetConfigValidatorService = {
  validateDashboardWidgetApiConfig: (
    widget: DashboardWidgetConfig,
  ) => DashboardWidgetConfigValidationError[];
};

export function validateDashboardWidgetApiConfig(
  adminforth: IAdminForth,
  widget: DashboardWidgetConfig,
): DashboardWidgetConfigValidationError[] {
  if (widget.target !== 'chart') {
    return [];
  }

  const errors: DashboardWidgetConfigValidationError[] = [];

  const chart = normalizeChartWidgetConfig(widget.chart);

  if (!chart) {
    errors.push({
      field: 'chart',
      message: 'Chart widget must have chart config',
    });
    return errors;
  }

  const aggregateDataSource = getAggregateDataSource(widget.dataSource);

  if (aggregateDataSource) {
    const resource = adminforth.config.resources.find((item) => item.resourceId === aggregateDataSource.resourceId);

    if (!resource) {
      errors.push({
        field: 'data_source.resource_id',
        message: `Resource "${aggregateDataSource.resourceId}" is not registered`,
      });
    }

    if (!aggregateDataSource.groupBy) {
      errors.push({
        field: 'data_source.group_by',
        message: 'Chart aggregate dataSource must define groupBy',
      });
    }

    return errors;
  }

  errors.push({
    field: 'data_source',
    message: 'Chart widget must have aggregate dataSource config',
  });

  return errors;
}

export function createWidgetConfigValidatorService(
  adminforth: IAdminForth,
): WidgetConfigValidatorService {
  return {
    validateDashboardWidgetApiConfig: (widget) => validateDashboardWidgetApiConfig(adminforth, widget),
  };
}

function getAggregateDataSource(dataSource: unknown) {
  if (
    typeof dataSource !== 'object'
    || dataSource === null
    || (dataSource as { type?: string }).type !== 'aggregate'
    || typeof (dataSource as { resourceId?: unknown }).resourceId !== 'string'
  ) {
    return null;
  }

  return dataSource as {
    type: 'aggregate';
    resourceId: string;
    groupBy?: unknown;
  };
}