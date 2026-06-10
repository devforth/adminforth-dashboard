import { Sorts } from 'adminforth';
import type {
  IAdminForth,
  IAdminForthSort,
} from 'adminforth';
import type {
  DashboardWidgetConfig,
  DashboardWidgetData,
  DashboardVariables,
  FilterExpression,
  QueryAggregateSelectItem,
  QueryCalcSelectItem,
  QueryBucketConfig,
  QueryConfig,
  QueryFieldSelectItem,
  QueryGroupByItem,
  QueryOrderByItem,
  ResourceQueryConfig,
  StepsQueryStepConfig,
  QuerySelectItem,
  TimeGrain,
} from '../custom/model/dashboard.types.js';
import {
  getAdminForthFilters,
  mergeFilters,
  type DashboardQueryFilters,
} from './dashboardFilterService.js';
import { evaluateCalc } from './calc-evaluator.js';

export type DashboardWidgetDataOptions = {
  pagination?: {
    page: number;
    pageSize: number;
  };
  variables?: DashboardVariables;
};

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
    filters: DashboardQueryFilters,
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

  const singleAggregateSelect = getSingleAggregateSelectItem(query);

  if (singleAggregateSelect) {
    return getSingleAggregateWidgetData(adminforth, query, singleAggregateSelect);
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
  if (query.bucket) {
    return getBucketedStepsQueryData(adminforth, query, query.bucket, variables);
  }

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

async function getBucketedStepsQueryData(
  adminforth: IAdminForth,
  query: Extract<QueryConfig, { source: 'steps' }>,
  bucketConfig: QueryBucketConfig,
  variables: DashboardVariables,
): Promise<DashboardWidgetData> {
  const rows = (await Promise.all(query.steps.map(async (step) => {
    const select = getStepSelect(step);
    const stepRows = await Promise.all(bucketConfig.buckets.map(async (bucket) => {
      const [values = {}] = await getAggregateRows(
        adminforth,
        step.resource,
        mergeFilters(step.filters, getBucketFilter(bucketConfig, bucket)),
        select,
        [],
      );

      return buildCalculatedRow({
        label: bucket.label,
        name: step.name,
        resource: step.resource,
        ...values,
      }, select, query.calcs, variables);
    }));

    return stepRows;
  }))).flat();
  const orderedRows = sortRows(rows, query.order_by);
  const slicedRows = typeof query.limit === 'number'
    ? orderedRows.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit)
    : orderedRows.slice(query.offset ?? 0);
  const columns = Array.from(new Set([
    'label',
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

async function getSingleAggregateWidgetData(
  adminforth: IAdminForth,
  query: ResourceQueryConfig,
  aggregate: QueryAggregateSelectItem,
): Promise<DashboardWidgetData> {
  const [currentValues = {}] = await getAggregateRows(
    adminforth,
    query.resource,
    query.filters,
    [aggregate],
    [],
  );
  const values: Record<string, unknown> = {
    [aggregate.as]: currentValues[aggregate.as] ?? 0,
  };

  const rows = query.sparkline
    ? await getSingleAggregateSparklineRows(adminforth, query, aggregate, getAdminForthFilters(query.filters))
    : [values];
  const columns = Array.from(new Set([
    aggregate.as,
    ...(query.sparkline ? [query.sparkline.as] : []),
  ]));

  return {
    kind: 'aggregate',
    columns,
    rows,
    values,
  };
}

async function getSingleAggregateSparklineRows(
  adminforth: IAdminForth,
  query: ResourceQueryConfig,
  aggregate: QueryAggregateSelectItem,
  filters: DashboardQueryFilters,
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
    [aggregate],
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
  baseFilters: FilterExpression | DashboardQueryFilters | undefined,
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

function getSingleAggregateSelectItem(query: ResourceQueryConfig) {
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

function getBucketFilter(
  bucketConfig: QueryBucketConfig,
  bucket: QueryBucketConfig['buckets'][number],
): FilterExpression | undefined {
  const filters: FilterExpression[] = [];

  if (typeof bucket.min === 'number') {
    filters.push({ field: bucketConfig.field, gte: bucket.min });
  }

  if (typeof bucket.max === 'number') {
    filters.push({ field: bucketConfig.field, lt: bucket.max });
  }

  return filters.length ? { and: filters } : undefined;
}

function getStepSelect(step: StepsQueryStepConfig): QueryAggregateSelectItem[] {
  return step.select;
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
    filters: DashboardQueryFilters;
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

function getFilterCacheKey(filters: DashboardQueryFilters) {
  if (Array.isArray(filters) && !filters.length) {
    return '__base__';
  }

  return JSON.stringify(filters);
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

export function createWidgetDataService(adminforth: IAdminForth): WidgetDataService {
  return {
    getWidgetData: (widget, options) => getWidgetData(adminforth, widget, options),
  };
}
