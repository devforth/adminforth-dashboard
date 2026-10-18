<template>
  <section class="dashboard-runtime af-dashboard w-full p-4">
    <PageHeader
      class="af-dashboard-header mb-6"
      :title="dashboardLabel"
      :description="headerDescription"
    >
      <template
        v-if="canEdit"
        #actions
      >
        <Button
          v-if="isEditMode"
          type="button"
          variant="secondary"
          @click="editDashboard"
        >
          <IconSettings class="h-4 w-4" />
          Settings
        </Button>

        <Button
          type="button"
          :variant="isEditMode ? 'primary' : 'secondary'"
          :aria-pressed="isEditMode"
          @click="isEditMode = !isEditMode"
        >
          <IconCheck
            v-if="isEditMode"
            class="h-4 w-4"
          />
          <IconPencil
            v-else
            class="h-4 w-4"
          />
          {{ isEditMode ? 'Done' : 'Edit' }}
        </Button>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-8">
      <DashboardGroup
        v-for="(group, index) in visibleGroups"
        :key="group.id"
        :group="group"
        :widgets="widgetsByGroupId.get(group.id) ?? []"
        :dashboard-slug="dashboardSlug"
        :is-edit-mode="isEditMode"
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
        v-if="isEditMode"
        type="button"
        variant="secondary"
        class="self-start"
        @click="addGroup"
      >
        <IconPlus class="h-4 w-4" />
        Add group
      </Button>
    </div>

    <!-- backdrop clicks are ignored: selecting text in the editor and releasing the mouse outside must not drop the edits -->
    <Dialog
      v-model:open="isEditorOpen"
      class="af-dashboard-config-dialog w-full sm:mx-4 sm:max-w-4xl"
      :header="editor ? EDITOR_TITLES[editor.kind] : ''"
      :buttons="editorButtons"
      :closeByClickOutside="false"
      :askForCloseConfirmation="isEditorDirty"
      closeConfirmationText="Close without saving the changes?"
    >
      <YamlConfigEditor
        v-if="editor"
        v-model="editorCode"
        @save="saveEditor"
      />

      <p
        v-if="editorError"
        class="mt-2 text-sm text-lightDanger dark:text-darkDanger"
      >
        {{ editorError }}
      </p>

      <ul
        v-if="editorFieldErrors.length"
        class="mt-2 grid gap-1 text-sm text-lightDanger dark:text-darkDanger"
      >
        <li
          v-for="validationError in editorFieldErrors"
          :key="`${validationError.field}-${validationError.message}`"
        >
          <span class="font-semibold">{{ validationError.field }}:</span>
          {{ validationError.message }}
        </li>
      </ul>
    </Dialog>
  </section>
</template>



<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { Button, Dialog, PageHeader } from '@/afcl'
import { useAdminforth } from '@/adminforth'
import { IconCheck, IconPencil, IconPlus, IconSettings } from '@iconify-prerendered/vue-lucide'
import DashboardGroup from './DashboardGroup.vue'
import YamlConfigEditor from './YamlConfigEditor.vue'
import { DashboardApiError, dashboardApi, type DashboardResponse } from '../api/dashboardApi.js'
import type {
  DashboardConfig,
  EditableDashboardConfig,
  DashboardGroupConfig,
  EditableDashboardGroupConfig,
  DashboardGroupMoveDirection,
  DashboardWidgetConfig,
  DashboardWidgetMoveDirection,
} from '../model/dashboard.types.js'
import { serializeDashboardWidgetConfigForEditor } from '../model/dashboard.types.js'
import { getWidgetTitle } from '../widgets/registry.js'

type ConfigEditor =
  | { kind: 'dashboard' }
  | { kind: 'group', id: string }
  | { kind: 'widget', id: string }

const EDITOR_TITLES: Record<ConfigEditor['kind'], string> = {
  dashboard: 'Dashboard settings',
  group: 'Edit group',
  widget: 'Edit widget',
}

const props = defineProps<{
  dashboardSlug: string
  dashboardId: string
  label: string
  config: DashboardConfig
  revision: number
  canEdit: boolean
  isRefreshing: boolean
}>()

const emit = defineEmits<{
  (e: 'dashboard-updated', dashboard: DashboardResponse): void
}>()

