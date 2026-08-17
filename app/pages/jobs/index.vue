<template>
  <div class="flex min-h-0 bg-gray-50">
        <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div v-else class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div class="hidden border-b border-gray-200 bg-gray-50 sm:grid sm:grid-cols-12 sm:gap-x-6 sm:px-6 sm:py-2.5">
            <span class="col-span-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Position</span>
            <span class="col-span-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Location</span>
            <span class="col-span-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Type</span>
          </div>
          <ul class="divide-y divide-gray-200">
            <li v-for="row in jobRows" :key="row.job.id">
              <NuxtLink
                :to="row.job.id ? `/jobs/${row.job.id}` : undefined"
                class="grid grid-cols-1 gap-x-6 gap-y-2 px-4 py-4 transition-colors sm:grid-cols-12 sm:px-6"
                :class="row.job.id ? 'hover:bg-gray-50 cursor-pointer' : 'pointer-events-none'"
              >
                <div class="min-w-0 sm:col-span-6">
                  <h2
                    class="text-base font-bold leading-snug"
                    :class="row.job.id ? 'text-[rgba(13,94,130,1)]' : 'text-gray-900'"
                  >
                    {{ row.title }}
                  </h2>
                  <p v-if="row.job.companyName || row.job.companyTagline" class="mt-0.5 text-sm leading-snug text-gray-500">
                    <span v-if="row.job.companyName" class="font-semibold text-gray-600">{{ row.job.companyName }}</span>
                    <span v-if="row.job.companyTagline">{{ row.job.companyName ? ' — ' : '' }}{{ row.job.companyTagline }}</span>
                  </p>
                </div>

                <div class="min-w-0 text-sm text-gray-600 sm:col-span-3">
                  <span v-if="row.job.location">{{ row.job.location }}</span>
                  <span v-if="row.job.remotePosition" class="block text-gray-500">Remote</span>
                </div>

                <div class="text-sm sm:col-span-3 sm:text-right">
                  <span v-if="row.typeLabel" class="font-semibold" :class="row.typeClass">
                    {{ row.typeLabel }}
                  </span>
                  <span v-if="row.postedLabel" class="block text-gray-500 sm:mt-1">
                    {{ row.postedLabel }}
                  </span>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const JOB_TYPES = [
  { label: 'Freelance', value: 'freelance' },
  { label: 'Full Time', value: 'full_time' },
  { label: 'Internship', value: 'internship' },
  { label: 'Part Time', value: 'part_time' },
  { label: 'Temporary', value: 'temporary' },
  { label: 'Volunteer', value: 'volunteer' },
] as const

const JOB_TYPE_TEXT_CLASSES: Record<string, string> = {
  freelance: 'text-violet-600',
  full_time: 'text-emerald-600',
  internship: 'text-sky-600',
  part_time: 'text-orange-500',
  temporary: 'text-amber-600',
  volunteer: 'text-teal-600',
}

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
  companyTagline?: string
  companyWebsite?: string
  createdAt?: string
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
const jobRows = computed(() =>
  jobs.value.map((job) => ({
    job,
    title: job.jobTitle || 'Untitled',
    typeLabel: job.jobType ? formatJobType(job.jobType) : '',
    typeClass: job.jobType ? jobTypeClass(job.jobType) : '',
    postedLabel: postedLabel(job.createdAt),
  })),
)

const errorMessage = computed(() => {
  const e = error.value
  if (!e) return ''
  return (e as any)?.data?.message ?? (e as any)?.message ?? 'Failed to load jobs.'
})

function formatJobType(value: string): string {
  if (!value) return ''
  return JOB_TYPES.find((t) => t.value === value)?.label ?? value.replace(/_/g, ' ')
}

function jobTypeClass(value: string): string {
  return JOB_TYPE_TEXT_CLASSES[value] ?? 'text-gray-700'
}

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'always' })

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

function postedLabel(value?: string): string {
  if (!value) return ''
  const posted = new Date(value).getTime()
  if (Number.isNaN(posted)) return ''
  const elapsed = Date.now() - posted
  if (elapsed < 60 * 1000) return 'Posted just now'
  for (const [unit, ms] of RELATIVE_UNITS) {
    const amount = Math.floor(elapsed / ms)
    if (amount >= 1) return `Posted ${relativeTime.format(-amount, unit)}`
  }
  return ''
}
</script>
