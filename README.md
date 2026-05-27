# @adminforth/dashboard

Dashboard plugin for AdminForth.

DashboardPage.vue
  └── DashboardRuntime.vue
        ├── DashboardGroup.vue
        │     └── WidgetShell.vue
        │           └── WidgetRenderer.vue
        │                 ├── TableWidget.vue
        │                 ├── ChartWidget.vue
        │                 ├── KpiCardWidget.vue
        │                 ├── PivotTableWidget.vue
        │                 └── GaugeCardWidget.vue
        └── DashboardEditorPanel.vue

src/features/dashboards/

  runtime/
    DashboardPage.vue
    DashboardRuntime.vue
    DashboardGroup.vue
    WidgetShell.vue
    WidgetRenderer.vue

  widgets/
    registry.ts

    table/
      TableWidget.vue
      TableWidgetEditor.vue
      table.adapter.ts

    chart/
      ChartWidget.vue
      ChartWidgetEditor.vue
      chart.adapter.ts
      charts/
        PieChart.vue
        LineChart.vue
        BarChart.vue
        StackedBarChart.vue
        FunnelChart.vue
        HistogramChart.vue

    kpi-card/
      KpiCardWidget.vue
      KpiCardWidgetEditor.vue
      kpi.adapter.ts

    pivot-table/
      PivotTableWidget.vue
      PivotTableWidgetEditor.vue
      pivot.adapter.ts

    gauge-card/
      GaugeCardWidget.vue
      GaugeCardWidgetEditor.vue
      gauge.adapter.ts