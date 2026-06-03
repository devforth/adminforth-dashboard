import { Filters, Sorts } from 'adminforth';
import type {
  IAdminForth,
  IAdminForthAndOrFilter,
  IAdminForthSingleFilter,
  IAdminForthSort,
} from 'adminforth';
import type {
  DashboardWidgetConfig,
  DashboardWidgetData,
  DashboardVariables,
  FilterExpression,
  QueryAggregateSelectItem,
  QueryCalcSelectItem,
  QueryConfig,
  QueryFieldSelectItem,
  QueryGroupByItem,
  QueryOrderByItem,
  ResourceQueryConfig,
  StepsQueryStepConfig,
  QuerySelectItem,
  TimeGrain,
} from '../custom/model/dashboard.types.js';

export type DashboardWidgetDataOptions = {
  pagination?: {
    page: number;
    pageSize: number;
  };
  variables?: DashboardVariables;
};

type DashboardWidgetFilters =
  | IAdminForthSingleFilter
  | IAdminForthAndOrFilter
  | Array<IAdminForthSingleFilter | IAdminForthAndOrFilter>;

type AggregateRule =
  | { operation: 'count' }
  | { operation: Exclude<QueryAggregateSelectItem['agg'], 'count'>; field: string };

type AggregateGroupByRule =
  | {
      type: 'date_trunc';
      field: string;
      truncation: TimeGrain;
      timezone?: string;
      as: string;
    }
  | {
      type: 'field';
      field: string;
      as: string;
    };

type AggregateResource = {
  aggregate: (
    filters: DashboardWidgetFilters,
    aggregations: Record<string, AggregateRule>,
    groupBy?: AggregateGroupByRule | AggregateGroupByRule[],
  ) => Promise<Record<string, unknown>[]>;
};

type EffectiveGroupByItem = {
  field: string;
  as: string;
  grain?: TimeGrain;
  timezone?: string;
};

