<template>
    <div class="flex min-h-0 bg-gray-50">
      <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
        <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Class Search</h1>

      <div class="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <label for="term" class="text-sm font-medium text-gray-700">Semester</label>
          <USelectMenu
            id="term"
            v-model="selectedTerm"
            :items="termOptions"
            value-attribute="value"
            label-attribute="label"
            class="w-full min-w-[8rem] sm:w-48"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <label for="faculty" class="text-sm font-medium text-gray-700">Faculty</label>
          <USelectMenu
            id="faculty"
            v-model="selectedFaculty"
            :items="facultyOptions"
            value-attribute="value"
            label-attribute="label"
            class="w-full min-w-[8rem] sm:w-48"
            placeholder="All faculty"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <label for="location" class="text-sm font-medium text-gray-700">Location</label>
          <USelectMenu
            id="location"
            v-model="selectedLocation"
            :items="locationOptions"
            value-attribute="value"
            label-attribute="label"
            class="w-full min-w-[8rem] sm:w-48"
            placeholder="All locations"
          />
        </div>
        <div class="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
          <label for="search" class="sr-only">Search classes</label>
          <input
            id="search"
            v-model="searchQuery"
            type="search"
            placeholder="Search course, title, instructor, location..."
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
            autocomplete="off"
          />
        </div>
      </div>

      <div v-if="pending" class="py-12 text-center text-gray-500">
        Loading classes...
      </div>
      <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
        {{ error }}
      </div>
      <div v-else-if="classes.length === 0" class="py-8 text-gray-500">
        No classes found for this term.
      </div>
      <div v-else-if="filteredClasses.length === 0" class="py-8 text-gray-500">
        No classes match your search.
      </div>
      <div v-else>
        <div class="mb-2 text-sm text-gray-600">
          Showing {{ rangeStart }}–{{ rangeEnd }} of {{ filteredClasses.length }} classes
        </div>

        <!-- Mobile: card list -->
        <div class="md:hidden space-y-3">
          <div
            v-for="c in paginatedClasses"
            :key="c.full_class_id"
            class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              class="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50"
              :aria-expanded="expandedId === c.full_class_id"
              @click="toggleExpand(c.full_class_id)"
            >
              <span
                class="mt-0.5 shrink-0 text-gray-500 transition-transform"
                :class="{ 'rotate-90': expandedId === c.full_class_id }"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline gap-2">
                  <span class="font-medium text-gray-900">{{ c.short_name }}</span>
                  <span class="text-sm text-gray-500">{{ c.section }}</span>
                  <span class="text-sm text-gray-500">{{ c.class_credits }} cr</span>
                </div>
                <p class="mt-0.5 text-sm text-gray-900 line-clamp-2">{{ c.short_description }}</p>
                <p class="mt-1 text-sm text-gray-600">{{ formatInstructor(c.instructor) }}</p>
                <p class="mt-0.5 text-xs text-gray-500">{{ c.delivery_method }} · {{ c.location }}</p>
              </div>
            </button>
            <div v-if="expandedId === c.full_class_id" class="border-t border-gray-100 bg-gray-50/80 px-4 py-4">
              <div class="grid gap-3 text-sm">
                <div v-if="c.full_description">
                  <span class="font-medium text-gray-700">Description</span>
                  <p class="mt-1 text-gray-600">{{ c.full_description }}</p>
                </div>
                <div v-if="c.syllabus_url">
                  <span class="font-medium text-gray-700">Syllabus</span>
                  <p class="mt-1">
                    <a :href="c.syllabus_url" target="_blank" rel="noopener noreferrer" class="text-[rgba(13,94,130,1)] hover:underline">View syllabus</a>
                  </p>
                </div>
                <div v-if="c.seats"><span class="font-medium text-gray-700">Seats available</span><p class="mt-1 text-gray-600">{{ c.seats }}</p></div>
                <div v-if="c.class_status"><span class="font-medium text-gray-700">Status</span><p class="mt-1 text-gray-600">{{ c.class_status }}</p></div>
                <div v-if="c.day_time"><span class="font-medium text-gray-700">Day & time</span><p class="mt-1 text-gray-600">{{ c.day_time }}</p></div>
                <div v-if="c.building"><span class="font-medium text-gray-700">Building & room</span><p class="mt-1 text-gray-600">{{ c.building }}</p></div>
                <div v-if="c.sched_comment"><span class="font-medium text-gray-700">Class comments</span><p class="mt-1 text-gray-600">{{ c.sched_comment }}</p></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop: table with horizontal scroll on small viewports -->
        <div class="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table class="min-w-[42rem] w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-10 px-2 py-3" aria-label="Expand" />
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Section</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Instructor</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Delivery</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Credits</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <template v-for="c in paginatedClasses" :key="c.full_class_id">
              <tr class="hover:bg-gray-50">
                <td class="w-10 px-2 py-3">
                  <button
                    type="button"
                    class="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-transform"
                    :class="{ 'rotate-90': expandedId === c.full_class_id }"
                    :aria-expanded="expandedId === c.full_class_id"
                    @click="toggleExpand(c.full_class_id)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ c.short_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ c.section }}</td>
                <td class="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" :title="c.short_description">{{ c.short_description }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formatInstructor(c.instructor) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ c.delivery_method }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ c.location }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ c.class_credits }}</td>
              </tr>
              <tr v-if="expandedId === c.full_class_id" class="bg-gray-50/80">
                <td colspan="8" class="px-4 py-4">
                  <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div v-if="c.full_description" class="sm:col-span-2 lg:col-span-3">
                      <span class="font-medium text-gray-700">Description</span>
                      <p class="mt-1 text-gray-600">{{ c.full_description }}</p>
                    </div>
                    <div v-if="c.syllabus_url">
                      <span class="font-medium text-gray-700">Syllabus</span>
                      <p class="mt-1">
                        <a
                          :href="c.syllabus_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-[rgba(13,94,130,1)] hover:underline"
                        >
                          View syllabus
                        </a>
                      </p>
                    </div>
                    <div v-if="c.seats">
                      <span class="font-medium text-gray-700">Seats available</span>
                      <p class="mt-1 text-gray-600">{{ c.seats }}</p>
                    </div>
                    <div v-if="c.class_status">
                      <span class="font-medium text-gray-700">Status</span>
                      <p class="mt-1 text-gray-600">{{ c.class_status }}</p>
                    </div>
                    <div v-if="c.day_time">
                      <span class="font-medium text-gray-700">Day & time</span>
                      <p class="mt-1 text-gray-600">{{ c.day_time }}</p>
                    </div>
                    <div v-if="c.building">
                      <span class="font-medium text-gray-700">Building & room</span>
                      <p class="mt-1 text-gray-600">{{ c.building }}</p>
                    </div>
                    <div v-if="c.sched_comment" class="sm:col-span-2 lg:col-span-3">
                      <span class="font-medium text-gray-700">Class comments</span>
                      <p class="mt-1 text-gray-600">{{ c.sched_comment }}</p>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        </div>
        <div v-if="totalPages > 1" class="mt-4 flex flex-wrap items-center justify-between gap-2 sm:justify-center">
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
      </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
