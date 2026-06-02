const SNAKE_TO_INTERNAL_KEY_MAP: Record<string, string> = {
  group_by: 'groupBy',
  order_by: 'orderBy',
  time_series: 'timeSeries',
  page_size: 'pageSize',
  min_width: 'minWidth',
  max_width: 'maxWidth',
  value_field: 'valueField',
  target_value: 'targetValue',
  target_field: 'targetField',
}

const INTERNAL_TO_SNAKE_KEY_MAP = Object.fromEntries(
  Object.entries(SNAKE_TO_INTERNAL_KEY_MAP).map(([snakeKey, internalKey]) => [internalKey, snakeKey]),
)

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function remapDashboardConfigKeys(
  value: unknown,
  keyMap: Record<string, string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => remapDashboardConfigKeys(item, keyMap))
  }

  if (!isPlainObject(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      keyMap[key] ?? key,
      remapDashboardConfigKeys(nestedValue, keyMap),
    ]),
  )
}

export function toInternalDashboardConfigShape(value: unknown): unknown {
  return remapDashboardConfigKeys(value, SNAKE_TO_INTERNAL_KEY_MAP)
}

export function toSnakeDashboardConfigShape(value: unknown): unknown {
  return remapDashboardConfigKeys(value, INTERNAL_TO_SNAKE_KEY_MAP)
}