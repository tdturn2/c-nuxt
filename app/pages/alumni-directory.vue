<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Alumni Directory</h1>
        <p class="mb-6 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          The Alumni Directory below includes active alumni who have logged in to Connect. For a comprehensive and official alumni list, visit our
          <NuxtLink to="/alumni-wall" class="font-medium underline hover:no-underline">Alumni Wall</NuxtLink>.
        </p>

        <template v-if="loading">
          <p class="sr-only">Loading alumni directory...</p>
          <ConnectDirectorySkeleton :show-count-line="true" :show-pagination-row="true" />
        </template>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{{ error }}</div>
        </div>

        <div v-else>
          <div v-if="alumni.length === 0" class="text-gray-500 py-8">
            No alumni found.
          </div>

          <template v-else>
            <div class="mb-6 w-full sm:max-w-md">
              <label for="alumni-directory-search" class="sr-only">Search by name</label>
              <input
                id="alumni-directory-search"
                v-model="searchQuery"
                type="search"
                placeholder="Search by name..."
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                autocomplete="off"
              />
            </div>

            <div v-if="filteredAlumni.length === 0" class="text-gray-500 py-8">
              No alumni match your search.
            </div>

            <template v-else>
              <div class="mb-2 text-sm text-gray-600">
                Showing {{ rangeStart }}-{{ rangeEnd }} of {{ filteredAlumni.length }} alumni
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <NuxtLink
                  v-for="a in paginatedAlumni"
                  :key="a.id"
                  :to="userProfilePath(a)"
                  class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center hover:border-gray-300 transition-colors"
                >
                  <div class="w-30 h-30 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mb-3">
                    <img
                      v-if="a.avatar?.url"
                      :src="a.avatar.url"
                      :alt="a.name"
                      class="w-full h-full object-cover"
                    />
                    <span v-else class="text-gray-500 font-semibold text-2xl">
                      {{ a.name?.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0 w-full">
                    <h2 class="font-semibold text-gray-900 truncate hover:text-[rgba(13,94,130,1)]">{{ a.name }}</h2>
                    <div v-for="(degree, degreeIndex) in a.degrees" :key="`${a.id}-degree-${degreeIndex}`" class="mt-1">
                      <p class="text-sm text-gray-600 truncate">{{ degree.degree }}</p>
                      <p v-if="degree.graduationYear" class="text-xs text-gray-500">Class of {{ degree.graduationYear }}</p>
                    </div>
                  </div>
                </NuxtLink>
              </div>

              <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-between gap-2 sm:justify-center">
                <button
                  type="button"
                  class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
                  :disabled="currentPage <= 1"
                  @click="currentPage = Math.max(1, currentPage - 1)"
                >
                  Previous
                </button>
                <span class="text-sm text-gray-600">
                  Page {{ currentPage }} of {{ totalPages }}
                </span>
                <button
                  type="button"
                  class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
                  :disabled="currentPage >= totalPages"
                  @click="currentPage = Math.min(totalPages, currentPage + 1)"
                >
                  Next
                </button>
              </div>
            </template>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type AlumniRow = {
  id: number
  name: string
  email: string | null
  degrees: Array<{
    degree: string
    graduationYear: number | null
  }>
  avatar: { url: string } | null
}

const searchQuery = ref('')

const { data: alumniPayload, pending: loading, error: fetchError } = useLazyFetch<{ alumni: AlumniRow[] }>(
  '/api/alumni',
)

const alumni = computed(() => alumniPayload.value?.alumni ?? [])

const error = computed(() => {
  const e = fetchError.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load alumni directory'
})

const PAGE_SIZE = 10
const currentPage = ref(1)

function userProfilePath(a: { id: number; email: string | null }): string {
  if (a.email?.includes('@')) {
    const username = a.email.split('@')[0]?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`
  }
  return `/user/${a.id}`
}

const filteredAlumni = computed(() => {
  const words = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return alumni.value
  return alumni.value.filter((a: AlumniRow) => {
    const name = (a.name ?? '').toLowerCase()
    return words.every((word) => name.includes(word))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAlumni.value.length / PAGE_SIZE)))

const paginatedAlumni = computed(() => {
  const list = filteredAlumni.value
  const start = (currentPage.value - 1) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() => (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredAlumni.value.length),
)

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(totalPages, (max) => {
  if (currentPage.value > max) currentPage.value = max
})

watch(fetchError, (e) => {
  if (e) console.error('Error loading alumni directory:', e)
})
</script>
