<template>
  <button
    type="button"
    class="flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm"
    :class="buttonClass"
    :title="title"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  disabled?: boolean
  variant?: 'default' | 'danger'
}>(), {
  disabled: false,
  variant: 'default',
})

const buttonClass = computed(() => {
  if (props.variant === 'danger') {
    return 'border-lightInputErrorColor/30 bg-lightSecondary text-lightInputErrorColor hover:bg-lightListViewButtonBackgroundHover dark:bg-darkSecondary dark:hover:bg-darkListViewButtonBackgroundHover'
  }

  return 'border-lightListViewButtonBorder bg-lightListViewButtonBackground text-lightListViewButtonText hover:bg-lightListViewButtonBackgroundHover hover:text-lightListViewButtonTextHover disabled:opacity-45 dark:border-darkListViewButtonBorder dark:bg-darkListViewButtonBackground dark:text-darkListViewButtonText dark:hover:bg-darkListViewButtonBackgroundHover dark:hover:text-darkListViewButtonTextHover'
})
</script>
