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
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-lightListViewButtonBorder bg-lightListViewButtonBackground text-lightListViewButtonText shadow-sm hover:bg-lightListViewButtonBackgroundHover hover:text-lightListViewButtonTextHover dark:border-darkListViewButtonBorder dark:bg-darkListViewButtonBackground dark:text-darkListViewButtonText dark:hover:bg-darkListViewButtonBackgroundHover dark:hover:text-darkListViewButtonTextHover"
          title="Edit JSON"
          @click="emit('edit-group', group)"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15.5 7.5a3 3 0 1 1 1 2.2l-6.8 6.8H7.5v2.2H5.3v2.2H2.8v-2.5l7.5-7.5a5.5 5.5 0 1 1 5.2 1.6" />
          </svg>
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-lightListViewButtonBorder bg-lightListViewButtonBackground text-lightListViewButtonText shadow-sm hover:bg-lightListViewButtonBackgroundHover hover:text-lightListViewButtonTextHover disabled:opacity-45 dark:border-darkListViewButtonBorder dark:bg-darkListViewButtonBackground dark:text-darkListViewButtonText dark:hover:bg-darkListViewButtonBackgroundHover dark:hover:text-darkListViewButtonTextHover"
          title="Move up"
          :disabled="!canMoveUp"
          @click="emit('move-up')"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-lightListViewButtonBorder bg-lightListViewButtonBackground text-lightListViewButtonText shadow-sm hover:bg-lightListViewButtonBackgroundHover hover:text-lightListViewButtonTextHover disabled:opacity-45 dark:border-darkListViewButtonBorder dark:bg-darkListViewButtonBackground dark:text-darkListViewButtonText dark:hover:bg-darkListViewButtonBackgroundHover dark:hover:text-darkListViewButtonTextHover"
          title="Move down"
          :disabled="!canMoveDown"
          @click="emit('move-down')"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-lightInputErrorColor/30 bg-lightSecondary text-lightInputErrorColor shadow-sm hover:bg-lightListViewButtonBackgroundHover dark:bg-darkSecondary dark:hover:bg-darkListViewButtonBackgroundHover"
          title="Remove"
          @click="emit('remove-group')"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
        </button>
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
          minWidth: widget.minWidth,
          maxWidth: widget.maxWidth,
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
