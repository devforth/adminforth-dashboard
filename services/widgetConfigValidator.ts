import type { IAdminForth } from 'adminforth';
import type { DashboardWidgetConfig } from '../custom/model/dashboard.types.js';
import type { DashboardWidgetConfigValidationError } from '../schema/widget.js';
import type { DashboardWidgetQueryConfig } from './widgetDataService.js';

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

  if (!widget.chart) {
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
        field: 'dataSource.resourceId',
        message: `Resource "${aggregateDataSource.resourceId}" is not registered`,
      });
    }

    if (!aggregateDataSource.groupBy) {
      errors.push({
        field: 'dataSource.groupBy',
        message: 'Chart aggregate dataSource must define groupBy',
      });
    }

    return errors;
  }

  if (!widget.query) {
    errors.push({
      field: 'query',
      message: 'Chart widget must have query or aggregate dataSource config',
    });
    return errors;
  }

  const query = widget.query as DashboardWidgetQueryConfig;
  const chart = widget.chart;

  const resource = adminforth.config.resources.find((item) => item.resourceId === query.resource);

  if (!resource) {
    errors.push({
      field: 'query.resource',
      message: `Resource "${query.resource}" is not registered`,
    });
    return errors;
  }

  if (!query.select) {
    return errors;
  }

  const resourceFields = resource.columns.map((column) => column.name);

  for (const field of query.select) {
    if (!resourceFields.includes(field)) {
      errors.push({
        field: 'query.select',
        message: `Field "${field}" is not in resource "${query.resource}"`,
      });
    }
  }

  const chartFields = [
    chart.x_field,
    chart.y_field,
    chart.label_field,
    chart.value_field,
    chart.bucket_field,
    ...(chart.series?.map((series: { field: string }) => series.field) ?? []),
  ].filter((field): field is string => typeof field === 'string');

  for (const field of chartFields) {
    if (!query.select.includes(field)) {
      errors.push({
        field: 'query.select',
        message: `Query select must include chart field "${field}"`,
      });
    }
  }

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