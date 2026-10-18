<template>
  <div class="flex h-full min-h-0 flex-col">
    <WidgetState
      :is-loading="isLoading"
      :error="error ? errorMessage : ''"
      :is-empty="!pivotRows.length"
    >
      <!-- the table reaches the edges of the card, so its row lines run through the whole card -->
      <div class="-mx-4 -mb-4 min-h-0 flex-1 overflow-auto">
        <table class="af-dashboard-pivot-table w-full min-w-max border-collapse text-left text-[13px] text-lightTableText dark:text-darkTableText">
          <thead class="sticky top-0 bg-lightCardBackground dark:bg-darkCardBackground">
            <tr>
              <th class="border-b border-lightTableBorder px-4 py-2 text-xs font-medium text-lightTableHeadingText dark:border-darkTableBorder dark:text-darkTableHeadingText">
                {{ formatFieldName(rowField) }}
              </th>
              <th
                v-for="column in pivotColumnLabels"
                :key="column"
                class="border-b border-lightTableBorder px-4 py-2 text-right text-xs font-medium text-lightTableHeadingText dark:border-darkTableBorder dark:text-darkTableHeadingText"
              >
                {{ shouldRenderAggregateMatrix ? formatFieldName(column) : column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pivotRows"
              :key="String(row.label)"
              class="border-b border-lightTableBorder last:border-b-0 dark:border-darkTableBorder"
            >
              <td class="px-4 py-2.5 font-medium text-lightCardTitle dark:text-darkCardTitle">
                {{ row.label }}
              </td>
              <td
                v-for="column in pivotColumnLabels"
                :key="column"
                class="px-4 py-2.5 text-right tabular-nums"
              >
                {{ formatChartValue(typeof row[column] === 'number' ? row[column] : 0) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </WidgetState>
  </div>
</template>



<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../queries/useWidgetData.js'
import {
  getFieldRefField,
} from '../model/dashboard.types.js'
import type { DashboardWidgetConfig, DashboardWidgetData } from '../model/dashboard.types.js'
import { formatChartLabel, formatChartValue, formatFieldName, toFiniteNumber } from './chart/chart.utils.js'
import WidgetState from './WidgetState.vue'

const props = defineProps<{
  dashboardSlug: string
  widget: DashboardWidgetConfig
}>()

const dashboardSlugRef = computed(() => props.dashboardSlug)
const widgetIdRef = computed(() => props.widget.id)
const {
  data,
  isLoading,
  error,
  errorMessage,
  refetch,
} = useWidgetData(dashboardSlugRef, widgetIdRef)

watch(
  () => props.widget,
  () => {
    void refetch()
  },
  { deep: true },
)

const pivotConfig = computed(() => props.widget.target === 'pivot_table' ? props.widget.pivot : undefined)
const widgetData = computed(() => data.value?.data as DashboardWidgetData | null)
const rows = computed(() => widgetData.value?.rows ?? [])
const columns = computed(() => widgetData.value?.columns ?? [])
const isAggregateData = computed(() => widgetData.value?.kind === 'aggregate')
const shouldRenderAggregateMatrix = computed(() => isAggregateData.value && !pivotConfig.value?.columns?.length)
const rowField = computed(() => getFieldRefField(pivotConfig.value?.rows[0]) || columns.value[0])
const columnField = computed(() => getFieldRefField(pivotConfig.value?.columns?.[0]) || columns.value[1])
const valueConfig = computed(() => pivotConfig.value?.values[0])
const valueField = computed(() => valueConfig.value?.field || columns.value[2] || columns.value[1])
const aggregation = computed(() => valueConfig.value?.aggregation || (valueField.value ? 'sum' : 'count'))
const pivotColumnLabels = computed(() => {
  if (shouldRenderAggregateMatrix.value) {
    return columns.value.filter((column) => column !== rowField.value)
  }

  return Array.from(new Set(rows.value.map((row) => formatChartLabel(row[columnField.value]))))
})
const pivotRows = computed(() => {
  if (shouldRenderAggregateMatrix.value) {
    return rows.value.map((row) => {
      const item: Record<string, number | string> = {
        label: formatChartLabel(row[rowField.value]),
      }

      for (const column of pivotColumnLabels.value) {
        item[column] = toFiniteNumber(row[column])
      }

      return item
    })
  }

  const rowMap = new Map<string, Record<string, number | string>>()

  for (const row of rows.value) {
    const rowLabel = formatChartLabel(row[rowField.value])
    const columnLabel = formatChartLabel(row[columnField.value])
    const item = rowMap.get(rowLabel) ?? { label: rowLabel }
    const currentValue = typeof item[columnLabel] === 'number' ? item[columnLabel] : 0
    item[columnLabel] = currentValue + (aggregation.value === 'count' ? 1 : toFiniteNumber(row[valueField.value]))
    rowMap.set(rowLabel, item)
  }

  return Array.from(rowMap.values())
})
</script>
