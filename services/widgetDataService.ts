import { Sorts } from 'adminforth';
import type { IAdminForth } from 'adminforth';
import type { DashboardWidgetConfig } from '../custom/model/dashboard.types.js';

export type DashboardWidgetQueryConfig = {
  resource: string;
  select?: string[];
  order?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
};

export type DashboardWidgetData = {
  columns: string[];
  rows: Record<string, unknown>[];
};

export type WidgetDataService = {
  getWidgetData: (widget: DashboardWidgetConfig) => Promise<DashboardWidgetData | null>;
};

export async function getWidgetData(
  adminforth: IAdminForth,
  widget: DashboardWidgetConfig,
): Promise<DashboardWidgetData | null> {
  if (!widget.query) {
    return null;
  }

  const query = widget.query as DashboardWidgetQueryConfig;

  const rows = await adminforth.resource(query.resource).list(
    [],
    query.limit,
    0,
    query.order
      ? [query.order.direction === 'desc' ? Sorts.DESC(query.order.field) : Sorts.ASC(query.order.field)]
      : undefined,
  );

  const columns = query.select ?? Object.keys(rows[0] ?? {});

  return {
    columns,
    rows: rows.map((row) => (
      Object.fromEntries(columns.map((column) => [column, row[column]]))
    )),
  };
}

export function createWidgetDataService(adminforth: IAdminForth): WidgetDataService {
  return {
    getWidgetData: (widget) => getWidgetData(adminforth, widget),
  };
}