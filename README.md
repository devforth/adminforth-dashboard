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
| `width`, `height`, `minWidth`, `maxWidth` | Optional explicit layout constraints. |
| `dataSource` | Optional resource or aggregate data source definition. |
| `query` | Optional AdminForth resource query used to load widget data. |

## Widget Support Matrix

| Widget target | Config field | Main settings | Data usage |
| --- | --- | --- | --- |
| `table` | `table` | `columns`, `pagination`, `pageSize` | Uses `dataSource.type = 'resource'` or legacy `query` to display resource rows with backend pagination unless `pagination` is `false`. |
| `chart` | `chart` | `type`, `x_field`, `y_field`, `label_field`, `value_field`, `bucket_field`, `buckets`, `series`, `series_name`, `color`, `colors` | Supports legacy `query` or `dataSource.type = 'aggregate'` with `groupBy`. |
| `kpi_card` | `kpi_card` | `value_field`, `label_field`, `prefix`, `suffix` | Reads the first row or aggregate values and formats one numeric value. |
| `gauge_card` | `gauge_card` | `value_field`, `min`, `max`, `min_field`, `max_field`, `suffix`, `color` | Reads the first row or aggregate values and renders progress between static or field-driven bounds. |
| `pivot_table` | `pivot_table` | `row_field`, `column_field`, `value_field`, `aggregation` | Supports legacy row-based queries and grouped aggregate rows. `aggregation` supports `count` and `sum`. |

Chart widget types:

| Chart type | Notes |
| --- | --- |
| `line` | Uses `x_field` and `y_field`; optional `series_name` and `color`. |
| `pie` | Uses `label_field` and optional `value_field`; without `value_field`, rows are counted by label. |
| `bar` | Uses `label_field` and `value_field`, or `bucket_field` with `buckets`. |
| `stacked_bar` | Uses `x_field` and `series`; if `series` is omitted, non-x columns become series. |
| `funnel` | Uses `label_field`, `value_field`, and optional `colors`. |
| `histogram` | Uses the same bucket settings as `bar`. |

## Query Shape

```ts
type DashboardWidgetQuery = {
  resource: string
  select?: string[]
  order?: {
    field: string
    direction: 'asc' | 'desc'
  }
  limit?: number
}
```

`resource` is an AdminForth `resourceId`. The query is executed through AdminForth resources, so widgets use the same resource contracts as the rest of the application.

## Data Source Shape

```ts
type WidgetDataSource =
  | {
      type: 'resource'
      resourceId: string
      columns?: string[]
      filters?: unknown
      sort?: unknown
    }
  | {
      type: 'aggregate'
      resourceId: string
      aggregations: Record<string, {
        operation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median'
        field?: string
      }>
      groupBy?:
        | { type: 'field'; field: string }
        | {
            type: 'date_trunc'
            field: string
            truncation: 'day' | 'week' | 'month' | 'year'
            timezone?: string
          }
      filters?: unknown
    }
```

`query` remains supported for backwards compatibility. When both are present, widgets prefer `dataSource`.

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
