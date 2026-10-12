<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Faculty Directory</h1>
          <p class="mt-1 text-sm text-gray-600">
            Hide people who have faculty access but are not teaching faculty. They stay out of the faculty directory and use a non-faculty profile. Their faculty permissions stay in place.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManage"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to this dashboard section.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>

          <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="text-base font-semibold text-gray-900">
                Faculty access
                <span class="ml-1 text-sm font-normal text-gray-500">({{ filteredFaculty.length }})</span>
              </h2>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  v-model="visibilityFilter"
                  class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                >
                  <option value="all">All</option>
                  <option value="listed">In directory</option>
                  <option value="hidden">Hidden</option>
                </select>
                <UInput
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search name, email, title..."
                  icon="i-lucide-search"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  class="w-full sm:w-72"
                />
              </div>
            </div>
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Name</th>
                  <th class="px-4 py-2 text-left font-semibold">Email</th>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Directory</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">Loading faculty...</td>
                </tr>
                <tr v-else-if="!filteredFaculty.length" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">No faculty match this view.</td>
                </tr>
                <tr v-for="person in filteredFaculty" :key="String(person.id)" class="border-t border-gray-200">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ person.name || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ person.email || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ person.employeeTitle || '—' }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="person.hideFromFacultyDirectory ? 'bg-gray-100 text-gray-700' : 'bg-emerald-50 text-emerald-800'"
                    >
                      {{ person.hideFromFacultyDirectory ? 'Hidden' : 'Listed' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      class="text-[rgba(13,94,130,1)] hover:underline disabled:opacity-50"
                      :disabled="savingId === person.id"
                      @click="setHidden(person, !person.hideFromFacultyDirectory)"
                    >
                      {{ person.hideFromFacultyDirectory ? 'Show in directory' : 'Hide from directory' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { sortDirectoryByLastName } from '@shared/directoryNameSort'

type FacultyPerson = {
  id: string | number
  name?: string | null
  email?: string | null
  employeeTitle?: string | null
  roles?: string[]
  hideFromFacultyDirectory?: boolean
}

const { mePending, canAccessSection } = useDashboardAccess()
const canManage = computed(() => canAccessSection('faculty-directory'))

const loading = ref(false)
const error = ref<string | null>(null)
const faculty = ref<FacultyPerson[]>([])
const searchQuery = ref('')
const visibilityFilter = ref<'all' | 'listed' | 'hidden'>('all')
const savingId = ref<string | number | null>(null)

const filteredFaculty = computed(() => {
  const words = searchQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return faculty.value.filter((person) => {
    const hidden = person.hideFromFacultyDirectory === true
    if (visibilityFilter.value === 'listed' && hidden) return false
    if (visibilityFilter.value === 'hidden' && !hidden) return false
    if (!words.length) return true
    const haystack = [person.name, person.email, person.employeeTitle].filter(Boolean).join(' ').toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
})

function hasFacultyRole(person: FacultyPerson): boolean {
  return Array.isArray(person.roles) && person.roles.some((role) => String(role).toLowerCase() === 'faculty')
}

async function loadFaculty() {
  if (!canManage.value) return
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ docs?: FacultyPerson[] }>('/api/dashboard/users')
    const docs = Array.isArray(res?.docs) ? res.docs : []
    faculty.value = sortDirectoryByLastName(docs.filter(hasFacultyRole))
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || e?.message || 'Failed to load faculty.'
  } finally {
    loading.value = false
  }
}

async function setHidden(person: FacultyPerson, hidden: boolean) {
  savingId.value = person.id
  error.value = null
  try {
    await $fetch(`/api/dashboard/users/${encodeURIComponent(String(person.id))}`, {
      method: 'PATCH',
      body: { hideFromFacultyDirectory: hidden },
    })
    person.hideFromFacultyDirectory = hidden
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || e?.message || 'Failed to update directory visibility.'
  } finally {
    savingId.value = null
  }
}

watch(canManage, () => loadFaculty(), { immediate: true })
</script>