const adminforth = useAdminforth()
const draftConfig = ref<DashboardConfig>(cloneConfig(props.config))
const currentRevision = ref(props.revision)
const dashboardLabel = ref(props.label)
const isEditMode = ref(false)
const editor = ref<ConfigEditor | null>(null)
const editorCode = ref('')
const editorInitialCode = ref('')
const editorError = ref('')
const editorFieldErrors = ref<{ field: string, message: string }[]>([])

const headerDescription = computed(() => {
  if (!isEditMode.value) {
    return undefined
  }

  return [
    `Slug: ${props.dashboardSlug}`,
    `Revision: ${currentRevision.value}`,
    props.isRefreshing ? 'Refreshing…' : '',
  ].filter(Boolean).join(' · ')
})

const isEditorOpen = computed({
  get: () => editor.value !== null,
  set: (isOpen: boolean) => {
    if (!isOpen) {
      closeEditor()
    }
  },
})
// Modal handles Esc on the whole document, so a closed editor must never count as dirty
const isEditorDirty = computed(() => editor.value !== null && editorCode.value !== editorInitialCode.value)
const editorButtons = [
  { label: 'Cancel', options: { variant: 'secondary' }, onclick: () => closeEditor() },
  { label: 'Save', options: { variant: 'primary' }, onclick: () => saveEditor() },
]

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

watch(
  () => props.label,
  (label: string) => {
    dashboardLabel.value = label
  },
)

function openEditor(target: ConfigEditor, value: unknown) {
  editor.value = target
  editorCode.value = stringifyYaml(value)
  editorInitialCode.value = editorCode.value
  editorError.value = ''
  editorFieldErrors.value = []
}

function closeEditor() {
  editor.value = null
}

async function saveEditor() {
  const target = editor.value!

  try {
    editorError.value = ''
    editorFieldErrors.value = []
    const config = parseYaml(editorCode.value)

    if (target.kind === 'dashboard') {
      const updatedDashboard = await dashboardApi.setDashboardConfig(props.dashboardSlug, config as EditableDashboardConfig)

      applyDashboardResponse(updatedDashboard)
      dashboardLabel.value = updatedDashboard.label
      emit('dashboard-updated', updatedDashboard)
    } else if (target.kind === 'group') {
      await dashboardApi.setDashboardGroupConfig(props.dashboardSlug, target.id, config as EditableDashboardGroupConfig)
      await refreshDashboardConfig()
    } else {
      await dashboardApi.setWidgetConfig(
        props.dashboardSlug,
        target.id,
        serializeDashboardWidgetConfigForEditor(config as DashboardWidgetConfig),
      )
      await refreshDashboardConfig()
    }

    closeEditor()
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : `Invalid ${target.kind} config`
    editorFieldErrors.value = error instanceof DashboardApiError ? error.validationErrors : []
  }
}

function editDashboard() {
  const editableConfig: EditableDashboardConfig = {
    label: dashboardLabel.value,
    slug: props.dashboardSlug,
    icon: draftConfig.value.icon,
  }

  openEditor({ kind: 'dashboard' }, editableConfig)
}

function editGroup(group: DashboardGroupConfig) {
  const editableGroupConfig: EditableDashboardGroupConfig = {
    label: group.label,
  }

  openEditor({ kind: 'group', id: group.id }, editableGroupConfig)
}

function editWidget(widget: DashboardWidgetConfig) {
  openEditor({ kind: 'widget', id: widget.id }, serializeDashboardWidgetConfigForEditor(widget))
}

const sortedGroups = computed(() => {
  return [...draftConfig.value.groups].sort((a, b) => a.order - b.order)
})

function groupWidgetsByGroupId(widgets: DashboardWidgetConfig[]) {
  const result = new Map<string, DashboardWidgetConfig[]>()

  for (const widget of widgets) {
    const nextWidgets = result.get(widget.group_id)
      ? [...result.get(widget.group_id)!, widget]
      : [widget]

    result.set(widget.group_id, nextWidgets)
  }

  for (const [groupId, widgets] of result.entries()) {
    result.set(groupId, [...widgets].sort((a, b) => a.order - b.order))
  }

  return result
}

const widgetsByGroupId = computed<Map<string, DashboardWidgetConfig[]>>(() => {
  return groupWidgetsByGroupId(draftConfig.value.widgets as DashboardWidgetConfig[])
})

