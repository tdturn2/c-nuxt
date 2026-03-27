<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside
      class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80"
    >
      <LeftInternal />
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            class="connect-page-body prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-[rgba(13,94,130,1)] prose-p:mb-4 prose-h1:mb-6 prose-h2:mt-8 prose-h2:mb-3 prose-ul:ml-6 prose-ul:list-disc prose-ul:my-2 prose-ol:ml-6 prose-ol:list-decimal prose-ol:my-2 prose-li:my-0 prose-li:leading-snug"
            v-html="contentHtml"
            @click="onContentClick"
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
import { findConnectPageByPath } from '~/composables/useConnectPagesTree'

const route = useRoute()

const { data: fetchData, pending, error } = await useFetch<
  { docs?: Array<{ id: number | string; title?: string; content?: unknown; slug?: string; parent?: unknown }> }
>('/api/connect-pages', {
  key: () => `connect-page-catchall-${route.path}`,
  query: () => ({
    limit: 500,
    depth: 2,
    sort: 'order,title',
  }),
})

const page = computed(() => {
  const docs = Array.isArray(fetchData.value?.docs) ? fetchData.value.docs : []
  return findConnectPageByPath(docs, route.path)
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

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').trim()
  const pdfTitleFromHref = (href: string) => {
    try {
      const u = new URL(href)
      const last = decodeURIComponent((u.pathname.split('/').pop() || '').trim())
      return last.replace(/\.pdf$/i, '') || 'PDF Document'
    } catch {
      return 'PDF Document'
    }
  }
  const isPdfUrl = (href: string) => {
    if (/\.pdf(?:$|[?#])/i.test(href)) return true
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      const url = new URL(href, base)
      const src = url.searchParams.get('src') || ''
      return /\.pdf(?:$|[?#])/i.test(decodeURIComponent(src))
    } catch {
      return false
    }
  }
  const toViewerHref = (href: string, linkText?: string) => {
    if (!isPdfUrl(href)) return href
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      const url = new URL(href, base)
      if (url.pathname === '/pdf' && url.searchParams.get('src')) return href
    } catch {}
    const candidate = (linkText || '').trim()
    const title = candidate || pdfTitleFromHref(href)
    return `/pdf?src=${encodeURIComponent(href)}&title=${encodeURIComponent(title)}&from=${encodeURIComponent(route.fullPath)}`
  }

  const pdfAttr = (href: string) => (isPdfUrl(href) ? ' data-pdf-link="true"' : '')
  const isInternalConnectHref = (href: string) => {
    if (href.startsWith('/')) return true
    try {
      const base = import.meta.client ? window.location.origin : 'http://localhost'
      const url = new URL(href, base)
      if (url.origin === 'https://connect.asburyseminary.edu') return true
      if (import.meta.client && url.origin === window.location.origin) return true
      return false
    } catch {
      return false
    }
  }
  const externalAttr = (href: string) => (
    !isInternalConnectHref(href) && /^https?:\/\//i.test(href)
      ? ' data-external-link="true"'
      : ''
  )

  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  const linkifyEscapedText = (escapedText: string) =>
    escapedText.replace(urlRegex, (matchedUrl) => {
      const href = toViewerHref(matchedUrl, pdfTitleFromHref(matchedUrl))
      const target = isPdfUrl(matchedUrl) ? '' : ' target="_blank" rel="noopener noreferrer"'
      return `<a href="${escapeHtml(href)}"${target}${pdfAttr(matchedUrl)}${externalAttr(matchedUrl)}>${matchedUrl}</a>`
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
    if (!inner) return ''
    if (tag === 'ol') return `<ol class="list-decimal ml-6 my-2">${inner}</ol>`
    return `<ul class="list-disc ml-6 my-2">${inner}</ul>`
  }
  if (node.type === 'listitem') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    return inner ? `<li class="list-item my-0 py-0.5">${inner}</li>` : ''
  }
  if (node.type === 'link') {
    const inner = (node.children || []).map(lexicalToHtml).join('')
    const href = typeof node?.fields?.url === 'string' ? node.fields.url : (typeof node.url === 'string' ? node.url : '')
    if (!inner || !href) return inner
    const viewerHref = toViewerHref(href, stripHtml(inner))
    const safeHref = escapeHtml(viewerHref)
    const target = isPdfUrl(href)
      ? ''
      : (node?.fields?.newTab || node.newTab) ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safeHref}"${target}${pdfAttr(href)}${externalAttr(href)}>${inner}</a>`
  }
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '')
    if (!text) return ''
    if (node.format & 1) text = `<strong>${text}</strong>`
    if (node.format & 2) text = `<em>${text}</em>`
    if (node.format & 8) text = `<u>${text}</u>`
    return linkifyEscapedText(text)
  }
  if (node.type === 'autolink') {
    const hrefRaw = node?.fields?.url || node?.url
    if (typeof hrefRaw !== 'string' || !hrefRaw) return ''
    const inner = (node.children || []).map(lexicalToHtml).join('')
    const titleFromText = stripHtml(inner) || pdfTitleFromHref(hrefRaw)
    const href = escapeHtml(toViewerHref(hrefRaw, titleFromText))
    const fallbackInner = inner || href
    const target = isPdfUrl(hrefRaw) ? '' : ' target="_blank" rel="noopener noreferrer"'
    return `<a href="${href}"${target}${pdfAttr(hrefRaw)}${externalAttr(hrefRaw)}>${fallbackInner}</a>`
  }
  if (Array.isArray(node.children)) return node.children.map(lexicalToHtml).join('')
  return ''
}

const contentHtml = computed(() => {
  const c = page.value?.content as any
  if (!c) return ''
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && 'html' in c && typeof (c as { html: string }).html === 'string') {
    return (c as { html: string }).html
  }
  if (c && typeof c === 'object' && c.root && typeof c.root === 'object') return lexicalToHtml(c.root)
  return ''
})

