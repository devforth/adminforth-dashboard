<template>
  <div class="flex h-full min-h-0 flex-col">
    <WidgetState
      :is-loading="isLoading"
      :error="error ? errorMessage : ''"
      :is-empty="!tableData?.rows.length"
    >
      <!-- the table reaches the edges of the card, so its row lines run through the whole card -->
      <div class="-mx-4 -mb-4 flex min-h-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="af-dashboard-table w-full min-w-max border-collapse text-left text-[13px] text-lightTableText dark:text-darkTableText">
            <thead class="sticky top-0 bg-lightCardBackground dark:bg-darkCardBackground">
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.field"
                  class="border-b border-lightTableBorder px-4 py-2 text-xs font-medium text-lightTableHeadingText dark:border-darkTableBorder dark:text-darkTableHeadingText"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, index) in tableData!.rows"
                :key="`${currentPage}-${index}`"
                class="border-b border-lightTableBorder last:border-b-0 dark:border-darkTableBorder"
              >
                <td
                  v-for="column in columns"
                  :key="column.field"
                  class="px-4 py-2.5"
                >
                  {{ formatCell(row[column.field]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="pagination"
          class="flex flex-wrap items-center justify-between gap-2 border-t border-lightTableBorder px-4 py-2 text-sm text-lightTablePaginationText dark:border-darkTableBorder dark:text-darkTablePaginationText"
        >
          <span class="tabular-nums">
            {{ pageStart }}–{{ pageEnd }} of {{ pagination.total }}
          </span>

          <div class="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              :disabled="currentPage <= 1 || isFetching"
              aria-label="Previous page"
              @click="currentPage -= 1"
            >
              <IconChevronLeft class="rtl:rotate-180" />
            </Button>

            <span class="flex items-center gap-1.5 px-1 tabular-nums">
              <input
                v-model.number="currentPageInput"
                type="number"
                min="1"
                :max="pagination.totalPages"
                class="dashboard-table-page-input h-7 rounded-default border border-lightInputBorder bg-lightInputBackground px-1 text-center text-sm text-lightInputText focus:border-lightInputFocusBorder focus:outline-none focus:ring-[3px] focus:ring-lightInputFocusRing dark:border-darkInputBorder dark:bg-darkInputBackground dark:text-darkInputText dark:focus:border-darkInputFocusBorder dark:focus:ring-darkInputFocusRing"
                :style="{ width: `${currentPageInputWidth}ch` }"
                :disabled="isFetching"
                aria-label="Current page"
                @blur="applyCurrentPageInput"
                @keydown.enter="applyCurrentPageInput"
              >
              <span>of {{ pagination.totalPages }}</span>
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              :disabled="currentPage >= pagination.totalPages || isFetching"
              aria-label="Next page"
              @click="currentPage += 1"
            >
              <IconChevronRight class="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </WidgetState>
  </div>
</template>



<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetData } from '../queries/useWidgetData.js'
import { getFieldRefField } from '../model/dashboard.types.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData, FieldRef } from '../model/dashboard.types.js'
import { Button } from '@/afcl'
import { IconChevronLeft, IconChevronRight } from '@iconify-prerendered/vue-lucide'
import WidgetState from './WidgetState.vue'
import { formatFieldName } from './chart/chart.utils.js'

type TableWidgetConfig = {
  columns?: FieldRef[]
  pagination?: boolean
  page_size?: number
}

const DEFAULT_PAGE_SIZE = 10

const props = defineProps<{
  dashboardSlug: string
  widget: DashboardWidgetConfig
}>()

const currentPage = ref(1)
const currentPageInput = ref(1)
const tableConfig = computed(() => props.widget.table as TableWidgetConfig | undefined)
const isPaginationEnabled = computed(() => tableConfig.value?.pagination !== false)
const pageSize = computed(() => tableConfig.value?.page_size ?? DEFAULT_PAGE_SIZE)
const dashboardSlugRef = computed(() => props.dashboardSlug)
const widgetIdRef = computed(() => props.widget.id)
const widgetDataRequest = computed(() => (
  isPaginationEnabled.value
    ? {
        pagination: {
          page: currentPage.value,
          pageSize: pageSize.value,
        },
      }
    : {}
))
const {
  data,
  isLoading,
  isFetching,
  error,
  errorMessage,
  refetch,
} = useWidgetData(dashboardSlugRef, widgetIdRef, widgetDataRequest)

watch(
  () => props.widget,
  () => {
    currentPage.value = 1
    void refetch()
  },
  { deep: true },
)

const tableData = computed(() => {
  return data.value?.data as DashboardWidgetTableData | null
})

const columns = computed(() => {
  const configuredColumns = tableConfig.value?.columns
  if (configuredColumns) {
    return configuredColumns.map((column) => {
      const field = getFieldRefField(column)!
      return { field, label: (typeof column === 'string' ? undefined : column.label) ?? formatFieldName(field) }
    })
  }

  return (tableData.value?.columns ?? []).map((field) => ({ field, label: formatFieldName(field) }))
})

const pagination = computed(() => tableData.value?.pagination)
const pageStart = computed(() => {
  if (!pagination.value || pagination.value.total === 0) {
    return 0
  }

  return (pagination.value.page - 1) * pagination.value.pageSize + 1
})
const pageEnd = computed(() => {
  if (!pagination.value) {
    return 0
  }

  return Math.min(pagination.value.page * pagination.value.pageSize, pagination.value.total)
})
const currentPageInputWidth = computed(() => {
  const digits = String(currentPageInput.value || currentPage.value).length
  return Math.max(digits + 3, 4)
})

watch(pagination, (nextPagination) => {
  if (nextPagination && currentPage.value > nextPagination.totalPages) {
    currentPage.value = nextPagination.totalPages
  }
})

watch(currentPage, (nextPage) => {
  currentPageInput.value = nextPage
})

function applyCurrentPageInput() {
  const totalPages = pagination.value?.totalPages ?? 1
  const page = Number.isFinite(currentPageInput.value) ? currentPageInput.value : currentPage.value
  currentPage.value = Math.min(Math.max(Math.trunc(page), 1), totalPages)
  currentPageInput.value = currentPage.value
}

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

<style scoped>
.dashboard-table-page-input::-webkit-outer-spin-button,
.dashboard-table-page-input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.dashboard-table-page-input {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
