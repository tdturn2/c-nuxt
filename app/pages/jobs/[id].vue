<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <NuxtLink
            to="/jobs"
            class="text-sm text-[rgba(13,94,130,1)] hover:underline flex items-center gap-1"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
            Back to jobs
          </NuxtLink>
        </div>

        <div v-if="pending" class="text-center py-12 text-gray-500">
          Loading job…
        </div>

        <div v-else-if="error || !job" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {{ errorMessage }}
          <NuxtLink to="/jobs" class="block mt-2 text-[rgba(13,94,130,1)] hover:underline">Back to jobs</NuxtLink>
        </div>

        <template v-else>
          <header class="mb-8">
            <h1 class="text-2xl font-bold text-gray-900">{{ job.jobTitle || 'Untitled' }}</h1>
            <p v-if="job.companyName" class="text-lg text-gray-600 mt-1">{{ job.companyName }}</p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-3">
              <span v-if="job.location" class="flex items-center gap-1">
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4 flex-shrink-0" />
                {{ job.location }}
              </span>
              <span v-if="job.remotePosition" class="flex items-center gap-1">
                <UIcon name="i-heroicons-home" class="w-4 h-4 flex-shrink-0" />
                Remote
              </span>
              <span v-if="job.jobType">{{ formatJobType(job.jobType) }}</span>
              <span v-if="job.jobCategory">{{ formatCategory(job.jobCategory) }}</span>
            </div>
          </header>

          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <section v-if="job.description">
              <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Description</h2>
              <div class="job-description text-gray-700" v-html="job.description" />
            </section>

            <section v-if="applicationLink">
              <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Apply</h2>
              <a
                :href="applicationLink"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
              >
                {{ applicationLinkLabel }}
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
              </a>
            </section>
          </div>

          <div v-if="hasCompanyDetails" class="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">About the company/organization</h2>
            <p v-if="job.companyTagline" class="text-gray-600 mb-4">{{ job.companyTagline }}</p>
            <dl class="space-y-3">
              <div v-if="job.companyWebsite" class="flex items-center gap-2">
                <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a
                  :href="normalizeUrl(job.companyWebsite)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[rgba(13,94,130,1)] hover:underline"
                >
                  {{ job.companyWebsite }}
                </a>
              </div>
              <div v-if="job.companyTwitterUsername" class="flex items-center gap-2">
                <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a
                  :href="`https://twitter.com/${job.companyTwitterUsername.replace(/^@/, '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[rgba(13,94,130,1)] hover:underline"
                >
                  @{{ job.companyTwitterUsername.replace(/^@/, '') }}
                </a>
              </div>
            </dl>
            <div v-if="job.companyVideoUrl" class="mt-4">
              <a
                :href="normalizeUrl(job.companyVideoUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 text-sm text-[rgba(13,94,130,1)] hover:underline"
              >
                <UIcon name="i-heroicons-play-circle" class="w-5 h-5" />
                Watch company video
              </a>
            </div>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: job, pending, error } = useFetch<any>(() => `/api/connect-jobs/${id.value}`, {
  key: () => `connect-job-${id.value}`,
})

const errorMessage = computed(() => {
  const e = error.value
  if (!e) return job.value ? '' : 'Job not found.'
  return (e as any)?.data?.message ?? (e as any)?.message ?? 'Failed to load job.'
})

const hasCompanyDetails = computed(() => {
  const j = job.value
  if (!j) return false
  return Boolean(
    j.companyTagline?.trim()
    || j.companyWebsite?.trim()
    || j.companyTwitterUsername?.trim()
    || j.companyVideoUrl?.trim(),
  )
})

const applicationLink = computed(() => {
  const raw = job.value?.applicationEmailOrUrl?.trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.includes('@')) return `mailto:${raw}`
  return `https://${raw}`
})

const applicationLinkLabel = computed(() => {
  const raw = job.value?.applicationEmailOrUrl?.trim()
  if (!raw) return 'Apply'
  if (raw.startsWith('http')) return 'Apply online'
  if (raw.includes('@')) return 'Apply by email'
  return 'Apply'
})

function formatJobType(value: string): string {
  if (!value) return ''
  return value.replace(/_/g, ' ')
}

const CATEGORY_LABELS: Record<string, string> = {
  administration: 'Administration',
  chaplain: 'Chaplain',
  christian_education: 'Christian Education',
  counseling: 'Counseling',
  finance: 'Finance',
  general_labor: 'General Labor',
  marketplace: 'Marketplace',
  missions: 'Missions',
  music: 'Music',
  pastoral_ministry: 'Pastoral Ministry',
  associate_pastor: 'Associate Pastor',
  children_ministry: "Children's Ministry",
  interim_pastor: 'Interim Pastor',
  senior_pastor: 'Senior Pastor',
  worship_pastor: 'Worship Pastor',
  youth_pastor: 'Youth Pastor',
  student_ministry: 'Student Ministry',
  teaching: 'Teaching',
}

function formatCategory(value: string): string {
  if (!value) return ''
  return CATEGORY_LABELS[value] ?? value.replace(/_/g, ' ')
}

function normalizeUrl(url: string): string {
  if (!url?.trim()) return ''
  const u = url.trim()
  return u.startsWith('http') ? u : `https://${u}`
}
</script>

<style scoped>
/* Submitted descriptions are raw HTML and this app has no Tailwind typography plugin,
   so preflight leaves every block element with zero margin. */
.job-description :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.65;
}

.job-description :deep(h1),
.job-description :deep(h2),
.job-description :deep(h3),
.job-description :deep(h4),
.job-description :deep(h5),
.job-description :deep(h6) {
  margin-top: 1.75rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-gray-900);
}

.job-description :deep(h1) { font-size: 1.5rem; }
.job-description :deep(h2) { font-size: 1.25rem; }
.job-description :deep(h3) { font-size: 1.125rem; }
.job-description :deep(h4),
.job-description :deep(h5),
.job-description :deep(h6) { font-size: 1rem; }

.job-description :deep(ul),
.job-description :deep(ol) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.job-description :deep(ul) { list-style: disc; }
.job-description :deep(ol) { list-style: decimal; }

.job-description :deep(li) {
  margin-bottom: 0.375rem;
  line-height: 1.6;
}

.job-description :deep(li > p) {
  margin-bottom: 0.25rem;
}

.job-description :deep(strong) {
  font-weight: 600;
  color: var(--color-gray-900);
}

.job-description :deep(a) {
  color: rgba(13, 94, 130, 1);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.job-description :deep(blockquote) {
  margin-bottom: 1rem;
  border-left: 3px solid var(--color-gray-200);
  padding-left: 1rem;
  font-style: italic;
  color: var(--color-gray-600);
}

.job-description :deep(hr) {
  margin: 1.5rem 0;
  border-top: 1px solid var(--color-gray-200);
}

.job-description :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.job-description :deep(table) {
  margin-bottom: 1rem;
  width: 100%;
  border-collapse: collapse;
}

.job-description :deep(th),
.job-description :deep(td) {
  border: 1px solid var(--color-gray-200);
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.job-description :deep(th) {
  background-color: var(--color-gray-50);
  font-weight: 600;
}

.job-description :deep(> *:first-child) {
  margin-top: 0;
}

.job-description :deep(> *:last-child) {
  margin-bottom: 0;
}
</style>