function onContentClick(event: MouseEvent) {
  if (!import.meta.client) return
  if (event.defaultPrevented) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const target = event.target as HTMLElement | null
  const link = target?.closest('a') as HTMLAnchorElement | null
  if (!link) return
  const hrefAttr = (link.getAttribute('href') || '').trim()
  if (!hrefAttr) return

  const text = (link.textContent || '').trim()
  const looksLikePdf = /\.pdf(?:$|[?#])/i.test(hrefAttr)

  // Handle absolute PDF links from raw HTML content by routing them through SPA viewer.
  if (looksLikePdf && /^https?:\/\//i.test(hrefAttr)) {
    event.preventDefault()
    const title = text || 'PDF Document'
    const to = `/pdf?src=${encodeURIComponent(hrefAttr)}&title=${encodeURIComponent(title)}&from=${encodeURIComponent(route.fullPath)}`
    navigateTo(to)
    return
  }

  const href = hrefAttr
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href)
      if (url.origin === window.location.origin) {
        event.preventDefault()
        navigateTo(`${url.pathname}${url.search}${url.hash}`)
      }
    } catch {}
    return
  }

  if (!href.startsWith('/')) return

  event.preventDefault()
  navigateTo(href)
}

useHead({
  title: () => (page.value?.title ? `${page.value.title} | Asbury Connect` : 'Asbury Connect'),
})
</script>

<style>
/* Prose often wins over utilities for `a { text-decoration }` — force subtle underlines here. */
article .connect-page-body.prose a {
  text-decoration: underline;
  text-decoration-color: rgba(13, 94, 130, 0.38);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
article .connect-page-body.prose a:hover {
  text-decoration-color: rgba(13, 94, 130, 0.75);
}

article .connect-page-body.prose ul,
article .connect-page-body.prose ol {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

article .connect-page-body.prose li {
  margin-top: 0.1rem;
  margin-bottom: 0.1rem;
}

/* Lexical wraps list text in <p class="mb-4"> — that dominates vertical rhythm inside <li>. */
article .connect-page-body.prose li > p {
  margin-top: 0 !important;
  margin-bottom: 0.25rem !important;
}

article .connect-page-body.prose li > p:last-child {
  margin-bottom: 0 !important;
}

.prose a[data-pdf-link="true"]::after {
  content: '';
  display: inline-block;
  width: 0.95em;
  height: 0.95em;
  margin-left: 0.25em;
  vertical-align: -0.12em;
  background-color: #dc2626; /* red-600 */
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M14%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V8z'/%3E%3Cpath%20d%3D'M14%202v6h6'/%3E%3Cpath%20d%3D'M16%2013H8'/%3E%3Cpath%20d%3D'M16%2017H8'/%3E%3Cpath%20d%3D'M10%209H8'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Cpath%20d%3D'M14%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V8z'/%3E%3Cpath%20d%3D'M14%202v6h6'/%3E%3Cpath%20d%3D'M16%2013H8'/%3E%3Cpath%20d%3D'M16%2017H8'/%3E%3Cpath%20d%3D'M10%209H8'/%3E%3C/svg%3E") center / contain no-repeat;
}

.prose a[data-external-link="true"]::after {
  content: ' \2197';
  font-size: 0.85em;
  margin-left: 0.2em;
  color: #6b7280; /* gray-500 */
  vertical-align: 0.08em;
}
</style>
