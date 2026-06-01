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
  FilterExpression,
  FunnelQueryConfig,
  QueryAggregateOperation,
  QueryAggregateSelectItem,
  QueryCalcSelectItem,
  QueryConfig,
  QueryFieldSelectItem,
  QueryGroupByItem,
  QueryOrderByItem,
  QuerySelectItem,
  TimeGrain,
} from '../custom/model/dashboard.types.js';

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

type QueryRowGroup = {
  rows: Record<string, unknown>[];
  values: Record<string, unknown>;
};

const NOW_MINUS_RE = /^(\d+)([dhw])$/;
const CALC_IDENTIFIER_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
const SAFE_CALC_EXPRESSION_RE = /^[\d+\-*/().\s]+$/;

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

  const data = 'steps' in widget.query
    ? await getFunnelWidgetData(adminforth, widget.query)
    : await getQueryWidgetData(adminforth, widget.query);

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

async function getFunnelWidgetData(
  adminforth: IAdminForth,
  query: FunnelQueryConfig,
): Promise<DashboardWidgetData> {
  const rows = await Promise.all(query.steps.map(async (step) => {
    const valueField = step.metric.as;
    const sourceRows = await getResourceRows(adminforth, step.resource, step.filters);

    return {
      name: step.name,
      [valueField]: calculateAggregate(sourceRows, step.metric),
    };
  }));

  return {
    kind: 'aggregate',
    columns: ['name', ...Array.from(new Set(query.steps.map((step) => step.metric.as)))],
    rows,
  };
}

async function getQueryWidgetData(
  adminforth: IAdminForth,
  query: QueryConfig,
): Promise<DashboardWidgetData> {
  const rows = await getResourceRows(adminforth, query.resource, query.filters, getBackendSort(query.orderBy));
  const selectedRows = buildQueryRows(rows, query);
  const orderedRows = sortRows(selectedRows, query.orderBy);
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

async function getResourceRows(
  adminforth: IAdminForth,
  resourceId: string,
  filters: unknown,
  sort?: IAdminForthSort | IAdminForthSort[],
) {
  return adminforth.resource(resourceId).list(
    normalizeFilters(filters),
    undefined,
    0,
    sort,
  );
}

function buildQueryRows(rows: Record<string, unknown>[], query: QueryConfig) {
  const select = query.select ?? getDefaultSelect(rows);
  const groupBy = query.groupBy ?? [];

  if (isAggregateQuery(query)) {
    return buildGroupedRows(rows, select, groupBy, query.calcs);
  }

  return rows.map((row) => buildPlainRow(row, select, query.calcs));
}

function buildGroupedRows(
  rows: Record<string, unknown>[],
  select: QuerySelectItem[],
  groupBy: QueryGroupByItem[],
  calcs: QueryCalcSelectItem[] = [],
) {
  const groups = new Map<string, QueryRowGroup>();
  const effectiveGroupBy = groupBy.length
    ? groupBy
    : select.filter(isFieldSelectItem).map((item) => ({ field: item.field, as: item.as, grain: item.grain }));

  if (!effectiveGroupBy.length) {
    const values = calculateGroupValues(rows, select, calcs);
    return Object.keys(values).length ? [values] : [];
  }

  for (const row of rows) {
    const values = Object.fromEntries(effectiveGroupBy.map((item) => {
      const field = getGroupByField(item);
      const alias = getGroupByAlias(item);
      const grain = getGroupByGrain(item);

      return [alias, formatGroupValue(row[field], grain)];
    }));
    const key = JSON.stringify(values);
    const group = groups.get(key) ?? { values, rows: [] };

    group.rows.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group.values,
    ...calculateGroupValues(group.rows, select, calcs),
  }));
}

function calculateGroupValues(
  rows: Record<string, unknown>[],
  select: QuerySelectItem[],
  calcs: QueryCalcSelectItem[],
) {
  const values: Record<string, unknown> = {};

  for (const item of select) {
    if (isAggregateSelectItem(item)) {
      const filteredRows = item.filters
        ? rows.filter((row) => matchesFilterExpression(row, item.filters as FilterExpression))
        : rows;

      values[item.as] = calculateAggregate(filteredRows, item);
    }
  }

  for (const item of [...select.filter(isCalcSelectItem), ...calcs]) {
    values[item.as] = evaluateCalc(item.calc, values);
  }

  return values;
}

function buildPlainRow(
  row: Record<string, unknown>,
  select: QuerySelectItem[],
  calcs: QueryCalcSelectItem[] = [],
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
    values[item.as] = evaluateCalc(item.calc, values);
  }

  return values;
}

function calculateAggregate(rows: Record<string, unknown>[], item: QueryAggregateSelectItem) {
  switch (item.agg) {
    case 'count':
      return rows.length;
    case 'count_distinct':
      return new Set(rows.map((row) => row[item.field!])).size;
    case 'sum':
      return aggregateNumbers(rows, item.field!, (values) => values.reduce((sum, value) => sum + value, 0));
    case 'avg':
      return aggregateNumbers(rows, item.field!, (values) => values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0);
    case 'min':
      return aggregateNumbers(rows, item.field!, (values) => values.length ? Math.min(...values) : 0);
    case 'max':
      return aggregateNumbers(rows, item.field!, (values) => values.length ? Math.max(...values) : 0);
    case 'median':
      return aggregateNumbers(rows, item.field!, calculateMedian);
    default:
      throw new Error(`Unsupported aggregation operation: ${(item as { agg: QueryAggregateOperation }).agg}`);
  }
}

