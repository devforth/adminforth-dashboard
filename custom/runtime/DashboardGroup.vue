<template>
  <section class="af-dashboard-group">
    <header class="af-dashboard-group-header mb-3 flex min-h-7 items-center justify-between gap-2">
      <h2 class="min-w-0 truncate text-base font-semibold tracking-tight text-lightCardTitle dark:text-darkCardTitle">
        {{ group.label }}
      </h2>

      <DashboardItemMenu
        v-if="isEditMode"
        :label="`${group.label} actions`"
        :can-move-up="canMoveUp"
        :can-move-down="canMoveDown"
        @edit="emit('edit-group', group)"
        @move-up="emit('move-up')"
        @move-down="emit('move-down')"
        @remove="emit('remove-group')"
      />
    </header>

    <div class="flex flex-wrap gap-4">
      <WidgetShell
        v-for="(widget, index) in widgets"
        :key="widget.id"
        :title="getWidgetTitle(widget)"
        :type-label="getWidgetLabel(widget.target)"
        :is-edit-mode="isEditMode"
        :can-move-up="index > 0"
        :can-move-down="index < widgets.length - 1"
        :layout="{
          size: widget.size,
          width: widget.width,
          min_width: widget.min_width,
          max_width: widget.max_width,
          height: widget.height ?? getWidgetDefaultHeight(widget.target),
        }"
        @edit="emit('edit-widget', widget)"
        @move-up="emit('move-widget-up', widget.id)"
        @move-down="emit('move-widget-down', widget.id)"
        @remove="emit('remove-widget', widget.id)"
      >
        <WidgetRenderer
          :widget="widget"
          :dashboard-slug="dashboardSlug"
        />
      </WidgetShell>

      <div
        v-if="!widgets.length"
        class="flex min-h-24 w-full items-center justify-center rounded-lg border border-dashed border-lightCardBorder text-sm text-lightCardDescription dark:border-darkCardBorder dark:text-darkCardDescription"
      >
        No widgets yet
      </div>
    </div>

    <Button
      v-if="isEditMode"
      type="button"
      variant="secondary"
      class="mt-3"
      @click="emit('add-widget')"
    >
      <IconPlus class="h-4 w-4" />
      Add widget
    </Button>
  </section>
</template>



<script setup lang="ts">
import { Button } from '@/afcl'
import { IconPlus } from '@iconify-prerendered/vue-lucide'
import DashboardItemMenu from './DashboardItemMenu.vue'
import WidgetRenderer from './WidgetRenderer.vue'
import WidgetShell from './WidgetShell.vue'
import type { DashboardGroupConfig, DashboardWidgetConfig } from '../model/dashboard.types.js'
import { getWidgetDefaultHeight, getWidgetLabel, getWidgetTitle } from '../widgets/registry.js'

defineProps<{
  group: DashboardGroupConfig
  widgets: DashboardWidgetConfig[]
  dashboardSlug: string
  isEditMode: boolean
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  (e: 'add-widget'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
  (e: 'remove-group'): void
  (e: 'edit-group', group: DashboardGroupConfig): void
  (e: 'edit-widget', widget: DashboardWidgetConfig): void
  (e: 'move-widget-up', widgetId: string): void
  (e: 'move-widget-down', widgetId: string): void
  (e: 'remove-widget', widgetId: string): void
}>()
</script>
