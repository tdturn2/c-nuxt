<template>
  <div class="overflow-hidden rounded-md border border-gray-300 bg-white" @pointerdown="emitFocus">
    <UEditorToolbar
      v-if="editor"
      :editor="editor"
      :items="toolbarItems"
      class="border-b border-gray-200 bg-white"
    />
    <div
      v-if="selectedImage"
      class="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5"
      @mousedown.prevent
    >
      <span class="mr-1 text-xs font-medium text-gray-500">Size</span>
      <button
        v-for="option in sizeOptions"
        :key="option.value"
        type="button"
        class="rounded px-2 py-1 text-xs font-medium"
        :class="selectedImage.size === option.value
          ? 'bg-[rgba(13,94,130,1)] text-white'
          : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'"
        @click="setImageAttr('size', option.value)"
      >
        {{ option.label }}
      </button>
      <span class="mx-1 hidden h-4 w-px bg-gray-300 sm:inline-block" />
      <span class="mr-1 text-xs font-medium text-gray-500">Float</span>
      <button
        v-for="option in alignOptions"
        :key="option.value"
        type="button"
        class="rounded px-2 py-1 text-xs font-medium"
        :class="selectedImage.align === option.value
          ? 'bg-[rgba(13,94,130,1)] text-white'
          : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100'"
        @click="setImageAttr('align', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
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
import { NodeSelection } from '@tiptap/pm/state'
import { sanitizeTipTapJsonForProseMirror } from '~/utils/tiptap/lexicalTipTap'
import {
  normalizePageImageAlign,
  normalizePageImageSize,
  type PageImageAlign,
  type PageImageSize,
} from '~/utils/connectPagesDocImage'

const PageImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'none',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'none',
        renderHTML: (attributes: { align?: string }) => ({
          'data-align': normalizePageImageAlign(attributes.align),
        }),
      },
      size: {
        default: 'full',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-size') || 'full',
        renderHTML: (attributes: { size?: string }) => ({
          'data-size': normalizePageImageSize(attributes.size),
        }),
      },
    }
  },
})

const sizeOptions: Array<{ value: PageImageSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full' },
]

const alignOptions: Array<{ value: PageImageAlign; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'none', label: 'None' },
]

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
const selectedImage = ref<{ align: PageImageAlign; size: PageImageSize } | null>(null)

function emitFocus() {
  if (editor.value && !editor.value.isDestroyed) emit('focus', editor.value)
}

function readSelectedImage(current: Editor) {
  const selection = current.state.selection
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== 'image') {
    selectedImage.value = null
    return
  }
  selectedImage.value = {
    align: normalizePageImageAlign(selection.node.attrs?.align),
    size: normalizePageImageSize(selection.node.attrs?.size),
  }
}

function setImageAttr(key: 'align' | 'size', value: string) {
  const current = editor.value
  if (!current || current.isDestroyed) return
  const attrs = key === 'align'
    ? { align: normalizePageImageAlign(value) }
    : { size: normalizePageImageSize(value) }
  current.chain().focus().updateAttributes('image', attrs).run()
  readSelectedImage(current)
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
        PageImage,
        Placeholder.configure({ placeholder: 'Write page content…' }),
        TableKit.configure({
          table: { resizable: true, allowTableNodeSelection: true },
        }),
      ],
      onFocus: () => emitFocus(),
      onSelectionUpdate: ({ editor: current }) => readSelectedImage(current),
      onUpdate: ({ editor: current }) => {
        emit('update:doc', current.getJSON())
        readSelectedImage(current)
      },
    })
    if (editor.value) emit('focus', editor.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not open this content section.'
  }
})

onBeforeUnmount(() => {
  if (editor.value && !editor.value.isDestroyed) editor.value.destroy()
  editor.value = null
})
</script>
