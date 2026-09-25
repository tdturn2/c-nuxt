<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header class="mb-10">
          <img
            :src="firstFruitsLogo"
            alt="First Fruits"
            class="mx-auto mb-6 block h-auto w-full max-w-[400px]"
          >
          <p class="mx-auto max-w-3xl text-center text-sm leading-relaxed text-gray-600">
            First Fruits is the academic open press of Asbury Theological Seminary. Asbury Theological Seminary desires to share the fruit of our academic labor with the entire world. First Fruits is part of this mission, serving as a free, open-access press to make available academic material from the Wesleyan and Holiness traditions.
          </p>
        </header>

        <div v-if="isLoading" class="space-y-6" aria-live="polite" aria-busy="true">
          <div class="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Loading First Fruits content...
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="n in 6" :key="n" class="h-28 rounded-md border border-gray-200 bg-white animate-pulse" />
          </div>
        </div>

        <div v-else class="space-y-12">
          <section>
            <div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-200 pb-3">
              <h2 class="text-base font-semibold tracking-tight text-gray-900">
                The Journal of Inductive Biblical Studies
              </h2>
              <a
                href="https://place.asburyseminary.edu/jibs/"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs font-medium text-[rgba(13,94,130,1)] hover:underline"
              >
                Browse journal
              </a>
            </div>
            <p v-if="jibsEntries.length === 0" class="text-sm text-gray-500">
              No current issue articles found.
            </p>
            <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <li v-for="entry in jibsEntries" :key="entryKey(entry)">
                <a
                  :href="entryHref(entry)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group flex h-full flex-col rounded-md border border-gray-200 bg-white px-4 py-3.5 transition-colors hover:border-[rgba(13,94,130,0.35)] hover:bg-[rgba(13,94,130,0.03)]"
                >
                  <span class="text-sm font-semibold leading-snug text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
                    {{ entry.title }}
                  </span>
                  <span v-if="entry.author" class="mt-2 text-xs text-gray-500">
                    {{ entry.author }}
                  </span>
                  <span class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[rgba(13,94,130,1)] opacity-80 group-hover:opacity-100">
                    {{ entry.pdfUrl ? 'Open PDF' : 'View article' }}
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3.5 w-3.5" />
                  </span>
                </a>
              </li>
            </ul>
          </section>

          <section>
            <div class="mb-4 border-b border-gray-200 pb-3">
              <h2 class="text-base font-semibold tracking-tight text-gray-900">Asbury Journal</h2>
              <p class="mt-1 text-xs text-gray-500">Full issues</p>
            </div>
            <p v-if="asburyJournalIssues.length === 0" class="text-sm text-gray-500">
              No full issue PDFs found.
            </p>
            <div
              v-else
              class="ff-cover-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-3 pt-1"
            >
              <a
                v-for="issue in asburyJournalIssues"
                :key="issue.issueUrl"
                :href="issue.issueUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="group w-[7.5rem] shrink-0"
              >
                <div class="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm transition group-hover:border-[rgba(13,94,130,0.4)] group-hover:shadow">
                  <img
                    v-if="issue.coverUrl"
                    :src="issue.coverUrl"
                    :alt="issue.issueTitle"
                    class="aspect-[3/4] w-full object-cover bg-gray-100"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="flex aspect-[3/4] w-full items-center justify-center bg-gray-50 text-[11px] text-gray-400"
                  >
                    No cover
                  </div>
                </div>
                <p class="mt-2 line-clamp-2 text-xs font-medium leading-snug text-gray-800 group-hover:text-[rgba(13,94,130,1)]">
                  {{ issue.issueTitle }}
                </p>
                <p v-if="issue.year" class="mt-0.5 text-[11px] text-gray-500">{{ issue.year }}</p>
              </a>
            </div>
          </section>

          <section>
            <div class="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-gray-200 pb-3">
              <div class="min-w-0">
                <img
                  :src="faithAndPhilosophyLogo"
                  alt="Faith and Philosophy"
                  class="mb-2 h-auto w-full max-w-[220px]"
                  loading="lazy"
                >
                <h2 class="sr-only">Faith and Philosophy</h2>
                <p class="text-xs text-gray-500">Latest issue articles</p>
              </div>
              <a
                v-if="faithPhilosophyIssueUrl"
                :href="faithPhilosophyIssueUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs font-medium text-[rgba(13,94,130,1)] hover:underline"
              >
                View issue page
              </a>
            </div>
            <p v-if="faithPhilosophyEntries.length === 0" class="text-sm text-gray-500">
              No latest issue articles found.
            </p>
            <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <li v-for="entry in faithPhilosophyEntries" :key="entryKey(entry)">
                <a
                  :href="entryHref(entry)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group flex h-full flex-col rounded-md border border-gray-200 bg-white px-4 py-3.5 transition-colors hover:border-[rgba(13,94,130,0.35)] hover:bg-[rgba(13,94,130,0.03)]"
                >
                  <span class="text-sm font-semibold leading-snug text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
                    {{ entry.title }}
                  </span>
                  <span v-if="entry.author" class="mt-2 text-xs text-gray-500">
                    {{ entry.author }}
                  </span>
                  <span class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[rgba(13,94,130,1)] opacity-80 group-hover:opacity-100">
                    {{ entry.pdfUrl ? 'Open PDF' : 'View article' }}
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3.5 w-3.5" />
                  </span>
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import firstFruitsLogo from '../../assets/first-fruits.svg'
import faithAndPhilosophyLogo from '../../assets/faith-and-philosophy-logo.png'

