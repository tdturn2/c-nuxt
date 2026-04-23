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
        <template v-else>
          <div v-if="plans.length" class="flex flex-wrap items-center gap-3 mb-6">
            <button
              type="button"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="createPlanPending"
              @click="openCreatePlanModal"
            >
              Add degree map
            </button>
            <NuxtLink
              to="/class-search"
              class="rounded-md border border-[rgba(13,94,130,1)] bg-white px-4 py-2 text-sm font-medium text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.08)]"
            >
              Open planner
            </NuxtLink>
          </div>

          <div
            v-if="!plans.length"
            class="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm"
          >
            <p class="text-gray-600 mb-6 max-w-md mx-auto">
              You do not have a degree map yet. Create one by choosing your degree program below.
            </p>
            <button
              type="button"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="createPlanPending"
              @click="openCreatePlanModal"
            >
              Create degree map
            </button>
          </div>

          <div v-else-if="plans.length === 1" class="space-y-6">
            <UserDegreePlanBody
              :plan="plans[0]!"
              @edit-course="(item) => onEditCourse(item, plans[0]!)"
            />
          </div>

          <div v-else class="space-y-4">
            <details
              v-for="(planItem, idx) in plans"
              :key="planItem.id ?? idx"
              class="group rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md"
              :open="idx === 0"
            >
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-gray-900 [&::-webkit-details-marker]:hidden"
              >
                <span>{{ planSummaryTitle(planItem) }}</span>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div class="border-t border-gray-200 px-4 pb-4 pt-2">
                <UserDegreePlanBody
                  :plan="planItem"
                  @edit-course="(item) => onEditCourse(item, planItem)"
                />
              </div>
            </details>
          </div>
        </template>

        <UModal v-model:open="createModalOpen" :ui="{ content: 'max-w-md' }">
          <template #header>Create degree map</template>
          <template #body>
            <div class="space-y-4 p-2">
              <p class="text-sm text-gray-600">
                Select the degree program to add as a new map. You can keep more than one map if you want to track multiple degree programs.
              </p>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Degree program</label>
                <select
                  v-model="selectedDegreeId"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                >
                  <option value="">Choose a degree…</option>
                  <option v-for="opt in degreeCatalog" :key="opt.id" :value="String(opt.id)">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <p v-if="createPlanError" class="text-sm text-red-600">{{ createPlanError }}</p>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                :disabled="createPlanPending"
                @click="createModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                :disabled="createPlanPending"
                @click="submitCreatePlan"
              >
                {{ createPlanPending ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </template>
        </UModal>

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
import type { DegreeItem, DegreePlan } from '~/components/user/DegreePlanBody.vue'

const { data, pending, error, refresh: refreshPlan } = await useFetch<{
  plans?: DegreePlan[]
  plan: DegreePlan | null
}>('/api/student-degree-plans', { key: 'student-degree-plans-my-plans' })

const plans = computed(() => {
  const list = data.value?.plans
  if (Array.isArray(list) && list.length > 0) return list
  const one = data.value?.plan
  return one ? [one] : []
})

function planSummaryTitle(p: DegreePlan) {
  const d = p?.degree
  return d?.name ?? p?.title ?? (p as any)?.name ?? 'Degree Plan'
}

const createModalOpen = ref(false)
const createPlanPending = ref(false)
const createPlanError = ref<string | null>(null)
const degreeCatalog = ref<{ id: number; label: string }[]>([])
const selectedDegreeId = ref('')

async function loadDegreeCatalog() {
  try {
    const res = await $fetch<{ docs?: any[] }>('/api/degrees', {
      query: { limit: '500', sort: 'id' },
    })
    const docs = Array.isArray(res?.docs) ? res.docs : []
    degreeCatalog.value = docs
      .map((d: any) => {
        const id = Number(d.id)
        const name = d.name ?? d.title ?? `Degree #${d.id}`
        const cy = d.catalogYear ?? d.catalog_year
        const label = cy != null && cy !== '' ? `${name} (${cy})` : name
        return { id, label }
      })
      .filter((x) => Number.isFinite(x.id))
  } catch (e: any) {
    createPlanError.value = e?.data?.message || e?.message || 'Could not load degree programs.'
  }
}

async function openCreatePlanModal() {
  createPlanError.value = null
  selectedDegreeId.value = ''
  createModalOpen.value = true
  if (!degreeCatalog.value.length) {
    await loadDegreeCatalog()
  }
}

async function submitCreatePlan() {
  const id = Number(selectedDegreeId.value)
  if (!Number.isFinite(id) || id <= 0) {
    createPlanError.value = 'Select a degree program.'
    return
  }
  createPlanPending.value = true
  createPlanError.value = null
  try {
    await $fetch('/api/student-degree-plans/create', {
      method: 'POST',
      body: { degreeId: id },
    })
    createModalOpen.value = false
    selectedDegreeId.value = ''
    await refreshPlan()
  } catch (e: any) {
    createPlanError.value = e?.data?.message || e?.message || 'Could not create degree map.'
  } finally {
    createPlanPending.value = false
  }
}

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

function courseTitle(item: DegreeItem | null) {
  if (!item) return ''
  const c = item.course
  return (c && (c.title ?? c.description)) ?? item.label ?? item.title ?? '—'
}

function courseCode(item: DegreeItem | null) {
  if (!item) return ''
  const c = item.course
  return (c && c.code) ?? item.code ?? '—'
}

const editSlideoverOpen = ref(false)
const editingPlan = ref<DegreePlan | null>(null)
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

function onEditCourse(item: DegreeItem, ownerPlan: DegreePlan) {
  editingPlan.value = ownerPlan
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
  editingPlan.value = null
  selectedSearchFullClassId.value = null
}

async function saveEditCourse() {
  if (!editingItem.value || !editingPlan.value) {
    cancelEditCourse()
    return
  }

  const item = editingItem.value
  const form = editForm.value
  const owner = editingPlan.value

  const planId = owner.id ?? (owner as any).id
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
