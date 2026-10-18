<template>
  <Card
    size="md"
    class="af-dashboard-widget flex min-h-24 grow shrink basis-[var(--widget-basis)] flex-col overflow-hidden min-w-[var(--widget-min-width)] max-w-[var(--widget-max-width)]"
    :class="isEditMode ? 'border-dashed' : ''"
    :style="widgetLayoutVars"
  >
    <div class="mb-3 flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="af-dashboard-widget-title truncate text-sm font-medium leading-6 text-lightCardTitle dark:text-darkCardTitle">
          {{ title }}
        </h3>
        <p
          v-if="isEditMode"
          class="text-xs text-lightCardDescription dark:text-darkCardDescription"
        >
          {{ typeLabel }}
        </p>
      </div>

      <DashboardItemMenu
        v-if="isEditMode"
        class="af-dashboard-widget-actions -me-1.5 -mt-0.5"
        :label="`${title} actions`"
        :can-move-up="canMoveUp"
        :can-move-down="canMoveDown"
        @edit="emit('edit')"
        @move-up="emit('move-up')"
        @move-down="emit('move-down')"
        @remove="emit('remove')"
      />
    </div>

    <slot />
  </Card>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { Card } from '@/afcl'
import type { WidgetLayout } from '../model/dashboard.types.js'
import DashboardItemMenu from './DashboardItemMenu.vue'

const sizeToFlexBasis: Record<NonNullable<WidgetLayout['size']>, string> = {
  small: '260px',
  medium: '360px',
  large: '480px',
  wide: '720px',
  full: '100%',
}

const props = defineProps<{
  title: string
  typeLabel: string
  isEditMode: boolean
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
    height: formatWidth(props.layout?.height),
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
