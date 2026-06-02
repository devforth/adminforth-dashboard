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
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-lightListViewButtonBorder bg-lightListViewButtonBackground text-lightListViewButtonText shadow-sm hover:bg-lightListViewButtonBackgroundHover hover:text-lightListViewButtonTextHover dark:border-darkListViewButtonBorder dark:bg-darkListViewButtonBackground dark:text-darkListViewButtonText dark:hover:bg-darkListViewButtonBackgroundHover dark:hover:text-darkListViewButtonTextHover"
        title="Edit JSON"
        @click="emit('edit')"
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
        @click="emit('remove')"
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
  </div>
</template>



<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { WidgetLayout } from '../model/dashboard.types.js'

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
