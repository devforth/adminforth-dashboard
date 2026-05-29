import { Aggregates, GroupBy, Sorts } from 'adminforth';
import type {
  IAdminForth,
  IAdminForthAndOrFilter,
  IAdminForthSingleFilter,
  IAdminForthSort,
} from 'adminforth';
import type {
  AggregationRule,
  DashboardWidgetConfig,
  DashboardWidgetData,
  GroupByRule,
  WidgetDataSource,
} from '../custom/model/dashboard.types.js';

export type DashboardWidgetQueryConfig = {
  resource: string;
  select?: string[];
  order?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
};

export type DashboardWidgetDataOptions = {
  pagination?: {
    page: number;
    pageSize: number;
  };
};

type DashboardWidgetFilters =
  | IAdminForthSingleFilter
  | IAdminForthAndOrFilter
  | Array<IAdminForthSingleFilter | IAdminForthAndOrFilter>;

export type WidgetDataService = {
  getWidgetData: (widget: DashboardWidgetConfig, options?: DashboardWidgetDataOptions) => Promise<DashboardWidgetData | null>;
};

export async function getWidgetData(
  adminforth: IAdminForth,
  widget: DashboardWidgetConfig,
  options: DashboardWidgetDataOptions = {},
): Promise<DashboardWidgetData | null> {
  const legacyQuery = getLegacyQueryConfig(widget.query);
  const dataSource = getWidgetDataSource(widget, legacyQuery);

  if (!dataSource) {
    return null;
  }

  if (dataSource.type === 'aggregate') {
    return getAggregateWidgetData(adminforth, dataSource);
  }

  return getResourceWidgetData(adminforth, dataSource, legacyQuery, options);
}

async function getResourceWidgetData(
  adminforth: IAdminForth,
  dataSource: Extract<WidgetDataSource, { type: 'resource' }>,
  legacyQuery: DashboardWidgetQueryConfig | undefined,
  options: DashboardWidgetDataOptions,
): Promise<DashboardWidgetData> {
  const resource = adminforth.resource(dataSource.resourceId);
  const filters = normalizeFilters(dataSource.filters);
  const sort = normalizeSort(dataSource.sort ?? legacyQuery?.order);
  const pagination = options.pagination;
  const offset = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
  const queryLimit = legacyQuery?.limit;
  const limit = pagination
    ? Math.max(Math.min(pagination.pageSize, (queryLimit ?? Infinity) - offset), 0)
    : queryLimit;

  const rows = await resource.list(
    filters,
    limit ?? undefined,
    offset,
    sort,
  );

  const columns = dataSource.columns ?? legacyQuery?.select ?? Object.keys(rows[0] ?? {});
  const total = pagination ? Math.min(await resource.count(filters), queryLimit ?? Infinity) : 0;

  return {
    columns,
    rows: rows.map((row) => (
      Object.fromEntries(columns.map((column) => [column, row[column]]))
    )),
    ...(pagination ? {
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pagination.pageSize), 1),
      },
    } : {}),
  };
}

async function getAggregateWidgetData(
  adminforth: IAdminForth,
  dataSource: Extract<WidgetDataSource, { type: 'aggregate' }>,
): Promise<DashboardWidgetData> {
  const resource = adminforth.resource(dataSource.resourceId);
  const rows = await resource.aggregate(
    normalizeFilters(dataSource.filters),
    Object.fromEntries(
      Object.entries(dataSource.aggregations).map(([alias, rule]) => [
        alias,
        createAggregationRule(rule),
      ]),
    ),
    dataSource.groupBy ? createGroupByRule(dataSource.groupBy) : undefined,
  );
  const columns = Object.keys(rows[0] ?? {});

  if (!dataSource.groupBy) {
    const values = rows[0] ?? {};

    return {
      kind: 'aggregate',
      columns: Object.keys(values),
      rows: Object.keys(values).length ? [values] : [],
      values,
    };
  }

  return {
    kind: 'aggregate',
    columns,
    rows,
  };
}

function getLegacyQueryConfig(query: unknown): DashboardWidgetQueryConfig | undefined {
  if (!isRecord(query) || typeof query.resource !== 'string') {
    return undefined;
  }

  return query as DashboardWidgetQueryConfig;
}

function getWidgetDataSource(
  widget: DashboardWidgetConfig,
  legacyQuery: DashboardWidgetQueryConfig | undefined,
): WidgetDataSource | undefined {
  if (isWidgetDataSource(widget.dataSource)) {
    return widget.dataSource;
  }

  if (!legacyQuery) {
    return undefined;
  }

  return {
    type: 'resource',
    resourceId: legacyQuery.resource,
    columns: legacyQuery.select,
    sort: legacyQuery.order,
  };
}

function isWidgetDataSource(value: unknown): value is WidgetDataSource {
  return isRecord(value)
    && (value.type === 'resource' || value.type === 'aggregate')
    && typeof value.resourceId === 'string';
}

function normalizeFilters(filters: unknown): DashboardWidgetFilters {
  if (Array.isArray(filters)) {
    return filters as DashboardWidgetFilters;
  }

  if (isRecord(filters)) {
    return filters as DashboardWidgetFilters;
  }

  return [];
}

function normalizeSort(sort: unknown): IAdminForthSort | IAdminForthSort[] | undefined {
  if (Array.isArray(sort)) {
    return sort as IAdminForthSort[];
  }

  if (!isRecord(sort) || typeof sort.field !== 'string') {
    return undefined;
  }

  if (sort.direction === 'asc') {
    return [Sorts.ASC(sort.field)];
  }

  if (sort.direction === 'desc') {
    return [Sorts.DESC(sort.field)];
  }

  return sort as IAdminForthSort;
}

function createAggregationRule(rule: AggregationRule) {
  switch (rule.operation) {
    case 'sum':
      return Aggregates.sum(rule.field!);
    case 'count':
      return Aggregates.count();
    case 'avg':
      return Aggregates.avg(rule.field!);
    case 'min':
      return Aggregates.min(rule.field!);
    case 'max':
      return Aggregates.max(rule.field!);
    case 'median':
      return Aggregates.median(rule.field!);
    default:
      throw new Error(`Unsupported aggregation operation: ${(rule as AggregationRule).operation}`);
  }
}

function createGroupByRule(rule: GroupByRule) {
  if (rule.type === 'field') {
    return GroupBy.Field(rule.field);
  }

  return GroupBy.DateTrunc(rule.field, rule.truncation, rule.timezone);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

export function createWidgetDataService(adminforth: IAdminForth): WidgetDataService {
  return {
    getWidgetData: (widget, options) => getWidgetData(adminforth, widget, options),
  };
}