interface ClassRow {
  full_class_id: string
  short_name: string
  section: string
  short_description: string
  instructor: string
  delivery_method: string
  location: string
  class_credits: number
  seats: string
  syllabus_url?: string
  full_description?: string
  day_time?: string
  building?: string
  class_status?: string
  sched_comment?: string
}

const expandedId = ref<string | null>(null)
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

/** "Last, First" → "First Last" */
function formatInstructor(raw: string): string {
  if (!raw?.trim()) return raw ?? ''
  const parts = raw.split(',').map((p) => p.trim())
  if (parts.length >= 2) return `${parts[1]} ${parts[0]}`
  return raw
}

const termOptions = (() => {
  const terms: { label: string; value: string }[] = []
  terms.push({ label: 'Spring 2026', value: 'SP26' })
  for (let y = 25; y >= 17; y--) {
    const year = 2000 + y
    terms.push({ label: `Fall ${year}`, value: `FA${y}` })
    terms.push({ label: `Summer ${year}`, value: `SU${y}` })
    terms.push({ label: `Spring ${year}`, value: `SP${y}` })
  }
  return terms
})()

const selectedTerm = ref(termOptions[0])

const termSlug = computed(() => selectedTerm.value?.value ?? 'SP26')

const { data: classesData, pending, error } = await useFetch<ClassRow[]>(
  () => `/api/class-list/${termSlug.value}`,
  { key: () => `class-list-${termSlug.value}` }
)

