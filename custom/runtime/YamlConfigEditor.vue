<template>
  <div
    ref="editorEl"
    class="min-h-[500px] w-full overflow-hidden rounded-lg border border-lightListBorder bg-lightListTable text-sm dark:border-darkListBorder dark:bg-darkListTable"
  />
</template>

<script setup lang="ts">
import 'monaco-editor/min/vs/editor/editor.main.css'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type * as Monaco from 'monaco-editor'

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: () => Worker
    }
  }
}

if (typeof window !== 'undefined' && !window.MonacoEnvironment) {
  window.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  }
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: []
}>()

const editorEl = ref<HTMLElement | null>(null)
let monaco: typeof Monaco | null = null
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let resizeObserver: ResizeObserver | null = null
let applyingExternalValue = false

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || value === editor.getValue()) {
      return
    }

    applyingExternalValue = true
    editor.setValue(value)
    applyingExternalValue = false
  },
)

onMounted(async () => {
  const [loadedMonaco] = await Promise.all([
    import('monaco-editor'),
    import('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'),
  ])

  monaco = loadedMonaco
  await nextTick()

  if (!editorEl.value) {
    return
  }

  editor = monaco.editor.create(editorEl.value, {
    value: props.modelValue,
    language: 'yaml',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbersMinChars: 3,
    padding: { top: 12, bottom: 12 },
    scrollBeyondLastLine: false,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    wrappingIndent: 'same',
    theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
  })

  editor.onDidChangeModelContent(() => {
    if (!editor || applyingExternalValue) {
      return
    }

    emit('update:modelValue', editor.getValue())
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    emit('save')
  })

  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(editorEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.dispose()
  editor = null
})
</script>
