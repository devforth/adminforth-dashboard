# @adminforth/dashboard

Dashboard plugin for AdminForth.

It adds configurable dashboard pages backed by an AdminForth resource. Dashboard records define groups and widgets, the plugin renders them under `/dashboard/:slug`, contributes a **Dashboards** sidebar group, and exposes endpoints for editing groups and widgets from the AdminForth UI.

Full setup guide: https://adminforth.dev/docs/tutorial/Plugins/dashboard/

## Editing access

Dashboard editing is limited to `superadmin` by default. Set `editRoles` when registering the plugin to allow other roles:

```ts
new DashboardPlugin({
  dashboardConfigsResourceId: 'dashboard_configs',
  editRoles: ['superadmin', 'developer'],
})
```

## Dashboard Config Shape

```ts
type DashboardConfig = {
  version: number
  groups: {
    id: string
    label: string
    order: number
  }[]
  widgets: DashboardWidgetConfig[]
}
```

Each widget has common fields:

| Field | Description |
| --- | --- |
| `id` | Persisted widget id. |
| `group_id` | Group where the widget is rendered. |
| `label` | Optional widget title. |
| `target` | Widget type: `table`, `chart`, `kpi_card`, `pivot_table`, or `gauge_card`. |
| `order` | Widget order inside its group. |
| `variables` | Optional widget variables passed to widget data loading. Variables are not available inside `query.calcs`. |
| `size` | Preset width: `small`, `medium`, `large`, `wide`, or `full`. |
| `width`, `height`, `min_width`, `max_width` | Optional explicit layout constraints. |
| `query` | Data query definition. |

## Widget Support Matrix

| Widget target | Config field | Main settings | Data usage |
| --- | --- | --- | --- |
| `table` | `table` | `pagination`, `page_size`, `columns` | Uses `query` to display raw or aggregate rows. |
| `chart` | `chart` | `type`, `x`, `y`, `label`, `value`, `series`, `buckets`, `color`, `colors` | Uses the same `query` shape for most chart types. Multi-resource charts use `query.source: steps`; add `query.bucket` for shared numeric buckets across resources. |
| `kpi_card` | `card` | `value`, `subtitle`, `comparison`, `sparkline` | Reads the first returned query row. |
| `gauge_card` | `card` | `value`, `target`, `progress`, `color` | Reads the first returned query row. |
| `pivot_table` | `pivot` | `rows`, `columns`, `values` | Uses query rows to build a pivot table. |

Chart widget types:

| Chart type | Notes |
| --- | --- |
| `line` | Uses `x` and `y`; `y` may contain multiple fields in config. |
| `pie` | Uses `label` and `value`. |
| `bar` | Uses `x` and `y`. |
| `stacked_bar` | Uses `x`, `y`, and `series`. |
| `funnel` | Uses `label`, `value`, and optional `colors`. Data comes from the same `query` shapes as every other chart. |
| `histogram` | Uses `x`, `y`, and optional `buckets`. Current histogram runtime support is single-resource only: provide raw rows for the numeric field and let `chart.buckets` derive counts on the frontend. For multi-resource bucket distributions, use `stacked_bar` with `query.source: steps` and `query.bucket`. |

## Query Shape

