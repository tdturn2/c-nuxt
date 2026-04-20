<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Degree Builder</h1>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canEditDegrees"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You don't have access to edit degrees. Access is limited to staff.
        </div>
        <template v-else>
          <div class="flex items-center gap-3 mb-4">
            <button
              type="button"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
              @click="createModalOpen = true"
            >
              Create degree
            </button>
          </div>

          <div v-if="degreesListPending" class="py-4 text-gray-500">Loading degrees...</div>
          <div v-else-if="degreesListError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-6">
            {{ degreesListError }}
          </div>
          <div v-else class="mb-6 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Catalog year</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="d in degreesList"
                  :key="d.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-4 py-3 text-sm text-gray-900">{{ d.id }}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    {{ d.name ?? d.title ?? '—' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ d.catalogYear ?? d.catalog_year ?? '—' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                      :disabled="bundlePending"
                      @click="loadBundleById(d.id)"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="degreesList.length === 0" class="px-4 py-6 text-sm text-gray-500">
              No degrees yet. Click Create degree to add one.
            </p>
          </div>
        </template>
      </div>
    </main>

    <!-- Degree edit slideover: table stays visible, edit in panel -->
    <USlideover
      v-model:open="degreeEditSlideoverOpen"
      :ui="{ content: 'max-w-2xl w-full', body: 'overflow-y-auto' }"
      @update:open="(v: boolean) => !v && onCloseDegreeEdit()"
    >
      <template #header>
        <div class="flex flex-col gap-0.5">
          <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Edit degree</p>
          <h2 v-if="bundle?.degree" class="text-base font-semibold text-gray-900 truncate">
            {{ bundle.degree.name ?? bundle.degree.title ?? `Degree #${selectedDegreeId}` }}
          </h2>
          <p v-if="bundlePending" class="text-sm text-gray-500">Loading…</p>
        </div>
      </template>
      <template #body>
        <div v-if="bundleError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-4">
          {{ bundleError }}
        </div>
        <div v-else-if="bundlePending" class="py-8 text-center text-gray-500">
          Loading degree…
        </div>
        <div v-else-if="bundle" class="space-y-6 pb-6">
          <!-- Degree header: editable -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 class="text-base font-semibold text-gray-900 mb-3">Degree details</h3>
            <div class="grid gap-3 sm:grid-cols-2 max-w-xl">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    v-model="degreeEdit.name"
                    type="text"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    placeholder="Degree name"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Catalog year</label>
                  <input
                    v-model="degreeEdit.catalogYear"
                    type="text"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                  :disabled="degreeSavePending"
                  @click="saveDegree"
                >
                  {{ degreeSavePending ? 'Saving…' : 'Save degree' }}
                </button>
              </div>
            </div>

            <!-- Specializations -->
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-base font-semibold text-gray-900">Specializations</h3>
                <button
                  type="button"
                  class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                  @click="openAddSpecializationModal()"
                >
                  Add specialization
                </button>
              </div>
              <ul v-if="specializations.length" class="space-y-2">
                <li
                  v-for="s in specializations"
                  :key="s.id"
                  class="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                >
                  <span>{{ s.name ?? s.title ?? `#${s.id}` }}</span>
                  <div class="flex gap-2">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="openEditSpecializationModal(s)">
                      Edit
                    </button>
                    <button type="button" class="text-red-600 hover:underline" @click="deleteSpecialization(s.id)">
                      Delete
                    </button>
                  </div>
                </li>
              </ul>
              <p v-else class="text-sm text-gray-500">No specializations. Add one to get started.</p>
            </div>

            <!-- Sections -->
            <div class="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 class="text-base font-semibold text-gray-900">Sections</h3>
                <button
                  type="button"
                  class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                  @click="openAddSectionModal()"
                >
                  Add section
                </button>
              </div>
              <div class="divide-y divide-gray-200">
                <div
                  v-for="(section, sectionIndex) in sections"
                  :key="section.id"
                  class="p-4 transition-colors"
                  :class="{ 'opacity-60': draggedSectionId === section.id, 'bg-[rgba(13,94,130,0.06)]': dropTargetSectionId === section.id }"
                  @dragover="onSectionDragOver($event, section)"
                  @dragleave="dropTargetSectionId = null"
                  @drop="onSectionDrop($event, section, sectionIndex)"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <span
                        class="shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
                        aria-label="Drag to reorder"
                        draggable="true"
                        @dragstart="onSectionDragStart($event, section, sectionIndex)"
                        @dragend="onSectionDragEnd"
                      >
                        <UIcon name="i-heroicons-bars-3-bottom-right" class="w-5 h-5" />
                      </span>
                      <span class="font-medium text-gray-900">{{ section.name ?? section.title ?? `Section #${section.id}` }}</span>
                      <span v-if="section.creditsRequired != null" class="ml-2 text-sm text-gray-500">
                        ({{ section.creditsRequired }} credits required)
                      </span>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" class="text-sm text-[rgba(13,94,130,1)] hover:underline" @click="openEditSectionModal(section)">
                        Edit
                      </button>
                      <button type="button" class="text-sm text-red-600 hover:underline" @click="deleteSection(section.id)">
                        Delete
                      </button>
                      <button type="button" class="text-sm text-[rgba(13,94,130,1)] hover:underline" @click="openAddItemModal(section)">
                        Add course
                      </button>
                    </div>
                  </div>
                  <div v-if="sectionItems(section).length" class="mt-3 overflow-x-auto">
                    <table class="min-w-full text-sm border border-gray-200 rounded-md">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="w-9 px-1 py-2" aria-label="Reorder" />
                          <th class="px-3 py-2 text-left font-semibold text-gray-700">Course</th>
                          <th class="px-3 py-2 text-left font-semibold text-gray-700">Title</th>
                          <th class="px-3 py-2 text-left font-semibold text-gray-700">Credits</th>
                          <th class="px-3 py-2 text-right font-semibold text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        <tr
                          v-for="(item, itemIndex) in sectionItems(section)"
                          :key="item.id"
                          class="bg-white transition-colors"
                          :class="{ 'opacity-60': draggedItemId === item.id, 'bg-[rgba(13,94,130,0.06)]': dropTargetItemId === item.id }"
                          @dragover.prevent.stop="onItemDragOver($event, item)"
                          @dragleave="dropTargetItemId = null"
                          @drop.prevent.stop="onItemDrop($event, section, itemIndex)"
                        >
                          <td class="w-9 px-1 py-2">
                            <span
                              class="inline-flex cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
                              aria-label="Drag to reorder"
                              draggable="true"
                              @dragstart="onItemDragStart($event, section, item, itemIndex)"
                              @dragend="onItemDragEnd"
                            >
                              <UIcon name="i-heroicons-bars-3-bottom-right" class="w-4 h-4" />
                            </span>
                          </td>
                          <td class="px-3 py-2 text-gray-900">{{ item.course?.code ?? item.code ?? '—' }}</td>
                          <td class="px-3 py-2 text-gray-700">{{ item.course?.title ?? item.label ?? item.title ?? '—' }}</td>
                          <td class="px-3 py-2 text-gray-600">{{ item.course?.credits ?? item.credits ?? '—' }}</td>
                          <td class="px-3 py-2 text-right">
                            <button type="button" class="text-red-600 hover:underline" @click="deleteSectionItem(item.id)">
                              Delete
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="mt-2 text-sm text-gray-500">No courses in this section. Click Add course.</p>
                </div>
              </div>
            </div>
        </div>
      </template>
    </USlideover>

    <!-- Create degree modal -->
    <UModal v-model:open="createModalOpen" :ui="{ content: 'max-w-md' }">
      <template #header>Create degree</template>
      <template #body>
        <div class="space-y-3 p-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="createForm.name"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Master of Divinity"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input
              v-model="createForm.code"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. MDIV"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Catalog year</label>
            <input
              v-model="createForm.catalogYear"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. 2025"
            />
          </div>
          <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            @click="createModalOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="createPending"
            @click="submitCreateDegree"
          >
            {{ createPending ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </template>
    </UModal>

    <!-- Add/Edit specialization modal -->
    <UModal v-model:open="specializationModalOpen" :ui="{ content: 'max-w-md' }">
      <template #header>{{ editingSpecialization ? 'Edit specialization' : 'Add specialization' }}</template>
      <template #body>
        <div class="space-y-3 p-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="specializationForm.name"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Specialization name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              v-model.number="specializationForm.order"
              type="number"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <p v-if="specializationError" class="text-sm text-red-600">{{ specializationError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" @click="specializationModalOpen = false">
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="specializationSavePending"
            @click="saveSpecialization"
          >
            {{ specializationSavePending ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </UModal>

    <!-- Add/Edit section modal -->
    <UModal v-model:open="sectionModalOpen" :ui="{ content: 'max-w-md' }">
      <template #header>{{ editingSection ? 'Edit section' : 'Add section' }}</template>
      <template #body>
        <div class="space-y-3 p-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="sectionForm.name"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Section name"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Credits required</label>
            <input
              v-model.number="sectionForm.creditsRequired"
              type="number"
              min="0"
              step="0.5"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Specialization (track)</label>
            <select
              v-model="sectionForm.specializationId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option :value="null">None (core section)</option>
              <option v-for="s in specializations" :key="s.id" :value="s.id">
                {{ s.name ?? s.title ?? `#${s.id}` }}
              </option>
            </select>
            <p class="mt-0.5 text-xs text-gray-500">Core sections: None. Elective sections: choose a track.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              v-model.number="sectionForm.order"
              type="number"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <p v-if="sectionError" class="text-sm text-red-600">{{ sectionError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" @click="sectionModalOpen = false">
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="sectionSavePending"
            @click="saveSection"
          >
            {{ sectionSavePending ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </UModal>

    <!-- Add/Edit section item modal -->
    <UModal v-model:open="itemModalOpen" :ui="{ content: 'max-w-md' }">
      <template #header>{{ editingItem ? 'Edit course' : 'Add course to section' }}</template>
      <template #body>
        <div class="space-y-3 p-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              v-model="itemForm.courseId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              :disabled="!!editingItem || coursesListPending"
            >
              <option :value="null">{{ coursesListPending ? 'Loading courses...' : 'Select course' }}</option>
              <option v-for="c in coursesList" :key="c.id" :value="c.id">
                {{ c.code }} – {{ c.title }} ({{ c.credits ?? '?' }} cr)
              </option>
            </select>
            <p v-if="coursesListError" class="mt-1 text-xs text-red-600">{{ coursesListError }}</p>
            <p
              v-else-if="!coursesListPending && !coursesList.length && !editingItem"
              class="mt-1 text-xs text-amber-700"
            >
              No courses found in catalog. Add one below.
            </p>
          </div>
          <div
            v-if="!editingItem && !coursesListPending && !coursesList.length"
            class="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2"
          >
            <p class="text-xs font-medium text-amber-800 uppercase tracking-wide">Create course in catalog</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <input
                v-model="newCourseForm.code"
                type="text"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Code (e.g. OT501)"
              />
              <input
                v-model="newCourseForm.credits"
                type="number"
                min="0"
                step="0.5"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Credits"
              />
            </div>
            <input
              v-model="newCourseForm.title"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Course title"
            />
            <div class="flex justify-end">
              <button
                type="button"
                class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                :disabled="newCoursePending"
                @click="createCourseAndSelect"
              >
                {{ newCoursePending ? 'Creating…' : 'Create course' }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              v-model.number="itemForm.order"
              type="number"
              min="0"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <p v-if="itemError" class="text-sm text-red-600">{{ itemError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50" @click="itemModalOpen = false">
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="itemSavePending"
            @click="saveSectionItem"
          >
            {{ itemSavePending ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface DegreeBundle {
  degree?: { id?: number; name?: string; title?: string; catalogYear?: string }
  specializations?: Array<{ id: number; name?: string; title?: string; order?: number }>
  sections?: Array<{
    id: number
    name?: string
    title?: string
    creditsRequired?: number
    order?: number
    items?: Array<{
      id: number
      code?: string
      label?: string
      title?: string
      credits?: number
      order?: number
      course?: { id: number; code: string; title: string; credits?: number }
    }>
  }>
}

interface CourseOption {
  id: number
  code: string
  title: string
  credits?: number
}

const selectedDegreeId = ref<number | null>(null)
const degreeEditSlideoverOpen = ref(false)
const bundle = ref<DegreeBundle | null>(null)
const bundleError = ref<string | null>(null)
const bundlePending = ref(false)

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-degrees-me',
})

const canEditDegrees = computed(() => {
  const user = me.value
  if (!user) return false
  const roles: string[] = Array.isArray(user.roles) ? user.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const {
  data: degreesData,
  pending: degreesListPending,
  error: degreesListErrorRef,
  execute: fetchDegreesList,
} = useFetch<{ docs?: any[] }>('/api/degrees', {
  key: 'dashboard-degrees-list',
  immediate: false,
})

watch(
  canEditDegrees,
  (allowed) => {
    if (allowed) fetchDegreesList()
  },
  { immediate: true }
)

const degreesList = computed(() => {
  const raw = degreesData.value
  if (!raw?.docs) return []
  return Array.isArray(raw.docs) ? raw.docs : []
})

const degreesListError = computed(() => {
  const e = degreesListErrorRef.value
  return e?.message ?? e?.statusMessage ?? (e ? 'Failed to load degrees' : null)
})

const specializations = computed(() => {
  const list = bundle.value?.specializations ?? []
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
})

const sections = computed(() => {
  const list = bundle.value?.sections ?? []
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
})

// Section drag-and-drop reorder
const draggedSectionId = ref<number | null>(null)
const dropTargetSectionId = ref<number | null>(null)
const draggedSectionIndex = ref<number>(0)

function onSectionDragStart(e: DragEvent, section: { id: number }, index: number) {
  draggedSectionId.value = section.id
  draggedSectionIndex.value = index
  e.dataTransfer?.setData('text/plain', String(section.id))
  e.dataTransfer!.effectAllowed = 'move'
}

function onSectionDragEnd() {
  draggedSectionId.value = null
  dropTargetSectionId.value = null
}

function onSectionDragOver(e: DragEvent, section: { id: number }) {
  if (draggedItemId.value != null) return
  e.preventDefault()
  if (draggedSectionId.value !== section.id) dropTargetSectionId.value = section.id
}

async function onSectionDrop(e: DragEvent, _targetSection: { id: number }, targetIndex: number) {
  if (draggedItemId.value != null) return
  e.preventDefault()
  const fromIndex = draggedSectionIndex.value
  const toIndex = targetIndex
  if (fromIndex === toIndex || !bundle.value?.sections) {
    dropTargetSectionId.value = null
    draggedSectionId.value = null
    return
  }
  const list = [...sections.value].filter(Boolean) as typeof sections.value
  const [moved] = list.splice(fromIndex, 1)
  if (!moved) return
  list.splice(toIndex, 0, moved)
  // Optimistic update: set order on each section and replace bundle sections so computed re-renders
  const reordered = list.map((s, i) => ({ ...s, order: i }))
  if (bundle.value.sections) {
    bundle.value.sections = reordered
  }
  dropTargetSectionId.value = null
  draggedSectionId.value = null
  // Persist new order
  try {
    await Promise.all(
      reordered.map((sec, i) =>
        $fetch(`/api/degree-sections/${sec.id}`, {
          method: 'PATCH',
          body: { order: i },
        })
      )
    )
  } catch (err) {
    console.error('Failed to update section order', err)
    if (selectedDegreeId.value != null) loadBundleById(selectedDegreeId.value)
  }
}

// Section item (class) drag-and-drop reorder
const draggedItemId = ref<number | null>(null)
const dropTargetItemId = ref<number | null>(null)
const draggedItemSection = ref<{ id: number; items?: any[] } | null>(null)
const draggedItemIndex = ref<number>(0)

function onItemDragStart(e: DragEvent, section: { id: number; items?: any[] }, item: { id: number }, index: number) {
  draggedItemId.value = item.id
  draggedItemSection.value = section
  draggedItemIndex.value = index
  e.dataTransfer?.setData('text/plain', `item-${item.id}`)
  e.dataTransfer!.effectAllowed = 'move'
}

function onItemDragEnd() {
  draggedItemId.value = null
  dropTargetItemId.value = null
  draggedItemSection.value = null
}

function onItemDragOver(e: DragEvent, item: { id: number }) {
  if (draggedItemId.value !== item.id && draggedItemSection.value) {
    dropTargetItemId.value = item.id
    e.dataTransfer!.dropEffect = 'move'
  }
}

async function onItemDrop(_e: DragEvent, section: { id: number; items?: any[] }, targetIndex: number) {
  if (!draggedItemSection.value || draggedItemSection.value.id !== section.id || !section.items) {
    dropTargetItemId.value = null
    draggedItemId.value = null
    draggedItemSection.value = null
    return
  }
  const fromIndex = draggedItemIndex.value
  if (fromIndex === targetIndex) {
    dropTargetItemId.value = null
    draggedItemId.value = null
    draggedItemSection.value = null
    return
  }
  const list = [...section.items].filter(Boolean)
  const [moved] = list.splice(fromIndex, 1)
  if (!moved) return
  list.splice(targetIndex, 0, moved)
  const reordered = list.map((it: any, i: number) => ({ ...it, order: i }))
  section.items = reordered
  dropTargetItemId.value = null
  draggedItemId.value = null
  draggedItemSection.value = null
  try {
    await Promise.all(
      reordered.map((it: { id: number }, i: number) =>
        $fetch(`/api/degree-section-items/${it.id}`, {
          method: 'PATCH',
          body: { order: i },
        })
      )
    )
  } catch (err) {
    console.error('Failed to update item order', err)
    if (selectedDegreeId.value != null) loadBundleById(selectedDegreeId.value)
  }
}

function sectionItems(section: { items?: any[] }) {
  const items = section.items ?? []
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// Create degree modal
const createModalOpen = ref(false)
const createForm = ref({ name: '', code: '', catalogYear: '' })
const createPending = ref(false)
const createError = ref<string | null>(null)

async function submitCreateDegree() {
  createError.value = null
  if (!createForm.value.name?.trim()) {
    createError.value = 'Name is required.'
    return
  }
  if (!createForm.value.code?.trim()) {
    createError.value = 'Code is required.'
    return
  }
  createPending.value = true
  try {
    const catalogYearRaw = createForm.value.catalogYear?.trim()
    const catalogYear = catalogYearRaw && /^\d+$/.test(catalogYearRaw) ? parseInt(catalogYearRaw, 10) : null
    const created = await $fetch<any>('/api/degrees/create', {
      method: 'POST',
      body: {
        name: createForm.value.name.trim(),
        code: createForm.value.code.trim(),
        catalogYear: catalogYear ?? undefined,
      },
    })
    createModalOpen.value = false
    createForm.value = { name: '', code: '', catalogYear: '' }
    await fetchDegreesList()
    if (created?.id) loadBundleById(created.id)
  } catch (err: any) {
    createError.value = err?.data?.message ?? err?.message ?? 'Failed to create degree.'
  } finally {
    createPending.value = false
  }
}

// Degree edit form (when bundle loaded)
const degreeEdit = ref({ name: '', catalogYear: '' })
const degreeSavePending = ref(false)

watch(
  () => bundle.value?.degree,
  (deg) => {
    if (deg) {
      degreeEdit.value = {
        name: (deg.name ?? deg.title ?? '').toString(),
        catalogYear: (deg.catalogYear ?? (deg as any).catalog_year ?? '').toString(),
      }
    }
  },
  { immediate: true }
)

async function saveDegree() {
  if (selectedDegreeId.value == null || !bundle.value?.degree) return
  degreeSavePending.value = true
  try {
    await $fetch(`/api/degrees/${selectedDegreeId.value}`, {
      method: 'PATCH',
      body: {
        name: degreeEdit.value.name || undefined,
        catalogYear: degreeEdit.value.catalogYear || undefined,
      },
    })
    if (bundle.value.degree) {
      bundle.value.degree = { ...bundle.value.degree, name: degreeEdit.value.name, catalogYear: degreeEdit.value.catalogYear }
    }
  } catch (err: any) {
    console.error('Save degree failed', err)
  } finally {
    degreeSavePending.value = false
  }
}

// Specializations
const specializationModalOpen = ref(false)
const editingSpecialization = ref<{ id: number; name?: string; title?: string; order?: number } | null>(null)
const specializationForm = ref({ name: '', order: 0 })
const specializationSavePending = ref(false)
const specializationError = ref<string | null>(null)

function openAddSpecializationModal() {
  editingSpecialization.value = null
  specializationForm.value = { name: '', order: specializations.value.length }
  specializationError.value = null
  specializationModalOpen.value = true
}

function openEditSpecializationModal(s: { id: number; name?: string; title?: string; order?: number }) {
  editingSpecialization.value = s
  specializationForm.value = {
    name: (s.name ?? s.title ?? '').toString(),
    order: s.order ?? 0,
  }
  specializationError.value = null
  specializationModalOpen.value = true
}

async function saveSpecialization() {
  specializationError.value = null
  if (!specializationForm.value.name?.trim()) {
    specializationError.value = 'Name is required.'
    return
  }
  if (selectedDegreeId.value == null) return
  specializationSavePending.value = true
  try {
    if (editingSpecialization.value) {
      await $fetch(`/api/specializations/${editingSpecialization.value.id}`, {
        method: 'PATCH',
        body: { name: specializationForm.value.name.trim(), order: specializationForm.value.order },
      })
    } else {
      await $fetch('/api/specializations', {
        method: 'POST',
        body: {
          degree: selectedDegreeId.value,
          name: specializationForm.value.name.trim(),
          order: specializationForm.value.order,
        },
      })
    }
    specializationModalOpen.value = false
    await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    specializationError.value = err?.data?.message ?? err?.message ?? 'Failed to save.'
  } finally {
    specializationSavePending.value = false
  }
}

async function deleteSpecialization(id: number) {
  if (!confirm('Delete this specialization?')) return
  try {
    await $fetch(`/api/specializations/${id}`, { method: 'DELETE' })
    if (selectedDegreeId.value != null) await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    console.error('Delete specialization failed', err)
  }
}

// Sections
const sectionModalOpen = ref(false)
const editingSection = ref<{ id: number; name?: string; title?: string; creditsRequired?: number; order?: number; specialization?: number | null } | null>(null)
const sectionForm = ref({ name: '', creditsRequired: null as number | null, order: 0, specializationId: null as number | null })
const sectionSavePending = ref(false)
const sectionError = ref<string | null>(null)

function openAddSectionModal() {
  editingSection.value = null
  sectionForm.value = { name: '', creditsRequired: null, order: sections.value.length, specializationId: null }
  sectionError.value = null
  sectionModalOpen.value = true
}

function openEditSectionModal(sec: { id: number; name?: string; title?: string; creditsRequired?: number; order?: number; specialization?: number | null }) {
  editingSection.value = sec
  const specId = sec.specialization ?? (sec as any).specializationId ?? null
  sectionForm.value = {
    name: (sec.name ?? sec.title ?? '').toString(),
    creditsRequired: sec.creditsRequired ?? null,
    order: sec.order ?? 0,
    specializationId: specId != null ? Number(specId) : null,
  }
  sectionError.value = null
  sectionModalOpen.value = true
}

async function saveSection() {
  sectionError.value = null
  if (!sectionForm.value.name?.trim()) {
    sectionError.value = 'Name is required.'
    return
  }
  if (selectedDegreeId.value == null) return
  sectionSavePending.value = true
  try {
    if (editingSection.value) {
      await $fetch(`/api/degree-sections/${editingSection.value.id}`, {
        method: 'PATCH',
        body: {
          name: sectionForm.value.name.trim(),
          creditsRequired: sectionForm.value.creditsRequired,
          order: sectionForm.value.order,
          specialization: sectionForm.value.specializationId,
        },
      })
    } else {
      await $fetch('/api/degree-sections/create', {
        method: 'POST',
        body: {
          degree: selectedDegreeId.value,
          name: sectionForm.value.name.trim(),
          creditsRequired: sectionForm.value.creditsRequired ?? undefined,
          order: sectionForm.value.order,
          specialization: sectionForm.value.specializationId ?? null,
        },
      })
    }
    sectionModalOpen.value = false
    await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    sectionError.value = err?.data?.message ?? err?.message ?? 'Failed to save.'
  } finally {
    sectionSavePending.value = false
  }
}

async function deleteSection(id: number) {
  if (!confirm('Delete this section and its courses?')) return
  try {
    await $fetch(`/api/degree-sections/${id}`, { method: 'DELETE' })
    if (selectedDegreeId.value != null) await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    console.error('Delete section failed', err)
  }
}

// Section items (courses)
const coursesList = ref<CourseOption[]>([])
const coursesListPending = ref(false)
const coursesListError = ref<string | null>(null)
const newCoursePending = ref(false)
const newCourseForm = ref<{ code: string; title: string; credits: string }>({
  code: '',
  title: '',
  credits: '',
})
const itemModalOpen = ref(false)
const itemSection = ref<{ id: number } | null>(null)
const editingItem = ref<{ id: number; course?: { id: number }; order?: number } | null>(null)
const itemForm = ref<{ courseId: number | null; order: number }>({ courseId: null, order: 0 })
const itemSavePending = ref(false)
const itemError = ref<string | null>(null)

async function loadCoursesList() {
  coursesListPending.value = true
  coursesListError.value = null
  try {
    const res = await $fetch<{ docs?: CourseOption[] }>('/api/courses/list')
    coursesList.value = res?.docs ?? []
  } catch (err: any) {
    coursesList.value = []
    coursesListError.value = err?.data?.message ?? err?.message ?? 'Failed to load courses.'
  } finally {
    coursesListPending.value = false
  }
}

async function createCourseAndSelect() {
  coursesListError.value = null
  const code = newCourseForm.value.code.trim().toUpperCase()
  const title = newCourseForm.value.title.trim()
  const creditsRaw = newCourseForm.value.credits.trim()
  const credits =
    creditsRaw === ''
      ? undefined
      : Number.isFinite(Number(creditsRaw))
        ? Number(creditsRaw)
        : NaN

  if (!code) {
    coursesListError.value = 'Course code is required.'
    return
  }
  if (!title) {
    coursesListError.value = 'Course title is required.'
    return
  }
  if (Number.isNaN(credits)) {
    coursesListError.value = 'Credits must be a valid number.'
    return
  }

  newCoursePending.value = true
  try {
    const created = await $fetch<any>('/api/courses', {
      method: 'POST',
      body: {
        code,
        title,
        credits,
      },
    })
    await loadCoursesList()
    const createdId = Number(created?.id)
    if (Number.isFinite(createdId)) {
      itemForm.value.courseId = createdId
    } else {
      const match = coursesList.value.find((c) => c.code?.toUpperCase() === code)
      if (match) itemForm.value.courseId = match.id
    }
    newCourseForm.value = { code: '', title: '', credits: '' }
  } catch (err: any) {
    coursesListError.value = err?.data?.message ?? err?.message ?? 'Failed to create course.'
  } finally {
    newCoursePending.value = false
  }
}

function openAddItemModal(section: { id: number; items?: any[] }) {
  itemSection.value = section
  editingItem.value = null
  const items = sectionItems(section)
  itemForm.value = { courseId: null, order: items.length }
  newCourseForm.value = { code: '', title: '', credits: '' }
  itemError.value = null
  itemModalOpen.value = true
  loadCoursesList()
}

function openEditItemModal(section: { id: number }, item: { id: number; course?: { id: number }; order?: number }) {
  itemSection.value = section
  editingItem.value = item
  itemForm.value = {
    courseId: item.course?.id ?? null,
    order: item.order ?? 0,
  }
  itemError.value = null
  itemModalOpen.value = true
  loadCoursesList()
}

async function saveSectionItem() {
  itemError.value = null
  if (!itemSection.value) return
  if (!editingItem.value && (itemForm.value.courseId == null || itemForm.value.courseId === 0)) {
    itemError.value = 'Select a course.'
    return
  }
  itemSavePending.value = true
  try {
    if (editingItem.value) {
      await $fetch(`/api/degree-section-items/${editingItem.value.id}`, {
        method: 'PATCH',
        body: { order: itemForm.value.order },
      })
    } else {
      const courseId = itemForm.value.courseId!
      const course = coursesList.value.find((c) => c.id === courseId)
      await $fetch('/api/degree-section-items/create', {
        method: 'POST',
        body: {
          degree: selectedDegreeId.value,
          section: itemSection.value.id,
          type: 'single',
          course: courseId,
          label: course?.title ?? '',
          credits: course?.credits ?? null,
          order: itemForm.value.order,
        },
      })
    }
    itemModalOpen.value = false
    if (selectedDegreeId.value != null) await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    itemError.value = err?.data?.message ?? err?.message ?? 'Failed to save.'
  } finally {
    itemSavePending.value = false
  }
}

async function deleteSectionItem(id: number) {
  if (!confirm('Remove this course from the section?')) return
  try {
    await $fetch(`/api/degree-section-items/${id}`, { method: 'DELETE' })
    if (selectedDegreeId.value != null) await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    console.error('Delete section item failed', err)
  }
}

function onCloseDegreeEdit() {
  selectedDegreeId.value = null
  bundle.value = null
  bundleError.value = null
}

function loadBundleById(id: number) {
  if (!id || !Number.isFinite(id)) return
  selectedDegreeId.value = id
  bundleError.value = null
  bundle.value = null
  bundlePending.value = true
  degreeEditSlideoverOpen.value = true
  $fetch<DegreeBundle>(`/api/degrees/${id}/bundle`)
    .then((data) => {
      bundle.value = data
    })
    .catch((err: any) => {
      bundleError.value =
        err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to load degree bundle.'
    })
    .finally(() => {
      bundlePending.value = false
    })
}
</script>
