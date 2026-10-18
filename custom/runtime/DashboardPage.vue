<template>
  <div class="min-h-full w-full">
    <div
      v-if="isLoading"
      class="p-4"
      aria-busy="true"
    >
      <Skeleton class="h-6 w-48" />
      <div class="mt-9 flex flex-wrap gap-4">
        <Skeleton
          v-for="index in 3"
          :key="index"
          type="input"
          class="h-32 min-w-64 flex-1"
        />
      </div>
    </div>

    <div
      v-else-if="error"
      class="p-4"
    >
      <p class="text-sm text-lightDanger dark:text-darkDanger">
        Failed to load dashboard
      </p>

      <Button
        type="button"
        variant="secondary"
        class="mt-3"
        @click="refetch"
      >
        Retry
      </Button>
    </div>

    <DashboardRuntime
      v-else-if="dashboard"
      :dashboard-slug="dashboardSlug"
      :dashboard-id="dashboard.id"
      :label="dashboard.label"
      :config="dashboard.config"
      :revision="dashboard.revision"
      :can-edit="canEditDashboard"
      :is-refreshing="isFetching"
      @dashboard-updated="handleDashboardUpdated"
    />

    <p
      v-else
      class="p-4 text-sm text-lightCardDescription dark:text-darkCardDescription"
    >
      Dashboard not found
    </p>
  </div>
</template>



<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Skeleton } from '@/afcl'
import websocket from '@/websocket'
import { getDashboardConfigUpdatedTopic } from '../model/dashboardTopics.js'
import DashboardRuntime from './DashboardRuntime.vue'
import { useDashboardConfig } from '../queries/useDashboardConfig.js'

const route = useRoute()
const router = useRouter()

function getDashboardSlugFromRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    if (!value[0]) {
      throw new Error('Dashboard slug route param is required')
    }

    return value[0]
  }

  if (!value) {
    throw new Error('Dashboard slug route param is required')
  }

  return value
}

const dashboardSlug = computed(() => {
  return getDashboardSlugFromRouteParam(route.params.slug as string | string[] | undefined)
})

const {
  data: dashboard,
  isLoading,
  isFetching,
  error,
  refetch,
} = useDashboardConfig(dashboardSlug)

const canEditDashboard = computed(() => {
  return dashboard.value?.canEdit === true
})

let unsubscribeFromDashboardUpdates: (() => void) | null = null

const dashboardConfigUpdatedTopic = computed(() => {
  return getDashboardConfigUpdatedTopic(dashboardSlug.value)
})

function handleDashboardConfigUpdated(data: { slug?: string; revision?: number }) {
  if (data.slug && data.slug !== dashboardSlug.value) {
    return
  }

  if (typeof data.revision === 'number' && dashboard.value && data.revision <= dashboard.value.revision) {
    return
  }

  void refetch()
}

async function handleDashboardUpdated(updatedDashboard: { slug: string }) {
  if (updatedDashboard.slug !== dashboardSlug.value) {
    await router.replace(`/dashboard/${updatedDashboard.slug}`)
    return
  }

  await refetch()
}

function subscribeToDashboardUpdates() {
  unsubscribeFromDashboardUpdates?.()
  unsubscribeFromDashboardUpdates = websocket.subscribe(dashboardConfigUpdatedTopic.value, handleDashboardConfigUpdated)
}

watch(dashboardConfigUpdatedTopic, subscribeToDashboardUpdates)

onMounted(() => {
  subscribeToDashboardUpdates()
})

onUnmounted(() => {
  unsubscribeFromDashboardUpdates?.()
})
</script>
