<script setup lang="ts">
import BarChart from '../bar/BarChart.vue'

defineProps<{
  rows: Record<string, unknown>[]
  labelField: string
  valueField: string
  color?: string
  height?: number
}>()
</script>

<template>
  <BarChart
    :rows="rows"
    :label-field="labelField"
    :value-field="valueField"
    :color="color"
    :height="height"
  />
</template>