const CALC_IDENTIFIER_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
const LOOKUP_CALL_RE = /lookup\(\s*(\$variables(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g;
const VARIABLE_PATH_PREFIX_RE = /^\$variables\.?/;
const SAFE_CALC_EXPRESSION_RE = /^[\d+\-*/().\s?:<>=!]+$/;
const RELATIVE_DURATION_RE = /^(\d+)(h|d|w|mo|y)$/;
const FILTER_OPERATORS = {
  eq: Filters.EQ,
  neq: Filters.NEQ,
  gt: Filters.GT,
  gte: Filters.GTE,
  lt: Filters.LT,
  lte: Filters.LTE,
  in: Filters.IN,
  not_in: Filters.NOT_IN,
  like: Filters.LIKE,
  ilike: Filters.ILIKE,
} as const;

export type WidgetDataService = {
  getWidgetData: (widget: DashboardWidgetConfig, options?: DashboardWidgetDataOptions) => Promise<DashboardWidgetData | null>;
};

export async function getWidgetData(
  adminforth: IAdminForth,
  widget: DashboardWidgetConfig,
  options: DashboardWidgetDataOptions = {},
): Promise<DashboardWidgetData | null> {
  if (!('query' in widget)) {
    return null;
  }

  const data = await getQueryWidgetData(adminforth, widget.query, options.variables ?? {});

  if (widget.target !== 'table' || !options.pagination) {
    return data;
  }

  const page = options.pagination.page;
  const pageSize = options.pagination.pageSize;
  const offset = (page - 1) * pageSize;

  return {
    ...data,
    rows: data.rows.slice(offset, offset + pageSize),
    pagination: {
      page,
      pageSize,
      total: data.rows.length,
      totalPages: Math.max(Math.ceil(data.rows.length / pageSize), 1),
    },
  };
}

async function getQueryWidgetData(
  adminforth: IAdminForth,
  query: QueryConfig,
  variables: DashboardVariables,
): Promise<DashboardWidgetData> {
  if (isStepsQuery(query)) {
    return getStepsQueryData(adminforth, query, variables);
  }

  const metricSelect = getSingleAggregateMetricSelect(query);

  if (metricSelect) {
    return getMetricWidgetData(adminforth, query, metricSelect);
  }

  const selectedRows = isAggregateQuery(query)
    ? await buildAggregateQueryRows(adminforth, query, variables)
    : buildPlainQueryRows(
      await getResourceRows(adminforth, query.resource, query.filters, getBackendSort(query.order_by)),
      query,
      variables,
    );
  const orderedRows = sortRows(selectedRows, query.order_by);
  const slicedRows = typeof query.limit === 'number'
    ? orderedRows.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit)
    : orderedRows.slice(query.offset ?? 0);
  const columns = getColumns(slicedRows, query);

  if (isAggregateQuery(query)) {
    const values = slicedRows.length === 1 ? slicedRows[0] : undefined;

    return {
      kind: 'aggregate',
      columns,
      rows: slicedRows,
      ...(values ? { values } : {}),
    };
  }

  return {
    kind: 'table',
    columns,
    rows: slicedRows,
  };
}

async function getStepsQueryData(
  adminforth: IAdminForth,
  query: Extract<QueryConfig, { source: 'steps' }>,
  variables: DashboardVariables,
): Promise<DashboardWidgetData> {
  const rows = await Promise.all(query.steps.map(async (step) => {
    const select = getStepSelect(step);
    const [values = {}] = await getAggregateRows(
      adminforth,
      step.resource,
      step.filters,
      select,
      [],
    );
    const row = buildCalculatedRow({
      name: step.name,
      resource: step.resource,
      ...values,
    }, select, query.calcs, variables);

    return row;
  }));
  const orderedRows = sortRows(rows, query.order_by);
  const slicedRows = typeof query.limit === 'number'
    ? orderedRows.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit)
    : orderedRows.slice(query.offset ?? 0);
  const columns = Array.from(new Set([
    'name',
    'resource',
    ...query.steps.flatMap((step) => getStepSelect(step).map((item) => item.as)),
    ...(query.calcs ?? []).map((item) => item.as),
  ]));

  return {
    kind: 'aggregate',
    columns,
    rows: slicedRows,
  };
}

async function getMetricWidgetData(
  adminforth: IAdminForth,
  query: ResourceQueryConfig,
  metric: QueryAggregateSelectItem,
): Promise<DashboardWidgetData> {
  const [currentValues = {}] = await getAggregateRows(
    adminforth,
    query.resource,
    query.filters,
    [metric],
    [],
  );
  const values: Record<string, unknown> = {
    [metric.as]: currentValues[metric.as] ?? 0,
  };

  const rows = query.sparkline
    ? await getMetricSparklineRows(adminforth, query, metric, getAdminForthFilters(query.filters))
    : [values];
  const columns = Array.from(new Set([
    metric.as,
    ...(query.sparkline ? [query.sparkline.as] : []),
  ]));

  return {
    kind: 'aggregate',
    columns,
    rows,
    values,
  };
}

async function getMetricSparklineRows(
  adminforth: IAdminForth,
  query: ResourceQueryConfig,
  metric: QueryAggregateSelectItem,
  filters: DashboardWidgetFilters,
) {
  const sparkline = query.sparkline!;
  const groupBy = [{
    field: sparkline.field,
    as: sparkline.as,
    grain: sparkline.grain,
  }];
  const rows = await getAggregateRows(
    adminforth,
    query.resource,
    filters,
    [metric],
    groupBy,
  );

  return rows.map((row) => ({
    ...query.sparkline?.fill_missing,
    ...row,
  }));
}

async function getResourceRows(
  adminforth: IAdminForth,
  resourceId: string,
  filters: FilterExpression | undefined,
  sort?: IAdminForthSort | IAdminForthSort[],
) {
  return adminforth.resource(resourceId).list(
    getAdminForthFilters(filters),
    undefined,
    0,
    sort,
  );
}

function buildPlainQueryRows(rows: Record<string, unknown>[], query: ResourceQueryConfig, variables: DashboardVariables) {
  const select = query.select ?? getDefaultSelect(rows);
  return rows.map((row) => buildPlainRow(row, select, query.calcs, variables));
}

async function buildAggregateQueryRows(
  adminforth: IAdminForth,
  query: ResourceQueryConfig,
  variables: DashboardVariables,
) {
  const select = query.select ?? [];
  const effectiveGroupBy = getEffectiveGroupBy(query.group_by, select);
  const aggregateSelect = select.filter(isAggregateSelectItem);
  const rows = await getAggregateRows(
    adminforth,
    query.resource,
    query.filters,
    aggregateSelect,
    effectiveGroupBy,
  );

  return rows.map((row) => buildCalculatedRow(row, select, query.calcs, variables));
}

async function getAggregateRows(
  adminforth: IAdminForth,
  resourceId: string,
  baseFilters: FilterExpression | DashboardWidgetFilters | undefined,
  select: QueryAggregateSelectItem[],
  groupBy: EffectiveGroupByItem[],
) {
  const resource = adminforth.resource(resourceId) as unknown as AggregateResource;
  const groups = new Map<string, Record<string, unknown>>();
  const groupByRules = groupBy.length ? groupBy.map(toAggregateGroupByRule) : undefined;
  const aggregateSelectGroups = groupAggregateSelectItems(select);

  if (groupBy.length) {
    const groupSeedAlias = getHiddenAggregateAlias(groupBy, select);
    const groupSeedRows = await resource.aggregate(
      getAdminForthFilters(baseFilters),
      { [groupSeedAlias]: { operation: 'count' } },
      groupByRules,
    );

    for (const row of groupSeedRows) {
      ensureAggregateGroup(groups, row, groupBy);
    }
  }

  for (const filterGroup of aggregateSelectGroups) {
    const rows = await resource.aggregate(
      mergeFilters(baseFilters, filterGroup.filters),
      Object.fromEntries(filterGroup.items.map((item) => [item.as, toAggregationRule(item)])),
      groupByRules,
    );

    for (const row of rows) {
      const values = ensureAggregateGroup(groups, row, groupBy);

      for (const item of filterGroup.items) {
        values[item.as] = row[item.as] ?? 0;
      }
    }
  }

  if (!groups.size && !groupBy.length && select.length) {
    groups.set(JSON.stringify({}), {});
  }

  return Array.from(groups.values(), (row) => applyAggregateDefaults(row, select));
}

function buildCalculatedRow(
  baseValues: Record<string, unknown>,
  select: QuerySelectItem[],
  calcs: QueryCalcSelectItem[] = [],
  variables: DashboardVariables,
) {
  const values: Record<string, unknown> = { ...baseValues };

  for (const item of [...select.filter(isCalcSelectItem), ...calcs]) {
    values[item.as] = evaluateCalc(item.calc, values, variables);
  }

  return values;
}

function buildPlainRow(
  row: Record<string, unknown>,
  select: QuerySelectItem[],
  calcs: QueryCalcSelectItem[] = [],
  variables: DashboardVariables,
) {
  const values: Record<string, unknown> = {};

  for (const item of select) {
    if (isFieldSelectItem(item)) {
      values[item.as ?? item.field] = item.grain
        ? formatGroupValue(row[item.field], item.grain)
        : row[item.field];
    }
  }

  for (const item of [...select.filter(isCalcSelectItem), ...calcs]) {
    values[item.as] = evaluateCalc(item.calc, values, variables);
  }

  return values;
}

function evaluateCalc(calc: string, values: Record<string, unknown>, variables: DashboardVariables) {
  const expression = calc
    .replace(LOOKUP_CALL_RE, (_match, path: string, keyField: string, defaultValue: string) => {
      const map = resolveVariablePath(variables, path);
      const key = String(values[keyField] ?? '');

      return String(toFiniteNumber(isRecord(map) && Object.prototype.hasOwnProperty.call(map, key)
        ? map[key]
        : Number(defaultValue)));
    })
    .replace(CALC_IDENTIFIER_RE, (name) => String(toFiniteNumber(values[name])));

  if (!SAFE_CALC_EXPRESSION_RE.test(expression)) {
    throw new Error(`Unsupported calc expression: ${calc}`);
  }

  return Function(`"use strict"; return (${expression});`)();
}

function resolveVariablePath(variables: DashboardVariables, path: string) {
  return path
    .replace(VARIABLE_PATH_PREFIX_RE, '')
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, segment) => isRecord(current) ? current[segment] : undefined, variables);
}

