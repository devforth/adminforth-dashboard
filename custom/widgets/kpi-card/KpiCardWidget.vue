<script setup lang="ts">
import { computed, watch } from 'vue'
import { useWidgetData } from '../../queries/useWidgetData.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../../model/dashboard.types.js'
import { formatChartValue, toFiniteNumber } from '../chart/chart.utils.js'

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

const kpiConfig = computed(() => props.widget.kpi_card as {
  value_field?: string
  label_field?: string
  prefix?: string
  suffix?: string
} | undefined)
const widgetData = computed(() => data.value?.data as DashboardWidgetTableData | null)
const columns = computed(() => widgetData.value?.columns ?? [])
const firstRow = computed(() => widgetData.value?.rows[0] ?? {})
const valueField = computed(() => kpiConfig.value?.value_field || columns.value[0])
const labelField = computed(() => kpiConfig.value?.label_field)
const value = computed(() => toFiniteNumber(firstRow.value[valueField.value]))
const label = computed(() => labelField.value ? String(firstRow.value[labelField.value]) : props.widget.label)
const formattedValue = computed(() => `${kpiConfig.value?.prefix ?? ''}${formatChartValue(value.value)}${kpiConfig.value?.suffix ?? ''}`)
</script>

<template>
  <div class="mt-3 rounded-lg border border-lightListBorder bg-lightTableBackground p-4 dark:border-darkListBorder dark:bg-darkTableBackground">
    <div
      v-if="isLoading"
      class="text-sm text-lightListTableText dark:text-darkListTableText"
    >
      Loading...
    </div>

    <div
      v-else-if="error"
      class="text-sm text-lightInputErrorColor"
    >
      Failed to load KPI data
    </div>

    <div
      v-else
      class="grid gap-1"
    >
      <div class="text-3xl font-bold text-lightNavbarText dark:text-darkNavbarText">
        {{ formattedValue }}
      </div>
      <div class="text-sm text-lightListTableText dark:text-darkListTableText">
        {{ label }}
      </div>
    </div>
  </div>
</template>
