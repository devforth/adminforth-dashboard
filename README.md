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
| `size` | Preset width: `small`, `medium`, `large`, `wide`, or `full`. |
| `width`, `height`, `min_width`, `max_width` | Optional explicit layout constraints. |
| `query` | Data query definition. |

## Widget Support Matrix

| Widget target | Config field | Main settings | Data usage |
| --- | --- | --- | --- |
| `table` | `table` | `pagination`, `page_size`, `columns` | Uses `query` to display raw or aggregate rows. |
| `chart` | `chart` | `type`, `x`, `y`, `label`, `value`, `series`, `buckets`, `color`, `colors` | Uses `query`; funnel charts use `query.steps`. |
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

Funnel charts use a steps query:

```yaml
target: chart
chart:
  type: funnel
  title: Sales funnel
query:
  steps:
    - name: Leads
      resource: leads
      metric:
        agg: count
        as: value
    - name: Customers
      resource: orders
      metric:
        agg: count_distinct
        field: customer_id
        as: value
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