function sortRows(rows: Record<string, unknown>[], orderBy: QueryOrderByItem[] = []) {
  if (!orderBy.length) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const order of orderBy) {
      const direction = order.direction === 'asc' ? 1 : -1;
      const result = compareValues(left[order.field], right[order.field]);

      if (result !== 0) {
        return result * direction;
      }
    }

    return 0;
  });
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function getBackendSort(orderBy: QueryOrderByItem[] | undefined) {
  if (!orderBy?.length) {
    return undefined;
  }

  return orderBy.map((order) => order.direction === 'asc'
    ? Sorts.ASC(order.field)
    : Sorts.DESC(order.field));
}

function getColumns(rows: Record<string, unknown>[], query: ResourceQueryConfig) {
  const selectColumns = [
    ...(query.group_by ?? []).map(getGroupByAlias),
    ...(query.select ?? []).map(getSelectAlias),
    ...(query.calcs ?? []).map((item) => item.as),
  ].filter(Boolean);

  return Array.from(new Set(selectColumns.length ? selectColumns : Object.keys(rows[0] ?? {})));
}

function getDefaultSelect(rows: Record<string, unknown>[]): QuerySelectItem[] {
  return Object.keys(rows[0] ?? {}).map((field) => ({ field }));
}

function isAggregateQuery(query: ResourceQueryConfig) {
  return Boolean(
    query.group_by?.length
    || query.select?.some((item) => isAggregateSelectItem(item)),
  );
}

