# @adminforth/dashboard

Dashboard plugin for AdminForth.

It adds configurable dashboard pages backed by an AdminForth resource. Dashboard records define groups and widgets, the plugin renders them under `/dashboard/:slug`, contributes a **Dashboards** sidebar group, and exposes endpoints for editing groups and widgets from the AdminForth UI.

Full setup guide: https://adminforth.dev/docs/tutorial/Plugins/dashboard/

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
| `variables` | Optional static maps/constants available inside widget `query.calcs` via `lookup($variables.path, field, default)`. |
| `size` | Preset width: `small`, `medium`, `large`, `wide`, or `full`. |
| `width`, `height`, `min_width`, `max_width` | Optional explicit layout constraints. |
| `query` | Data query definition. |

## Widget Support Matrix

| Widget target | Config field | Main settings | Data usage |
| --- | --- | --- | --- |
| `table` | `table` | `pagination`, `page_size`, `columns` | Uses `query` to display raw or aggregate rows. |
| `chart` | `chart` | `type`, `x`, `y`, `label`, `value`, `series`, `buckets`, `color`, `colors` | Uses `query`; step-based charts may use `query.steps` with optional `calcs`. |
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
| `funnel` | Uses `query.steps` and optional `label`, `value`, `colors`. |
| `histogram` | Uses `x`, `y`, and optional `buckets`. |

## Query Shape

```ts
type QueryConfig = {
  resource: string
  select?: Array<
    | { field: string; as?: string; grain?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' }
    | { agg: 'sum' | 'count' | 'count_distinct' | 'avg' | 'min' | 'max' | 'median'; field?: string; as: string; filters?: unknown }
    | { calc: string; as: string }
  >
  filters?: unknown
  group_by?: Array<string | { field: string; as?: string; grain?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'; timezone?: string }>
  order_by?: Array<{ field: string; direction?: 'asc' | 'desc' }>
  limit?: number
  offset?: number
}
```

Step-based chart queries use `steps` and may include `calcs`:

```yaml
target: chart
label: Average price by database
variables:
  price_multipliers:
    cars_sl: 0.84
    cars_mysql: 1.12
    cars_pg: 0.91
    cars_mongo: 1.07
    cars_ch: 0.76
chart:
  type: bar
  title: Average price by database
  x:
    field: name
  y:
    field: adjusted_value
query:
  steps:
    - name: SQLite
      resource: cars_sl
      metric:
        agg: avg
        field: price
        as: value
    - name: MySQL
      resource: cars_mysql
      metric:
        agg: avg
        field: price
        as: value
  calcs:
    - calc: value * lookup($variables.price_multipliers, resource, 1)
      as: adjusted_value
```

Widget-level variables example:

```yaml
target: chart
label: Model costs
variables:
  token_prices_per_1m:
    input:
      gpt-4.1: 2.00
      gpt-4.1-mini: 0.40
      gpt-4o-mini: 0.15
    output:
      gpt-4.1: 8.00
      gpt-4.1-mini: 1.60
      gpt-4o-mini: 0.60
    cached:
      gpt-4.1: 0.50
      gpt-4.1-mini: 0.10
      gpt-4o-mini: 0.075
chart:
  type: stacked_bar
  title: LLM costs by model
  x:
    field: model
  y:
    - field: input_cost
    - field: output_cost
    - field: cached_cost
query:
  resource: model_usage
  select:
    - field: model
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
    - model
  calcs:
    - calc: input_tokens / 1000000 * lookup($variables.token_prices_per_1m.input, model, 0)
      as: input_cost
    - calc: output_tokens / 1000000 * lookup($variables.token_prices_per_1m.output, model, 0)
      as: output_cost
    - calc: cached_tokens / 1000000 * lookup($variables.token_prices_per_1m.cached, model, 0)
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
