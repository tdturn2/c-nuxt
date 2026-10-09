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
          </div>

          <div
            v-if="!plans.length"
            class="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm"
          >
            <p class="text-gray-600 mb-6 max-w-md mx-auto">
              You do not have a degree map yet. Create one by choosing the year you began and your degree program.
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
              @remove-course="(item) => onRemoveCourse(item, plans[0]!)"
              @deleted="onPlanDeleted"
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
                  @remove-course="(item) => onRemoveCourse(item, planItem)"
                  @deleted="onPlanDeleted"
                />
              </div>
            </details>
          </div>
        </template>

        <UModal v-model:open="createModalOpen" :ui="{ content: 'max-w-lg' }">
          <template #header>
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(13,94,130,0.1)]">
                <UIcon name="i-lucide-map" class="h-5 w-5 text-[rgba(13,94,130,1)]" />
              </span>
              <div class="min-w-0">
                <h2 class="text-base font-semibold text-gray-900">Create degree map</h2>
                <p class="mt-0.5 text-sm text-gray-500">
                  Your map is built from the catalog for the year you started.
                </p>
              </div>
            </div>
          </template>

          <template #body>
            <div class="space-y-5">
              <div class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                <p>A degree map matches the catalog year in which you began your program.</p>
                <p class="mt-1">Previous years will be added. Check back later if your catalog year is not listed yet.</p>
              </div>
              <div>
                <label for="degree-map-year" class="block text-sm font-medium text-gray-900">
                  <span class="mr-1.5 text-xs font-semibold text-[rgba(13,94,130,1)]">1</span>
                  Catalog year
                </label>
                <p class="mt-0.5 mb-2 text-xs text-gray-500">
                  The year you began your degree program.
                </p>
                <USelectMenu
                  id="degree-map-year"
                  v-model="selectedCatalogYear"
                  :items="catalogYearItems"
                  value-key="value"
                  label-key="label"
                  color="neutral"
                  variant="outline"
                  size="lg"
                  placeholder="Select a year…"
                  icon="i-lucide-calendar"
                  :search-input="{ placeholder: 'Search years…' }"
                  class="w-full"
                />
              </div>

              <div>
                <label for="degree-map-degree" class="block text-sm font-medium text-gray-900">
                  <span class="mr-1.5 text-xs font-semibold text-[rgba(13,94,130,1)]">2</span>
                  Degree program
                </label>
                <p class="mt-0.5 mb-2 text-xs text-gray-500">
                  {{
                    selectedCatalogYear
                      ? `Programs offered in ${selectedCatalogYear}.`
                      : 'Choose a calendar year to see available programs.'
                  }}
                </p>
                <USelectMenu
                  id="degree-map-degree"
                  v-model="selectedDegreeId"
                  :items="degreeItemsForSelectedYear"
                  value-key="value"
                  label-key="label"
                  color="neutral"
                  variant="outline"
                  size="lg"
                  icon="i-lucide-graduation-cap"
                  :disabled="!selectedCatalogYear || !degreeItemsForSelectedYear.length"
                  :placeholder="selectedCatalogYear ? 'Select a degree…' : 'Select a year first'"
                  :search-input="{ placeholder: 'Search degrees…' }"
                  class="w-full"
                />
                <p
                  v-if="selectedCatalogYear && !degreeItemsForSelectedYear.length"
                  class="mt-2 flex items-start gap-1.5 text-xs text-amber-700"
                >
                  <UIcon name="i-lucide-triangle-alert" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  No degree maps are available for {{ selectedCatalogYear }}.
                </p>
              </div>

              <div v-if="concentrationsForSelectedDegree.length">
                <label for="degree-map-concentration" class="block text-sm font-medium text-gray-900">
                  <span class="mr-1.5 text-xs font-semibold text-[rgba(13,94,130,1)]">3</span>
                  Concentration
                </label>
                <p class="mt-0.5 mb-2 text-xs text-gray-500">
                  This program keeps shared requirements on the degree and puts track-specific courses on a concentration.
                </p>
                <USelectMenu
                  id="degree-map-concentration"
                  v-model="selectedSpecializationId"
                  :items="concentrationItems"
                  value-key="value"
                  label-key="label"
                  color="neutral"
                  variant="outline"
                  size="lg"
                  icon="i-lucide-git-branch"
                  placeholder="Select a concentration…"
                  :search-input="{ placeholder: 'Search concentrations…' }"
                  class="w-full"
                />
              </div>

              <p
                v-if="createPlanError"
                class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <UIcon name="i-lucide-circle-alert" class="mt-0.5 h-4 w-4 shrink-0" />
                {{ createPlanError }}
              </p>
            </div>
          </template>

          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                :disabled="createPlanPending"
                @click="createModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                :disabled="createPlanPending || !canCreatePlan"
                @click="submitCreatePlan"
              >
                <UIcon v-if="createPlanPending" name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
                {{ createPlanPending ? 'Creating…' : 'Create map' }}
              </button>
            </div>
          </template>
        </UModal>

        <USlideover v-model:open="editSlideoverOpen" :ui="{ content: 'max-w-lg' }">
          <template #header>
            <div class="flex flex-col gap-1">
              <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {{ editingItem?.electiveLine && !editingItem.record?.id ? 'Add course' : 'Edit course' }}
              </p>
              <h3 v-if="editingItem" class="text-base font-semibold text-gray-900 truncate">
                {{ editingItem.electiveLine && !editingItem.record?.id ? (editingItem.label || 'Elective') : courseTitle(editingItem) }}
              </h3>
              <p v-if="editingItem && !(editingItem.electiveLine && !editingItem.record?.id)" class="text-xs text-gray-500">
                {{ courseCode(editingItem) }}
              </p>
              <p v-else-if="editingItem?.electiveLine" class="text-xs text-gray-500">
                Counts toward {{ editingItem.credits != null ? `${editingItem.credits} hours` : 'this elective section' }}
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
                    <label class="block text-xs font-medium text-gray-700 mb-1">Semester</label>
                    <select
                      v-model="courseSearchTerm"
                      class="w-40 px-2 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select</option>
                      <option v-for="term in visibleTermOptions" :key="term.value" :value="term.value">
                        {{ term.label }}
                      </option>
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
                <div v-if="editingItem?.electiveLine" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Course code</label>
                    <input
                      v-model="editForm.courseCode"
                      type="text"
                      class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. NT605"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Course title</label>
                    <input
                      v-model="editForm.courseTitle"
                      type="text"
                      class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Course title"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Semester / Year</label>
                  <select
                    v-model="editForm.term"
                    class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select</option>
                    <option v-if="editForm.term && !visibleTermValues.has(editForm.term)" :value="editForm.term">
                      {{ editForm.term }}
                    </option>
                    <option v-for="term in visibleTermOptions" :key="term.value" :value="term.value">
                      {{ term.label }}
                    </option>
                  </select>
                  <p class="mt-1 text-xs text-gray-500">Same semesters as Class Search, through Spring 2027.</p>
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
                        />
                        Residential
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          v-model="editForm.hoursType"
                          type="radio"
                          value="Non-Residential"
                          class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        Non-Residential
                      </label>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">Looking up a class sets a default. You can change it.</p>
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
                  v-if="editingItem?.electiveLine && editingItem.record?.id"
                  type="button"
                  class="mr-auto px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                  :disabled="savingEdit"
                  @click="removeEditingCourse"
                >
                  Remove course
                </button>
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
import { buildClassSearchTermOptions } from '@shared/academicTerms'
import { appliedElectiveHours, courseSearchSeed, isElectivePlaceholderCode } from '@shared/degreeMapElectives'

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
  const base = d?.name ?? p?.title ?? (p as any)?.name ?? 'Degree Plan'
  const concentration = p?.specialization?.name?.trim()
  return concentration ? `${base} · ${concentration}` : base
}

