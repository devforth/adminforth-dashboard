<template>
  <section
    class="group/dashboard relative rounded-lg p-4"
    :class="isAdmin ? 'border border-dashed border-lightListBorder dark:border-darkListBorder' : ''"
  >
    <header class="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 class="m-0 text-lg font-bold text-lightNavbarText dark:text-darkNavbarText">
          {{ group.label }}
        </h2>
      </div>

      <div
        v-if="isAdmin"
        class="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover/dashboard:opacity-100"
      >
        <DashboardToolbarButton
          title="Edit JSON"
          @click="emit('edit-group', group)"
        >
          <IconToolsOutline class="h-5 w-5" />
        </DashboardToolbarButton>

        <DashboardToolbarButton
          title="Move up"
          :disabled="!canMoveUp"
          @click="emit('move-up')"
        >
          <IconArrowUpOutline class="h-5 w-5" />
        </DashboardToolbarButton>

        <DashboardToolbarButton
          title="Move down"
          :disabled="!canMoveDown"
          @click="emit('move-down')"
        >
          <IconArrowDownOutline class="h-5 w-5" />
        </DashboardToolbarButton>

        <DashboardToolbarButton
          title="Remove"
          variant="danger"
          @click="emit('remove-group')"
        >
          <IconTrashBinSolid class="h-5 w-5" />
        </DashboardToolbarButton>
      </div>
    </header>

    <div class="flex flex-wrap gap-4">
      <WidgetShell
        v-for="(widget, index) in widgets"
        :key="widget.id"
        :is-admin="isAdmin"
        :can-move-up="index > 0"
        :can-move-down="index < widgets.length - 1"
        :layout="{
          size: widget.size,
          width: widget.width,
          min_width: widget.min_width,
          max_width: widget.max_width,
          height: widget.height,
        }"
        @edit="emit('edit-widget', widget)"
        @move-up="emit('move-widget-up', widget.id)"
        @move-down="emit('move-widget-down', widget.id)"
        @remove="emit('remove-widget', widget.id)"
      >
        <WidgetRenderer
          :widget="widget"
          :dashboard-slug="dashboardSlug"
          :is-admin="isAdmin"
        />
      </WidgetShell>

      <div
        v-if="!widgets.length"
        class="flex min-h-24 w-full items-center justify-center rounded-lg text-sm text-lightListTableText dark:text-darkListTableText"
        :class="isAdmin ? 'border border-dashed border-lightListBorder dark:border-darkListBorder' : ''"
      >
        No widgets yet
      </div>

    </div>

    <div
      v-if="isAdmin"
      class="mt-3 flex"
    >
      <Button
        type="button"
        mode="secondary"
        class="h-10 w-28 border text-xs font-semibold"
        @click="emit('add-widget')"
      >
        Add widget
      </Button>
    </div>
  </section>
</template>



<script setup lang="ts">
import { Button } from '@/afcl'
import { IconArrowDownOutline, IconArrowUpOutline, IconToolsOutline, IconTrashBinSolid } from '@iconify-prerendered/vue-flowbite'
import DashboardToolbarButton from './DashboardToolbarButton.vue'
import WidgetRenderer from './WidgetRenderer.vue'
import WidgetShell from './WidgetShell.vue'
import type { DashboardGroupConfig, DashboardWidgetConfig } from '../model/dashboard.types.js'

defineProps<{
  group: DashboardGroupConfig
  widgets: DashboardWidgetConfig[]
  dashboardSlug: string
  isAdmin: boolean
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
