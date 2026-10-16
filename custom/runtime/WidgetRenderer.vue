<template>
  <div class="flex h-full min-h-0 flex-col gap-1">
    <div
      v-if="isEditMode"
      class="text-xs font-bold uppercase tracking-normal text-lightListTableText dark:text-darkListTableText"
    >
      {{ widget.target }}
    </div>

    <div class="text-base font-semibold text-lightNavbarText dark:text-darkNavbarText">
      {{ widgetTitle }}
    </div>

    <component
      :is="widgetComponent"
      v-if="widgetComponent"
      class="mt-3 min-h-0 flex-1 overflow-hidden"
      :widget="widget"
      :dashboard-slug="dashboardSlug"
    />
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardWidgetConfig } from '../model/dashboard.types.js'
import { getWidgetRegistration, getWidgetTitle } from '../widgets/registry.js'

const props = defineProps<{
  widget: DashboardWidgetConfig
  dashboardSlug: string
  isEditMode: boolean
}>()

const widgetRegistration = computed(() => {
  return getWidgetRegistration(props.widget.target)
})

const widgetComponent = computed(() => {
  return widgetRegistration.value?.component
})

const widgetTitle = computed(() => getWidgetTitle(props.widget))
</script>
