<template>
  <div
    v-if="isLoading"
    class="grid gap-3"
    aria-busy="true"
  >
    <Skeleton class="h-3 w-1/2" />
    <Skeleton class="h-3 w-full" />
    <Skeleton class="h-3 w-3/4" />
  </div>

  <p
    v-else-if="error"
    class="text-sm text-lightDanger dark:text-darkDanger"
  >
    {{ error }}
  </p>

  <p
    v-else-if="isEmpty"
    class="text-sm text-lightCardDescription dark:text-darkCardDescription"
  >
    No data available
  </p>

  <slot v-else />
</template>

<script setup lang="ts">
import { Skeleton } from '@/afcl'

defineProps<{
  isLoading: boolean
  error: string
  isEmpty?: boolean
}>()
</script>
