<template>
  <div class="overflow-hidden rounded-md border border-gray-300 bg-white" @pointerdown="emitFocus">
    <UEditorToolbar
      v-if="editor"
      :editor="editor"
      :items="toolbarItems"
      class="border-b border-gray-200 bg-white"
    />
    <div ref="hostRef" class="connect-docs-editor" />
    <UEditorDragHandle v-if="editor" :editor="editor" />
  </div>
  <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { Editor } from '@tiptap/vue-3'
import { sanitizeTipTapJsonForProseMirror } from '~/utils/tiptap/lexicalTipTap'

const props = defineProps<{
  doc: any
  toolbarItems: any[]
}>()

const emit = defineEmits<{
  'update:doc': [value: any]
  focus: [editor: Editor]
}>()

const hostRef = ref<HTMLElement | null>(null)
const editor = shallowRef<Editor | null>(null)
const error = ref('')

function emitFocus() {
  if (editor.value && !editor.value.isDestroyed) emit('focus', editor.value)
}

onMounted(() => {
  const host = hostRef.value
  if (!host) return
  try {
    editor.value = new Editor({
      element: host,
      content: sanitizeTipTapJsonForProseMirror(JSON.parse(JSON.stringify(props.doc))),
      extensions: [
        StarterKit.configure({ link: { openOnClick: false } }),
        Image,
        Placeholder.configure({ placeholder: 'Write page content…' }),
        TableKit.configure({
          table: { resizable: true, allowTableNodeSelection: true },
        }),
      ],
      onFocus: () => emitFocus(),
      onUpdate: ({ editor: current }) => {
        emit('update:doc', current.getJSON())
      },
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not open this content section.'
  }
})

onBeforeUnmount(() => {
  if (editor.value && !editor.value.isDestroyed) editor.value.destroy()
  editor.value = null
})
</script>
