import type { IAdminForth } from 'adminforth';
import type { DashboardWidgetConfig, QueryConfig } from '../custom/model/dashboard.types.js';
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
  if (!('query' in widget)) {
    return [];
  }

  if ('steps' in widget.query) {
    return widget.query.steps.flatMap((step, index) => validateResource(
      adminforth,
      step.resource,
      `query.steps.${index}.resource`,
    ));
  }

  return validateQueryConfig(adminforth, widget.query, 'query');
}

function validateQueryConfig(
  adminforth: IAdminForth,
  query: QueryConfig,
  fieldPrefix: string,
): DashboardWidgetConfigValidationError[] {
  return validateResource(adminforth, query.resource, `${fieldPrefix}.resource`);
}

function validateResource(
  adminforth: IAdminForth,
  resourceId: string,
  field: string,
): DashboardWidgetConfigValidationError[] {
  const resource = adminforth.config.resources.find((item) => item.resourceId === resourceId);

  if (resource) {
    return [];
  }

  return [{
    field,
    message: `Resource "${resourceId}" is not registered`,
  }];
}

export function createWidgetConfigValidatorService(
  adminforth: IAdminForth,
): WidgetConfigValidatorService {
  return {
    validateDashboardWidgetApiConfig: (widget) => validateDashboardWidgetApiConfig(adminforth, widget),
  };
}
