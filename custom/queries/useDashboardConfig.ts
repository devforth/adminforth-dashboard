import { ref, watch, type Ref } from 'vue'
import { dashboardApi } from '../api/dashboardApi.js'

export function useDashboardConfig(slug: Ref<string>) {
  const data = ref<Awaited<ReturnType<typeof dashboardApi.getDashboardConfig>> | null>(null)
  const isLoading = ref(false)
  const isFetching = ref(false)
  const error = ref<unknown>(null)

  async function refetch() {
    if (!slug.value) {
      data.value = null
      error.value = null
      return null
    }

    isFetching.value = true
    if (data.value === null) {
      isLoading.value = true
    }

    try {
      const response = await dashboardApi.getDashboardConfig(slug.value)
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
    slug,
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