type JournalIssue = {
  issueTitle: string
  issueUrl: string
  pdfUrl: string | null
  coverUrl: string | null
  year: string | null
}

type CurrentIssueEntry = {
  title: string
  author: string | null
  articleUrl: string | null
  pdfUrl: string | null
}

const JOURNAL_TITLE_NOISE = /^(the\s+)?journal of inductive biblical studies$/i

const { data: jibsIssueData, pending: jibsIssuePending } = await useFetch<{ entries?: CurrentIssueEntry[] }>(
  '/api/digital-commons/current-issue?context=jibs&limit=12',
  { key: 'jibs-current-issue' },
)

const { data: asburyJournalData, pending: asburyJournalPending } = await useFetch<{ issues?: JournalIssue[] }>(
  '/api/digital-commons/journal-full-issues?context=asburyjournal&limit=8',
  { key: 'asbury-journal-full-issues' },
)

const { data: faithPhilosophyIssuesData, pending: faithPhilosophyIssuesPending } = await useFetch<{ issues?: JournalIssue[] }>(
  '/api/digital-commons/journal-full-issues?context=faithandphilosophy&limit=8',
  { key: 'faith-philosophy-issues' },
)

const jibsEntries = computed(() =>
  (Array.isArray(jibsIssueData.value?.entries) ? jibsIssueData.value.entries : []).filter(
    (entry) => entry?.title && !JOURNAL_TITLE_NOISE.test(String(entry.title).trim()),
  ),
)

const asburyJournalIssues = computed(() => (Array.isArray(asburyJournalData.value?.issues) ? asburyJournalData.value.issues : []))
const faithPhilosophyIssues = computed(() =>
  (Array.isArray(faithPhilosophyIssuesData.value?.issues) ? faithPhilosophyIssuesData.value.issues : []),
)

const faithPhilosophyIssueUrl = computed(() => faithPhilosophyIssues.value[0]?.issueUrl || '')

const { data: faithIssueEntriesData, pending: faithIssueEntriesPending } = await useAsyncData(
  'faith-issue-entries-v5',
  async () => {
    if (!faithPhilosophyIssueUrl.value) return { entries: [] as CurrentIssueEntry[] }
    return await $fetch<{ entries: CurrentIssueEntry[] }>(
      `/api/digital-commons/issue-entries?issueUrl=${encodeURIComponent(faithPhilosophyIssueUrl.value)}`,
    )
  },
  { watch: [faithPhilosophyIssueUrl] },
)

const faithPhilosophyEntries = computed(() =>
  (Array.isArray(faithIssueEntriesData.value?.entries) ? faithIssueEntriesData.value.entries : []),
)

const isLoading = computed(() =>
  Boolean(
    jibsIssuePending.value ||
      asburyJournalPending.value ||
      faithPhilosophyIssuesPending.value ||
      faithIssueEntriesPending.value,
  ),
)

function entryKey(entry: CurrentIssueEntry) {
  return entry.pdfUrl || entry.articleUrl || entry.title
}

function entryHref(entry: CurrentIssueEntry) {
  return entry.pdfUrl || entry.articleUrl || '#'
}
</script>

<style scoped>
.ff-cover-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(8, 92, 128, 0.28) transparent;
  scroll-snap-type: x proximity;
}

.ff-cover-scroll > a {
  scroll-snap-align: start;
}

.ff-cover-scroll::-webkit-scrollbar {
  height: 6px;
}

.ff-cover-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.ff-cover-scroll::-webkit-scrollbar-thumb {
  background: rgba(8, 92, 128, 0.28);
  border-radius: 999px;
}
</style>
