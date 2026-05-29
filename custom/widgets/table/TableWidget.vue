<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-lightListBorder bg-lightTableBackground dark:border-darkListBorder dark:bg-darkTableBackground">
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
      class="flex min-h-0 flex-1 flex-col"
    >
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="min-w-max w-full border-collapse text-left text-sm">
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
              :key="`${currentPage}-${index}`"
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

      <div
        v-if="pagination"
        class="flex flex-wrap items-center justify-between gap-2 border-t border-lightListBorder px-3 py-2 text-sm text-lightListTableText dark:border-darkListBorder dark:text-darkListTableText"
      >
        <div>
          {{ pageStart }}-{{ pageEnd }} of {{ pagination.total }}
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded border border-lightListBorder text-sm disabled:opacity-45 dark:border-darkListBorder"
            :disabled="currentPage <= 1 || isFetching"
            @click="currentPage -= 1"
            aria-label="Previous page"
          >
            &lt;
          </button>

          <span class="flex items-center gap-1">
            <span>Page</span>
            <input
              v-model.number="currentPageInput"
              type="number"
              min="1"
              :max="pagination.totalPages"
              class="dashboard-table-page-input h-8 min-w-8 rounded border border-lightListBorder bg-lightTableBackground px-2 text-center text-sm text-lightListTableText dark:border-darkListBorder dark:bg-darkTableBackground dark:text-darkListTableText"
              :style="{ width: `${currentPageInputWidth}ch` }"
              :disabled="isFetching"
              aria-label="Current page"
              @blur="applyCurrentPageInput"
              @keydown.enter="applyCurrentPageInput"
            >
            <span>of {{ pagination.totalPages }}</span>
          </span>

          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded border border-lightListBorder text-sm disabled:opacity-45 dark:border-darkListBorder"
            :disabled="currentPage >= pagination.totalPages || isFetching"
            @click="currentPage += 1"
            aria-label="Next page"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWidgetData } from '../../queries/useWidgetData.js'
import type { DashboardWidgetConfig, DashboardWidgetTableData } from '../../model/dashboard.types.js'

type TableWidgetConfig = {
  columns?: string[]
  pagination?: boolean
  pageSize?: number
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
const pageSize = computed(() => tableConfig.value?.pageSize ?? DEFAULT_PAGE_SIZE)
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
  return configuredColumns ?? tableData.value?.columns ?? []
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
