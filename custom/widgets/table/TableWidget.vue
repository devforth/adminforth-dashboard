<template>
  <div class="overflow-hidden rounded-lg border border-lightListBorder bg-lightTableBackground dark:border-darkListBorder dark:bg-darkTableBackground">
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
      Failed to load table data
    </div>

    <div
      v-else-if="!tableData?.rows.length"
      class="p-4 text-sm text-lightListTableText dark:text-darkListTableText"
    >
      No data available
    </div>

    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-lightTableHeadingBackground text-xs uppercase text-lightTableHeadingText dark:bg-darkTableHeadingBackground dark:text-darkTableHeadingText">
          <tr>
            <th
              v-for="column in columns"
              :key="column"
              class="px-3 py-2 font-semibold"
            >
              {{ column }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in tableData.rows"
            :key="index"
            class="border-t border-lightListBorder odd:bg-lightTableOddBackground even:bg-lightTableEvenBackground dark:border-darkListBorder odd:dark:bg-darkTableOddBackground even:dark:bg-darkTableEvenBackground"
          >
            <td
              v-for="column in columns"
              :key="column"
              class="px-3 py-2 text-lightListTableText dark:text-darkListTableText"
            >
              {{ formatCell(row[column]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../../queries/useWidgetData.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../../model/dashboard.types.js'

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

const tableData = computed(() => {
  return data.value?.data as DashboardWidgetTableData | null
})

const columns = computed(() => {
  const configuredColumns = (props.widget.table as { columns?: string[] } | undefined)?.columns
  return configuredColumns ?? tableData.value?.columns ?? []
})

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}
</script>
