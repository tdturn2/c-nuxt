<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <div class="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm"
          :class="mode === 'visual' ? 'bg-[rgba(13,94,130,1)] text-white' : 'text-gray-700'"
          @click="showVisual"
        >
          Visual
        </button>
        <button
          type="button"
          class="rounded px-3 py-1.5 text-sm"
          :class="mode === 'code' ? 'bg-[rgba(13,94,130,1)] text-white' : 'text-gray-700'"
          @click="showCode"
        >
          Code
        </button>
      </div>
      <p class="text-xs text-gray-500">
        Visual uses the same formatting tools as pages. Code accepts HTML pasted from another editor, including inline styles.
      </p>
    </div>

    <div v-if="mode === 'visual'" class="overflow-hidden rounded-md border border-gray-300 bg-white">
      <UEditorToolbar
        v-if="editor"
        :editor="editor"
        :items="toolbarItems"
        class="sticky top-0 z-10 overflow-x-auto border-b border-gray-200 bg-white/95"
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
          :class="selectedImage.size === option.value ? 'bg-[rgba(13,94,130,1)] text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'"
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
          :class="selectedImage.align === option.value ? 'bg-[rgba(13,94,130,1)] text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200'"
          @click="setImageAttr('align', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div ref="hostRef" class="official-message-editor" />
      <UEditorDragHandle v-if="editor" :editor="editor" />
    </div>
    <textarea
      v-else
      v-model="htmlSource"
      spellcheck="false"
      class="min-h-72 w-full rounded-md border border-gray-300 bg-gray-950 px-3 py-3 font-mono text-xs leading-5 text-gray-100"
      placeholder="Paste HTML here"
    />
    <p v-if="editorError" class="mt-2 text-sm text-red-600">{{ editorError }}</p>
  </div>
</template>

<script setup lang="ts">
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { Editor } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
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

const extensions = [
  StarterKit.configure({
    link: { openOnClick: false },
    heading: { levels: [1, 2, 3, 4] },
  }),
  PageImage,
  Placeholder.configure({ placeholder: 'Write an official message…' }),
  TableKit.configure({
    table: { resizable: true, allowTableNodeSelection: true },
  }),
]

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

const mode = ref<'visual' | 'code'>('visual')
const htmlSource = ref('')
const hostRef = ref<HTMLElement | null>(null)
const editor = shallowRef<Editor | null>(null)
const editorError = ref('')
const selectedImage = ref<{ align: PageImageAlign; size: PageImageSize } | null>(null)

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

function runTableCommand(command: string, attrs?: Record<string, unknown>) {
  const current = editor.value
  if (!current || current.isDestroyed) return
  const chain = current.chain().focus() as unknown as Record<string, (...args: unknown[]) => { run: () => boolean }>
  const fn = chain[command]
  if (typeof fn === 'function') fn.call(chain, attrs).run()
}

function promptForImage() {
  const src = window.prompt('Image URL')?.trim()
  if (!src || !editor.value || editor.value.isDestroyed) return
  editor.value.chain().focus().setImage({ src, alt: '' }).run()
}

const toolbarItems = computed(() => [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } },
  ],
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' },
        { kind: 'heading', level: 4, icon: 'i-lucide-heading-4', label: 'Heading 4' },
      ],
    },
    {
      icon: 'i-lucide-list',
      tooltip: { text: 'Lists' },
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bulleted list' },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Numbered list' },
      ],
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code block' } },
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Inline code' } },
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
    { icon: 'i-lucide-image', tooltip: { text: 'Image' }, onClick: promptForImage },
    {
      icon: 'i-lucide-table-2',
      tooltip: { text: 'Table' },
      content: { align: 'end' },
      items: [
        { label: 'Insert 3 × 3 table', icon: 'i-lucide-table-2', onClick: () => runTableCommand('insertTable', { rows: 3, cols: 3, withHeaderRow: true }) },
        { label: 'Add row above', icon: 'i-lucide-rows-3', onClick: () => runTableCommand('addRowBefore') },
        { label: 'Add row below', icon: 'i-lucide-rows-3', onClick: () => runTableCommand('addRowAfter') },
        { label: 'Add column before', icon: 'i-lucide-columns-3', onClick: () => runTableCommand('addColumnBefore') },
        { label: 'Add column after', icon: 'i-lucide-columns-3', onClick: () => runTableCommand('addColumnAfter') },
        { label: 'Delete row', icon: 'i-lucide-rows-2', onClick: () => runTableCommand('deleteRow') },
        { label: 'Delete column', icon: 'i-lucide-columns-2', onClick: () => runTableCommand('deleteColumn') },
        { label: 'Merge selected cells', icon: 'i-lucide-panels-top-left', onClick: () => runTableCommand('mergeCells') },
        { label: 'Split cell', icon: 'i-lucide-grid-2x2', onClick: () => runTableCommand('splitCell') },
        { label: 'Toggle header row', icon: 'i-lucide-panel-top', onClick: () => runTableCommand('toggleHeaderRow') },
        { label: 'Delete table', icon: 'i-lucide-trash-2', onClick: () => runTableCommand('deleteTable') },
      ],
    },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Divider' } },
    { kind: 'clearFormatting', icon: 'i-lucide-rotate-ccw', tooltip: { text: 'Clear formatting' } },
  ],
])