function getSingleAggregateMetricSelect(query: ResourceQueryConfig) {
  if (query.group_by?.length) {
    return undefined;
  }

  const select = query.select ?? [];
  const aggregateItems = select.filter(isAggregateSelectItem);

  if (aggregateItems.length !== 1 || aggregateItems.length !== select.length) {
    return undefined;
  }

  return aggregateItems[0];
}

function isStepsQuery(query: QueryConfig): query is Extract<QueryConfig, { source: 'steps' }> {
  return query.source === 'steps';
}

function getStepSelect(step: StepsQueryStepConfig): QueryAggregateSelectItem[] {
  return 'select' in step ? step.select : [step.metric];
}

function isFieldSelectItem(item: QuerySelectItem): item is QueryFieldSelectItem {
  return 'field' in item && !('agg' in item);
}

function isAggregateSelectItem(item: QuerySelectItem): item is QueryAggregateSelectItem {
  return 'agg' in item;
}

function isCalcSelectItem(item: QuerySelectItem): item is QueryCalcSelectItem {
  return 'calc' in item;
}

function getSelectAlias(item: QuerySelectItem) {
  if (isFieldSelectItem(item)) {
    return item.as ?? item.field;
  }

  return item.as;
}

function getGroupByAlias(item: QueryGroupByItem) {
  return typeof item === 'string' ? item : item.as ?? item.field;
}

