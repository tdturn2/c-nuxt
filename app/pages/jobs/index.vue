<template>
  <div class="flex min-h-0 bg-gray-50">
        <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between gap-4 mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Jobs Board</h1>
          <NuxtLink
            to="/jobs/submit"
            class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
          >
            Submit a job
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-center gap-4 mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-center gap-2">
            <label for="filter-jobType" class="text-sm font-medium text-gray-700 whitespace-nowrap">Job type</label>
            <select
              id="filter-jobType"
              v-model="selectedJobType"
              class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white min-w-[10rem] focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
            >
              <option value="">All types</option>
              <option v-for="opt in JOB_TYPES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label for="filter-jobCategory" class="text-sm font-medium text-gray-700 whitespace-nowrap">Category</label>
            <select
              id="filter-jobCategory"
              v-model="selectedJobCategory"
              class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white min-w-[12rem] focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
            >
              <option value="">All categories</option>
              <option v-for="opt in JOB_CATEGORIES" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>

        <div v-if="pending" class="text-center py-12 text-gray-500">
          Loading jobs…
        </div>

        <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {{ errorMessage }}
        </div>

        <div v-else-if="!jobs.length" class="text-gray-500 py-8">
          No published jobs at the moment with the selected filters. Check back later or
          <NuxtLink to="/jobs/submit" class="text-[rgba(13,94,130,1)] hover:underline">submit a job</NuxtLink>.
        </div>

        <ul v-else class="space-y-4">
          <li
            v-for="job in jobs"
            :key="job.id"
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 transition-colors"
          >
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 class="text-lg font-semibold text-gray-900">
                  <NuxtLink
                    v-if="job.id"
                    :to="`/jobs/${job.id}`"
                    class="hover:text-[rgba(13,94,130,1)] hover:underline"
                  >
                    {{ job.jobTitle || 'Untitled' }}
                  </NuxtLink>
                  <span v-else>{{ job.jobTitle || 'Untitled' }}</span>
                </h2>
                <span v-if="job.companyName" class="text-sm text-gray-600">{{ job.companyName }}</span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span v-if="job.location" class="flex items-center gap-1">
                  <UIcon name="i-heroicons-map-pin" class="w-4 h-4 flex-shrink-0" />
                  {{ job.location }}
                </span>
                <span v-if="job.remotePosition" class="flex items-center gap-1">
                  <UIcon name="i-heroicons-home" class="w-4 h-4 flex-shrink-0" />
                  Remote
                </span>
                <span v-if="job.jobType" class="capitalize">{{ formatJobType(job.jobType) }}</span>
              </div>
              <p v-if="job.description" class="text-sm text-gray-600 line-clamp-2 mt-1">
                {{ stripHtml(job.description) }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const JOB_TYPES = [
  { label: 'Freelance', value: 'freelance' },
  { label: 'Full time', value: 'full_time' },
  { label: 'Internship', value: 'internship' },
  { label: 'Part time', value: 'part_time' },
  { label: 'Temporary', value: 'temporary' },
  { label: 'Volunteer', value: 'volunteer' },
] as const

const JOB_CATEGORIES = [
  { label: 'Administration', value: 'administration' },
  { label: 'Chaplain', value: 'chaplain' },
  { label: 'Christian Education', value: 'christian_education' },
  { label: 'Counseling', value: 'counseling' },
  { label: 'Finance', value: 'finance' },
  { label: 'General Labor', value: 'general_labor' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Missions', value: 'missions' },
  { label: 'Music', value: 'music' },
  { label: 'Pastoral Ministry', value: 'pastoral_ministry' },
  { label: 'Associate Pastor', value: 'associate_pastor' },
  { label: "Children's Ministry", value: 'children_ministry' },
  { label: 'Interim Pastor', value: 'interim_pastor' },
  { label: 'Senior Pastor', value: 'senior_pastor' },
  { label: 'Worship Pastor', value: 'worship_pastor' },
  { label: 'Youth Pastor', value: 'youth_pastor' },
  { label: 'Student Ministry', value: 'student_ministry' },
  { label: 'Teaching', value: 'teaching' },
] as const

interface Job {
  id?: number | string
  jobTitle?: string
  location?: string
  remotePosition?: boolean
  jobType?: string
  jobCategory?: string
  description?: string
  companyName?: string
  companyWebsite?: string
}

interface ListResponse {
  docs: Job[]
  totalDocs?: number
  page?: number
  totalPages?: number
  limit?: number
}

const selectedJobType = ref('')
const selectedJobCategory = ref('')

const { data, pending, error } = useFetch<ListResponse>('/api/connect-jobs/list', {
  query: { limit: '100', sort: '-createdAt' },
})

const allJobs = computed(() => data.value?.docs ?? [])

const jobs = computed(() => {
  const list = allJobs.value
  const type = selectedJobType.value
  const category = selectedJobCategory.value
  if (!type && !category) return list
  return list.filter((job) => {
    if (type && job.jobType !== type) return false
    if (category && job.jobCategory !== category) return false
    return true
  })
})
const errorMessage = computed(() => {
  const e = error.value
  if (!e) return ''
  return (e as any)?.data?.message ?? (e as any)?.message ?? 'Failed to load jobs.'
})

function formatJobType(value: string): string {
  if (!value) return ''
  return value.replace(/_/g, ' ')
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
</script>
