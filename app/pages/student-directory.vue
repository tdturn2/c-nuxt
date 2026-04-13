<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Student Directory</h1>

        <div v-if="loading" class="text-center py-12">
          <div class="text-gray-500">Loading directory...</div>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{{ error }}</div>
        </div>

        <div v-else>
          <div v-if="students.length === 0" class="text-gray-500 py-8">
            No students found.
          </div>

          <template v-else>
            <div class="mb-6 w-full sm:max-w-md">
              <label for="student-search" class="sr-only">Search by name</label>
              <input
                id="student-search"
                v-model="searchQuery"
                type="search"
                placeholder="Search by name..."
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                autocomplete="off"
              />
            </div>

            <div v-if="filteredStudents.length === 0" class="text-gray-500 py-8">
              No students match your search.
            </div>

            <template v-else>
              <div class="mb-2 text-sm text-gray-600">
                Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredStudents.length }} students
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <NuxtLink
                  v-for="s in paginatedStudents"
                  :key="s.id"
                  :to="userProfilePath(s)"
                  class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center hover:border-gray-300 transition-colors"
                >
                  <div class="w-30 h-30 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mb-3">
                    <img
                      v-if="s.avatar?.url"
                      :src="s.avatar.url"
                      :alt="s.name"
                      class="w-full h-full object-cover"
                    />
                    <span v-else class="text-gray-500 font-semibold text-2xl">
                      {{ s.name?.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0 w-full">
                    <h2 class="font-semibold text-gray-900 truncate hover:text-[rgba(13,94,130,1)]">{{ s.name }}</h2>
                    <p v-if="s.employeeTitle" class="text-sm text-gray-600 truncate">{{ s.employeeTitle }}</p>
                    <p v-if="s.department" class="text-xs text-gray-500 mt-0.5">{{ departmentLabel(s.department) }}</p>
                    <p v-if="s.section" class="text-xs text-gray-500">{{ sectionLabel(s.section) }}</p>
                  </div>
                  <dl v-if="s.phone" class="mt-3 pt-3 border-t border-gray-100 space-y-1 w-full text-left">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-phone" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <a :href="`tel:${s.phone}`" class="text-sm text-gray-700" @click.stop>{{ s.phone }}</a>
                    </div>
                  </dl>
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
type StudentRow = {
  id: number
  name: string
  email: string | null
  employeeTitle: string | null
  department: string | null
  section: string | null
  phone: string | null
  avatar: { url: string } | null
}

const loading = ref(true)
const error = ref<string | null>(null)
const students = ref<StudentRow[]>([])

const searchQuery = ref('')
const PAGE_SIZE = 10
const currentPage = ref(1)

const DEPARTMENT_LABELS: Record<string, string> = {
  '1': 'Academic Affairs',
  '2': 'EMT',
  '3': 'Finance and Administration',
  '4': 'Office of the President',
  '5': 'Formation',
  '6': 'Advancement'
}

function departmentLabel(id: string | null): string {
  if (!id) return ''
  return DEPARTMENT_LABELS[id] ?? id
}

function sectionLabel(slug: string | null): string {
  if (!slug) return ''
  if (slug === 'lits') return 'LITS'
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Username from email (e.g. terry.turner@asburyseminary.edu → terry.turner); fallback to id */
function userProfilePath(s: { id: number; email: string | null }): string {
  if (s.email?.includes('@')) {
    const username = s.email.split('@')[0]?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`
  }
  return `/user/${s.id}`
}

const filteredStudents = computed(() => {
  const words = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return students.value
  return students.value.filter((s) => {
    const name = (s.name ?? '').toLowerCase()
    return words.every((word) => name.includes(word))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / PAGE_SIZE)))

const paginatedStudents = computed(() => {
  const list = filteredStudents.value
  const start = (currentPage.value - 1) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() => (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredStudents.value.length)
)

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(totalPages, (max) => {
  if (currentPage.value > max) currentPage.value = max
})

onMounted(async () => {
  if (!import.meta.client) return
  try {
    loading.value = true
    error.value = null
    const res = await $fetch<{ students: StudentRow[] }>('/api/students')
    students.value = res.students ?? []
  } catch (err: any) {
    console.error('Error loading students:', err)
    error.value = err.data?.message || 'Failed to load directory'
  } finally {
    loading.value = false
  }
})
</script>