```ts
type QueryConfig = {
  source?: 'resource'
  resource: string
  select?: Array<
    | { field: string; as?: string; grain?: 'day' | 'week' | 'month' | 'year' }
    | { agg: 'sum' | 'count' | 'count_distinct' | 'avg' | 'min' | 'max' | 'median'; field?: string; as: string; filters?: DashboardFilter | DashboardFilter[] }
    | { calc: string; as: string }
  >
  filters?: DashboardFilter | DashboardFilter[]
  group_by?: Array<string | { field: string; as?: string; grain?: 'day' | 'week' | 'month' | 'year'; timezone?: string }>
  order_by?: Array<{ field: string; direction?: 'asc' | 'desc' }>
  limit?: number
  offset?: number
  bucket?: { field: string; buckets: Array<{ label: string; min?: number; max?: number }> }
  calcs?: Array<{ calc: string; as: string }>
  formatting?: Record<string, JsonValue>
} | {
  source: 'steps'
  steps: Array<{
    name: string
    resource: string
    select: Array<{ agg: 'sum' | 'count' | 'count_distinct' | 'avg' | 'min' | 'max' | 'median'; field?: string; as: string; filters?: DashboardFilter | DashboardFilter[] }>
    filters?: DashboardFilter | DashboardFilter[]
  }>
  calcs?: Array<{ calc: string; as: string }>
  order_by?: Array<{ field: string; direction?: 'asc' | 'desc' }>
  limit?: number
  offset?: number
  formatting?: Record<string, JsonValue>
}

`source: 'steps'` returns one aggregate row per step by default. Each step supports aggregate `select` items plus optional `filters`; it does not support per-step `field` selects, `calc` selects, or `group_by`. Add `query.bucket` when multiple resources need the same numeric buckets, for example a stacked bar distribution by price range.

type DashboardFilter =
  | { and: DashboardFilter[] }
  | { or: DashboardFilter[] }
  | {
      field: string
      eq?: FilterValue
      neq?: FilterValue
      gt?: FilterValue
      gte?: FilterValue
      lt?: FilterValue
      lte?: FilterValue
      in?: FilterValue[]
      not_in?: FilterValue[]
      like?: FilterValue
      ilike?: FilterValue
    }

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type RelativeDateValue = { now: true } | { now_minus: `${number}${'h' | 'd' | 'w' | 'mo' | 'y'}` }
type FilterValue = JsonValue | RelativeDateValue
```

Use `filters` for rolling date ranges. Do not hard-code dates for dashboards that should move with time:

```yaml
query:
  resource: orders
  filters:
    and:
      - field: created_at
        gte:
          now_minus: 30d
      - field: created_at
        lt:
          now: true
```

Multi-resource queries use `source: steps`. Each step uses `select`, even if it has only one aggregate:

```yaml
target: chart
label: Average price by database
chart:
  type: bar
  title: Average price by database
  x:
    field: name
  y:
    field: value
query:
  source: steps
  steps:
    - name: SQLite
      resource: cars_sl
      select:
        - agg: avg
          field: price
          as: value
    - name: MySQL
      resource: cars_mysql
      select:
        - agg: avg
          field: price
          as: value
```

Bucketed multi-resource queries use `query.bucket`. The dashboard runs each step once per bucket and returns rows with `label`, `name`, `resource`, and the selected aggregate aliases:

```yaml
target: chart
label: Cars by price range and database
chart:
  type: stacked_bar
  title: Cars by price range and database
  x:
    field: label
  y:
    field: count
  series:
    field: name
query:
  source: steps
  bucket:
    field: price
    buckets:
      - label: Budget
        max: 3500
      - label: Mid-range
        min: 3500
        max: 7000
      - label: Premium
        min: 7000
  steps:
    - name: SQLite
      resource: cars_sl
      select:
        - agg: count
          as: count
    - name: MySQL
      resource: cars_mysql
      select:
        - agg: count
          as: count
```

Cost calculation example:

```yaml
target: chart
label: Model costs
chart:
  type: stacked_bar
  title: GPT-5.4 costs by day
  x:
    field: day
  y:
    - field: input_cost
    - field: output_cost
    - field: cached_cost
query:
  resource: model_usage
  filters:
    and:
      - field: model
        eq: gpt-5.4
      - field: used_at
        gte:
          now_minus: 7d
      - field: used_at
        lt:
          now: true
  select:
    - field: used_at
      as: day
      grain: day
    - agg: sum
      field: input_tokens
      as: input_tokens
    - agg: sum
      field: output_tokens
      as: output_tokens
    - agg: sum
      field: cached_tokens
      as: cached_tokens
  group_by:
    - field: used_at
      as: day
      grain: day
  calcs:
    - calc: input_tokens / 1000000 * 2.5
      as: input_cost
    - calc: output_tokens / 1000000 * 15
      as: output_cost
    - calc: cached_tokens / 1000000 * 0.25
      as: cached_cost
```


## Runtime Structure

```text
DashboardPage.vue
└── DashboardRuntime.vue
    └── DashboardGroup.vue
        └── WidgetShell.vue
            └── WidgetRenderer.vue
                ├── TableWidget.vue
                ├── ChartWidget.vue
                ├── KpiCardWidget.vue
                ├── PivotTableWidget.vue
                └── GaugeCardWidget.vue
```

`DashboardPage.vue` loads a dashboard by slug, `DashboardRuntime.vue` renders ordered groups, `WidgetShell.vue` provides the widget frame and editor actions, and `WidgetRenderer.vue` selects the widget component by `target`.
