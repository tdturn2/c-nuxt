<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <img
            :src="firstFruitsLogo"
            alt="First Fruits"
            class="mb-4 block w-full max-w-[300px] mx-auto"
          >
          <p class="mt-2 max-w-4xl text-sm text-gray-600">
            First Fruits is the academic open press of Asbury Theological Seminary. Asbury Theological Seminary desires to share the fruit of our academic labor with the entire world. First Fruits is part of this mission, serving as a free, open-access press to make available academic material from the Wesleyan and Holiness traditions.
          </p>
        </div>

        <div v-if="isLoading" class="space-y-3" aria-live="polite" aria-busy="true">
          <div class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Loading First Fruits content...
          </div>
          <div v-for="n in 6" :key="n" class="h-24 rounded-lg border border-gray-200 bg-white animate-pulse" />
        </div>
        <div v-else class="space-y-8">
          <section>
            <div class="mb-3 flex items-end justify-between gap-3">
              <h2 class="text-lg font-semibold text-gray-900">The Journal of Inductive Biblical Studies</h2>
              <a
                href="https://place.asburyseminary.edu/jibs/"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-[rgba(13,94,130,1)] hover:underline"
              >
                Browse journal
              </a>
            </div>
            <div v-if="jibsEntries.length === 0" class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              No current issue articles found.
            </div>
            <div v-else class="overflow-x-auto pb-2">
              <div class="flex gap-3 min-w-max pr-2">
                <article
                  v-for="entry in jibsEntries"
                  :key="entry.pdfUrl || entry.articleUrl || entry.title"
                  class="w-80 shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <a
                    v-if="entry.articleUrl"
                    :href="entry.articleUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="line-clamp-2 text-sm font-semibold text-[rgba(13,94,130,1)] hover:underline"
                  >
                    {{ entry.title }}
                  </a>
                  <p v-else class="line-clamp-2 text-sm font-semibold text-gray-900">{{ entry.title }}</p>
                  <p class="mt-1 text-xs text-gray-600">{{ entry.author || 'Unknown author' }}</p>
                </article>
              </div>
            </div>
          </section>

          <section>
            <h2 class="mb-3 text-lg font-semibold text-gray-900">Asbury Journal (Full Issues)</h2>
            <div v-if="asburyJournalIssues.length === 0" class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">No full issue PDFs found.</div>
            <div v-else class="overflow-x-auto pb-2">
              <div class="flex gap-3 min-w-max pr-2">
                <article v-for="issue in asburyJournalIssues" :key="issue.issueUrl" class="w-32 shrink-0 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <a :href="issue.issueUrl" target="_blank" rel="noopener noreferrer" class="block">
                    <img v-if="issue.coverUrl" :src="issue.coverUrl" alt="" class="h-36 w-24 rounded border border-gray-200 object-cover bg-gray-100" loading="lazy" />
                    <div v-else class="flex h-36 w-24 items-center justify-center rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-500">No cover</div>
                  </a>
                  <div class="mt-2 min-w-0">
                    <a :href="issue.issueUrl" target="_blank" rel="noopener noreferrer" class="line-clamp-2 text-xs font-semibold text-[rgba(13,94,130,1)] hover:underline">{{ issue.issueTitle }}</a>
                    <p class="mt-1 text-[11px] text-gray-500">{{ issue.year || '—' }}</p>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section>
            <img
              :src="faithAndPhilosophyLogo"
              alt="Faith and Philosophy"
              class="w-[300px] h-auto"
              loading="lazy"
            />
          </section>

          <section>
            <div class="mb-3 flex items-end justify-between gap-3">
              <h2 class="text-lg font-semibold text-gray-900">Faith and Philosophy (Latest Issue Articles)</h2>
              <a
                v-if="faithPhilosophyIssueUrl"
                :href="faithPhilosophyIssueUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-[rgba(13,94,130,1)] hover:underline"
              >
                View issue page
              </a>
            </div>
            <div v-if="faithPhilosophyEntries.length === 0" class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
              No latest issue articles found.
            </div>
            <div v-else class="overflow-x-auto pb-2">
              <div class="flex gap-3 min-w-max pr-2">
                <article
                  v-for="entry in faithPhilosophyEntries"
                  :key="entry.pdfUrl || entry.articleUrl || entry.title"
                  class="w-80 shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <a
                    v-if="entry.articleUrl"
                    :href="entry.articleUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="line-clamp-2 text-sm font-semibold text-[rgba(13,94,130,1)] hover:underline"
                  >
                    {{ entry.title }}
                  </a>
                  <p v-else class="line-clamp-2 text-sm font-semibold text-gray-900">{{ entry.title }}</p>
                  <p class="mt-1 text-xs text-gray-600">{{ entry.author || 'Unknown author' }}</p>
                  
                </article>
              </div>
            </div>
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
  (Array.isArray(jibsIssueData.value?.entries) ? jibsIssueData.value.entries : []),
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

// PDF embedding is intentionally disabled; we link out to the repository pages instead.
</script>
