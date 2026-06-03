import { Filters } from 'adminforth';
import type {
  IAdminForthAndOrFilter,
  IAdminForthSingleFilter,
} from 'adminforth';
import type { FilterExpression } from '../custom/model/dashboard.types.js';

export type DashboardQueryFilters =
  | IAdminForthSingleFilter
  | IAdminForthAndOrFilter
  | Array<IAdminForthSingleFilter | IAdminForthAndOrFilter>;

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

export function getAdminForthFilters(filters: FilterExpression | DashboardQueryFilters | undefined): DashboardQueryFilters {
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

export function mergeFilters(...filters: Array<FilterExpression | DashboardQueryFilters | undefined>) {
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
    return [] as DashboardQueryFilters;
  }

  return merged.length === 1 ? merged[0] : merged;
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

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
