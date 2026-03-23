<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Degree Map</h1>

        <div v-if="pending" class="py-8 text-gray-500">
          Loading your degree plan...
        </div>
        <div
          v-else-if="error"
          class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm"
        >
          {{ error }}
        </div>
        <div v-else-if="!plan" class="py-8 text-gray-500">
          No degree plan is currently associated with your account.
        </div>
        <div v-else class="space-y-6">
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <h2 class="text-xl font-semibold text-gray-900">
                  {{ planTitle }}
                </h2>
                <p v-if="degreeTotalCredits" class="mt-0.5 text-sm text-gray-500">
                  Total credit hours required: {{ degreeTotalCredits }}
                  <span v-if="remainingCredits != null" class="ml-3 text-gray-700">
                    Credit hours remaining:
                    <span class="font-semibold">{{ remainingCredits }}</span>
                  </span>
                </p>
                <p class="mt-0.5 text-sm text-gray-500">
                  Residential hours completed:
                  <span class="font-medium text-gray-800">{{ residentialHoursCompleted }}</span>
                  <span class="ml-3 text-gray-500">
                    Non-residential hours completed:
                    <span class="font-medium text-gray-800">{{ nonResidentialHoursCompleted }}</span>
                  </span>
                </p>
                <div v-if="planProgress" class="mt-4">
                  <div class="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span>Overall progress</span>
                    <span class="font-medium text-gray-800">
                      {{ planProgress.percent }}% • {{ planProgress.earned }} / {{ planProgress.total }} hours
                    </span>
                  </div>
                  <div class="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500 transition-all duration-500"
                      :style="{ width: planProgress.percent + '%' }"
                    />
                  </div>
                </div>
                <div
                  v-if="planDescription"
                  class="mt-3 text-gray-600 prose prose-sm max-w-none"
                  v-html="planDescription"
                />
              </div>
              <div v-if="catalogYear" class="shrink-0">
                <span
                  class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-sm"
                >
                  Catalog year
                  <span class="ml-1 font-bold">{{ catalogYear }}</span>
                </span>
              </div>
            </div>
          </div>

          <div v-for="section in sections" :key="section.id" class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ section.name }}
            </h3>
            <p v-if="section.creditsRequired != null" class="mt-0.5 text-sm text-gray-500">
              {{ section.creditsRequired }} credits required
            </p>
            <div class="mt-3 overflow-x-auto rounded-lg border border-gray-200">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Semester/Year<br />Completed</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours<br />Required</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours<br />Earned</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours<br />Type</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                    <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th class="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white">
                  <tr
                    v-for="(item, i) in section.items"
                    :key="item.id ?? i"
                    :class="[
                      'hover:bg-gray-50 transition',
                      isItemCompleted(item) ? 'bg-emerald-50/70 border-l-4 border-l-emerald-400' : ''
                    ]"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ courseCode(item) }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      <UPopover
                        v-if="courseDescription(item)"
                        :popper="{ placement: 'top', strategy: 'fixed' }"
                        :content="{ align: 'start', side: 'top', sideOffset: 8 }"
                      >
                        <button
                          type="button"
                          class="inline-flex text-left hover:underline decoration-dotted decoration-gray-400"
                        >
                          {{ courseTitle(item) }}
                        </button>
                        <template #content>
                          <div
                            class="max-w-[500px] p-3 rounded-md bg-white text-sm text-gray-800 shadow-lg border border-gray-200 whitespace-pre-line"
                          >
                            {{ courseDescription(item) }}
                          </div>
                        </template>
                      </UPopover>
                      <span v-else>{{ courseTitle(item) }}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">{{ formattedTerm(item) }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{{ courseCredits(item) }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{{ courseHoursEarned(item) }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">{{ courseHoursType(item) }}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      <UPopover
                        v-if="courseNotes(item)"
                        :popper="{ placement: 'top', strategy: 'fixed' }"
                        :content="{ align: 'start', side: 'top', sideOffset: 8 }"
                      >
                        <button
                          type="button"
                          class="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          aria-label="View notes"
                        >
                          <UIcon name="i-heroicons-document-text" class="h-4 w-4" />
                        </button>
                        <template #content>
                          <div
                            class="max-w-[400px] p-3 rounded-md bg-white text-sm text-gray-800 shadow-lg border border-gray-200 whitespace-pre-line"
                          >
                            {{ courseNotes(item) }}
                          </div>
                        </template>
                      </UPopover>
                      <span v-else class="text-gray-300">—</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      <div class="flex items-center justify-center">
                        <UIcon
                          :name="isItemCompleted(item) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-clock'"
                          :class="isItemCompleted(item) ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4 text-gray-400'"
                          aria-hidden="true"
                        />
                      </div>
                    </td>
                    <td class="px-2 py-3 text-right">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        aria-label="Edit course"
                        @click="onEditCourse(item)"
                      >
                        <UIcon name="i-heroicons-pencil-square" class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <USlideover v-model:open="editSlideoverOpen" :ui="{ content: 'max-w-lg' }">
          <template #header>
            <div class="flex flex-col gap-1">
              <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Edit course</p>
              <h3 v-if="editingItem" class="text-base font-semibold text-gray-900 truncate">
                {{ courseTitle(editingItem) }}
              </h3>
              <p v-if="editingItem" class="text-xs text-gray-500">
                {{ courseCode(editingItem) }}
              </p>
            </div>
          </template>

          <template #body>
            <div class="space-y-6">
              <div class="border-b border-gray-200 pb-4">
                <p class="text-sm font-medium text-gray-900 mb-2">Edit mode</p>
                <div class="flex items-center gap-4 mb-3">
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      v-model="editMode"
                      type="radio"
                      value="regular"
                      class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    Regular course
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      v-model="editMode"
                      type="radio"
                      value="other"
                      class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    Other / manual entry
                  </label>
                </div>
                <p class="text-xs text-gray-500">
                  Regular courses link to an official offering; Other keeps this entry as a manual course.
                </p>
              </div>

              <div v-if="editMode === 'regular'" class="border-b border-gray-200 pb-4">
                <p class="text-sm font-medium text-gray-900 mb-2">Lookup course offering</p>
                <div class="flex flex-wrap items-end gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Year</label>
                    <select
                      v-model="courseSearchYear"
                      class="w-28 px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select</option>
                      <option v-for="y in courseSearchYearOptions" :key="y" :value="y">
                        {{ y }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      v-model="courseSearchSemester"
                      class="w-32 px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select</option>
                      <option value="FA">Fall</option>
                      <option value="SP">Spring</option>
                      <option value="SU">Summer</option>
                    </select>
                  </div>
                  <div class="flex-1 min-w-[180px]">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Search</label>
                    <div class="flex gap-2">
                      <input
                        v-model="courseSearchQuery"
                        type="search"
                        class="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Course, title, instructor…"
                        autocomplete="off"
                      />
                      <button
                        type="button"
                        class="px-3 py-1.5 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="courseSearchDisabled || courseSearchPending"
                        @click="runCourseSearch"
                      >
                        {{ courseSearchPending ? 'Searching…' : 'Search' }}
                      </button>
                    </div>
                  </div>
                </div>
                <p v-if="courseSearchError" class="mt-2 text-xs text-red-600">
                  {{ courseSearchError }}
                </p>
                <div
                  v-if="courseSearchResults.length"
                  class="mt-3 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-gray-50"
                >
                  <table class="min-w-full text-xs">
                    <thead class="bg-gray-100 text-gray-700 uppercase">
                      <tr>
                        <th class="px-3 py-2 text-left font-semibold">Course</th>
                        <th class="px-3 py-2 text-left font-semibold">Title</th>
                        <th class="px-3 py-2 text-left font-semibold hidden sm:table-cell">Instructor</th>
                        <th class="px-3 py-2 text-left font-semibold hidden md:table-cell">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="c in courseSearchResults"
                        :key="c.full_class_id"
                        :class="[
                          'border-t border-gray-200 hover:bg-white cursor-pointer transition-colors',
                          selectedSearchFullClassId === c.full_class_id
                            ? 'bg-[rgba(13,94,130,0.2)] hover:bg-[rgba(13,94,130,0.25)]'
                            : 'bg-white'
                        ]"
                        @click="selectCourseFromSearch(c)"
                      >
                        <td class="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                          {{ c.short_name }} {{ c.section }}
                        </td>
                        <td class="px-3 py-2 text-gray-700">
                          <div class="truncate max-w-[12rem] sm:max-w-[18rem]" :title="c.short_description">
                            {{ c.short_description }}
                          </div>
                        </td>
                        <td class="px-3 py-2 text-gray-600 hidden sm:table-cell">
                          {{ c.instructor }}
                        </td>
                        <td class="px-3 py-2 text-gray-500 hidden md:table-cell">
                          {{ c.location }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Semester / Year</label>
                  <input
                    v-model="editForm.term"
                    type="text"
                    class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. FA24 or SP25"
                  />
                  <p class="mt-1 text-xs text-gray-500">Use term codes like FA24, SP25, SU26.</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Hours earned</label>
                    <input
                      v-model="editForm.hoursEarned"
                      type="number"
                      min="0"
                      step="0.5"
                      class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      :disabled="editMode === 'regular'"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Hours type</label>
                    <div class="flex items-center gap-4 pt-1">
                      <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          v-model="editForm.hoursType"
                          type="radio"
                          value="Residential"
                          class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          :disabled="editMode === 'regular'"
                        />
                        Residential
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          v-model="editForm.hoursType"
                          type="radio"
                          value="Non-Residential"
                          class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          :disabled="editMode === 'regular'"
                        />
                        Non-Residential
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    v-model="editForm.status"
                  class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value=""></option>
                    <option value="completed">Completed</option>
                    <option value="active">In Progress</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    v-model="editForm.notes"
                    rows="3"
                    class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent whitespace-pre-wrap"
                    placeholder="Substitution details, exceptions, or advisor comments"
                  ></textarea>
                </div>
              </div>
            </div>
          </template>

          <template #footer>
            <div class="flex flex-col gap-3 w-full">
              <p v-if="editError" class="text-sm text-red-600">{{ editError }}</p>
              <div class="flex items-center justify-end gap-3">
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  :disabled="savingEdit"
                  @click="cancelEditCourse"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="savingEdit"
                  @click="saveEditCourse"
                >
                  {{ savingEdit ? 'Saving...' : 'Save changes' }}
                </button>
              </div>
            </div>
          </template>
        </USlideover>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
interface DegreeItem {
  id?: number
  course?: { code?: string; title?: string; credits?: number; description?: string }
  // primary data lives on nested record from Payload
  record?: {
    status?: string
    term?: string
    grade?: string | null
    hoursEarned?: number
    hoursType?: string
    substitutionNotes?: string | null
    [key: string]: any
  }
  // fallbacks / denormalised fields
  status?: string
  term?: string
  grade?: string | null
  hoursEarned?: number
  hoursType?: string
  substitutionNotes?: string | null
  credits?: number
  label?: string
  title?: string
  [key: string]: any
}

interface DegreeSection {
  id?: number
  name?: string
  creditsRequired?: number
  order?: number
  items?: DegreeItem[]
}

interface DegreePlan {
  degree?: { name?: string; displayLabel?: string; catalogYear?: number; description?: string; totalCredits?: number }
  sections?: DegreeSection[]
  [key: string]: any
}

const { data, pending, error, refresh: refreshPlan } = await useFetch<{ plan: DegreePlan | null }>(
  '/api/student-degree-plans',
  { key: 'student-degree-plans-my-plans' }
)

const plan = computed(() => data.value?.plan ?? null)

const planTitle = computed(() => {
  const d = plan.value?.degree
  return d?.name ?? plan.value?.title ?? (plan.value as any)?.name ?? 'Degree Plan'
})

const catalogYear = computed(() => {
  const d = plan.value?.degree
  const v = d?.catalogYear ?? plan.value?.catalogYear ?? (plan.value as any)?.catalog_year
  return v != null ? String(v) : null
})

const degreeTotalCredits = computed(() => {
  const v = plan.value?.degree?.totalCredits
  return v != null ? Number(v) : null
})

const planDescription = computed(() => {
  const d = plan.value?.degree
  const html = d?.description ?? plan.value?.description ?? (plan.value as any)?.content
  return typeof html === 'string' && html ? html : ''
})

const sections = computed<DegreeSection[]>(() => {
  const raw = plan.value?.sections
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => Array.isArray(s?.items) && s.items && s.items.length > 0)
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
})

