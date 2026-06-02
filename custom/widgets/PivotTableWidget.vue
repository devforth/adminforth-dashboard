<template>
  <div class="mt-3 flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-lightListBorder bg-lightTableBackground dark:border-darkListBorder dark:bg-darkTableBackground">
    <div
      v-if="isLoading"
      class="p-4 text-sm text-lightListTableText dark:text-darkListTableText"
    >
      Loading...
    </div>

    <div
      v-else-if="error"
      class="p-4 text-sm text-lightInputErrorColor"
    >
      Failed to load pivot data
    </div>

    <div
      v-else-if="!pivotRows.length"
      class="p-4 text-sm text-lightListTableText dark:text-darkListTableText"
    >
      No data available
    </div>

    <div
      v-else
      class="min-h-0 flex-1 overflow-auto"
    >
      <table class="min-w-max w-full border-collapse text-left text-sm">
        <thead class="bg-lightTableHeadingBackground text-xs uppercase text-lightTableHeadingText dark:bg-darkTableHeadingBackground dark:text-darkTableHeadingText">
          <tr>
            <th class="px-3 py-2 font-semibold">
              {{ rowField }}
            </th>
            <th
              v-for="column in pivotColumnLabels"
              :key="column"
              class="px-3 py-2 text-right font-semibold"
            >
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in pivotRows"
            :key="String(row.label)"
            class="border-t border-lightListBorder odd:bg-lightTableOddBackground even:bg-lightTableEvenBackground dark:border-darkListBorder odd:dark:bg-darkTableOddBackground even:dark:bg-darkTableEvenBackground"
          >
            <td class="px-3 py-2 font-medium text-lightNavbarText dark:text-darkNavbarText">
              {{ row.label }}
            </td>
            <td
              v-for="column in pivotColumnLabels"
              :key="column"
              class="px-3 py-2 text-right text-lightListTableText dark:text-darkListTableText"
            >
              {{ formatChartValue(typeof row[column] === 'number' ? row[column] : 0) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../queries/useWidgetData.js'
import {
  getFieldRefField,
} from '../model/dashboard.types.js'
import type { DashboardWidgetConfig, DashboardWidgetData } from '../model/dashboard.types.js'
import { formatChartLabel, formatChartValue, toFiniteNumber } from './chart/chart.utils.js'

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