const classes = computed(() => {
  const raw = classesData.value
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) return (raw as any).data
  return []
})

const facultyOptions = computed(() => {
  const list = classes.value
  const seen = new Set<string>()
  const options: { label: string; value: string }[] = [{ label: 'All faculty', value: '' }]
  for (const c of list) {
    const raw = (c.instructor ?? '').trim()
    if (raw && !seen.has(raw)) {
      seen.add(raw)
      options.push({ label: formatInstructor(raw), value: raw })
    }
  }
  options.sort((a, b) => (a.label === 'All faculty' ? -1 : a.label.localeCompare(b.label)))
  return options
})

const selectedFaculty = ref<{ label: string; value: string }>({ label: 'All faculty', value: '' })

const locationOptions = computed(() => {
  const list = classes.value
  const seen = new Set<string>()
  const options: { label: string; value: string }[] = [{ label: 'All locations', value: '' }]
  for (const c of list) {
    const raw = (c.location ?? '').trim()
    if (raw && !seen.has(raw)) {
      seen.add(raw)
      options.push({ label: raw, value: raw })
    }
  }
  options.sort((a, b) => (a.label === 'All locations' ? -1 : a.label.localeCompare(b.label)))
  return options
})

const selectedLocation = ref<{ label: string; value: string }>({ label: 'All locations', value: '' })

const searchQuery = ref('')
const PAGE_SIZE = 50
const currentPage = ref(1)

const filteredClasses = computed(() => {
  let list = classes.value
  const facultyValue = selectedFaculty.value?.value
  if (facultyValue) {
    list = list.filter((c: ClassRow) => (c.instructor ?? '').trim() === facultyValue)
  }
  const locationValue = selectedLocation.value?.value
  if (locationValue) {
    list = list.filter((c: ClassRow) => (c.location ?? '').trim() === locationValue)
  }
  const words = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return list
  return list.filter((c: ClassRow) => {
    const course = (c.short_name ?? '').toLowerCase()
    const title = (c.short_description ?? '').toLowerCase()
    const instructor = (c.instructor ?? '').toLowerCase()
    const location = (c.location ?? '').toLowerCase()
    const searchable = [course, title, instructor, location].join(' ')
    return words.every((word) => searchable.includes(word))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredClasses.value.length / PAGE_SIZE)))

const paginatedClasses = computed(() => {
  const list = filteredClasses.value
  const start = (currentPage.value - 1) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() => (currentPage.value - 1) * PAGE_SIZE + 1)
const rangeEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredClasses.value.length)
)

watch([searchQuery, () => selectedFaculty.value, () => selectedLocation.value], () => {
  currentPage.value = 1
})
watch(termSlug, () => {
  selectedFaculty.value = { label: 'All faculty', value: '' }
  selectedLocation.value = { label: 'All locations', value: '' }
  currentPage.value = 1
})
watch(totalPages, (max) => {
  if (currentPage.value > max) currentPage.value = max
})
</script>
