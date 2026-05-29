<template>
  <section class="w-full p-6">
    <header class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="m-0 text-2xl font-bold text-lightNavbarText dark:text-darkNavbarText">
          {{ label }}
        </h1>

        <div
          v-if="isAdmin"
          class="mt-1.5 flex gap-3 text-xs text-lightListTableText dark:text-darkListTableText"
        >
          <span>Slug: {{ dashboardSlug }}</span>
          <span>Revision: {{ currentRevision }}</span>
          <span v-if="isRefreshing">Refreshing...</span>
        </div>
      </div>
    </header>

    <div class="flex flex-col gap-5">
      <DashboardGroup
        v-for="(group, index) in visibleGroups"
        :key="group.id"
        :group="group"
        :widgets="widgetsByGroupId.get(group.id) ?? []"
        :dashboard-slug="dashboardSlug"
        :is-admin="isAdmin"
        :can-move-up="index > 0"
        :can-move-down="index < visibleGroups.length - 1"
        @add-widget="addWidget(group.id)"
        @move-up="moveGroup(group.id, 'up')"
        @move-down="moveGroup(group.id, 'down')"
        @remove-group="removeGroup(group.id)"
        @edit-group="editGroup"
        @edit-widget="editWidget"
        @move-widget-up="moveWidget($event, 'up')"
        @move-widget-down="moveWidget($event, 'down')"
        @remove-widget="removeWidget"
      />

      <Button
        v-if="isAdmin"
        type="button"
        mode="secondary"
        class="h-10 w-28 border text-xs font-semibold"
        @click="addGroup"
      >
        Add group
      </Button>
    </div>

    <div
      v-if="editingGroupId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      @click.self="closeGroupConfigEditor"
    >
      <section class="w-full max-w-2xl rounded-lg border border-lightListBorder bg-lightDropdownOptionsBackground p-4 shadow-xl dark:border-darkListBorder dark:bg-darkDropdownOptionsBackground">
        <header class="mb-3 flex items-center justify-between gap-3">
          <h2 class="m-0 text-base font-bold text-lightNavbarText dark:text-darkNavbarText">
            Group JSON
          </h2>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-lightListTableText hover:bg-lightListViewButtonBackgroundHover dark:text-darkListTableText dark:hover:bg-darkListViewButtonBackgroundHover"
            @click="closeGroupConfigEditor"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <textarea
          v-model="groupConfigCode"
          class="min-h-[500px] w-full resize-y rounded-lg border border-lightListBorder bg-lightListTable p-3 font-mono text-sm text-lightNavbarText outline-none focus:border-lightPrimaryButtonBackground dark:border-darkListBorder dark:bg-darkListTable dark:text-darkNavbarText dark:focus:border-darkPrimaryButtonBackground"
          spellcheck="false"
          @keydown.ctrl.enter.prevent="saveGroupConfig"
          @keydown.meta.enter.prevent="saveGroupConfig"
        />

        <div
          v-if="groupConfigError"
          class="mt-2 text-sm text-lightInputErrorColor"
        >
          {{ groupConfigError }}
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            mode="secondary"
            @click="closeGroupConfigEditor"
          >
            Cancel
          </Button>

          <Button
            type="button"
            @click="saveGroupConfig"
          >
            Save
          </Button>
        </div>
      </section>
    </div>

    <div
      v-if="editingWidgetId"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      @click.self="closeWidgetConfigEditor"
    >
      <section class="w-full max-w-2xl rounded-lg border border-lightListBorder bg-lightDropdownOptionsBackground p-4 shadow-xl dark:border-darkListBorder dark:bg-darkDropdownOptionsBackground">
        <header class="mb-3 flex items-center justify-between gap-3">
          <h2 class="m-0 text-base font-bold text-lightNavbarText dark:text-darkNavbarText">
            Widget JSON
          </h2>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-lightListTableText hover:bg-lightListViewButtonBackgroundHover dark:text-darkListTableText dark:hover:bg-darkListViewButtonBackgroundHover"
            @click="closeWidgetConfigEditor"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <textarea
          v-model="widgetConfigCode"
          class="min-h-[500px] w-full resize-y rounded-lg border border-lightListBorder bg-lightListTable p-3 font-mono text-sm text-lightNavbarText outline-none focus:border-lightPrimaryButtonBackground dark:border-darkListBorder dark:bg-darkListTable dark:text-darkNavbarText dark:focus:border-darkPrimaryButtonBackground"
          spellcheck="false"
          @keydown.ctrl.enter.prevent="saveWidgetConfig"
          @keydown.meta.enter.prevent="saveWidgetConfig"
        />

        <div
          v-if="widgetConfigError"
          class="mt-2 text-sm text-lightInputErrorColor"
        >
          {{ widgetConfigError }}
        </div>

        <ul
          v-if="widgetConfigFieldErrors.length"
          class="mt-2 grid gap-1 text-sm text-lightInputErrorColor"
        >
          <li
            v-for="validationError in widgetConfigFieldErrors"
            :key="`${validationError.field}-${validationError.message}`"
          >
            <span class="font-semibold">{{ validationError.field }}:</span>
            {{ validationError.message }}
          </li>
        </ul>

        <div class="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            mode="secondary"
            @click="closeWidgetConfigEditor"
          >
            Cancel
          </Button>

          <Button
            type="button"
            @click="saveWidgetConfig"
          >
            Save
          </Button>
        </div>
      </section>
    </div>
  </section>