function mountEditor() {
  const host = hostRef.value
  if (!host || editor.value) return
  try {
    editor.value = new Editor({
      element: host,
      content: htmlSource.value.trim() || '<p></p>',
      extensions,
      onSelectionUpdate: ({ editor: current }) => readSelectedImage(current),
    })
    editorError.value = ''
  } catch (err) {
    editorError.value = err instanceof Error ? err.message : 'Could not open the editor.'
  }
}

function destroyEditor() {
  if (editor.value && !editor.value.isDestroyed) editor.value.destroy()
  editor.value = null
  selectedImage.value = null
}

function showCode() {
  if (editor.value && !editor.value.isDestroyed) htmlSource.value = editor.value.getHTML()
  mode.value = 'code'
}

function showVisual() {
  mode.value = 'visual'
}

watch(mode, async (next) => {
  if (next !== 'visual') {
    destroyEditor()
    return
  }
  await nextTick()
  mountEditor()
})

onMounted(() => {
  if (mode.value === 'visual') mountEditor()
})

onBeforeUnmount(destroyEditor)

function htmlForSend() {
  if (mode.value === 'code') return htmlSource.value
  return editor.value && !editor.value.isDestroyed ? editor.value.getHTML() : htmlSource.value
}

function clear() {
  htmlSource.value = ''
  if (mode.value === 'visual' && editor.value && !editor.value.isDestroyed) {
    editor.value.commands.setContent('<p></p>')
    return
  }
  mode.value = 'visual'
}

defineExpose({ htmlForSend, clear })
</script>

<style>
.official-message-editor .ProseMirror {
  min-height: 16rem;
  padding: 0.75rem 1rem;
  outline: none;
}
.official-message-editor .ProseMirror h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.25; margin: 1rem 0 0.65rem; }
.official-message-editor .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.25; margin: 1.25rem 0 0.5rem; }
.official-message-editor .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.375; margin: 1rem 0 0.4rem; }
.official-message-editor .ProseMirror h4 { font-size: 1.125rem; font-weight: 600; line-height: 1.375; margin: 0.85rem 0 0.35rem; }
.official-message-editor .ProseMirror p { margin: 0.35rem 0; }
.official-message-editor .ProseMirror ul { list-style: disc; padding-left: 1.25rem; margin: 0.35rem 0; }
.official-message-editor .ProseMirror ol { list-style: decimal; padding-left: 1.25rem; margin: 0.35rem 0; }
.official-message-editor .ProseMirror blockquote { border-left: 3px solid #d1d5db; padding-left: 0.75rem; color: #4b5563; margin: 0.5rem 0; }
.official-message-editor .ProseMirror a { color: rgb(13, 94, 130); text-decoration: underline; }
.official-message-editor .ProseMirror img { display: block; max-width: 100%; height: auto; border-radius: 0.5rem; }
.official-message-editor .ProseMirror img[data-size="small"] { width: 10rem; }
.official-message-editor .ProseMirror img[data-size="medium"] { width: 16rem; }
.official-message-editor .ProseMirror img[data-size="large"] { width: 24rem; }
.official-message-editor .ProseMirror img[data-size="full"] { width: 100%; }
.official-message-editor .ProseMirror img[data-align="left"] { float: left; margin: 0.2rem 1rem 0.6rem 0; }
.official-message-editor .ProseMirror img[data-align="right"] { float: right; margin: 0.2rem 0 0.6rem 1rem; }
.official-message-editor .ProseMirror pre { margin: 0.5rem 0; overflow-x: auto; border-radius: 0.375rem; border: 1px solid #e5e7eb; background: #f9fafb; padding: 0.75rem; font-size: 0.75rem; }
.official-message-editor .tableWrapper { margin: 1rem 0; overflow-x: auto; }
.official-message-editor table { width: 100%; border-collapse: collapse; }
.official-message-editor th,
.official-message-editor td { position: relative; min-width: 4rem; border: 1px solid #d1d5db; padding: 0.45rem 0.6rem; vertical-align: top; }
.official-message-editor th { background: #f3f4f6; font-weight: 600; }
.official-message-editor .selectedCell::after { position: absolute; inset: 0; content: ''; background: rgba(13, 94, 130, 0.14); pointer-events: none; }
</style>
