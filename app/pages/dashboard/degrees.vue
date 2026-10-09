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
                          <button
                            type="button"
                            class="ml-3 text-sm font-medium text-red-700 hover:underline"
                            @click.stop="requestDeleteDegree(d)"
                          >
                            Delete
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
          <div v-if="selectedDegreeId != null && !bundlePending" class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              @click="requestDeleteOpenDegree"
            >
              Delete degree
            </button>
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              @click="openImportModal(selectedDegreeId)"
            >
              Import CSV
            </button>
          </div>
        </div>
      </template>
      <template #body>
        <div v-if="bundleError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-4">
          {{ bundleError }}
        </div>
        <div v-else-if="bundlePending" class="py-8 text-center text-gray-500">
          Loading degree…
        </div>
        <div v-else-if="bundle" ref="degreeEditorBody" class="space-y-6 pb-6">
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

            <!-- Concentrations (specializations) -->
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h3 class="text-base font-semibold text-gray-900">Concentrations</h3>
                  <p class="mt-0.5 text-xs text-gray-500">
                    Each concentration gets its own section group below for courses and electives.
                  </p>
                </div>
                <button
                  type="button"
                  class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                  @click="openAddSpecializationModal()"
                >
                  Add concentration
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
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click.stop="openAddSectionModal(s.id)">
                      Add section
                    </button>
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click.stop="openEditSpecializationModal(s)">
                      Edit
                    </button>
                    <button
                      type="button"
                      class="text-red-600 hover:underline"
                      @click.stop.prevent="requestDeleteSpecialization(s)"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              </ul>
              <p v-else class="text-sm text-gray-500">No concentrations yet. Add one to create a place for track-specific courses.</p>
            </div>

            <!-- Sections -->
            <div class="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div class="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 class="text-base font-semibold text-gray-900">Sections</h3>
                  <p class="mt-0.5 text-xs text-gray-500">Core sections apply to everyone. Concentration sections only apply to that track.</p>
                </div>
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
              <div>
                <p v-if="!sectionGroups.length" class="px-4 py-6 text-sm text-gray-500">
                  No sections yet. Add a core section, or add a concentration to create one automatically.
                </p>
                <p v-else-if="sections.length && !visibleSections.length" class="px-4 py-6 text-sm text-gray-500">
                  No sections or courses match this filter.
                </p>
                <template v-for="group in sectionGroups" :key="group.key">
                  <div class="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2">
                    <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {{ group.label }}
                      <span class="ml-1 font-normal normal-case text-gray-400">({{ group.sections.length }})</span>
                    </div>
                    <button
                      type="button"
                      class="text-xs font-medium text-[rgba(13,94,130,1)] hover:underline"
                      @click="openAddSectionModal(group.specializationId)"
                    >
                      Add section
                    </button>
                  </div>
                  <p v-if="!group.sections.length" class="border-t border-gray-100 px-4 py-4 text-sm text-gray-500">
                    No sections in this {{ group.specializationId == null ? 'core' : 'concentration' }} group yet.
                    <button
                      type="button"
                      class="ml-1 font-medium text-[rgba(13,94,130,1)] hover:underline"
                      @click="openAddSectionModal(group.specializationId)"
                    >
                      Add section
                    </button>
                  </p>
                <div
                  v-for="section in group.sections"
                  :key="section.id"
                  class="border-t border-gray-200 p-4 transition-colors"
                  :class="{ 'opacity-60': draggedSectionId === section.id, 'bg-[rgba(13,94,130,0.06)]': dropTargetSectionId === section.id }"
                  @dragover="onSectionDragOver($event, section)"
                  @dragleave="dropTargetSectionId = null"
                  @drop="onSectionDrop($event, section, sectionFlatIndex(section))"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <span
                        class="shrink-0 touch-none text-gray-400"
                        :class="editorFilterActive ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:text-gray-600 active:cursor-grabbing'"
                        aria-label="Drag to reorder"
                        :draggable="!editorFilterActive"
                        @dragstart="onSectionDragStart($event, section, sectionFlatIndex(section))"
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
                      <button type="button" class="text-sm text-[rgba(13,94,130,1)] hover:underline" @click.stop="openEditSectionModal(section)">
                        Edit
                      </button>
                      <button
                        type="button"
                        class="text-sm text-red-600 hover:underline"
                        @click.stop.prevent="requestDeleteSection(section)"
                      >
                        Delete
                      </button>
                      <button type="button" class="text-sm text-[rgba(13,94,130,1)] hover:underline" @click.stop="openAddItemModal(section)">
                        Add course
                      </button>
                    </div>
                  </div>
                  <p v-if="section.description" class="mt-2 whitespace-pre-line text-sm text-gray-600">{{ section.description }}</p>
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
                          <td class="px-3 py-2 text-gray-900">
                            <span v-if="item.course?.code || item.code">{{ item.course?.code ?? item.code }}</span>
                            <span
                              v-else-if="isCustomCourseItem(item)"
                              class="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                            >
                              Custom
                            </span>
                            <span v-else class="text-gray-400">—</span>
                          </td>
                          <td class="px-3 py-2 text-gray-700">{{ item.course?.title ?? item.label ?? item.description ?? item.title ?? '—' }}</td>
                          <td class="px-3 py-2 text-gray-600">{{ item.course?.credits ?? item.credits ?? '—' }}</td>
                          <td class="px-3 py-2 text-right space-x-2">
                            <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click.stop="openEditItemModal(section, item)">
                              Edit
                            </button>
                            <button
                              type="button"
                              class="text-red-600 hover:underline"
                              @click.stop.prevent="requestDeleteSectionItem(item)"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else-if="!section.description" class="mt-2 text-sm text-gray-500">No courses in this section. Click Add course.</p>
                </div>
                </template>
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
      <template #header>{{ editingSpecialization ? 'Edit concentration' : 'Add concentration' }}</template>
      <template #body>
        <div class="space-y-3 p-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="specializationForm.name"
              type="text"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. Pastoral Ministry"
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
          <p v-if="!editingSpecialization" class="text-xs text-gray-500">
            A section for this concentration will be created so you can add courses right away.
          </p>
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
    <UModal v-model:open="sectionModalOpen" :ui="{ content: 'max-w-xl' }">
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              v-model="sectionForm.description"
              rows="6"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="900 level courses&#10;The remaining 18 elective credit hours may include MC, MD, ME, MH courses, upon approval of the student’s mentor and ARP Dean through academic petition"
            />
            <p class="mt-0.5 text-xs text-gray-500">
              Use this when the section does not list specific courses. Line breaks are kept on the degree map.
            </p>
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Concentration</label>
            <select
              v-model="sectionForm.specializationId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option :value="null">None (core section)</option>
              <option v-for="s in specializations" :key="s.id" :value="s.id">
                {{ s.name ?? s.title ?? `#${s.id}` }}
              </option>
            </select>
            <p class="mt-0.5 text-xs text-gray-500">Core sections: None. Sections that change with a concentration, including that concentration’s electives, choose the concentration.</p>
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
    <UModal v-model:open="itemModalOpen" :ui="{ content: 'max-w-lg' }">
      <template #header>{{ editingItem ? 'Edit course' : 'Add course to section' }}</template>
      <template #body>
        <div class="space-y-3 p-2">
          <div class="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1">
            <button
              type="button"
              class="rounded px-3 py-1.5 text-sm font-medium"
              :class="itemKind === 'catalog' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="itemKind = 'catalog'"
            >
              Catalog course
            </button>
            <button
              type="button"
              class="rounded px-3 py-1.5 text-sm font-medium"
              :class="itemKind === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="itemKind = 'custom'"
            >
              Custom description
            </button>
          </div>

          <div v-if="itemKind === 'catalog'">
            <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <USelectMenu
              v-model="itemForm.courseId"
              :items="courseMenuItems"
              value-key="value"
              label-key="label"
              :filter-fields="['label', 'code', 'title']"
              color="neutral"
              variant="outline"
              class="w-full"
              placeholder="Search by code or title…"
              :search-input="{ placeholder: 'Search by code or title…' }"
              :disabled="coursesListPending"
              :virtualize="{ estimateSize: 36 }"
              clear
            >
              <template #empty="{ searchTerm }">
                <div class="px-2 py-2 text-sm text-gray-600">
                  <p>{{ searchTerm ? `No course matches “${searchTerm}”.` : 'No courses found.' }}</p>
                  <button
                    type="button"
                    class="mt-2 font-medium text-[rgba(13,94,130,1)] hover:underline"
                    @mousedown.prevent="startCustomDescription(searchTerm)"
                  >
                    {{ searchTerm ? `Use “${searchTerm}” as a custom description` : 'Use a custom description' }}
                  </button>
                </div>
              </template>
            </USelectMenu>
            <p v-if="coursesListError" class="mt-1 text-xs text-red-600">{{ coursesListError }}</p>
            <p v-else class="mt-1 text-xs text-gray-500">
              For a range or requirement that isn’t one course, switch to a custom description.
            </p>
          </div>

          <div v-else class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="itemForm.label"
                rows="3"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="e.g. Any course from OT501–OT520"
              />
              <p class="mt-1 text-xs text-gray-500">
                This line is not tied to a catalog course. Students see this text on the degree map.
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Credits</label>
              <input
                v-model="itemForm.credits"
                type="number"
                min="0"
                step="0.5"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="Optional"
              />
            </div>
          </div>

          <div
            v-if="itemKind === 'catalog' && !coursesListPending && !coursesList.length"
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

    <UModal v-model:open="deleteConfirmOpen" :ui="{ content: 'max-w-md' }">
      <template #header>{{ deleteConfirmTitle }}</template>
      <template #body>
        <p class="text-sm text-gray-700">{{ deleteConfirmMessage }}</p>
        <p v-if="deleteConfirmError" class="mt-3 text-sm text-red-600">{{ deleteConfirmError }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            :disabled="deleteConfirmPending"
            @click="deleteConfirmOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            :disabled="deleteConfirmPending"
            @click="runConfirmedDelete"
          >
            {{ deleteConfirmPending ? 'Deleting…' : 'Delete' }}
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
    description?: string | null
    order?: number
    items?: Array<{
      id: number
      type?: string
      code?: string
      label?: string
      description?: string | null
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

function sectionSearchText(section: { name?: string; title?: string; description?: string | null; items?: any[] }) {
  const items = sectionItems(section)
  const courseText = items
    .map((item) => `${item.course?.code ?? item.code ?? ''} ${item.course?.title ?? item.label ?? item.description ?? item.title ?? ''}`)
    .join(' ')
  return `${section.name ?? ''} ${section.title ?? ''} ${section.description ?? ''} ${courseText}`.toLowerCase()
}

const visibleSections = computed(() => {
  const q = editorQuery.value.trim().toLowerCase()
  if (!q) return sections.value
  return sections.value.filter((section) => sectionSearchText(section).includes(q))
})

function sectionSpecId(section: { specialization?: number | { id?: number } | null; specializationId?: number | null }) {
  const spec = section.specialization ?? section.specializationId ?? null
  if (spec && typeof spec === 'object') return spec.id ?? null
  return spec
}

function sectionFlatIndex(section: { id: number }) {
  return sections.value.findIndex((item) => item.id === section.id)
}

const sectionGroups = computed(() => {
  const core: typeof visibleSections.value = []
  const bySpec = new Map<number, typeof visibleSections.value>()
  for (const section of visibleSections.value) {
    const id = sectionSpecId(section)
    if (id == null) core.push(section)
    else {
      const list = bySpec.get(Number(id)) ?? []
      list.push(section)
      bySpec.set(Number(id), list)
    }
  }
  const groups: Array<{
    key: string
    label: string
    specializationId: number | null
    sections: typeof visibleSections.value
  }> = []
  // Always show Core so there is a place to add shared sections.
  groups.push({ key: 'core', label: 'Core', specializationId: null, sections: core })
  for (const spec of specializations.value) {
    const list = bySpec.get(spec.id) ?? []
    // Hide empty concentration groups while filtering, unless nothing matched at all.
    if (editorFilterActive.value && !list.length) continue
    groups.push({
      key: String(spec.id),
      label: spec.name ?? spec.title ?? 'Concentration',
      specializationId: spec.id,
      sections: list,
    })
  }
  return groups
})

function visibleSectionItems(section: { name?: string; title?: string; items?: any[] }) {
  const items = sectionItems(section)
  const q = editorQuery.value.trim().toLowerCase()
  if (!q) return items
  const sectionName = `${section.name ?? ''} ${section.title ?? ''}`.toLowerCase()
  if (sectionName.includes(q)) return items
  return items.filter((item) => {
    const text = `${item.course?.code ?? item.code ?? ''} ${item.course?.title ?? item.label ?? item.description ?? item.title ?? ''}`.toLowerCase()
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
    const name = specializationForm.value.name.trim()
    if (editingSpecialization.value) {
      await $fetch(`/api/specializations/${editingSpecialization.value.id}`, {
        method: 'PATCH',
        body: { name, order: specializationForm.value.order },
      })
    } else {
      const created = await $fetch<{ id?: number }>('/api/specializations', {
        method: 'POST',
        body: {
          degree: selectedDegreeId.value,
          name,
          order: specializationForm.value.order,
        },
      })
      const specializationId = Number(created?.id)
      if (Number.isFinite(specializationId)) {
        // Create a starting section under this concentration so courses can be added immediately.
        await $fetch('/api/degree-sections/create', {
          method: 'POST',
          body: {
            degree: selectedDegreeId.value,
            name,
            order: sections.value.length,
            specialization: specializationId,
          },
        })
      }
    }
    specializationModalOpen.value = false
    await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    specializationError.value = err?.data?.message ?? err?.message ?? 'Failed to save.'
  } finally {
    specializationSavePending.value = false
  }
}

const deleteConfirmOpen = ref(false)
const deleteConfirmPending = ref(false)
const deleteConfirmError = ref<string | null>(null)
const deleteConfirmTitle = ref('Delete')
const deleteConfirmMessage = ref('')
const pendingDelete = ref<
  | { kind: 'item'; id: number; label: string }
  | { kind: 'section'; id: number; label: string }
  | { kind: 'specialization'; id: number; label: string }
  | { kind: 'degree'; id: number; label: string }
  | null
>(null)

function openDeleteConfirm(
  target: NonNullable<typeof pendingDelete.value>,
  title: string,
  message: string,
) {
  pendingDelete.value = target
  deleteConfirmTitle.value = title
  deleteConfirmMessage.value = message
  deleteConfirmError.value = null
  deleteConfirmOpen.value = true
}

function requestDeleteSectionItem(item: {
  id: number
  course?: { code?: string; title?: string }
  code?: string
  label?: string
  description?: string | null
  title?: string
}) {
  const label =
    item.course?.code ||
    item.code ||
    item.course?.title ||
    item.label ||
    item.description ||
    item.title ||
    `course #${item.id}`
  openDeleteConfirm(
    { kind: 'item', id: Number(item.id), label: String(label) },
    'Remove course',
    `Remove “${label}” from this section?`,
  )
}

function requestDeleteSection(section: { id: number; name?: string; title?: string }) {
  const label = section.name ?? section.title ?? `section #${section.id}`
  openDeleteConfirm(
    { kind: 'section', id: Number(section.id), label: String(label) },
    'Delete section',
    `Delete “${label}” and its courses?`,
  )
}

function requestDeleteOpenDegree() {
  const degree = bundle.value?.degree
  const id = degree?.id ?? selectedDegreeId.value
  if (id == null) return
  requestDeleteDegree({
    id: Number(id),
    name: degree?.name ?? degree?.title,
    code: degree?.code,
    catalogYear: degree?.catalogYear,
  })
}

function requestDeleteDegree(degree: {
  id: number
  name?: string | null
  title?: string | null
  code?: string | null
  catalogYear?: string | number | null
}) {
  const label = degreeName(degree) || `Degree #${degree.id}`
  const year = catalogYearLabel(degree)
  const yearBit = year && year !== '—' ? ` (${year})` : ''
  openDeleteConfirm(
    { kind: 'degree', id: Number(degree.id), label },
    'Delete degree',
    `Delete “${label}”${yearBit}? This removes its sections, courses, and concentrations, and any student degree maps for this program.`,
  )
}

function requestDeleteSpecialization(spec: { id: number; name?: string; title?: string }) {
  const label = spec.name ?? spec.title ?? `concentration #${spec.id}`
  openDeleteConfirm(
    { kind: 'specialization', id: Number(spec.id), label: String(label) },
    'Delete concentration',
    `Delete concentration “${label}”? Sections linked to it will remain until you reassign or delete them.`,
  )
}

async function runConfirmedDelete() {
  const target = pendingDelete.value
  if (!target) return
  deleteConfirmPending.value = true
  deleteConfirmError.value = null
  try {
    if (target.kind === 'item') {
      await $fetch(`/api/degree-section-items/${target.id}`, { method: 'DELETE' })
      if (bundle.value?.sections) {
        for (const section of bundle.value.sections) {
          if (!Array.isArray(section.items)) continue
          section.items = section.items.filter((item: { id?: number }) => Number(item.id) !== target.id)
        }
      }
    } else if (target.kind === 'section') {
      await $fetch(`/api/degree-sections/${target.id}`, { method: 'DELETE' })
    } else if (target.kind === 'degree') {
      await $fetch(`/api/degrees/${target.id}`, { method: 'DELETE' })
      if (selectedDegreeId.value === target.id) {
        selectedDegreeId.value = null
        bundle.value = null
        degreeEditSlideoverOpen.value = false
      }
      deleteConfirmOpen.value = false
      pendingDelete.value = null
      await fetchDegreesList()
      return
    } else {
      await $fetch(`/api/specializations/${target.id}`, { method: 'DELETE' })
    }
    deleteConfirmOpen.value = false
    pendingDelete.value = null
    if (selectedDegreeId.value != null) await loadBundleById(selectedDegreeId.value)
  } catch (err: any) {
    console.error('Delete failed', err)
    deleteConfirmError.value =
      err?.data?.message ??
      err?.data?.error ??
      err?.statusMessage ??
      err?.message ??
      'Delete failed.'
  } finally {
    deleteConfirmPending.value = false
  }
}

// Sections
const sectionModalOpen = ref(false)
const editingSection = ref<{ id: number; name?: string; title?: string; creditsRequired?: number; description?: string | null; order?: number; specialization?: number | null } | null>(null)
const sectionForm = ref({ name: '', description: '', creditsRequired: null as number | null, order: 0, specializationId: null as number | null })
const sectionSavePending = ref(false)
const sectionError = ref<string | null>(null)

function openAddSectionModal(specializationId: number | null = null) {
  editingSection.value = null
  sectionForm.value = {
    name: '',
    description: '',
    creditsRequired: null,
    order: sections.value.length,
    specializationId,
  }
  sectionError.value = null
  sectionModalOpen.value = true
}

function openEditSectionModal(sec: { id: number; name?: string; title?: string; creditsRequired?: number; description?: string | null; order?: number; specialization?: number | null }) {
  editingSection.value = sec
  const specId = sec.specialization ?? (sec as any).specializationId ?? null
  sectionForm.value = {
    name: (sec.name ?? sec.title ?? '').toString(),
    description: (sec.description ?? '').toString(),
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
          description: sectionForm.value.description.trim(),
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
          description: sectionForm.value.description.trim(),
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

// Section items (courses)
const coursesList = ref<CourseOption[]>([])
const coursesListPending = ref(false)
const coursesListError = ref<string | null>(null)

const courseMenuItems = computed(() =>
  [...coursesList.value]
    .sort((a, b) =>
      String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { sensitivity: 'base', numeric: true })
    )
    .map((course) => ({
      value: course.id,
      label: `${course.code} – ${course.title}${course.credits != null ? ` (${course.credits} cr)` : ''}`,
      code: course.code,
      title: course.title,
    }))
)
const newCoursePending = ref(false)
const newCourseForm = ref<{ code: string; title: string; credits: string }>({
  code: '',
  title: '',
  credits: '',
})
const itemModalOpen = ref(false)
const itemSection = ref<{ id: number } | null>(null)
const itemKind = ref<'catalog' | 'custom'>('catalog')
const editingItem = ref<{ id: number; course?: { id: number }; order?: number } | null>(null)
const itemForm = ref<{ courseId: number | null; order: number; label: string; credits: string }>({
  courseId: null,
  order: 0,
  label: '',
  credits: '',
})
const itemSavePending = ref(false)
const itemError = ref<string | null>(null)

function isCustomCourseItem(item: { type?: string; course?: { id?: number } | null; label?: string; description?: string | null }) {
  return item.type === 'other_course' || (!item.course?.id && Boolean(item.label || item.description))
}

function emptyItemForm(order = 0) {
  return { courseId: null as number | null, order, label: '', credits: '' }
}

function startCustomDescription(text?: string) {
  itemKind.value = 'custom'
  itemForm.value.courseId = null
  const next = text?.trim()
  if (next) itemForm.value.label = next
}

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
  itemKind.value = 'catalog'
  const items = sectionItems(section)
  itemForm.value = emptyItemForm(items.length)
  newCourseForm.value = { code: '', title: '', credits: '' }
  itemError.value = null
  itemModalOpen.value = true
  loadCoursesList()
}

function openEditItemModal(
  section: { id: number },
  item: {
    id: number
    type?: string
    label?: string
    description?: string | null
    credits?: number | null
    order?: number
    course?: { id: number }
  }
) {
  itemSection.value = section
  editingItem.value = item
  itemKind.value = isCustomCourseItem(item) ? 'custom' : 'catalog'
  itemForm.value = {
    courseId: item.course?.id ?? null,
    order: item.order ?? 0,
    label: String(item.label ?? item.description ?? ''),
    credits: item.credits != null ? String(item.credits) : '',
  }
  itemError.value = null
  itemModalOpen.value = true
  loadCoursesList()
}

function parseItemCredits(raw: unknown): number | null | undefined {
  if (raw == null || raw === '') return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  const credits = Number(trimmed)
  return Number.isFinite(credits) ? credits : undefined
}

async function saveSectionItem() {
  itemError.value = null
  if (!itemSection.value) return

  const custom = itemKind.value === 'custom'
  const label = String(itemForm.value.label ?? '').trim()
  const credits = custom ? parseItemCredits(itemForm.value.credits) : null
  if (custom) {
    if (!label) {
      itemError.value = 'Enter a description.'
      return
    }
    if (credits === undefined) {
      itemError.value = 'Credits must be a number.'
      return
    }
  } else if (itemForm.value.courseId == null || itemForm.value.courseId === 0) {
    itemError.value = 'Select a course.'
    return
  }

  itemSavePending.value = true
  try {
    if (custom) {
      const body = {
        type: 'other_course',
        course: null,
        label,
        description: label,
        credits,
        order: itemForm.value.order,
      }
      if (editingItem.value) {
        await $fetch(`/api/degree-section-items/${editingItem.value.id}`, {
          method: 'PATCH',
          body,
        })
      } else {
        await $fetch('/api/degree-section-items/create', {
          method: 'POST',
          body: {
            degree: selectedDegreeId.value,
            section: itemSection.value.id,
            ...body,
          },
        })
      }
    } else if (editingItem.value) {
      const courseId = itemForm.value.courseId!
      const course = coursesList.value.find((c) => c.id === courseId)
      await $fetch(`/api/degree-section-items/${editingItem.value.id}`, {
        method: 'PATCH',
        body: {
          type: 'single',
          course: courseId,
          label: course?.title ?? '',
          description: null,
          credits: course?.credits ?? null,
          order: itemForm.value.order,
        },
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

function onCloseDegreeEdit() {
  selectedDegreeId.value = null
  bundle.value = null
  bundleError.value = null
  editorQuery.value = ''
}

const degreeEditorBody = ref<HTMLElement | null>(null)

function editorScroller() {
  const node = degreeEditorBody.value
  if (!node) return null
  return (node.closest('[data-slot="body"]') as HTMLElement | null) ?? node.parentElement
}

function restoreEditorScroll(scrollTop: number) {
  const apply = () => {
    const el = editorScroller()
    if (el) el.scrollTop = scrollTop
  }
  nextTick(() => {
    apply()
    requestAnimationFrame(apply)
    window.setTimeout(apply, 0)
    window.setTimeout(apply, 50)
    window.setTimeout(apply, 200)
  })
}

function loadBundleById(id: number) {
  if (!id || !Number.isFinite(id)) return
  const keepPlace =
    degreeEditSlideoverOpen.value &&
    selectedDegreeId.value === id &&
    bundle.value != null
  const scrollTop = keepPlace ? (editorScroller()?.scrollTop ?? 0) : 0
  selectedDegreeId.value = id
  bundleError.value = null
  if (!keepPlace) {
    bundle.value = null
    bundlePending.value = true
    editorQuery.value = ''
    degreeSaveError.value = null
  }
  degreeEditSlideoverOpen.value = true
  $fetch<DegreeBundle>(`/api/degrees/${id}/bundle`)
    .then((data) => {
      bundle.value = data
      if (keepPlace) restoreEditorScroll(scrollTop)
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
