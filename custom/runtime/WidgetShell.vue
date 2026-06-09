<template>
  <div
    class="group relative flex min-h-24 grow shrink basis-[var(--widget-basis)] flex-col overflow-hidden rounded-lg bg-lightListTable p-3 min-w-[var(--widget-min-width)] max-w-[var(--widget-max-width)] dark:bg-darkListTable"
    :class="isAdmin ? 'border border-dashed border-lightListBorder dark:border-darkListBorder' : ''"
    :style="widgetLayoutVars"
  >
    <slot />

    <div
      v-if="isAdmin"
      class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <DashboardToolbarButton
        title="Edit JSON"
        @click="emit('edit')"
      >
        <DashboardToolbarIcon name="edit" />
      </DashboardToolbarButton>

      <DashboardToolbarButton
        title="Move up"
        :disabled="!canMoveUp"
        @click="emit('move-up')"
      >
        <DashboardToolbarIcon name="move-up" />
      </DashboardToolbarButton>

      <DashboardToolbarButton
        title="Move down"
        :disabled="!canMoveDown"
        @click="emit('move-down')"
      >
        <DashboardToolbarIcon name="move-down" />
      </DashboardToolbarButton>

      <DashboardToolbarButton
        title="Remove"
        variant="danger"
        @click="emit('remove')"
      >
        <DashboardToolbarIcon name="remove" />
      </DashboardToolbarButton>
    </div>
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { WidgetLayout } from '../model/dashboard.types.js'
import DashboardToolbarButton from './DashboardToolbarButton.vue'
import DashboardToolbarIcon from './DashboardToolbarIcon.vue'

const DEFAULT_WIDGET_HEIGHT = 500

const sizeToFlexBasis: Record<NonNullable<WidgetLayout['size']>, string> = {
  small: '260px',
  medium: '360px',
  large: '480px',
  wide: '720px',
  full: '100%',
}

const props = defineProps<{
  isAdmin: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  layout?: WidgetLayout
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
  (e: 'remove'): void
}>()

const widgetLayoutVars = computed<CSSProperties>(() => {
  const basis = sizeToFlexBasis[props.layout?.size ?? 'medium']
  const fixedWidth = formatWidth(props.layout?.width)

  return {
    '--widget-basis': clampToContainerWidth(fixedWidth ?? basis),
    '--widget-min-width': clampToContainerWidth(fixedWidth ?? formatWidth(props.layout?.min_width) ?? basis),
    '--widget-max-width': props.layout?.max_width === null
      ? '100%'
      : clampToContainerWidth(fixedWidth ?? formatWidth(props.layout?.max_width) ?? '100%'),
    height: formatWidth(props.layout?.height ?? DEFAULT_WIDGET_HEIGHT),
  }
})

function formatWidth(value: number | undefined) {
  if (typeof value === 'number') {
    return `${value}px`
  }
}

function clampToContainerWidth(value: string) {
  return `min(${value}, 100%)`
}
</script>
