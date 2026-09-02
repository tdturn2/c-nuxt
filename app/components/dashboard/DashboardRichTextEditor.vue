<template>
  <UEditor
    v-slot="{ editor }"
    v-model="editorModel"
    content-type="json"
    :placeholder="placeholder"
    class="w-full min-h-[180px] overflow-hidden rounded-md border border-gray-300 bg-white connect-post-editor"
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
import {
  cloneTipTapDoc,
  INITIAL_TIPTAP_DOC,
  sanitizeTipTapJsonForProseMirror,
} from '~/utils/tiptap/lexicalTipTap'

const props = withDefaults(defineProps<{
  modelValue?: any
  placeholder?: string
}>(), {
  placeholder: 'Write a post…',
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const editorModel = computed({
  get() {
    return sanitizeTipTapJsonForProseMirror(cloneTipTapDoc(props.modelValue ?? INITIAL_TIPTAP_DOC))
  },
  set(v: any) {
    emit('update:modelValue', v)
  },
})

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
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Divider' } },
    { kind: 'clearFormatting', icon: 'i-lucide-rotate-ccw', tooltip: { text: 'Clear formatting' } },
  ],
]
</script>

<style>
.connect-post-editor .tiptap,
.connect-post-editor .ProseMirror {
  min-height: 160px;
  padding: 0.75rem 0.9rem;
  outline: none;
}
.connect-post-editor .ProseMirror h1 {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0.35rem 0 0.5rem;
}
.connect-post-editor .ProseMirror h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0.35rem 0 0.4rem;
}
.connect-post-editor .ProseMirror h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.3rem 0 0.35rem;
}
.connect-post-editor .ProseMirror p {
  margin: 0 0 0.5rem;
}
.connect-post-editor .ProseMirror p:last-child {
  margin-bottom: 0;
}
.connect-post-editor .ProseMirror ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.35rem 0;
}
.connect-post-editor .ProseMirror ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.35rem 0;
}
.connect-post-editor .ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 0.75rem;
  color: #4b5563;
  margin: 0.5rem 0;
}
.connect-post-editor .ProseMirror a {
  color: rgb(13, 94, 130);
  text-decoration: underline;
}
.connect-post-editor .ProseMirror pre {
  margin: 0.5rem 0;
  overflow-x: auto;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 0.75rem;
  font-size: 0.75rem;
}
.connect-post-editor .ProseMirror code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.connect-post-editor .ProseMirror hr {
  margin: 0.75rem 0;
  border-color: #e5e7eb;
}
</style>
