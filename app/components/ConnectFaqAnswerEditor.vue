<template>
  <div class="mt-1 overflow-hidden rounded-md border border-gray-300 bg-white">
    <div class="flex flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 px-1 py-1">
      <UButton icon="i-lucide-bold" color="neutral" variant="ghost" size="xs" title="Bold" @mousedown.prevent="exec('bold')" />
      <UButton icon="i-lucide-italic" color="neutral" variant="ghost" size="xs" title="Italic" @mousedown.prevent="exec('italic')" />
      <UButton icon="i-lucide-underline" color="neutral" variant="ghost" size="xs" title="Underline" @mousedown.prevent="exec('underline')" />
      <UButton icon="i-lucide-list" color="neutral" variant="ghost" size="xs" title="Bulleted list" @mousedown.prevent="exec('insertUnorderedList')" />
      <UButton icon="i-lucide-list-ordered" color="neutral" variant="ghost" size="xs" title="Numbered list" @mousedown.prevent="exec('insertOrderedList')" />
      <UButton icon="i-lucide-link" color="neutral" variant="ghost" size="xs" title="Link" @mousedown.prevent="applyLink" />
    </div>
    <div
      ref="fieldRef"
      v-once
      contenteditable="true"
      class="faq-answer-field max-h-64 min-h-28 overflow-auto px-3 py-2 text-sm leading-relaxed text-gray-900 outline-none"
      v-html="startingHtml"
      @input="sync"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  faqAnswerDocToHtml,
  htmlToFaqAnswerDoc,
  isSafeFaqHref,
  renderConnectFaqAnswerHtml,
} from '~/utils/connectFaq'

const props = defineProps<{
  modelValue?: { type?: string; content?: any[] } | null
  fallbackAnswer?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { type: 'doc'; content: any[] }]
}>()

const fieldRef = ref<HTMLElement | null>(null)

const startingHtml = (() => {
  if (props.modelValue?.type === 'doc' && Array.isArray(props.modelValue.content)) {
    return faqAnswerDocToHtml(props.modelValue) || '<p><br></p>'
  }
  return renderConnectFaqAnswerHtml(props.fallbackAnswer || '') || '<p><br></p>'
})()

function sync() {
  const html = fieldRef.value?.innerHTML || ''
  emit('update:modelValue', htmlToFaqAnswerDoc(html))
}

function exec(command: string) {
  fieldRef.value?.focus()
  document.execCommand(command)
  sync()
}

function applyLink() {
  const field = fieldRef.value
  if (!field) return
  field.focus()
  const entered = window.prompt('Link address', 'https://')
  if (entered == null) return
  const href = entered.trim()
  if (!href) {
    document.execCommand('unlink')
    sync()
    return
  }
  if (!isSafeFaqHref(href)) return
  const selected = window.getSelection()?.toString() || ''
  if (!selected) {
    const safeHref = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    const safeText = href.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    document.execCommand('insertHTML', false, `<a href="${safeHref}">${safeText}</a>`)
  } else {
    document.execCommand('createLink', false, href)
  }
  sync()
}
</script>

<style scoped>
.faq-answer-field :deep(a) {
  color: rgb(13, 94, 130);
  text-decoration: underline;
}
.faq-answer-field :deep(ul) {
  list-style: disc;
  margin: 0.35rem 0;
  padding-left: 1.25rem;
}
.faq-answer-field :deep(ol) {
  list-style: decimal;
  margin: 0.35rem 0;
  padding-left: 1.25rem;
}
.faq-answer-field :deep(p) {
  margin: 0.35rem 0;
}
.faq-answer-field :deep(p:first-child) {
  margin-top: 0;
}
.faq-answer-field :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
