<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Degree Builder</h1>
          <p class="mt-1 text-sm text-gray-600">
            Manage degree maps by catalog year. Newest years are listed first.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canEditDegrees"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You don't have access to edit degrees. Access is limited to Connect admins.
        </div>
        <template v-else>
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search name, code, or year…"
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                size="sm"
                class="w-full sm:w-72"
              />
              <select
                v-model="sortKey"
                aria-label="Sort degrees"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              >
                <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
                @click="createModalOpen = true"
              >
                Create degree
              </button>
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                @click="openImportModal()"
              >
                Import CSV
              </button>
            </div>
          </div>

          <div v-if="catalogYearOptions.length" class="mb-4 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="yearFilter === '' ? 'bg-[rgba(13,94,130,1)] text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
              @click="yearFilter = ''"
            >
              All years
            </button>
            <button
              v-for="year in catalogYearOptions"
              :key="year"
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="yearFilter === String(year) ? 'bg-[rgba(13,94,130,1)] text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
              @click="yearFilter = yearFilter === String(year) ? '' : String(year)"
            >
              {{ year }}
            </button>
          </div>

          <div v-if="degreesListPending" class="py-4 text-gray-500">Loading degrees...</div>
          <div v-else-if="degreesListError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-6">
            {{ degreesListError }}
          </div>
          <div v-else class="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
              <p>
                <span class="font-semibold text-gray-900">{{ filteredDegrees.length }}</span>
                <span v-if="filteredDegrees.length !== degreesList.length"> of {{ degreesList.length }}</span>
                {{ filteredDegrees.length === 1 ? 'degree' : 'degrees' }}
              </p>
              <button
                v-if="hasActiveFilters"
                type="button"
                class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                @click="clearDegreeFilters"
              >
                Clear search
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-white">
                  <tr class="border-b border-gray-200">
                    <th class="px-4 py-2 text-left">
                      <button type="button" class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-700 hover:text-gray-900" @click="toggleSort('name')">
                        Name
                        <UIcon v-if="sortKey.startsWith('name')" :name="sortKey === 'name-asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th class="px-4 py-2 text-left">
                      <button type="button" class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-700 hover:text-gray-900" @click="toggleSort('code')">
                        Code
                        <UIcon v-if="sortKey.startsWith('code')" :name="sortKey === 'code-asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th class="px-4 py-2 text-left">
                      <button type="button" class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-700 hover:text-gray-900" @click="toggleSort('year')">
                        Catalog year
                        <UIcon v-if="sortKey.startsWith('year')" :name="sortKey === 'year-asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th class="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="degreesList.length === 0">
                    <td colspan="4" class="px-4 py-8 text-sm text-gray-500">
                      No degrees yet. Click Create degree to add one.
                    </td>
                  </tr>
                  <tr v-else-if="filteredDegrees.length === 0">
                    <td colspan="4" class="px-4 py-8 text-sm text-gray-500">
                      No degrees match this search.
                      <button type="button" class="ml-1 font-medium text-[rgba(13,94,130,1)] hover:underline" @click="clearDegreeFilters">
                        Clear search
                      </button>
                    </td>
                  </tr>
                  <template v-for="group in degreeGroups" :key="group.key">
                    <tr v-if="groupsByYear" class="bg-gray-50">
                      <td colspan="4" class="px-2 py-1.5">
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-gray-100"
                          @click="toggleYearGroup(group.key)"
                        >
                          <UIcon
                            :name="isYearCollapsed(group.key) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                            class="h-4 w-4 text-gray-500"
                          />
                          <span class="text-sm font-semibold text-gray-900">{{ group.label }}</span>
                          <span class="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                            {{ group.degrees.length }}
                          </span>
                        </button>
                      </td>
                    </tr>
                    <template v-if="!groupsByYear || !isYearCollapsed(group.key)">
                      <tr
                        v-for="d in group.degrees"
                        :key="d.id"
                        class="cursor-pointer border-t border-gray-200"
                        :class="selectedDegreeId === d.id ? 'bg-[rgba(13,94,130,0.08)]' : 'hover:bg-gray-50'"
                        @click="loadBundleById(d.id)"
                      >
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">
                          {{ degreeName(d) || '—' }}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-700">
                          <span v-if="degreeCode(d)" class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                            {{ degreeCode(d) }}
                          </span>
                          <span v-else class="text-gray-400">—</span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600">
                          {{ catalogYearLabel(d) }}
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button
                            type="button"
                            class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                            :disabled="bundlePending && selectedDegreeId === d.id"
                            @click.stop="loadBundleById(d.id)"
                          >
                            {{ bundlePending && selectedDegreeId === d.id ? 'Opening…' : 'Edit' }}
                          </button>
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- Degree edit slideover: table stays visible, edit in panel -->
    <USlideover
      v-model:open="degreeEditSlideoverOpen"
      :ui="{ content: 'max-w-4xl w-full', body: 'overflow-y-auto' }"
      @update:open="(v: boolean) => !v && onCloseDegreeEdit()"
    >
      <template #header>
        <div class="flex items-start justify-between gap-3 w-full">
          <div class="flex flex-col gap-0.5 min-w-0">
            <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">Edit degree</p>
            <h2 v-if="bundle?.degree" class="text-base font-semibold text-gray-900 truncate">
              {{ bundle.degree.name ?? bundle.degree.title ?? `Degree #${selectedDegreeId}` }}
            </h2>
            <p v-if="bundle?.degree && (bundle.degree.code || bundle.degree.catalogYear)" class="truncate text-sm text-gray-500">
              <span v-if="bundle.degree.code">{{ bundle.degree.code }}</span>
              <span v-if="bundle.degree.code && bundle.degree.catalogYear"> · </span>
              <span v-if="bundle.degree.catalogYear">{{ bundle.degree.catalogYear }}</span>
            </p>
            <p v-if="bundlePending" class="text-sm text-gray-500">Loading…</p>
          </div>
          <button
            v-if="selectedDegreeId != null && !bundlePending"
            type="button"
            class="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            @click="openImportModal(selectedDegreeId)"
          >
            Import CSV
          </button>
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
            <div class="grid gap-3 sm:grid-cols-3">
                <div class="sm:col-span-3">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    v-model="degreeEdit.name"
                    type="text"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    placeholder="Degree name"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    v-model="degreeEdit.code"
                    type="text"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    placeholder="e.g. MDIV"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Catalog year</label>
                  <input
                    v-model="degreeEdit.catalogYear"
                    type="text"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    placeholder="e.g. 2026"
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
              <p v-if="degreeSaveError" class="mt-2 text-sm text-red-600">{{ degreeSaveError }}</p>
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
              <div class="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 class="text-base font-semibold text-gray-900">Sections</h3>
                <div class="flex flex-wrap items-center gap-2">
                  <UInput
                    v-model="editorQuery"
                    type="search"
                    placeholder="Filter sections or courses…"
                    icon="i-lucide-search"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="w-56"
                  />
                  <button
                    type="button"
                    class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                    @click="openAddSectionModal()"
                  >
                    Add section
                  </button>
                </div>
              </div>
              <p v-if="editorFilterActive" class="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                Showing matches only. Clear the filter to drag and reorder.
              </p>
              <div class="divide-y divide-gray-200">
                <p v-if="sections.length && !visibleSections.length" class="px-4 py-6 text-sm text-gray-500">
                  No sections or courses match this filter.
                </p>
                <div
                  v-for="(section, sectionIndex) in visibleSections"
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
                        class="shrink-0 touch-none text-gray-400"
                        :class="editorFilterActive ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:text-gray-600 active:cursor-grabbing'"
                        aria-label="Drag to reorder"
                        :draggable="!editorFilterActive"
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
                          v-for="(item, itemIndex) in visibleSectionItems(section)"
                          :key="item.id"
                          class="bg-white transition-colors"
                          :class="{ 'opacity-60': draggedItemId === item.id, 'bg-[rgba(13,94,130,0.06)]': dropTargetItemId === item.id }"
                          @dragover.prevent.stop="onItemDragOver($event, item)"
                          @dragleave="dropTargetItemId = null"
                          @drop.prevent.stop="onItemDrop($event, section, itemIndex)"
                        >
                          <td class="w-9 px-1 py-2">
                            <span
                              class="inline-flex touch-none text-gray-400"
                              :class="editorFilterActive ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:text-gray-600 active:cursor-grabbing'"
                              aria-label="Drag to reorder"
                              :draggable="!editorFilterActive"
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
            <input
              v-if="!editingItem"
              v-model="courseSearch"
              type="search"
              class="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              placeholder="Search by code or title…"
              :disabled="coursesListPending"
            />
            <select
              v-model="itemForm.courseId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              :disabled="!!editingItem || coursesListPending"
            >
              <option :value="null">{{ coursesListPending ? 'Loading courses...' : courseSelectPlaceholder }}</option>
              <option v-for="c in filteredCourses" :key="c.id" :value="c.id">
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

    <!-- Import degree map CSV -->
    <UModal v-model:open="importModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #header>Import degree map (CSV)</template>
      <template #body>
        <div class="space-y-4 p-1 text-sm text-gray-700">
          <p>
            One row per course. Rows with the same <code class="text-xs bg-gray-100 px-1 rounded">section_name</code>
            are grouped into one section. Download the template for column names.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              @click="downloadTemplate"
            >
              Download template
            </button>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Degree</label>
            <select
              v-model.number="importDegreeId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              :disabled="importPending"
            >
              <option :value="null" disabled>Select a degree…</option>
              <option v-for="d in degreesByLatestYear" :key="d.id" :value="d.id">
                {{ degreeOptionLabel(d) }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              class="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700"
              :disabled="importPending"
              @change="onImportFileChange"
            >
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input v-model="importCreateMissingCourses" type="checkbox" class="rounded border-gray-300" :disabled="importPending">
            Create missing courses when <code class="text-xs bg-gray-100 px-1 rounded">course_code</code> is not in the catalog
          </label>
          <div v-if="importParseErrors.length" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p class="font-medium mb-1">CSV errors</p>
            <ul class="list-disc pl-5 space-y-0.5">
              <li v-for="(msg, i) in importParseErrors" :key="i">{{ msg }}</li>
            </ul>
          </div>
          <div v-else-if="importPreviewRows.length" class="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <p class="font-medium text-gray-900">{{ importPreviewRows.length }} course row(s) ready to import</p>
            <p class="mt-1 text-gray-600">{{ importPreviewSectionCount }} section(s)</p>
          </div>
          <div v-if="importResult" class="rounded-md border border-gray-200 bg-white p-3 text-sm space-y-1">
            <p class="font-medium text-gray-900">Import complete</p>
            <p>Sections created: {{ importResult.sectionsCreated }} · updated: {{ importResult.sectionsUpdated }}</p>
            <p>Courses added: {{ importResult.itemsCreated }} · skipped (duplicate): {{ importResult.itemsSkipped }}</p>
            <p v-if="importResult.coursesCreated">New catalog courses: {{ importResult.coursesCreated }}</p>
            <ul v-if="importResult.warnings?.length" class="mt-2 list-disc pl-5 text-amber-800">
              <li v-for="(w, i) in importResult.warnings" :key="`w-${i}`">{{ w }}</li>
            </ul>
            <ul v-if="importResult.errors?.length" class="mt-2 list-disc pl-5 text-red-700">
              <li v-for="(e, i) in importResult.errors" :key="`e-${i}`">{{ e }}</li>
            </ul>
          </div>
          <p v-if="importError" class="text-sm text-red-600">{{ importError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            :disabled="importPending"
            @click="importModalOpen = false"
          >
            Close
          </button>
          <button
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="importPending || !importDegreeId || !importPreviewRows.length || importParseErrors.length > 0"
            @click="runImport"
          >
            {{ importPending ? 'Importing…' : 'Import' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  catalogYearLabel,
  catalogYearNumber,
  compareDegrees,
  DEGREE_SORT_OPTIONS,
  degreeCode,
  degreeName,
  degreeOptionLabel,
  type DegreeListItem,
  type DegreeSortKey,
} from '@shared/degreeBuilderList'
import {
  downloadDegreeMapCsvTemplate,
  parseDegreeMapCsv,
  type DegreeMapCsvRow,
} from '@shared/degreeMapCsv'
const SORT_OPTIONS = DEGREE_SORT_OPTIONS

interface DegreeBundle {
  degree?: { id?: number; name?: string; title?: string; code?: string | null; catalogYear?: string | number | null }
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

const { mePending, canAccessSection } = useDashboardAccess()
const canEditDegrees = computed(() => canAccessSection('degrees'))

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

const degreesList = computed<DegreeListItem[]>(() => {
  const raw = degreesData.value
  if (!raw?.docs) return []
  return Array.isArray(raw.docs) ? raw.docs : []
})

const searchQuery = ref('')
const yearFilter = ref('')
const sortKey = ref<DegreeSortKey>('year-desc')
const collapsedYearKeys = ref<string[]>([])

const catalogYearOptions = computed(() => {
  const years = new Set<number>()
  for (const degree of degreesList.value) {
    const year = catalogYearNumber(degree)
    if (year != null) years.add(year)
  }
  return [...years].sort((a, b) => b - a)
})

const hasActiveFilters = computed(() => searchQuery.value.trim().length > 0 || yearFilter.value !== '')

const filteredDegrees = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const year = yearFilter.value
  return degreesList.value
    .filter((degree) => {
      if (year && catalogYearLabel(degree) !== year) return false
      if (!q) return true
      const haystack = `${degreeName(degree)} ${degreeCode(degree)} ${catalogYearLabel(degree)} ${degree.displayLabel ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
    .sort((a, b) => compareDegrees(a, b, sortKey.value))
})

const degreesByLatestYear = computed(() =>
  [...degreesList.value].sort((a, b) => compareDegrees(a, b, 'year-desc'))
)

const groupsByYear = computed(() => sortKey.value === 'year-desc' || sortKey.value === 'year-asc')

const degreeGroups = computed(() => {
  const list = filteredDegrees.value
  if (!groupsByYear.value) {
    return [{ key: 'all', label: '', degrees: list }]
  }
  const groups: Array<{ key: string; label: string; degrees: DegreeListItem[] }> = []
  for (const degree of list) {
    const year = catalogYearNumber(degree)
    const key = year == null ? 'none' : String(year)
    const label = year == null ? 'No catalog year' : String(year)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.degrees.push(degree)
    else groups.push({ key, label, degrees: [degree] })
  }
  return groups
})

function isYearCollapsed(key: string) {
  return collapsedYearKeys.value.includes(key)
}

function toggleYearGroup(key: string) {
  collapsedYearKeys.value = isYearCollapsed(key)
    ? collapsedYearKeys.value.filter((item) => item !== key)
    : [...collapsedYearKeys.value, key]
}

function toggleSort(column: 'year' | 'name' | 'code') {
  const current = sortKey.value
  if (column === 'year') sortKey.value = current === 'year-desc' ? 'year-asc' : 'year-desc'
  else if (column === 'name') sortKey.value = current === 'name-asc' ? 'name-desc' : 'name-asc'
  else sortKey.value = current === 'code-asc' ? 'code-desc' : 'code-asc'
}

function clearDegreeFilters() {
  searchQuery.value = ''
  yearFilter.value = ''
}

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

const editorQuery = ref('')
const editorFilterActive = computed(() => editorQuery.value.trim().length > 0)

// Section drag-and-drop reorder
const draggedSectionId = ref<number | null>(null)
const dropTargetSectionId = ref<number | null>(null)
const draggedSectionIndex = ref<number>(0)

function onSectionDragStart(e: DragEvent, section: { id: number }, index: number) {
  if (editorFilterActive.value) {
    e.preventDefault()
    return
  }
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
  if (editorFilterActive.value || draggedItemId.value != null) return
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
  if (editorFilterActive.value) {
    e.preventDefault()
    return
  }
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
  if (editorFilterActive.value || !draggedItemSection.value || draggedItemSection.value.id !== section.id || !section.items) {
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
  const list = sectionItems(section)
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

function sectionSearchText(section: { name?: string; title?: string; items?: any[] }) {
  const items = sectionItems(section)
  const courseText = items
    .map((item) => `${item.course?.code ?? item.code ?? ''} ${item.course?.title ?? item.label ?? item.title ?? ''}`)
    .join(' ')
  return `${section.name ?? ''} ${section.title ?? ''} ${courseText}`.toLowerCase()
}

const visibleSections = computed(() => {
  const q = editorQuery.value.trim().toLowerCase()
  if (!q) return sections.value
  return sections.value.filter((section) => sectionSearchText(section).includes(q))
})

function visibleSectionItems(section: { name?: string; title?: string; items?: any[] }) {
  const items = sectionItems(section)
  const q = editorQuery.value.trim().toLowerCase()
  if (!q) return items
  const sectionName = `${section.name ?? ''} ${section.title ?? ''}`.toLowerCase()
  if (sectionName.includes(q)) return items
  return items.filter((item) => {
    const text = `${item.course?.code ?? item.code ?? ''} ${item.course?.title ?? item.label ?? item.title ?? ''}`.toLowerCase()
    return text.includes(q)
  })
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
const degreeEdit = ref({ name: '', code: '', catalogYear: '' })
const degreeSavePending = ref(false)
const degreeSaveError = ref<string | null>(null)

watch(
  () => bundle.value?.degree,
  (deg) => {
    if (deg) {
      degreeEdit.value = {
        name: (deg.name ?? deg.title ?? '').toString(),
        code: (deg.code ?? '').toString(),
        catalogYear: (deg.catalogYear ?? (deg as any).catalog_year ?? '').toString(),
      }
    }
  },
  { immediate: true }
)

async function saveDegree() {
  if (selectedDegreeId.value == null || !bundle.value?.degree) return
  degreeSavePending.value = true
  degreeSaveError.value = null
  try {
    await $fetch(`/api/degrees/${selectedDegreeId.value}`, {
      method: 'PATCH',
      body: {
        name: degreeEdit.value.name.trim(),
        code: degreeEdit.value.code.trim(),
        catalogYear: degreeEdit.value.catalogYear.trim(),
      },
    })
    if (bundle.value.degree) {
      bundle.value.degree = {
        ...bundle.value.degree,
        name: degreeEdit.value.name.trim(),
        code: degreeEdit.value.code.trim(),
        catalogYear: degreeEdit.value.catalogYear.trim(),
      }
    }
    await fetchDegreesList()
  } catch (err: any) {
    degreeSaveError.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to save degree.'
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
const courseSearch = ref('')

const filteredCourses = computed(() => {
  const list = [...coursesList.value].sort((a, b) =>
    String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { sensitivity: 'base', numeric: true })
  )
  const q = courseSearch.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((course) => `${course.code ?? ''} ${course.title ?? ''}`.toLowerCase().includes(q))
})

const courseSelectPlaceholder = computed(() => {
  if (!courseSearch.value.trim()) return 'Select course'
  if (!filteredCourses.value.length) return 'No matching courses'
  return `${filteredCourses.value.length} matching course${filteredCourses.value.length === 1 ? '' : 's'}`
})
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
  courseSearch.value = ''
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
  courseSearch.value = ''
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
  editorQuery.value = ''
}

function loadBundleById(id: number) {
  if (!id || !Number.isFinite(id)) return
  selectedDegreeId.value = id
  bundleError.value = null
  bundle.value = null
  bundlePending.value = true
  editorQuery.value = ''
  degreeSaveError.value = null
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

type DegreeMapImportSummary = {
  sectionsCreated: number
  sectionsUpdated: number
  itemsCreated: number
  itemsSkipped: number
  coursesCreated: number
  errors: string[]
  warnings: string[]
}

const importModalOpen = ref(false)
const importDegreeId = ref<number | null>(null)
const importCsvText = ref('')
const importPreviewRows = ref<DegreeMapCsvRow[]>([])
const importParseErrors = ref<string[]>([])
const importCreateMissingCourses = ref(false)
const importPending = ref(false)
const importError = ref<string | null>(null)
const importResult = ref<DegreeMapImportSummary | null>(null)

const importPreviewSectionCount = computed(() => {
  const names = new Set(importPreviewRows.value.map((r) => r.sectionName.trim().toLowerCase()))
  return names.size
})

function openImportModal(degreeId?: number | null) {
  importError.value = null
  importResult.value = null
  importCsvText.value = ''
  importPreviewRows.value = []
  importParseErrors.value = []
  importCreateMissingCourses.value = false
  importDegreeId.value =
    degreeId != null && Number.isFinite(degreeId)
      ? degreeId
      : selectedDegreeId.value != null
        ? selectedDegreeId.value
        : null
  importModalOpen.value = true
}

function downloadTemplate() {
  downloadDegreeMapCsvTemplate()
}

async function onImportFileChange(event: Event) {
  importError.value = null
  importResult.value = null
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    importPreviewRows.value = []
    importParseErrors.value = []
    importCsvText.value = ''
    return
  }
  const text = await file.text()
  importCsvText.value = text
  const parsed = parseDegreeMapCsv(text)
  importParseErrors.value = parsed.errors
  importPreviewRows.value = parsed.rows
}

async function runImport() {
  if (!importDegreeId.value || !importPreviewRows.value.length) return
  importPending.value = true
  importError.value = null
  importResult.value = null
  try {
    const res = await $fetch<{ summary?: DegreeMapImportSummary }>('/api/degrees/import-csv', {
      method: 'POST',
      body: {
        degreeId: importDegreeId.value,
        rows: importPreviewRows.value,
        createMissingCourses: importCreateMissingCourses.value,
      },
    })
    importResult.value = res?.summary ?? null
    await fetchDegreesList()
    if (selectedDegreeId.value === importDegreeId.value) {
      await loadBundleById(importDegreeId.value)
    }
  } catch (err: any) {
    const dataErrors = err?.data?.errors
    if (Array.isArray(dataErrors)) {
      importParseErrors.value = dataErrors.map(String)
    }
    importError.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Import failed.'
  } finally {
    importPending.value = false
  }
}
</script>
