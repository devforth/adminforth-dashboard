<template>
  <div class="flex h-full min-h-0 flex-col gap-1">
    <div
      v-if="isAdmin"
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
import { getWidgetLabel, getWidgetRegistration } from '../widgets/registry.js'

const props = defineProps<{
  widget: DashboardWidgetConfig
  dashboardSlug: string
  isAdmin: boolean
}>()

const widgetRegistration = computed(() => {
  return getWidgetRegistration(props.widget.target)
})

const widgetComponent = computed(() => {
  return widgetRegistration.value?.component
})

const widgetTitle = computed(() => {
  if (props.widget.label) {
    return props.widget.label
  }

  if (props.widget.target === 'empty') {
    return 'Empty widget'
  }

  if (props.widget.target === 'chart') {
    return props.widget.chart.title || 'Untitled chart'
  }

  return getWidgetLabel(props.widget.target)
})
</script>