function getEffectiveGroupBy(groupBy: QueryGroupByItem[] | undefined, select: QuerySelectItem[]) {
  if (groupBy?.length) {
    return groupBy.map((item) => normalizeGroupByItem(item));
  }

  return select
    .filter(isFieldSelectItem)
    .map((item) => normalizeGroupByItem({ field: item.field, as: item.as, grain: item.grain }));
}

function normalizeGroupByItem(item: QueryGroupByItem | Pick<QueryFieldSelectItem, 'field' | 'as' | 'grain'>): EffectiveGroupByItem {
  if (typeof item === 'string') {
    return { field: item, as: item };
  }

  return {
    field: item.field,
    as: item.as ?? item.field,
    grain: item.grain,
    timezone: 'timezone' in item ? item.timezone : undefined,
  };
}

function toAggregateGroupByRule(item: EffectiveGroupByItem): AggregateGroupByRule {
  if (item.grain) {
    return {
      type: 'date_trunc',
      field: item.field,
      truncation: item.grain,
      timezone: item.timezone,
      as: item.as,
    };
  }

  return {
    type: 'field',
    field: item.field,
    as: item.as,
  };
}

function toAggregationRule(item: QueryAggregateSelectItem): AggregateRule {
  switch (item.agg) {
    case 'count':
      return { operation: 'count' };
    case 'count_distinct':
      return { operation: 'count_distinct', field: item.field! };
    case 'sum':
      return { operation: 'sum', field: item.field! };
    case 'avg':
      return { operation: 'avg', field: item.field! };
    case 'min':
      return { operation: 'min', field: item.field! };
    case 'max':
      return { operation: 'max', field: item.field! };
    case 'median':
      return { operation: 'median', field: item.field! };
  }
}

function extractAggregateGroupValues(row: Record<string, unknown>, groupBy: EffectiveGroupByItem[]) {
  return Object.fromEntries(groupBy.map((item) => [
    item.as,
    formatGroupValue(row[item.as], item.grain),
  ]));
}

function ensureAggregateGroup(
  groups: Map<string, Record<string, unknown>>,
  row: Record<string, unknown>,
  groupBy: EffectiveGroupByItem[],
) {
  const groupValues = groupBy.length ? extractAggregateGroupValues(row, groupBy) : {};
  const key = JSON.stringify(groupValues);
  const existingGroup = groups.get(key);

  if (existingGroup) {
    return existingGroup;
  }

  groups.set(key, groupValues);
  return groupValues;
}

function applyAggregateDefaults(values: Record<string, unknown>, select: QueryAggregateSelectItem[]) {
  for (const item of select) {
    if (typeof values[item.as] === 'undefined') {
      values[item.as] = 0;
    }
  }

  return values;
}

