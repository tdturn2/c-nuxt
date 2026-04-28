<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div v-if="!issueUrl" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Invalid or missing issue URL.
        </div>

        <div v-else-if="pending" class="space-y-3">
          <div v-for="n in 6" :key="n" class="h-16 rounded-lg border border-gray-200 bg-white animate-pulse" />
        </div>

        <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load issue contents.
        </div>

        <div v-else class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div class="min-w-0">
              <h1 class="truncate text-sm font-semibold text-gray-900">{{ issueTitle }}</h1>
              <p class="truncate text-xs text-gray-500">{{ issueUrl }}</p>
            </div>
            <NuxtLink
              to="/first-fruits"
              class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            >
              Back
            </NuxtLink>
          </div>

          <div class="p-4">
            <div class="mb-4 flex items-start gap-3" v-if="coverUrl">
              <img :src="coverUrl" alt="" class="h-32 w-24 rounded border border-gray-200 object-cover bg-gray-100" loading="lazy" />
              <p class="text-sm text-gray-600">Issue contents</p>
            </div>

            <div v-if="entries.length === 0" class="text-sm text-gray-500">
              No entries found for this issue.
            </div>
            <div v-else class="space-y-2">
              <article
                v-for="entry in entries"
                :key="entry.pdfUrl || entry.articleUrl || entry.title"
                class="rounded border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <NuxtLink
                  v-if="entry.pdfUrl"
                  :to="pdfLink(entry)"
                  class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                >
                  {{ entry.title }}
                </NuxtLink>
                <a
                  v-else-if="entry.articleUrl"
                  :href="entry.articleUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                >
                  {{ entry.title }}
                </a>
                <p v-else class="text-sm font-medium text-gray-900">{{ entry.title }}</p>
                <p class="mt-0.5 text-xs text-gray-600">{{ entry.author || 'Unknown author' }}</p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type IssueEntry = {
  title: string
  author: string | null
  articleUrl: string | null
  pdfUrl: string | null
}

const route = useRoute()

const issueUrl = computed(() => {
  const raw = route.query.url
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || typeof value !== 'string') return ''
  try {
    const parsed = new URL(value)
    if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) return ''
    return parsed.toString()
  } catch {
    return ''
  }
})

const { data, pending, error } = await useAsyncData(
  'journal-issue-data',
  async () => {
    if (!issueUrl.value) {
      return { issueTitle: null, coverUrl: null, entries: [] as IssueEntry[] }
    }
    return await $fetch<{
      issueTitle: string | null
      coverUrl: string | null
      entries: IssueEntry[]
    }>(`/api/digital-commons/issue-entries?issueUrl=${encodeURIComponent(issueUrl.value)}`)
  },
  { watch: [issueUrl] },
)

const issueTitle = computed(() => {
  const raw = route.query.title
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value === 'string' && value.trim()) return value.trim()
  return data.value?.issueTitle ?? 'Journal Issue'
})

const coverUrl = computed(() => data.value?.coverUrl || '')
const entries = computed(() => (Array.isArray(data.value?.entries) ? data.value!.entries! : []))

function pdfLink(entry: IssueEntry) {
  return {
    path: '/pdf',
    query: {
      src: entry.pdfUrl || '',
      title: entry.title,
      from: '/journal-issue',
    },
  }
}

useHead({
  title: () => `${issueTitle.value} | Asbury Connect`,
})
</script>
