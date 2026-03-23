<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
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
            class="prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-[rgba(13,94,130,1)] prose-a:no-underline hover:prose-a:underline"
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
const route = useRoute()
const slug = computed(() => (route.params.slug as string) ?? '')

const { data: fetchData, pending, error } = await useFetch<
  { docs?: Array<{ title?: string; content?: unknown }> } | { title?: string; content?: unknown }
>('/api/connect-pages', {
  key: () => `connect-page-${slug.value}`,
  query: () => ({
    'where[slug][equals]': slug.value,
    limit: 1,
    depth: 1,
  }),
})

/** Single page doc: by-slug may return doc directly or { docs: [doc] } */
const page = computed(() => {
  const d = fetchData.value
  if (!d) return null
  return Array.isArray((d as any).docs) ? (d as any).docs[0] ?? null : (d as any)
})

function lexicalToHtml(node: any): string {
  if (!node || typeof node !== 'object') return ''

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

  if (node.type === 'text') {
    let text = node.text || ''
    if (!text) return ''
    if (node.format & 1) text = `<strong>${text}</strong>` // bold
    if (node.format & 2) text = `<em>${text}</em>` // italic
    if (node.format & 8) text = `<u>${text}</u>` // underline
    return text
  }

  // Fallback: render children only
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
  title: () => (page.value?.title ? `${page.value.title} | Asbury Connect` : 'Asbury Connect'),
})
</script>

