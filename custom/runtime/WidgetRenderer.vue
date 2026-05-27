<template>
  <div class="flex flex-col gap-1">
    <div
      v-if="isAdmin"
      class="text-xs font-bold uppercase tracking-normal text-lightListTableText dark:text-darkListTableText"
    >
      {{ widget.target }}
    </div>

    <div class="text-base font-semibold text-lightNavbarText dark:text-darkNavbarText">
      {{ widgetTitle }}
    </div>

    <TableWidget
      v-if="widget.target === 'table'"
      class="mt-3"
      :widget="widget"
      :dashboard-slug="dashboardSlug"
    />

    <ChartWidget
      v-if="widget.target === 'chart'"
      :widget="widget"
      :dashboard-slug="dashboardSlug"
    />

    <KpiCardWidget
      v-if="widget.target === 'kpi_card'"
      :widget="widget"
      :dashboard-slug="dashboardSlug"
    />

    <PivotTableWidget
      v-if="widget.target === 'pivot_table'"
      :widget="widget"
      :dashboard-slug="dashboardSlug"
    />

    <GaugeCardWidget
      v-if="widget.target === 'gauge_card'"
      :widget="widget"
      :dashboard-slug="dashboardSlug"
    />
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import ChartWidget from '../widgets/chart/ChartWidget.vue'
import GaugeCardWidget from '../widgets/gauge-card/GaugeCardWidget.vue'
import KpiCardWidget from '../widgets/kpi-card/KpiCardWidget.vue'
import PivotTableWidget from '../widgets/pivot-table/PivotTableWidget.vue'
import TableWidget from '../widgets/table/TableWidget.vue'
import type { DashboardWidgetConfig } from '../model/dashboard.types.js'

const props = defineProps<{
  widget: DashboardWidgetConfig
  dashboardSlug: string
  isAdmin: boolean
}>()

const widgetTitle = computed(() => {
  if (props.widget.label) {
    return props.widget.label
  }

  if (props.widget.target === 'empty') {
    return 'Empty widget'
  }

  if (props.widget.target === 'chart') {
    return props.widget.chart?.title || 'Untitled chart'
  }

  return props.widget.target.replaceAll('_', ' ')
})
</script>