const totalHoursEarned = computed(() => {
  let sum = 0
  for (const section of sections.value) {
    for (const item of section.items || []) {
      const r = item.record
      const v = r?.hoursEarned ?? item.hoursEarned
      if (typeof v === 'number') sum += v
    }
  }
  return sum
})

const remainingCredits = computed(() => {
  if (degreeTotalCredits.value == null) return null
  const remaining = degreeTotalCredits.value - totalHoursEarned.value
  return remaining > 0 ? remaining : 0
})

const planProgress = computed(() => {
  if (!degreeTotalCredits.value || degreeTotalCredits.value <= 0) return null

  const earned = totalHoursEarned.value
  const total = degreeTotalCredits.value
  const rawPercent = (earned / total) * 100
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)))

  return {
    percent,
    earned,
    total
  }
})

interface ClassRow {
  full_class_id: string
  short_name: string
  section: string
  short_description: string
  instructor: string
  location: string
  class_credits: number
}

const courseSearchYear = ref<string>('')
const courseSearchSemester = ref<string>('')
const courseSearchQuery = ref<string>('')
const courseSearchPending = ref(false)
const courseSearchError = ref<string | null>(null)
const courseSearchResults = ref<ClassRow[]>([])
const editMode = ref<'regular' | 'other'>('regular')