function aggregateNumbers(
  rows: Record<string, unknown>[],
  field: string,
  aggregate: (values: number[]) => number,
) {
  return aggregate(rows.map((row) => toFiniteNumber(row[field])).filter(Number.isFinite));
}

function calculateMedian(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function evaluateCalc(calc: string, values: Record<string, unknown>) {
  const expression = calc.replace(CALC_IDENTIFIER_RE, (name) => String(toFiniteNumber(values[name])));

  if (!SAFE_CALC_EXPRESSION_RE.test(expression)) {
    throw new Error(`Unsupported calc expression: ${calc}`);
  }

  return Function(`"use strict"; return (${expression});`)();
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

function getColumns(rows: Record<string, unknown>[], query: QueryConfig) {
  const selectColumns = [
    ...(query.groupBy ?? []).map(getGroupByAlias),
    ...(query.select ?? []).map(getSelectAlias),
    ...(query.calcs ?? []).map((item) => item.as),
  ].filter(Boolean);

  return Array.from(new Set(selectColumns.length ? selectColumns : Object.keys(rows[0] ?? {})));
}

function getDefaultSelect(rows: Record<string, unknown>[]): QuerySelectItem[] {
  return Object.keys(rows[0] ?? {}).map((field) => ({ field }));
}

function isAggregateQuery(query: QueryConfig) {
  return Boolean(
    query.groupBy?.length
    || query.select?.some((item) => isAggregateSelectItem(item)),
  );
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

function getGroupByField(item: QueryGroupByItem) {
  return typeof item === 'string' ? item : item.field;
}

function getGroupByAlias(item: QueryGroupByItem) {
  return typeof item === 'string' ? item : item.as ?? item.field;
}

function getGroupByGrain(item: QueryGroupByItem) {
  return typeof item === 'string' ? undefined : item.grain;
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

  if (grain === 'quarter') {
    return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
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

  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}T${hour}:00:00.000Z`;
}

function normalizeFilters(filters: unknown): DashboardWidgetFilters {
  if (Array.isArray(filters)) {
    return filters.map((filter) => normalizeFilterNode(filter)) as DashboardWidgetFilters;
  }

  if (isRecord(filters)) {
    return normalizeFilterNode(filters);
  }

  return [];
}

function normalizeFilterNode(filter: unknown): IAdminForthSingleFilter | IAdminForthAndOrFilter {
  if (!isRecord(filter)) {
    return filter as IAdminForthSingleFilter;
  }

  if (Array.isArray(filter.and)) {
    return Filters.AND(filter.and.map((item) => normalizeFilterNode(item)));
  }

  if (Array.isArray(filter.or)) {
    return Filters.OR(filter.or.map((item) => normalizeFilterNode(item)));
  }

  if (typeof filter.field === 'string') {
    if (Object.prototype.hasOwnProperty.call(filter, 'eq')) {
      return Filters.EQ(filter.field, normalizeFilterValue(filter.eq));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'neq')) {
      return Filters.NEQ(filter.field, normalizeFilterValue(filter.neq));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'gt')) {
      return Filters.GT(filter.field, normalizeFilterValue(filter.gt));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'gte')) {
      return Filters.GTE(filter.field, normalizeFilterValue(filter.gte));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'lt')) {
      return Filters.LT(filter.field, normalizeFilterValue(filter.lt));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'lte')) {
      return Filters.LTE(filter.field, normalizeFilterValue(filter.lte));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'in')) {
      return Filters.IN(filter.field, normalizeFilterValue(filter.in));
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'not_in')) {
      return Filters.NOT_IN(filter.field, normalizeFilterValue(filter.not_in));
    }
  }

  return filter as IAdminForthSingleFilter | IAdminForthAndOrFilter;
}

function matchesFilterExpression(row: Record<string, unknown>, filter: FilterExpression): boolean {
  if (Array.isArray(filter)) {
    return filter.every((item) => matchesFilterExpression(row, item));
  }

  if ('and' in filter) {
    return filter.and.every((item) => matchesFilterExpression(row, item));
  }

  if ('or' in filter) {
    return filter.or.some((item) => matchesFilterExpression(row, item));
  }

  const value = row[filter.field];

  if (Object.prototype.hasOwnProperty.call(filter, 'eq')) {
    return value === normalizeFilterValue(filter.eq);
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'neq')) {
    return value !== normalizeFilterValue(filter.neq);
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'gt')) {
    return compareComparableValues(value, normalizeFilterValue(filter.gt)) > 0;
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'gte')) {
    return compareComparableValues(value, normalizeFilterValue(filter.gte)) >= 0;
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'lt')) {
    return compareComparableValues(value, normalizeFilterValue(filter.lt)) < 0;
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'lte')) {
    return compareComparableValues(value, normalizeFilterValue(filter.lte)) <= 0;
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'in')) {
    return filter.in?.includes(value) ?? false;
  }

  if (Object.prototype.hasOwnProperty.call(filter, 'not_in')) {
    return !(filter.not_in?.includes(value) ?? false);
  }

  return true;
}

function compareComparableValues(left: unknown, right: unknown) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function normalizeFilterValue(value: unknown) {
  if (!isRecord(value) || typeof value.now_minus !== 'string') {
    return value;
  }

  const match = value.now_minus.match(NOW_MINUS_RE);

  if (!match) {
    return value;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const date = new Date();

  if (unit === 'h') {
    date.setHours(date.getHours() - amount);
  } else if (unit === 'w') {
    date.setDate(date.getDate() - amount * 7);
  } else {
    date.setDate(date.getDate() - amount);
  }

  return date.toISOString();
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
