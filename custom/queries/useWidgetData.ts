import { ref, watch, type Ref } from 'vue'
import { dashboardApi, type DashboardWidgetDataRequest } from '../api/dashboardApi.js'

export function useWidgetData(
  slug: Ref<string>,
  widgetId: Ref<string>,
  request?: Ref<DashboardWidgetDataRequest>,
) {
  const data = ref<Awaited<ReturnType<typeof dashboardApi.getDashboardWidgetData>> | null>(null)
  const isLoading = ref(false)
  const isFetching = ref(false)
  const error = ref<unknown>(null)

  async function refetch() {
    if (!slug.value || !widgetId.value) {
      data.value = null
      error.value = null
      return null
    }

    isFetching.value = true
    if (data.value === null) {
      isLoading.value = true
    }

    try {
      const response = await dashboardApi.getDashboardWidgetData(slug.value, widgetId.value, request?.value)
      data.value = response
      error.value = null
      return response
    } catch (e) {
      error.value = e
      throw e
    } finally {
      isFetching.value = false
      isLoading.value = false
    }
  }

  watch(
    request ? [slug, widgetId, request] : [slug, widgetId],
    () => {
      void refetch()
    },
    { immediate: true },
  )

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}
