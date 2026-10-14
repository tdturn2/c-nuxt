<template>
  <UEditor
    ref="editorRef"
    v-slot="{ editor }"
    v-model="model"
    content-type="html"
    :extensions="extensions"
    placeholder="Write the job description…"
    class="w-full min-h-[220px] overflow-hidden rounded-md border border-gray-300 bg-white job-description-editor"
  >
    <UEditorToolbar
      :editor="editor"
      :items="toolbarItems"
      class="border-b border-gray-200 sticky top-0 inset-x-0 bg-white/95 backdrop-blur z-10 overflow-x-auto"
    />
    <UEditorDragHandle :editor="editor" />
  </UEditor>
</template>

<script setup lang="ts">
import { unref } from 'vue'
import { TableKit } from '@tiptap/extension-table'

const model = defineModel<string>({ default: '' })

const editorRef = ref<any>(null)

const extensions = [
  TableKit.configure({
    table: {
      resizable: true,
      allowTableNodeSelection: true,
    },
  }),
]

function runTableCommand(command: string, attrs?: Record<string, unknown>) {
  const inst = editorRef.value as any
  const editor = inst?.editor != null ? unref(inst.editor) : null
  if (!editor || editor.isDestroyed) return
  const chain = editor.chain().focus()
  const fn = chain[command]
  if (typeof fn === 'function') fn.call(chain, attrs).run()
}

const toolbarItems = [
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
    {
      icon: 'i-lucide-table-2',
      tooltip: { text: 'Table' },
      content: { align: 'end' },
      items: [
        {
          label: 'Insert 3 × 3 table',
          icon: 'i-lucide-table-2',
          onClick: () => runTableCommand('insertTable', { rows: 3, cols: 3, withHeaderRow: true }),
        },
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
]
</script>

<style>
.job-description-editor .tiptap,
.job-description-editor .ProseMirror {
  min-height: 220px;
  padding: 0.75rem 0.9rem;
  outline: none;
}
.job-description-editor .ProseMirror h1 {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0.75rem 0 0.4rem;
}
.job-description-editor .ProseMirror h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0.7rem 0 0.35rem;
}
.job-description-editor .ProseMirror h3,
.job-description-editor .ProseMirror h4 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.6rem 0 0.3rem;
}
.job-description-editor .ProseMirror p {
  margin: 0 0 0.65rem;
  line-height: 1.6;
}
.job-description-editor .ProseMirror ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.35rem 0 0.65rem;
}
.job-description-editor .ProseMirror ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.35rem 0 0.65rem;
}
.job-description-editor .ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 0.75rem;
  color: #4b5563;
  margin: 0.5rem 0;
}
.job-description-editor .ProseMirror a {
  color: rgb(13, 94, 130);
  text-decoration: underline;
}
.job-description-editor .ProseMirror table {
  width: 100%;
  margin: 0.5rem 0 0.75rem;
  border-collapse: collapse;
}
.job-description-editor .ProseMirror th,
.job-description-editor .ProseMirror td {
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.6rem;
  vertical-align: top;
  text-align: left;
}
.job-description-editor .ProseMirror th {
  background: #f9fafb;
  font-weight: 600;
}
.job-description-editor .ProseMirror hr {
  margin: 0.75rem 0;
  border-color: #e5e7eb;
}
</style>
