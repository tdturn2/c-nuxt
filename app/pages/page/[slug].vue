<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftInternal />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="pending" class="py-12 text-center text-gray-500">
          Loading...
        </div>
        <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {{ error }}
        </div>
        <div v-else-if="!page" class="py-12 text-center text-gray-500">
          Page not found.
        </div>
        <article v-else>
          <h1 class="text-3xl font-bold text-gray-900 mb-6">
            {{ page.title }}
          </h1>
          <div
            v-if="contentHtml"
            class="prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-[rgba(13,94,130,1)] prose-a:no-underline hover:prose-a:underline prose-p:mb-4 prose-h1:mb-6 prose-h2:mt-8 prose-h2:mb-3 prose-ul:ml-6 prose-ul:list-disc prose-ol:ml-6 prose-ol:list-decimal prose-li:my-1"
            v-html="contentHtml"
          />
          <div v-else-if="page.content" class="prose prose-gray max-w-none text-gray-600">
            <p>Content format is not supported for display.</p>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { buildPagePathMap } from '~/composables/useConnectPagesTree'

const route = useRoute()
const slug = computed(() => (route.params.slug as string) ?? '')

const { data: fetchData, pending, error } = await useFetch<
  { docs?: Array<{ id: number | string; title?: string; content?: unknown; slug?: string; parent?: unknown }> }
>('/api/connect-pages', {
  key: () => `connect-page-${slug.value}`,
  query: () => ({
    limit: 500,
    depth: 2,
    sort: 'order,title',
  }),
})

const page = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  return docs.find((d) => (d.slug || '').toString() === slug.value) || null
})

const canonicalPath = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  const current = page.value
  if (!current) return null
  const { pathById } = buildPagePathMap(docs)
  return pathById.get(String(current.id)) || null
})

watchEffect(() => {
  const next = canonicalPath.value
  if (next && route.path !== next) navigateTo(next, { replace: true })
})

function lexicalToHtml(node: any): string {
  if (!node || typeof node !== 'object') return ''

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  const linkifyEscapedText = (escapedText: string) =>
    escapedText.replace(urlRegex, (matchedUrl) => {
      // `matchedUrl` is already HTML-escaped because the input is escaped.
      const href = matchedUrl
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${matchedUrl}</a>`
    })

  if (node.type === 'root' && Array.isArray(node.children)) {
    return node.children.map(lexicalToHtml).join('')
  }

  if (node.type === 'paragraph') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<p class="mb-4 leading-relaxed">${inner}</p>` : ''
  }

  if (node.type === 'heading') {
    const tag = node.tag || 'h2'
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<${tag} class="mt-8 mb-3 font-semibold">${inner}</${tag}>` : ''
  }

  if (node.type === 'quote') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<blockquote>${inner}</blockquote>` : ''
  }

  if (node.type === 'list') {
    const tag = node.listType === 'number' ? 'ol' : 'ul'
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<${tag}>${inner}</${tag}>` : ''
  }

  if (node.type === 'listitem') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<li>${inner}</li>` : ''
  }

  if (node.type === 'link') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    const href = typeof node?.fields?.url === 'string' ? node.fields.url : (typeof node.url === 'string' ? node.url : '')
    if (!inner || !href) return inner
    const safeHref = escapeHtml(href)
    const target = (node?.fields?.newTab || node.newTab) ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safeHref}"${target}>${inner}</a>`
  }

  if (node.type === 'text') {
    let text = escapeHtml(node.text || '')
    if (!text) return ''
    if (node.format & 1) text = `<strong>${text}</strong>` // bold
    if (node.format & 2) text = `<em>${text}</em>` // italic
    if (node.format & 8) text = `<u>${text}</u>` // underline
    // Convert plain URLs into clickable anchors
    return linkifyEscapedText(text)
  }

  if (node.type === 'autolink') {
    const hrefRaw = node?.fields?.url || node?.url
    if (typeof hrefRaw !== 'string' || !hrefRaw) return ''
    const href = escapeHtml(hrefRaw)
    const inner = (node.children || []).map(lexicalToHtml).join('') || href
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${inner}</a>`
  }

  if (Array.isArray(node.children)) {
    return node.children.map(lexicalToHtml).join('')
  }

  return ''
}

/** Extract HTML string from Payload content (HTML field or Lexical rich text JSON) */
const contentHtml = computed(() => {
  const c = page.value?.content as any
  if (!c) return ''

  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && 'html' in c && typeof (c as { html: string }).html === 'string') {
    return (c as { html: string }).html
  }
  if (c && typeof c === 'object' && c.root && typeof c.root === 'object') {
    return lexicalToHtml(c.root)
  }

  return ''
})

useHead({
  title: () => page.value?.title ? `${page.value.title} | Asbury Connect` : 'Asbury Connect',
})
</script>

