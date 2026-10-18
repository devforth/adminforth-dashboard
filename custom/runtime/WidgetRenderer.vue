<template>
  <component
    :is="widgetComponent"
    v-if="widgetComponent"
    class="min-h-0 flex-1"
    :widget="widget"
    :dashboard-slug="dashboardSlug"
  />

  <p
    v-else
    class="text-sm text-lightCardDescription dark:text-darkCardDescription"
  >
    Edit YAML of this widget to choose what it shows.
  </p>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardWidgetConfig } from '../model/dashboard.types.js'
import { getWidgetRegistration } from '../widgets/registry.js'

const props = defineProps<{
  widget: DashboardWidgetConfig
  dashboardSlug: string
}>()

const widgetComponent = computed(() => {
  return getWidgetRegistration(props.widget.target)?.component
})
</script>
