<template>
  <div class="min-h-full w-full">
    <div
      v-if="isLoading"
      class="p-6 text-sm text-lightListTableText dark:text-darkListTableText"
    >
      Loading dashboard...
    </div>

    <div
      v-else-if="error"
      class="p-6 text-sm text-lightInputErrorColor"
    >
      <div>Failed to load dashboard</div>

      <Button
        type="button"
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
      :is-admin="isAdmin"
      :is-refreshing="isFetching"
      @dashboard-updated="handleDashboardUpdated"
    />

    <div
      v-else
      class="dashboard-page__state"
    >
      Dashboard not found
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/afcl'
import { useCoreStore } from '@/stores/core'
import websocket from '@/websocket'
import { getDashboardConfigUpdatedTopic } from '../model/dashboardTopics.js'
import DashboardRuntime from './DashboardRuntime.vue'
import { useDashboardConfig } from '../queries/useDashboardConfig.js'

const route = useRoute()
const router = useRouter()
const coreStore = useCoreStore()

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

const isAdmin = computed(() => {
  return coreStore.adminUser?.dbUser.role === 'superadmin'
})

const subscribedTopic = ref<string | null>(null)

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
  if (subscribedTopic.value) {
    websocket.unsubscribe(subscribedTopic.value)
  }

  subscribedTopic.value = dashboardConfigUpdatedTopic.value
  websocket.subscribe(subscribedTopic.value, handleDashboardConfigUpdated)
}

watch(dashboardConfigUpdatedTopic, subscribeToDashboardUpdates)

onMounted(() => {
  subscribeToDashboardUpdates()
})

onUnmounted(() => {
  if (!subscribedTopic.value) {
    return
  }

  websocket.unsubscribe(subscribedTopic.value)
})
</script>
