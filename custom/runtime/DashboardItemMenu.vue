<template>
  <DropdownMenu
    placement="bottom-end"
    teleportToBody
  >
    <template #trigger>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        :aria-label="label"
      >
        <IconEllipsis />
      </Button>
    </template>

    <DropdownMenuItem @click="emit('edit')">
      <template #icon><IconPencil /></template>
      Edit YAML
    </DropdownMenuItem>

    <DropdownMenuItem
      :disabled="!canMoveUp"
      @click="emit('move-up')"
    >
      <template #icon><IconArrowUp /></template>
      Move up
    </DropdownMenuItem>

    <DropdownMenuItem
      :disabled="!canMoveDown"
      @click="emit('move-down')"
    >
      <template #icon><IconArrowDown /></template>
      Move down
    </DropdownMenuItem>

    <DropdownMenuItem
      danger
      @click="emit('remove')"
    >
      <template #icon><IconTrash2 /></template>
      Remove
    </DropdownMenuItem>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { Button, DropdownMenu, DropdownMenuItem } from '@/afcl'
import { IconArrowDown, IconArrowUp, IconEllipsis, IconPencil, IconTrash2 } from '@iconify-prerendered/vue-lucide'

defineProps<{
  label: string
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
  (e: 'remove'): void
}>()
</script>
