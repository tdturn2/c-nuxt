<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Faculty Directory</h1>

        <template v-if="loading">
          <p class="sr-only">Loading faculty directory…</p>
          <ConnectDirectorySkeleton toolbar="filters" />
        </template>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{{ error }}</div>
        </div>

        <div v-else>
          <div v-if="faculty.length === 0" class="text-gray-500 py-8">
            No faculty found.
          </div>

          <template v-else>
            <div class="mb-6 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
              <div
                class="grid min-w-[52rem] grid-cols-6 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 shadow-sm sm:min-w-0"
                role="group"
                aria-label="Faculty totals"
              >
              <button
                v-for="stat in facultyTypeTotals"
                :key="stat.value || 'all'"
                type="button"
                class="border-b-2 px-3 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(13,94,130,0.45)] sm:px-4"
                :class="activeFacultyType === stat.value
                  ? 'border-b-[rgba(13,94,130,1)] bg-[rgba(13,94,130,0.07)]'
                  : 'border-b-transparent bg-white hover:bg-gray-50'"
                :aria-pressed="activeFacultyType === stat.value"
                @click="selectFacultyType(stat.value)"
              >
                <span
                  class="block text-[11px] font-semibold uppercase tracking-wider"
                  :class="activeFacultyType === stat.value ? 'text-[rgba(13,94,130,1)]' : 'text-gray-500'"
                >
                  {{ stat.label }}
                </span>
                <span
                  class="mt-1.5 block text-3xl font-semibold tabular-nums leading-none tracking-tight"
                  :class="activeFacultyType === stat.value ? 'text-[rgba(13,94,130,1)]' : 'text-gray-900'"
                >
                  {{ stat.count }}
                </span>
              </button>
              </div>
            </div>

            <div class="mb-6 flex flex-wrap items-end gap-3 sm:gap-4">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <label for="faculty-type" class="text-sm font-medium text-gray-700">Type</label>
                <USelectMenu
                  id="faculty-type"
                  v-model="selectedType"
                  :items="typeOptions"
                  value-attribute="value"
                  label-attribute="label"
                  class="w-full min-w-[14rem] sm:w-64"
                  placeholder="All"
                />
              </div>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <label for="faculty-school" class="text-sm font-medium text-gray-700">School</label>
                <USelectMenu
                  id="faculty-school"
                  v-model="selectedSchool"
                  :items="schoolOptions"
                  value-attribute="value"
                  label-attribute="label"
                  class="w-full min-w-[16rem] sm:w-80"
                  placeholder="All schools"
                />
              </div>
              <div class="w-full sm:max-w-md sm:min-w-[200px] sm:flex-1">
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
            </div>

            <div v-if="filteredFaculty.length === 0" class="text-gray-500 py-8">
              No faculty match your filters.
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <NuxtLink
                v-for="person in filteredFaculty"
                :key="person.id"
                :to="userProfilePath(person)"
                class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center hover:border-gray-300 transition-colors"
              >
                <div class="w-30 h-30 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mb-3">
                  <img
                    v-if="person.avatar?.url"
                    :src="mediaDisplayUrl(person.avatar.url, 256) || person.avatar.url"
                    :alt="person.name"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-gray-500 font-semibold text-2xl">
                    {{ person.name?.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0 w-full">
                  <h2 class="font-semibold text-gray-900 truncate hover:text-[rgba(13,94,130,1)]">{{ person.name }}</h2>
                  <p v-if="person.employeeTitle" class="text-sm text-gray-600 truncate">{{ person.employeeTitle }}</p>
                </div>
                <dl class="mt-3 pt-3 border-t border-gray-100 space-y-1 w-full text-left">
                  <div v-if="publicContactEmail(person)" class="flex items-center gap-2 min-w-0">
                    <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a :href="`mailto:${publicContactEmail(person)}`" class="text-sm text-[rgba(13,94,130,1)] hover:underline truncate" @click.stop>{{ publicContactEmail(person) }}</a>
                  </div>
                  <div v-if="person.phone" class="flex items-center gap-2">
                    <UIcon name="i-heroicons-phone" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a :href="`tel:${person.phone}`" class="text-sm text-gray-700" @click.stop>{{ person.phone }}</a>
                  </div>
                </dl>
              </NuxtLink>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { sortDirectoryByLastName } from '@shared/directoryNameSort'
import { publicContactEmail } from '@shared/publicContactEmail'
import { FACULTY_TYPES, facultyTypeFromTitle } from '@shared/facultyDirectory'
import { mediaDisplayUrl } from '@shared/mediaUrls'

type FacultyRow = {
  id: number
  name: string
  email: string | null
  preferredEmail?: string | null
  employeeTitle: string | null
  phone: string | null
  section: string | null
  avatar: { url: string } | null
}

const SCHOOLS = [
  { label: 'School of Biblical Interpretation', value: 'school-of-biblical-interpretation' },
  { label: 'School of Theology and Formation', value: 'school-of-theology-and-formation' },
  { label: 'School of Counseling', value: 'school-of-counseling' },
  { label: 'ESJ School of Mission and Ministry', value: 'esj-school-of-mission-and-ministry' },
] as const

const ALL_SCHOOLS = { label: 'All schools', value: '' } as const
const ALL_TYPES = { label: 'All', value: '' } as const

const route = useRoute()
const router = useRouter()

const searchQuery = ref('')
const selectedSchool = ref<{ label: string; value: string }>({ ...ALL_SCHOOLS })
const selectedType = ref<{ label: string; value: string }>({ ...ALL_TYPES })

const { data: facultyPayload, pending: loading, error: fetchError } = useLazyFetch<{ faculty: FacultyRow[] }>(
  '/api/faculty',
)

const faculty = computed(() => facultyPayload.value?.faculty ?? [])

const error = computed(() => {
  const e = fetchError.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load directory'
})

/** Username from email (e.g. terry.turner@asburyseminary.edu → terry.turner); fallback to id */
function userProfilePath(person: { id: number; email: string | null }): string {
  if (person.email?.includes('@')) {
    const username = person.email.split('@')[0]?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`
  }
  return `/user/${person.id}`
}

const schoolOptions = computed(() => [{ ...ALL_SCHOOLS }, ...SCHOOLS])
const typeOptions = computed(() => [{ ...ALL_TYPES }, ...FACULTY_TYPES])

function schoolFromQuery(value: string) {
  if (!value) return { ...ALL_SCHOOLS }
  return schoolOptions.value.find((option) => option.value === value) ?? { ...ALL_SCHOOLS }
}

function typeFromQuery(value: string) {
  if (!value) return { ...ALL_TYPES }
  return typeOptions.value.find((option) => option.value === value) ?? { ...ALL_TYPES }
}

const facultyInSchool = computed(() => {
  const school = selectedSchool.value?.value ?? ''
  if (!school) return faculty.value
  return faculty.value.filter((person) => (person.section ?? '').trim() === school)
})

const facultyTypeTotals = computed(() => {
  const counts: Record<string, number> = Object.fromEntries(FACULTY_TYPES.map((type) => [type.value, 0]))
  for (const person of facultyInSchool.value) {
    counts[facultyTypeFromTitle(person.employeeTitle)] += 1
  }
  return [
    { label: 'All', value: '', count: facultyInSchool.value.length },
    ...FACULTY_TYPES.map((type) => ({ label: type.label, value: type.value, count: counts[type.value] ?? 0 })),
  ]
})

const activeFacultyType = computed(() => selectedType.value?.value ?? '')

function scrollActiveTotalIntoView() {
  if (!import.meta.client) return
  const attempt = (tries: number) => {
    const selected = document.querySelector<HTMLElement>('[aria-label="Faculty totals"] [aria-pressed="true"]')
    const scroller = selected?.parentElement?.parentElement
    if (!selected || !scroller) return
    if (scroller.scrollWidth <= scroller.clientWidth) {
      if (tries > 0) requestAnimationFrame(() => attempt(tries - 1))
      return
    }
    const left = selected.offsetLeft - (scroller.clientWidth - selected.offsetWidth) / 2
    scroller.scrollTo({ left: Math.max(0, left) })
  }
  nextTick(() => requestAnimationFrame(() => attempt(6)))
}

function selectFacultyType(value: string) {
  selectedType.value = typeFromQuery(value)
  scrollActiveTotalIntoView()
}

watch([activeFacultyType, () => faculty.value.length], scrollActiveTotalIntoView, { flush: 'post' })

const filteredFaculty = computed(() => {
  const type = selectedType.value?.value ?? ''
  let list = facultyInSchool.value
  if (type) {
    list = list.filter((person) => facultyTypeFromTitle(person.employeeTitle) === type)
  }
  const words = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length) {
    list = list.filter((person: FacultyRow) => {
      const name = (person.name ?? '').toLowerCase()
      return words.every((word) => name.includes(word))
    })
  }
  return sortDirectoryByLastName(list)
})

function parseSchool(query: typeof route.query) {
  const school = typeof query.school === 'string' ? query.school.trim() : ''
  return school
}

function parseType(query: typeof route.query) {
  const type = typeof query.type === 'string' ? query.type.trim() : ''
  return type
}

function applyQueryToFilters() {
  const school = parseSchool(route.query)
  const nextSchool = schoolFromQuery(school)
  if (selectedSchool.value.value !== nextSchool.value) selectedSchool.value = nextSchool

  const type = parseType(route.query)
  const nextType = typeFromQuery(type)
  if (selectedType.value.value !== nextType.value) selectedType.value = nextType
}

watch(() => [route.query.school, route.query.type], applyQueryToFilters, { immediate: true })

function syncRouteFromFilters() {
  const school = selectedSchool.value?.value ?? ''
  const type = selectedType.value?.value ?? ''
  const currentSchool = parseSchool(route.query)
  const currentType = parseType(route.query)
  if (school === currentSchool && type === currentType) return
  const query = { ...route.query }
  if (school) query.school = school
  else delete query.school
  if (type) query.type = type
  else delete query.type
  router.replace({ path: route.path, query })
}

watch([selectedSchool, selectedType], syncRouteFromFilters)

watch(fetchError, (e) => {
  if (e) console.error('Error loading faculty:', e)
})
</script>