const courseSearchYearOptions = computed(() => {
  const current = new Date().getFullYear()
  return [current - 1, current, current + 1, current + 2].map(String)
})

const courseSearchTermCode = computed(() => {
  if (!courseSearchYear.value || !courseSearchSemester.value) return null
  const yy = courseSearchYear.value.slice(-2)
  return `${courseSearchSemester.value}${yy}`
})

const courseSearchDisabled = computed(
  () => !courseSearchTermCode.value || !courseSearchQuery.value.trim()
)

function isHoursTypeResidential(item: DegreeItem) {
  const raw = (item.record?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return false
  const v = raw.toLowerCase()
  return v === 'residential' || v === 'r'
}

function isHoursTypeNonResidential(item: DegreeItem) {
  const raw = (item.record?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return false
  const v = raw.toLowerCase()
  return (
    v === 'non-residential' ||
    v === 'nonresidential' ||
    v === 'non_residential' ||
    v === 'online' ||
    v === 'n'
  )
}

const residentialHoursCompleted = computed(() => {
  let sum = 0
  for (const section of sections.value) {
    for (const item of section.items || []) {
      if (!isHoursTypeResidential(item)) continue
      const v = item.record?.hoursEarned ?? item.hoursEarned
      if (typeof v === 'number') sum += v
    }
  }
  return sum
})

const nonResidentialHoursCompleted = computed(() => {
  let sum = 0
  for (const section of sections.value) {
    for (const item of section.items || []) {
      if (!isHoursTypeNonResidential(item)) continue
      const v = item.record?.hoursEarned ?? item.hoursEarned
      if (typeof v === 'number') sum += v
    }
  }
  return sum
})

const editSlideoverOpen = ref(false)
const editingItem = ref<DegreeItem | null>(null)
const savingEdit = ref(false)
const editError = ref<string | null>(null)
const editForm = ref({
  term: '',
  hoursEarned: '',
  hoursType: '',
  notes: '',
  status: '',
  offeringCode: ''
})
const selectedSearchFullClassId = ref<string | null>(null)

function courseCode(item: DegreeItem) {
  const c = item.course
  return (c && c.code) ?? item.code ?? '—'
}

function courseTitle(item: DegreeItem) {
  const c = item.course
  return (c && (c.title ?? c.description)) ?? item.label ?? item.title ?? '—'
}

function courseDescription(item: DegreeItem) {
  const c = item.course
  const rec = item.record as any
  return (c && c.description) ?? rec?.description ?? (item as any).description ?? ''
}

function courseCredits(item: DegreeItem) {
  const c = item.course
  const v = (c && c.credits) ?? item.credits
  return v != null ? String(v) : '—'
}

function formattedTerm(item: DegreeItem) {
  const rec = item.record
  const term = rec?.term ?? item.term
  if (!term || typeof term !== 'string') return '—'
  // Expect codes like FA17, SP25, SU26
  const code = term.slice(0, 2).toUpperCase()
  const yearPart = term.slice(2)
  const yearNum = Number.isFinite(Number(yearPart)) ? 2000 + Number(yearPart) : null
  const season =
    code === 'FA'
      ? 'Fall'
      : code === 'SP'
        ? 'Spring'
        : code === 'SU'
          ? 'Summer'
          : code

  const base = yearNum ? `${season} ${yearNum}` : term

  // When completed, list the class in the year-completed column, e.g. Spring 2025 (NT501-W1)
  const r = item.record as any
  const completedCode =
    r?.completedCourseCode ??
    r?.offeringFullClassId ??
    r?.offeringCode ??
    r?.completedCourseId ??
    r?.passedCourseCode ??
    r?.passedCourseId ??
    r?.offeringId ??
    null

  if (completedCode) return `${base} (${String(completedCode)})`

  // If no offering code on record but status is completed, show course code e.g. Spring 2025 (NT501-W1)
  const status = (r?.status ?? item.status ?? '').toString().toLowerCase()
  if (status === 'completed' || status === 'complete') {
    const codeForCompleted = courseCode(item)
    if (codeForCompleted && codeForCompleted !== '—') return `${base} (${codeForCompleted})`
  }

  return base
}

function courseStatus(item: DegreeItem) {
  const r = item.record
  // e.g. 'active', 'completed', 'planned'
  return r?.status ?? item.status ?? '—'
}

function courseHoursEarned(item: DegreeItem) {
  const r = item.record
  const v = r?.hoursEarned ?? item.hoursEarned ?? null
  return v != null ? String(v) : '—'
}

function courseHoursType(item: DegreeItem) {
  const r = item.record
  const raw = (r?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return '—'
  const v = raw.toLowerCase()
  if (v === 'residential' || v === 'r') return 'R'
  if (v === 'non-residential' || v === 'nonresidential' || v === 'online' || v === 'n') return 'N'
  return raw
}

function courseNotes(item: DegreeItem) {
  const r = item.record
  return (
    r?.substitutionNotes ??
    (r as any)?.notes ??
    (r as any)?.note ??
    item.substitutionNotes ??
    (item as any).notes ??
    (item as any).note ??
    ''
  )
}

function isItemCompleted(item: DegreeItem) {
  const required = item.course?.credits ?? item.credits
  const earned = item.record?.hoursEarned ?? item.hoursEarned
  if (required == null || earned == null) return false
  return Number(earned) >= Number(required)
}

function onEditCourse(item: DegreeItem) {
  editingItem.value = item

  const r = (item.record ?? {}) as any

  editForm.value.term = (r.term ?? item.term ?? '') as string
  const hours = r.hoursEarned ?? item.hoursEarned
  editForm.value.hoursEarned = hours != null ? String(hours) : ''
  const rawHoursType = String(r.hoursType ?? item.hoursType ?? '')
  const hoursTypeNorm = rawHoursType.trim().toLowerCase()
  editForm.value.hoursType =
    hoursTypeNorm === 'residential' || hoursTypeNorm === 'r'
      ? 'Residential'
      : hoursTypeNorm === 'non-residential' ||
          hoursTypeNorm === 'nonresidential' ||
          hoursTypeNorm === 'non_residential' ||
          hoursTypeNorm === 'online' ||
          hoursTypeNorm === 'n'
        ? 'Non-Residential'
        : ''
  editForm.value.notes = courseNotes(item)
  const rawStatus = String(r.status ?? item.status ?? '')
  const statusNorm = rawStatus.trim().toLowerCase()
  editForm.value.status =
    statusNorm === 'completed' || statusNorm === 'complete'
      ? 'completed'
      : statusNorm === 'active' ||
          statusNorm === 'in progress' ||
          statusNorm === 'in_progress' ||
          statusNorm === 'in-progress'
        ? 'active'
        : ''

  const offeringCode = r?.offeringCode ?? r?.completedCourseCode ?? r?.offeringFullClassId ?? ''
  editForm.value.offeringCode = typeof offeringCode === 'string' ? offeringCode : ''
  selectedSearchFullClassId.value = editForm.value.offeringCode || null

  editMode.value = 'regular'
  courseSearchError.value = null
  courseSearchResults.value = []

  editError.value = null
  editSlideoverOpen.value = true
}

async function runCourseSearch() {
  if (!courseSearchTermCode.value || !courseSearchQuery.value.trim()) {
    courseSearchError.value = 'Select a year, semester, and enter a search term.'
    return
  }

  courseSearchPending.value = true
  courseSearchError.value = null
  courseSearchResults.value = []

  try {
    const term = courseSearchTermCode.value
    const all = await $fetch<ClassRow[]>(`/api/class-list/${term}`)
    const q = courseSearchQuery.value.trim().toLowerCase()
    courseSearchResults.value =
      all?.filter((c) => {
        const haystack = [
          c.full_class_id,
          c.short_name,
          c.section,
          c.short_description,
          c.instructor,
          c.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      }) ?? []
  } catch (err: any) {
    console.error('Course search failed', err)
    courseSearchError.value = err?.data?.message || err?.message || 'Failed to search classes.'
  } finally {
    courseSearchPending.value = false
  }
}

function selectCourseFromSearch(c: ClassRow) {
  if (!c) return
  // Store full class id (e.g. OT501-W1) so it is saved to the record
  editForm.value.offeringCode = c.full_class_id ?? ''
  selectedSearchFullClassId.value = c.full_class_id ?? null
  // Use the selected term code from the search controls
  if (courseSearchTermCode.value) {
    editForm.value.term = courseSearchTermCode.value
  }
  // Use class credits as hours earned by default
  if (c.class_credits != null) {
    editForm.value.hoursEarned = String(c.class_credits)
  }
  const title = (c.short_description || '').toUpperCase()
  if (title.includes('X1') || title.includes('X2')) {
    editForm.value.hoursType = 'Non-Residential'
  } else {
    editForm.value.hoursType = 'Residential'
  }
}

function cancelEditCourse() {
  editSlideoverOpen.value = false
  editingItem.value = null
  selectedSearchFullClassId.value = null
}

async function saveEditCourse() {
  if (!editingItem.value || !plan.value) {
    cancelEditCourse()
    return
  }

  const item = editingItem.value
  const form = editForm.value

  const planId = plan.value.id ?? (plan.value as any).id
  const degreeSectionItemId = item.id ?? (item as any).id

  if (planId == null || degreeSectionItemId == null) {
    editError.value = 'Missing plan or course item id.'
    return
  }

  const courseId = (item.course as any)?.id ?? item.record?.courseId ?? (item.record as any)?.course?.id ?? null

  const body = {
    planId,
    degreeSectionItemId,
    courseId: courseId ?? undefined,
    offeringCode: form.offeringCode || undefined,
    term: form.term || null,
    hoursEarned: form.hoursEarned !== '' && Number.isFinite(Number(form.hoursEarned)) ? Number(form.hoursEarned) : null,
    hoursType:
      form.hoursType === 'Residential'
        ? 'residential'
        : form.hoursType === 'Non-Residential'
          ? 'non_residential'
          : form.hoursType || null,
    substitutionNotes: form.notes || null,
    status: form.status || null
  }

  savingEdit.value = true
  editError.value = null
  try {
    const result = await $fetch<any>('/api/student-course-records/upsert-line', {
      method: 'POST',
      body
    })
    if (result && item.record !== result) {
      item.record = result
    }
    await refreshPlan()
    cancelEditCourse()
  } catch (err: any) {
    console.error('Failed to upsert course record', err)
    editError.value = err?.data?.message || err?.message || 'Failed to save. Please try again.'
  } finally {
    savingEdit.value = false
  }
}
</script>