</template>



<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { Button } from '@/afcl'
import DashboardGroup from './DashboardGroup.vue'
import { DashboardApiError, dashboardApi, type DashboardResponse } from '../api/dashboardApi.js'
import type {
  DashboardConfig,
  DashboardGroupConfig,
  DashboardGroupMoveDirection,
  DashboardWidgetConfig,
  DashboardWidgetMoveDirection,
} from '../model/dashboard.types.js'
import { serializeDashboardWidgetConfigForEditor } from '../model/dashboard.types.js'

const props = defineProps<{
  dashboardSlug: string
  dashboardId: string
  label: string
  config: DashboardConfig
  revision: number
  isAdmin: boolean
  isRefreshing: boolean
}>()

const draftConfig = ref<DashboardConfig>(cloneConfig(props.config))
const currentRevision = ref(props.revision)
const editingGroupId = ref<string | null>(null)
const groupConfigCode = ref('')
const groupConfigError = ref('')
const editingWidgetId = ref<string | null>(null)
const widgetConfigCode = ref('')
const widgetConfigError = ref('')
const widgetConfigFieldErrors = ref<{ field: string, message: string }[]>([])

watch(
  () => props.config,
  (config: DashboardConfig) => {
    draftConfig.value = cloneConfig(config)
  },
  { deep: true },
)

watch(
  () => props.revision,
  (revision: number) => {
    currentRevision.value = revision
  },
)

const sortedGroups = computed(() => {
  return [...draftConfig.value.groups].sort((a, b) => a.order - b.order)
})

const widgetsByGroupId = computed<Map<string, DashboardWidgetConfig[]>>(() => {
  const result = new Map<string, DashboardWidgetConfig[]>()

  for (const widget of draftConfig.value.widgets) {
    const widgets = result.get(widget.group_id) ?? []
    widgets.push(widget)
    result.set(widget.group_id, widgets)
  }

  for (const [groupId, widgets] of result.entries()) {
    result.set(groupId, [...widgets].sort((a, b) => a.order - b.order))
  }

  return result
})

const visibleGroups = computed(() => {
  if (props.isAdmin) {
    return sortedGroups.value
  }

  return sortedGroups.value.filter((group) => {
    return (widgetsByGroupId.value.get(group.id) ?? []).length > 0
  })
})

async function addGroup() {
  if (!props.isAdmin) {
    return
  }

  try {
    applyDashboardResponse(await dashboardApi.addDashboardGroup(props.dashboardSlug))
  } catch (error) {
    console.error('Failed to add dashboard group', error)
  }
}