async function onPlanDeleted() {
  await refreshPlan()
}

const createModalOpen = ref(false)
const createPlanPending = ref(false)
const createPlanError = ref<string | null>(null)
type DegreeConcentration = {
  id: number
  name: string
  order: number | null
}
type DegreeCatalogEntry = {
  id: number
  name: string
  catalogYear: string | null
  specializations: DegreeConcentration[]
}
const degreeCatalog = ref<DegreeCatalogEntry[]>([])
const selectedCatalogYear = ref('')
const selectedDegreeId = ref('')
const selectedSpecializationId = ref('')

/** Catalog years students can start a map for. Earlier years stay in the dashboard until they are reviewed. */
const OPEN_DEGREE_MAP_YEARS = ['2026']

const catalogYearOptions = computed(() => {
  const years = new Set<string>()
  for (const d of degreeCatalog.value) {
    if (d.catalogYear && OPEN_DEGREE_MAP_YEARS.includes(d.catalogYear)) years.add(d.catalogYear)
  }
  return Array.from(years).sort((a, b) => Number(b) - Number(a) || b.localeCompare(a))
})

const catalogYearItems = computed(() =>
  catalogYearOptions.value.map((year) => ({ label: year, value: year })),
)

const degreesForSelectedYear = computed(() => {
  const year = selectedCatalogYear.value
  if (!year) return []
  return degreeCatalog.value
    .filter((d) => d.catalogYear === year)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
})

