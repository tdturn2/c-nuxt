<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside
      class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80"
    >
      <LeftInternal />
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div v-if="!pdfUrl" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Invalid or missing PDF URL.
        </div>
        <div v-else-if="asburyEmbedBlocked" class="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p class="font-semibold">This PDF host is blocking embedded viewing right now.</p>
          <p class="mt-2">
            Open the document in a new tab to complete any challenge check, then view or download from there.
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <NuxtLink
              v-if="returnTo"
              :to="returnTo"
              class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            >
              Back to page
            </NuxtLink>
            <a
              :href="rawPdfUrl || pdfUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Open PDF in new tab
            </a>
          </div>
        </div>
        <PdfEmbed
          v-else
          :src="pdfUrl"
          :title="pdfTitle"
          :back-to="returnTo"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { normalizePlaceViewcontentSearchUrl } from '@shared/digitalCommonsViewcontent'

const route = useRoute()

function getRawPdfUrlFromQuery() {
  const raw = route.query.src
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed
}

function getPdfUrlFromQuery() {
  const trimmed = getRawPdfUrlFromQuery()
  if (!trimmed) return ''

  // Allow same-origin relative proxy paths like /api/pdf-proxy?url=...
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    if (!(url.protocol === 'http:' || url.protocol === 'https:')) return ''
    // Proxy Digital Commons PDFs so browsers don't block iframe embedding
    // when upstream sends X-Frame-Options/CSP frame-ancestors restrictions.
    if (url.hostname.endsWith('place.asburyseminary.edu')) {
      const canonical = normalizePlaceViewcontentSearchUrl(url.toString())
      return `/api/pdf-proxy?url=${encodeURIComponent(canonical)}`
    }
    return url.toString()
  } catch {
    return ''
  }
}

const rawPdfUrl = computed(() => getRawPdfUrlFromQuery())
const pdfUrl = computed(() => getPdfUrlFromQuery())
// Only when the iframe would point at Digital Commons directly (frame
// restrictions). Base this on the resolved `pdfUrl`, not `src` query alone,
// so `/pdf?src=https://place…` still embeds via `/api/pdf-proxy`.
const asburyEmbedBlocked = computed(() => {
  try {
    const src = pdfUrl.value
    if (!src) return false
    if (src.startsWith('/') || src.startsWith('//')) return false
    const url = new URL(src)
    return url.hostname.endsWith('place.asburyseminary.edu')
  } catch {
    return false
  }
})

const pdfTitle = computed(() => {
  const raw = route.query.title
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.trim() ? value.trim() : 'PDF Document'
})

const returnTo = computed(() => {
  const raw = route.query.from
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return ''
  if (trimmed.startsWith('//')) return ''
  return trimmed
})

useHead({
  title: () => `${pdfTitle.value} | Asbury Connect`,
})
</script>
