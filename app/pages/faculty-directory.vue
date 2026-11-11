<template>
  <div ref="directoryRoot" class="flex min-h-0 bg-gray-50">
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

            <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <NuxtLink
                v-for="person in filteredFaculty"
                :key="person.id"
                :to="userProfilePath(person)"
                class="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm transition-shadow hover:border-[rgba(13,94,130,0.35)] hover:shadow-md"
              >
                <div class="mx-auto mb-4 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 ring-4 ring-[rgba(13,94,130,0.08)]">
                  <img
                    v-if="person.avatar?.url"
                    :src="mediaDisplayUrl(person.avatar.url, 256) || person.avatar.url"
                    :alt="person.name"
                    class="h-full w-full object-cover"
                  />
                  <span v-else class="text-2xl font-semibold text-gray-500">
                    {{ person.name?.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <h2 class="text-base font-semibold leading-snug text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
                  {{ person.name }}
                </h2>
                <p class="mt-1 line-clamp-3 min-h-10 text-sm leading-snug text-gray-600">
                  {{ person.employeeTitle }}
                </p>
                <div
                  v-if="publicContactEmail(person) || person.phone"
                  class="mt-auto flex items-center justify-center gap-1 pt-4"
                >
                  <UTooltip
                    v-if="publicContactEmail(person)"
                    :text="publicContactEmail(person) || ''"
                    :delay-duration="0"
                  >
                    <a
                      :href="`mailto:${publicContactEmail(person)}`"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-full text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.08)]"
                      :aria-label="`Email ${person.name}`"
                      @click.stop
                    >
                      <UIcon name="i-lucide-mail" class="h-4 w-4" />
                    </a>
                  </UTooltip>
                  <UTooltip
                    v-if="person.phone"
                    :text="person.phone"
                    :delay-duration="0"
                  >
                    <a
                      :href="`tel:${person.phone}`"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-full text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.08)]"
                      :aria-label="`Call ${person.name}`"
                      @click.stop
                    >
                      <UIcon name="i-lucide-phone" class="h-4 w-4" />
                    </a>
                  </UTooltip>
                </div>
              </NuxtLink>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { sortDirectoryByLastName } from '@shared/directoryNameSort'
import { queryValue } from '@shared/directoryListQuery'
import { keepDirectoryReturn, readDirectoryReturn } from '~/composables/useDirectoryReturnState'
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
const directoryRoot = ref<HTMLElement | null>(null)

const rememberedSearch = readDirectoryReturn(
  route.path,
  (value): value is string => typeof value === 'string',
)
let holdSearch = rememberedSearch != null
const searchQuery = ref(rememberedSearch != null ? rememberedSearch.trim() : queryValue(route.query.q).trim())
keepDirectoryReturn(route.path, () => searchQuery.value.trim())
const selectedSchool = ref<{ label: string; value: string }>({ ...ALL_SCHOOLS })
const selectedType = ref<{ label: string; value: string }>({ ...ALL_TYPES })

const { data: facultyPayload, pending: loading, error: fetchError } = useLazyFetch<{ faculty: FacultyRow[] }>(
  '/api/faculty',
)

const faculty = computed(() => facultyPayload.value?.faculty ?? [])

useDirectoryScrollRestore(directoryRoot, () => !loading.value)

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

function parseSearch(query: typeof route.query) {
  return queryValue(query.q).trim()
}

function applyQueryToFilters() {
  const school = parseSchool(route.query)
  const nextSchool = schoolFromQuery(school)
  if (selectedSchool.value.value !== nextSchool.value) selectedSchool.value = nextSchool

  const type = parseType(route.query)
  const nextType = typeFromQuery(type)
  if (selectedType.value.value !== nextType.value) selectedType.value = nextType

  if (holdSearch) return
  const q = parseSearch(route.query)
  if (searchQuery.value !== q) searchQuery.value = q
}

watch(() => [route.query.school, route.query.type, route.query.q], applyQueryToFilters, { immediate: true })

function syncRouteFromFilters() {
  const school = selectedSchool.value?.value ?? ''
  const type = selectedType.value?.value ?? ''
  const q = searchQuery.value.trim()
  const currentSchool = parseSchool(route.query)
  const currentType = parseType(route.query)
  const currentSearch = parseSearch(route.query)
  if (school === currentSchool && type === currentType && q === currentSearch) return
  const query = { ...route.query }
  if (school) query.school = school
  else delete query.school
  if (type) query.type = type
  else delete query.type
  if (q) query.q = q
  else delete query.q
  router.replace({ path: route.path, query })
}

watch([selectedSchool, selectedType], syncRouteFromFilters)
watchDebounced(searchQuery, syncRouteFromFilters, { debounce: 400 })
onMounted(() => {
  holdSearch = false
  syncRouteFromFilters()
})

watch(fetchError, (e) => {
  if (e) console.error('Error loading faculty:', e)
})
</script>