function groupAggregateSelectItems(select: QueryAggregateSelectItem[]) {
  const groups = new Map<string, {
    filters: DashboardWidgetFilters;
    items: QueryAggregateSelectItem[];
  }>();

  for (const item of select) {
    const filters = getAdminForthFilters(item.filters);
    const key = getFilterCacheKey(filters);
    const group = groups.get(key) ?? { filters, items: [] };

    group.items.push(item);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function getFilterCacheKey(filters: DashboardWidgetFilters) {
  if (Array.isArray(filters) && !filters.length) {
    return '__base__';
  }

  return JSON.stringify(filters);
}

function mergeFilters(...filters: Array<FilterExpression | DashboardWidgetFilters | undefined>) {
  const merged: Array<IAdminForthSingleFilter | IAdminForthAndOrFilter> = [];

  for (const filter of filters) {
    const normalized = getAdminForthFilters(filter);

    if (Array.isArray(normalized)) {
      merged.push(...normalized);
      continue;
    }

    if (normalized) {
      merged.push(normalized);
    }
  }

  if (!merged.length) {
    return [] as DashboardWidgetFilters;
  }

  return merged.length === 1 ? merged[0] : merged;
}

function getHiddenAggregateAlias(groupBy: EffectiveGroupByItem[], select: QueryAggregateSelectItem[]) {
  const usedAliases = new Set([
    ...groupBy.map((item) => item.as),
    ...select.map((item) => item.as),
  ]);
  let alias = '__adminforth_dashboard_group_seed__';

  while (usedAliases.has(alias)) {
    alias = `_${alias}`;
  }

  return alias;
}

function formatGroupValue(value: unknown, grain: TimeGrain | undefined) {
  if (!grain) {
    return value;
  }

  const date = new Date(String(value));

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  if (grain === 'year') {
    return `${date.getUTCFullYear()}`;
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  if (grain === 'month') {
    return `${date.getUTCFullYear()}-${month}`;
  }

  const day = String(date.getUTCDate()).padStart(2, '0');

  if (grain === 'week') {
    const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    return weekStart.toISOString().slice(0, 10);
  }

  if (grain === 'day') {
    return `${date.getUTCFullYear()}-${month}-${day}`;
  }

  return value;
}

function getAdminForthFilters(filters: FilterExpression | DashboardWidgetFilters | undefined): DashboardWidgetFilters {
  if (Array.isArray(filters)) {
    return filters.map((filter) => isDashboardFilterExpression(filter)
      ? toAdminForthFilter(filter)
      : filter);
  }

  if (isDashboardFilterExpression(filters)) {
    return toAdminForthFilter(filters);
  }

  if (filters) {
    return filters;
  }

  return [];
}

function isDashboardFilterExpression(value: unknown): value is FilterExpression {
  if (Array.isArray(value)) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return 'and' in value
    || 'or' in value
    || 'eq' in value
    || 'neq' in value
    || 'gt' in value
    || 'gte' in value
    || 'lt' in value
    || 'lte' in value
    || 'in' in value
    || 'not_in' in value
    || 'like' in value
    || 'ilike' in value;
}

function toAdminForthFilter(filter: FilterExpression): IAdminForthSingleFilter | IAdminForthAndOrFilter {
  if (Array.isArray(filter)) {
    return Filters.AND(filter.map((item) => toAdminForthFilter(item)));
  }

  if ('and' in filter) {
    return Filters.AND(filter.and.map((item) => toAdminForthFilter(item)));
  }

  if ('or' in filter) {
    return Filters.OR(filter.or.map((item) => toAdminForthFilter(item)));
  }

  for (const [operator, createFilter] of Object.entries(FILTER_OPERATORS)) {
    if (Object.prototype.hasOwnProperty.call(filter, operator)) {
      return createFilter(filter.field, resolveFilterValue(filter[operator as keyof typeof FILTER_OPERATORS]));
    }
  }

  return Filters.AND([]);
}

function resolveFilterValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveFilterValue(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (value.now === true) {
    return new Date().toISOString();
  }

  if (typeof value.now_minus === 'string') {
    return subtractDuration(new Date(), value.now_minus).toISOString();
  }

  return value;
}

function subtractDuration(now: Date, duration: string) {
  const match = duration.match(RELATIVE_DURATION_RE);

  if (!match) {
    throw new Error(`Unsupported relative date duration: ${duration}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const date = new Date(now);

  if (unit === 'h') {
    date.setUTCHours(date.getUTCHours() - amount);
  } else if (unit === 'd') {
    date.setUTCDate(date.getUTCDate() - amount);
  } else if (unit === 'w') {
    date.setUTCDate(date.getUTCDate() - amount * 7);
  } else if (unit === 'mo') {
    date.setUTCMonth(date.getUTCMonth() - amount);
  } else if (unit === 'y') {
    date.setUTCFullYear(date.getUTCFullYear() - amount);
  }

  return date;
}

function toFiniteNumber(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

export function createWidgetDataService(adminforth: IAdminForth): WidgetDataService {
  return {
    getWidgetData: (widget, options) => getWidgetData(adminforth, widget, options),
  };
}