async function addWidget(groupId: string) {
  if (!props.isAdmin) {
    return
  }

  try {
    applyDashboardResponse(await dashboardApi.addDashboardWidget(props.dashboardSlug, groupId))
  } catch (error) {
    console.error('Failed to add dashboard widget', error)
  }
}

async function moveGroup(groupId: string, direction: DashboardGroupMoveDirection) {
  if (!props.isAdmin) {
    return
  }

  try {
    applyDashboardResponse(
      await dashboardApi.moveDashboardGroup(props.dashboardSlug, groupId, direction),
    )
  } catch (error) {
    console.error('Failed to move dashboard group', error)
  }
}

async function removeGroup(groupId: string) {
  if (!props.isAdmin) {
    return
  }

  try {
    applyDashboardResponse(await dashboardApi.removeDashboardGroup(props.dashboardSlug, groupId))
  } catch (error) {
    console.error('Failed to remove dashboard group', error)
  }
}

function editGroup(group: DashboardGroupConfig) {
  editingGroupId.value = group.id
  groupConfigCode.value = stringifyYaml(group)
  groupConfigError.value = ''
}

async function saveGroupConfig() {
  if (!editingGroupId.value) {
    return
  }

  try {
    const groupConfig = parseYaml(groupConfigCode.value) as DashboardGroupConfig

    applyDashboardResponse(
      await dashboardApi.setDashboardGroupConfig(
        props.dashboardSlug,
        editingGroupId.value,
        groupConfig,
      ),
    )
    closeGroupConfigEditor()
  } catch (error) {
    groupConfigError.value = error instanceof Error ? error.message : 'Invalid group config'
  }
}

function closeGroupConfigEditor() {
  editingGroupId.value = null
  groupConfigCode.value = ''
  groupConfigError.value = ''
}

async function moveWidget(widgetId: string, direction: DashboardWidgetMoveDirection) {
  if (!props.isAdmin) {
    return
  }

  try {
    applyDashboardResponse(
      await dashboardApi.moveDashboardWidget(props.dashboardSlug, widgetId, direction),
    )
  } catch (error) {
    console.error('Failed to move dashboard widget', error)
  }
}

async function removeWidget(widgetId: string) {
  if (!props.isAdmin) {
    return
  }

  try {
    applyDashboardResponse(await dashboardApi.removeDashboardWidget(props.dashboardSlug, widgetId))
  } catch (error) {
    console.error('Failed to remove dashboard widget', error)
  }
}

function editWidget(widget: DashboardWidgetConfig) {
  editingWidgetId.value = widget.id
  widgetConfigCode.value = stringifyYaml(serializeDashboardWidgetConfigForEditor(widget))
  widgetConfigError.value = ''
  widgetConfigFieldErrors.value = []
}

async function saveWidgetConfig() {
  if (!editingWidgetId.value) {
    return
  }

  try {
    widgetConfigError.value = ''
    widgetConfigFieldErrors.value = []
    const widgetConfig = parseYaml(widgetConfigCode.value) as DashboardWidgetConfig

    applyDashboardResponse(
      await dashboardApi.setWidgetConfig(
        props.dashboardSlug,
        editingWidgetId.value,
        widgetConfig,
      ),
    )
    closeWidgetConfigEditor()
  } catch (error) {
    widgetConfigError.value = error instanceof Error ? error.message : 'Invalid widget config'
    widgetConfigFieldErrors.value = error instanceof DashboardApiError ? error.validationErrors : []
  }
}

function closeWidgetConfigEditor() {
  editingWidgetId.value = null
  widgetConfigCode.value = ''
  widgetConfigError.value = ''
  widgetConfigFieldErrors.value = []
}

function applyDashboardResponse(response: DashboardResponse) {
  draftConfig.value = cloneConfig(response.config)
  currentRevision.value = response.revision
}

function cloneConfig(config: DashboardConfig): DashboardConfig {
  return JSON.parse(JSON.stringify(config))
}
</script>
