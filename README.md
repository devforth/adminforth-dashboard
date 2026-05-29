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
| `data_source` | Resource or aggregate data source definition. |

## Widget Support Matrix

| Widget target | Config field | Main settings | Data usage |
| --- | --- | --- | --- |
| `table` | `table` | `pagination`, `page_size` | Uses `data_source.type = 'resource'` to display resource rows with backend pagination unless `pagination` is `false`. |
| `chart` | `chart` | `type`, `x_field`, `y_field`, `label_field`, `value_field`, `bucket_field`, `buckets`, `series`, `series_name`, `color`, `colors` | Uses `data_source.type = 'aggregate'` with `group_by`. |
| `kpi_card` | `kpi_card` | `value_field`, `label_field`, `prefix`, `suffix` | Reads aggregate values or the first returned row from `data_source`. |
| `gauge_card` | `gauge_card` | `value_field`, `min`, `max`, `min_field`, `max_field`, `suffix`, `color` | Reads aggregate values or the first returned row from `data_source` and renders progress between static or field-driven bounds. |
| `pivot_table` | `pivot_table` | `row_field`, `column_field`, `value_field`, `aggregation` | Uses grouped aggregate rows from `data_source.type = 'aggregate'`. `aggregation` supports `count` and `sum`. |

Chart widget types:

| Chart type | Notes |
| --- | --- |
| `line` | Uses `x_field` and `y_field`; optional `series_name` and `color`. |
| `pie` | Uses `label_field` and optional `value_field`; without `value_field`, rows are counted by label. |
| `bar` | Uses `label_field` and `value_field`, or `bucket_field` with `buckets`. |
| `stacked_bar` | Uses `x_field` and `series`; if `series` is omitted, non-x columns become series. |
| `funnel` | Uses `label_field`, `value_field`, and optional `colors`. |
| `histogram` | Uses the same bucket settings as `bar`. |

## Data Source Shape

```ts
type WidgetDataSource =
  | {
      type: 'resource'
      resource_id: string
      columns?: string[]
      filters?: unknown
      sort?: unknown
    }
  | {
      type: 'aggregate'
      resource_id: string
      aggregations: Record<string, {
        operation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median'
        field?: string
      }>
      group_by?:
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

  `resource_id` is an AdminForth `resourceId`. The data source is executed through AdminForth resources, so widgets use the same resource contracts as the rest of the application.

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