const visibleGroups = computed(() => {
  if (isEditMode.value) {
    return sortedGroups.value
  }

  return sortedGroups.value.filter((group) => {
    return (widgetsByGroupId.value.get(group.id) ?? []).length > 0
  })
})

// mutations refresh the config on success and show the error to the user on failure
async function mutate(failureMessage: string, request: () => Promise<unknown>) {
  try {
    await request()
    await refreshDashboardConfig()
  } catch (error) {
    adminforth.alert({
      message: `${failureMessage}: ${error instanceof Error ? error.message : String(error)}`,
      variant: 'danger',
    })
  }
}

async function addGroup() {
  await mutate('Failed to add the group', () => dashboardApi.addDashboardGroup(props.dashboardSlug))
}

async function addWidget(groupId: string) {
  await mutate('Failed to add the widget', () => dashboardApi.addDashboardWidget(props.dashboardSlug, groupId))
}

async function moveGroup(groupId: string, direction: DashboardGroupMoveDirection) {
  await mutate('Failed to move the group', () => dashboardApi.moveDashboardGroup(props.dashboardSlug, groupId, direction))
}

async function removeGroup(groupId: string) {
  const group = draftConfig.value.groups.find((item) => item.id === groupId)!
  const widgetCount = widgetsByGroupId.value.get(groupId)?.length ?? 0
  const isConfirmed = await adminforth.confirm({
    title: `Remove group "${group.label}"?`,
    message: widgetCount
      ? `Its ${widgetCount} ${widgetCount === 1 ? 'widget' : 'widgets'} will be removed too. This cannot be undone.`
      : 'This cannot be undone.',
    yes: 'Remove',
    no: 'Cancel',
    dangerous: true,
  })

  if (isConfirmed) {
    await mutate('Failed to remove the group', () => dashboardApi.removeDashboardGroup(props.dashboardSlug, groupId))
  }
}

async function moveWidget(widgetId: string, direction: DashboardWidgetMoveDirection) {
  await mutate('Failed to move the widget', () => dashboardApi.moveDashboardWidget(props.dashboardSlug, widgetId, direction))
}

async function removeWidget(widgetId: string) {
  const widget = (draftConfig.value.widgets as DashboardWidgetConfig[]).find((item) => item.id === widgetId)!
  const isConfirmed = await adminforth.confirm({
    title: `Remove widget "${getWidgetTitle(widget)}"?`,
    message: 'This cannot be undone.',
    yes: 'Remove',
    no: 'Cancel',
    dangerous: true,
  })

  if (isConfirmed) {
    await mutate('Failed to remove the widget', () => dashboardApi.removeDashboardWidget(props.dashboardSlug, widgetId))
  }
}

async function refreshDashboardConfig() {
  applyDashboardResponse(await dashboardApi.getDashboardConfig(props.dashboardSlug))
}

function applyDashboardResponse(response: DashboardResponse) {
  draftConfig.value = cloneConfig(response.config)
  currentRevision.value = response.revision
}

function cloneConfig(config: DashboardConfig): DashboardConfig {
  return JSON.parse(JSON.stringify(config))
}
</script>

<style scoped>
/* Chart colors used by widgets/chart/chart.utils.ts. The series order is validated for color-vision
   deficiency against the card surfaces (lightCardBackground / darkCardBackground), so keep it when changing values. */
.dashboard-runtime {
  --dashboard-primary: theme('colors.lightPrimary');
  --dashboard-series-1: #2a78d6;
  --dashboard-series-2: #eb6834;
  --dashboard-series-3: #1baf7a;
  --dashboard-series-4: #eda100;
  --dashboard-series-5: #e87ba4;
  --dashboard-series-6: #008300;
  --dashboard-series-7: #6250d6;
  --dashboard-series-8: #e34948;
}

.dark .dashboard-runtime {
  --dashboard-primary: theme('colors.darkPrimary');
  --dashboard-series-1: #3987e5;
  --dashboard-series-2: #d95926;
  --dashboard-series-3: #199e70;
  --dashboard-series-4: #c98500;
  --dashboard-series-5: #d55181;
  --dashboard-series-6: #008300;
  --dashboard-series-7: #9085e9;
  --dashboard-series-8: #e66767;
}
</style>
