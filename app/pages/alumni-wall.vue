<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Alumni Wall</h1>
            <p class="text-sm text-gray-600">
              Search Seminary alumni records across more than 100 years.
            </p>
          </div>
          <div
            class="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm"
            aria-label="Asbury Seminary alumni total"
          >
            <div class="flex items-center gap-2 text-gray-600">
              <UIcon name="i-heroicons-academic-cap" class="w-4 h-4 text-blue-700" />
              <span class="text-sm">Asbury Seminary Alumni</span>
            </div>
            <div class="mt-1 text-center text-3xl font-extrabold tracking-tight text-blue-800 leading-none">
              {{ totalAlumniCount != null ? formatNumber(totalAlumniCount) : '...' }}
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-end gap-3 sm:gap-4 mb-6">
          <div class="w-full sm:flex-1 sm:min-w-[260px] sm:max-w-lg">
            <label for="alumni-search" class="sr-only">Search alumni</label>
            <input
              id="alumni-search"
              v-model="searchQuery"
              type="search"
              placeholder="Search by name, degree, or year..."
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              autocomplete="off"
            />
          </div>

          <div class="min-w-[11rem]">
            <label for="alumni-year" class="sr-only">Filter by year</label>
            <input
              id="alumni-year"
              v-model="yearFilter"
              type="number"
              min="1900"
              max="2100"
              placeholder="Year (optional)"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
            />
          </div>
        </div>

        <template v-if="pending && !hasLoadedOnce">
          <ConnectDirectorySkeleton :show-count-line="true" :show-pagination-row="true" />
        </template>

        <div v-else-if="fetchError" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">
            {{ fetchError }}
          </div>
        </div>

        <div v-else>
          <div class="mb-2 text-sm text-gray-600">
            Showing {{ rangeStart }}–{{ rangeEnd }} of {{ totalDocs }} alumni
          </div>
          <div v-if="docs.length === 0" class="text-gray-500 py-8">
            No alumni match your search.
          </div>

          <div v-else class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div class="overflow-x-auto">
              <table class="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="w-[36%] px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                    <th class="w-[44%] px-4 py-2 text-left font-semibold text-gray-700">Degree(s)</th>
                    <th class="w-[20%] px-4 py-2 text-left font-semibold text-gray-700">Year(s)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="alumni in docs" :key="alumni.id">
                    <td class="px-4 py-2 text-gray-900 truncate">
                      {{ alumni.full_name_with_m || alumni.full_name }}
                    </td>
                    <td class="px-4 py-2 text-gray-700 truncate">
                      {{ formatDegrees(alumni) }}
                    </td>
                    <td class="px-4 py-2 text-gray-700 truncate">
                      {{ formatYears(alumni) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-between gap-2 sm:justify-center">
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              :disabled="page <= 1"
              @click="page = Math.max(1, page - 1)"
            >
              Previous
            </button>
            <span class="text-sm text-gray-600">
              Page {{ page }} of {{ totalPages }}
            </span>
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              :disabled="page >= totalPages"
              @click="page = Math.min(totalPages, page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'

type AlumniRecord = {
  id: number
  full_name: string
  full_name_with_m?: string
  degree_1?: string
  degree_2?: string
  degree_3?: string
  degree_4?: string
  degree_1_year?: number | string
  degree_2_year?: number | string
  degree_3_year?: number | string
  degree_4_year?: number | string
}

type AlumniSearchResponse = {
  docs: AlumniRecord[]
  totalDocs: number
  page: number
  limit: number
  totalPages: number
  hasPrevPage: boolean
  hasNextPage: boolean
}

const searchQuery = ref('')
const yearFilter = ref('')
const page = ref(1)
const limit = 25

const data = ref<AlumniSearchResponse>({
  docs: [],
  totalDocs: 0,
  page: 1,
  limit,
  totalPages: 1,
  hasPrevPage: false,
  hasNextPage: false,
})
const pending = ref(false)
const error = ref<any>(null)
const hasLoadedOnce = ref(false)
const totalAlumniCount = ref<number | null>(null)
let requestToken = 0

const docs = computed(() => data.value.docs ?? [])
const totalDocs = computed(() => data.value.totalDocs ?? 0)
const totalPages = computed(() => data.value.totalPages ?? 1)
const rangeStart = computed(() => (totalDocs.value === 0 ? 0 : (page.value - 1) * limit + 1))
const rangeEnd = computed(() => Math.min(page.value * limit, totalDocs.value))
const fetchError = computed(() => {
  const e = error.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load alumni records'
})

watchDebounced([searchQuery, yearFilter], () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }
  runSearch()
}, { debounce: 250, maxWait: 600 })

watch(page, () => {
  runSearch()
})

const runSearch = async () => {
  const token = ++requestToken
  pending.value = true
  error.value = null
  const normalizedYear = String(yearFilter.value ?? '').trim()

  try {
    const response = await $fetch<AlumniSearchResponse>('/api/alumni/search', {
      query: {
        q: searchQuery.value,
        page: page.value,
        limit,
        year: normalizedYear || undefined,
      },
      credentials: 'include',
    })

    if (token !== requestToken) return
    data.value = response
    hasLoadedOnce.value = true
    if (!searchQuery.value.trim() && !normalizedYear) {
      totalAlumniCount.value = response.totalDocs
    }
  } catch (e: any) {
    if (token !== requestToken) return
    error.value = e
  } finally {
    if (token === requestToken) pending.value = false
  }
}

await runSearch()

const loadTotalAlumniCount = async () => {
  if (totalAlumniCount.value != null) return
  try {
    const response = await $fetch<AlumniSearchResponse>('/api/alumni/search', {
      query: { page: 1, limit: 1 },
      credentials: 'include',
    })
    totalAlumniCount.value = response.totalDocs
  } catch {
    // Leave badge as loading dots if lookup fails.
  }
}

await loadTotalAlumniCount()

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

function formatDegrees(row: AlumniRecord): string {
  return [row.degree_1, row.degree_2, row.degree_3, row.degree_4].filter(Boolean).join(', ') || '—'
}

function formatYears(row: AlumniRecord): string {
  return [row.degree_1_year, row.degree_2_year, row.degree_3_year, row.degree_4_year]
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(', ') || '—'
}
</script>
