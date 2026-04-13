<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Faculty Directory</h1>

        <div v-if="loading" class="text-center py-12">
          <div class="text-gray-500">Loading directory...</div>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{{ error }}</div>
        </div>

        <div v-else>
          <div v-if="faculty.length === 0" class="text-gray-500 py-8">
            No faculty found.
          </div>

          <template v-else>
            <div class="mb-6 w-full sm:max-w-md">
              <label for="faculty-search" class="sr-only">Search by name</label>
              <input
                id="faculty-search"
                v-model="searchQuery"
                type="search"
                placeholder="Search by name..."
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                autocomplete="off"
              />
            </div>

            <div v-if="filteredFaculty.length === 0" class="text-gray-500 py-8">
              No faculty match your search.
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div
                v-for="person in filteredFaculty"
                :key="person.id"
                class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center"
              >
                <div class="w-30 h-30 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mb-3">
                  <img
                    v-if="person.avatar?.url"
                    :src="person.avatar.url"
                    :alt="person.name"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-gray-500 font-semibold text-2xl">
                    {{ person.name?.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0 w-full">
                  <h2 class="font-semibold text-gray-900 truncate">{{ person.name }}</h2>
                  <p v-if="person.employeeTitle" class="text-sm text-gray-600 truncate">{{ person.employeeTitle }}</p>
                  <p v-if="person.department" class="text-xs text-gray-500 mt-0.5">{{ departmentLabel(person.department) }}</p>
                  <p v-if="person.section" class="text-xs text-gray-500">{{ sectionLabel(person.section) }}</p>
                </div>
                <dl class="mt-3 pt-3 border-t border-gray-100 space-y-1 w-full text-left">
                  <div v-if="person.email" class="flex items-center gap-2 min-w-0">
                    <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a :href="`mailto:${person.email}`" class="text-sm text-[rgba(13,94,130,1)] hover:underline truncate">{{ person.email }}</a>
                  </div>
                  <div v-if="person.phone" class="flex items-center gap-2">
                    <UIcon name="i-heroicons-phone" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a :href="`tel:${person.phone}`" class="text-sm text-gray-700">{{ person.phone }}</a>
                  </div>
                </dl>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type FacultyRow = {
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
const faculty = ref<FacultyRow[]>([])
const searchQuery = ref('')

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

const filteredFaculty = computed(() => {
  const words = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return faculty.value
  return faculty.value.filter((person) => {
    const name = (person.name ?? '').toLowerCase()
    return words.every((word) => name.includes(word))
  })
})

onMounted(async () => {
  if (!import.meta.client) return
  try {
    loading.value = true
    error.value = null
    const res = await $fetch<{ faculty: FacultyRow[] }>('/api/faculty')
    faculty.value = res.faculty ?? []
  } catch (err: any) {
    console.error('Error loading faculty:', err)
    error.value = err.data?.message || 'Failed to load directory'
  } finally {
    loading.value = false
  }
})
</script>
