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
const route = useRoute()

function getPdfUrlFromQuery() {
  const raw = route.query.src
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    if (!(url.protocol === 'http:' || url.protocol === 'https:')) return ''
    return url.toString()
  } catch {
    return ''
  }
}

const pdfUrl = computed(() => getPdfUrlFromQuery())
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