/** Year is already chosen in step 1, so labels stay program-only. */
const degreeItemsForSelectedYear = computed(() =>
  degreesForSelectedYear.value.map((d) => ({ label: d.name, value: String(d.id) })),
)

const concentrationsForSelectedDegree = computed(() => {
  const id = Number(selectedDegreeId.value)
  const degree = degreesForSelectedYear.value.find((d) => d.id === id)
  return (degree?.specializations ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
})

const concentrationItems = computed(() =>
  concentrationsForSelectedDegree.value.map((spec) => ({ label: spec.name, value: String(spec.id) })),
)

const canCreatePlan = computed(() => {
  if (!selectedCatalogYear.value || !selectedDegreeId.value) return false
  if (!concentrationsForSelectedDegree.value.length) return true
  return concentrationsForSelectedDegree.value.some((spec) => String(spec.id) === selectedSpecializationId.value)
})

watch(selectedCatalogYear, () => {
  selectedDegreeId.value = ''
  selectedSpecializationId.value = ''
})

watch(selectedDegreeId, () => {
  const list = concentrationsForSelectedDegree.value
  selectedSpecializationId.value = list.length === 1 ? String(list[0]!.id) : ''
})

function normalizeCatalogYear(value: unknown): string | null {
  if (value == null || value === '') return null
  const raw = String(value).trim()
  if (!raw) return null
  const match = raw.match(/\d{4}/)
  return match?.[0] ?? raw
}

async function loadDegreeCatalog() {
  try {
    const res = await $fetch<{ docs?: any[] }>('/api/degrees', {
      query: { limit: '500', sort: 'id' },
    })
    const docs = Array.isArray(res?.docs) ? res.docs : []
    degreeCatalog.value = docs
      .map((d: any) => {
        const id = Number(d.id)
        const name = String(d.name ?? d.title ?? `Degree #${d.id}`).trim() || `Degree #${d.id}`
        const catalogYear = normalizeCatalogYear(d.catalogYear ?? d.catalog_year)
        const specializations = (Array.isArray(d.specializations) ? d.specializations : [])
          .map((spec: any) => ({
            id: Number(spec?.id),
            name: String(spec?.name ?? spec?.title ?? '').trim(),
            order: spec?.order == null || spec?.order === '' ? null : Number(spec.order),
          }))
          .filter((spec: DegreeConcentration) => Number.isFinite(spec.id) && spec.name)
        return { id, name, catalogYear, specializations }
      })
      .filter((x) => Number.isFinite(x.id))
  } catch (e: any) {
    createPlanError.value = e?.data?.message || e?.message || 'Could not load degree programs.'
  }
}

async function openCreatePlanModal() {
  createPlanError.value = null
  selectedDegreeId.value = ''
  selectedSpecializationId.value = ''
  createModalOpen.value = true
  if (!degreeCatalog.value.length) {
    await loadDegreeCatalog()
  }
  selectedCatalogYear.value = catalogYearOptions.value.includes('2026') ? '2026' : (catalogYearOptions.value[0] ?? '')
}

async function submitCreatePlan() {
  if (!selectedCatalogYear.value || !OPEN_DEGREE_MAP_YEARS.includes(selectedCatalogYear.value)) {
    createPlanError.value = 'Select a catalog year that is available now.'
    return
  }
  const id = Number(selectedDegreeId.value)
  if (!Number.isFinite(id) || id <= 0) {
    createPlanError.value = 'Select a degree program.'
    return
  }
  const selected = degreeCatalog.value.find((d) => d.id === id)
  if (!selected || selected.catalogYear !== selectedCatalogYear.value) {
    createPlanError.value = 'Select a degree program available for that calendar year.'
    return
  }
  const specializationId = Number(selectedSpecializationId.value)
  if (selected.specializations.length && !selected.specializations.some((spec) => spec.id === specializationId)) {
    createPlanError.value = 'Select a concentration for this program.'
    return
  }
  createPlanPending.value = true
  createPlanError.value = null
  try {
    await $fetch('/api/student-degree-plans/create', {
      method: 'POST',
      body: {
        degreeId: id,
        ...(selected.specializations.length ? { specializationId } : {}),
      },
    })
    createModalOpen.value = false
    selectedCatalogYear.value = ''
    selectedDegreeId.value = ''
    selectedSpecializationId.value = ''
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

const visibleTermOptions = buildClassSearchTermOptions()
const visibleTermValues = new Set(visibleTermOptions.map((term) => term.value))
const courseSearchTerm = ref<string>('')
const courseSearchQuery = ref<string>('')
const courseSearchPending = ref(false)
const courseSearchError = ref<string | null>(null)
const courseSearchResults = ref<ClassRow[]>([])
const editMode = ref<'regular' | 'other'>('regular')

const courseSearchTermCode = computed(() => {
  const term = courseSearchTerm.value.trim().toUpperCase()
  return visibleTermValues.has(term) ? term : null
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
  offeringCode: '',
  courseCode: '',
  courseTitle: '',
})
const selectedSearchFullClassId = ref<string | null>(null)

function onEditCourse(item: DegreeItem, ownerPlan: DegreePlan) {
  editingPlan.value = ownerPlan
  editingItem.value = item

  const r = (item.record ?? {}) as any

  editForm.value.term = (r.term ?? item.term ?? '') as string
  const applied = appliedElectiveHours(item.record)
  const hours = applied ?? r.hoursEarned ?? item.hoursEarned
  editForm.value.hoursEarned = hours != null && hours !== '' ? String(hours) : ''
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

  const offeringCode = r?.offeringCode ?? r?.completedCourseCode ?? r?.offeringFullClassId ?? r?.enteredCourseCode ?? ''
  editForm.value.offeringCode = typeof offeringCode === 'string' ? offeringCode : ''
  editForm.value.courseCode = typeof r?.enteredCourseCode === 'string' ? r.enteredCourseCode : ''
  editForm.value.courseTitle = typeof r?.enteredCourseTitle === 'string' ? r.enteredCourseTitle : ''
  selectedSearchFullClassId.value = editForm.value.offeringCode || null

  editMode.value = 'regular'
  courseSearchTerm.value = ''
  const seedSource =
    (typeof r?.offeringFullClassId === 'string' && r.offeringFullClassId) ||
    (typeof r?.offeringCode === 'string' && r.offeringCode) ||
    (typeof r?.enteredCourseCode === 'string' && r.enteredCourseCode) ||
    item.course?.code ||
    item.code ||
    ''
  const seed = courseSearchSeed(seedSource)
  courseSearchQuery.value = seed && !isElectivePlaceholderCode(seed) ? seed : ''
  courseSearchError.value = null
  courseSearchResults.value = []

  editError.value = null
  editSlideoverOpen.value = true
}

async function runCourseSearch() {
  if (!courseSearchTermCode.value || !courseSearchQuery.value.trim()) {
    courseSearchError.value = 'Select a semester and enter a search term.'
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
  editForm.value.courseCode = c.short_name || c.full_class_id || ''
  editForm.value.courseTitle = c.short_description || ''
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

async function onRemoveCourse(item: DegreeItem, ownerPlan: DegreePlan) {
  const recordId = item.record?.id
  if (recordId == null) return
  const label = item.code || item.title || item.label || 'this course'
  if (!window.confirm(`Remove ${label} from this elective section?`)) return
  editError.value = null
  try {
    await $fetch(`/api/student-course-records/${encodeURIComponent(String(recordId))}`, { method: 'DELETE' })
    if (editingItem.value?.record?.id === recordId) cancelEditCourse()
    await refreshPlan()
  } catch (err: any) {
    console.error('Failed to remove course record', err)
    editError.value = err?.data?.message || err?.message || 'Failed to remove course.'
    editingPlan.value = ownerPlan
    editingItem.value = item
    editSlideoverOpen.value = true
  }
}

async function removeEditingCourse() {
  if (!editingItem.value || !editingPlan.value) return
  await onRemoveCourse(editingItem.value, editingPlan.value)
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

  if (item.electiveLine && !form.courseCode.trim() && !form.offeringCode.trim()) {
    editError.value = 'Enter a course code, or look up a class offering.'
    return
  }
  if (item.electiveLine && !(Number(form.hoursEarned) > 0)) {
    editError.value = 'Enter the hours for this course.'
    return
  }

  const courseId = item.electiveLine
    ? item.record?.courseId ?? (item.record as any)?.course?.id ?? null
    : (item.course as any)?.id ?? item.record?.courseId ?? (item.record as any)?.course?.id ?? null

  const body = {
    planId,
    degreeSectionItemId,
    recordId: item.electiveLine ? item.record?.id ?? undefined : undefined,
    courseId: courseId ?? undefined,
    offeringCode: form.offeringCode || undefined,
    enteredCourseCode: item.electiveLine ? form.courseCode || null : undefined,
    enteredCourseTitle: item.electiveLine ? form.courseTitle || null : undefined,
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
