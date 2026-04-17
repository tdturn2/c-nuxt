<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside
      class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80"
    >
      <LeftInternal />
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Docs / Pages</h1>
            <p class="text-sm text-gray-600 mt-1">Manage Payload “connect-pages” (title, slug, content).</p>
          </div>
          <button
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="!canManage"
            @click="openCreate()"
          >
            Create page
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access…</div>
        <div v-else-if="!canManage" class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
          You don't have access to manage pages. Access is limited to staff.
        </div>
        <template v-else>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <UInput
              v-model="search"
              type="search"
              placeholder="Search title / slug…"
              icon="i-lucide-search"
              color="neutral"
              variant="outline"
              size="sm"
              class="sm:max-w-sm"
            />
            <div class="flex flex-wrap items-center gap-2">
              <div
                class="inline-flex rounded-lg border border-gray-200 bg-gray-100/80 p-0.5"
                role="group"
                aria-label="Page list layout"
              >
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  :class="
                    pagesViewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  "
                  @click="pagesViewMode = 'list'"
                >
                  List
                </button>
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                  :class="
                    pagesViewMode === 'tree'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  "
                  @click="pagesViewMode = 'tree'"
                >
                  Tree
                </button>
              </div>
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                :disabled="pagesPending"
                @click="refreshPages()"
              >
                Refresh
              </button>
            </div>
          </div>

          <div v-if="pagesPending" class="py-4 text-gray-500">Loading pages…</div>
          <div v-else-if="pagesError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-6">
            {{ pagesError }}
          </div>
          <div v-else-if="pagesViewMode === 'list'" class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Slug</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Updated</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="p in filteredPages" :key="p.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-900">{{ p.id }}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    {{ pagePathLabelById.get(p.id) || p.title || '—' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">
                    <code class="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{{ p.slug || '—' }}</code>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">
                    {{ pageCategoryLabelById.get(p.id) || '—' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ formatDate(p.updatedAt) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                      @click="openEdit(p)"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="filteredPages.length === 0" class="px-4 py-6 text-sm text-gray-500">
              No pages match your search.
            </p>
          </div>
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase w-10">
                    <span class="sr-only">Expand or collapse branch</span>
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Slug</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Updated</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="row in visibleTreeRows" :key="row.page.id" class="hover:bg-gray-50">
                  <td class="px-2 py-3 align-middle text-center">
                    <button
                      v-if="row.childCount > 0"
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      :aria-expanded="!treeCollapsed[String(row.page.id)]"
                      :aria-label="treeCollapsed[String(row.page.id)] ? 'Expand children' : 'Collapse children'"
                      @click="toggleTreeBranch(String(row.page.id))"
                    >
                      <span class="text-[10px] leading-none select-none" aria-hidden="true">
                        {{ treeCollapsed[String(row.page.id)] ? '▶' : '▼' }}
                      </span>
                    </button>
                    <span v-else class="inline-block w-7" />
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900">{{ row.page.id }}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    <div class="flex items-center min-w-0" :style="{ paddingLeft: `${row.depth * 0.75}rem` }">
                      <span
                        v-if="row.depth > 0"
                        class="mr-1.5 shrink-0 text-gray-300 select-none"
                        aria-hidden="true"
                      >└</span>
                      <span class="truncate">{{ pagePathLabelById.get(row.page.id) || row.page.title || '—' }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">
                    <code class="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{{ row.page.slug || '—' }}</code>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-700">
                    {{ pageCategoryLabelById.get(row.page.id) || '—' }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">
                    {{ formatDate(row.page.updatedAt) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                      @click="openEdit(row.page)"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="visibleTreeRows.length === 0" class="px-4 py-6 text-sm text-gray-500">
              No pages match your search.
            </p>
          </div>
        </template>
      </div>
    </main>

    <USlideover
      v-model:open="editorOpen"
      :modal="false"
      :ui="{ content: 'max-w-3xl w-full', body: 'overflow-y-auto min-h-0' }"
      @update:open="(v) => !v && resetEditor()"
    >
      <template #header>
        <div class="flex flex-col gap-0.5">
          <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {{ editingId ? 'Edit page' : 'Create page' }}
          </p>
          <h2 class="text-base font-semibold text-gray-900 truncate">
            {{ form.title?.trim() || (editingId ? `Page #${editingId}` : 'New page') }}
          </h2>
          <div v-if="editingId && pagePathById.get(String(editingId))" class="mt-1">
            <NuxtLink
              class="text-xs font-medium text-[rgba(13,94,130,1)] hover:underline"
              :to="pagePathById.get(String(editingId))"
              target="_blank"
              rel="noopener noreferrer"
            >
              View live page
            </NuxtLink>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-4 pb-6">
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  v-model="form.title"
                  type="text"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  v-model="form.slug"
                  type="text"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                  placeholder="e.g. arp"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Parent page</label>
                <select
                  v-model="form.parentId"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                >
                  <option value="">None (top-level)</option>
                  <option
                    v-for="opt in parentPageOptions"
                    :key="opt.id"
                    :value="String(opt.id)"
                  >
                    {{ opt.title }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  v-model="form.sectionId"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)] disabled:bg-gray-100 disabled:text-gray-500"
                  :disabled="!!editingId"
                >
                  <option value="">Select section…</option>
                  <option v-for="opt in sectionOptions" :key="opt.id" :value="String(opt.id)">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="editingId" class="mt-1 text-xs text-gray-500">
                  Section cannot be changed here.
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  v-model="form.navCategory"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)] disabled:bg-gray-100 disabled:text-gray-500"
                  :disabled="!!form.parentId"
                >
                  <option value="">Select category…</option>
                  <option
                    v-for="opt in categoryOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="form.parentId" class="mt-1 text-xs text-gray-500">
                  Child pages inherit category from the top parent.
                </p>
              </div>
            </div>
          </div>

          <details class="rounded-lg border border-gray-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary
              class="cursor-pointer list-none px-4 py-3 rounded-lg hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1"
            >
              <span class="text-sm font-semibold text-gray-900">Contacts section</span>
              <p class="text-xs text-gray-500 mt-0.5">
                Optional. If you select contacts, they will appear on the live page.
              </p>
            </summary>
            <div class="border-t border-gray-100 px-4 pb-4 pt-3">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Contacts heading</label>
                <input
                  v-model="contactsHeading"
                  type="text"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                  placeholder="Defaults to “Contacts”"
                >
              </div>
            </div>

            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <div class="min-w-0">
                <label class="block text-sm font-medium text-gray-700 mb-1">Selected contacts (order matters)</label>
                <div v-if="selectedContacts.length === 0" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  No contacts selected.
                </div>
                <ul v-else class="space-y-2">
                  <li
                    v-for="(c, idx) in selectedContacts"
                    :key="String(c.id)"
                    class="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                  >
                    <div class="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
                      <img
                        v-if="c.avatar?.url"
                        :src="c.avatar.url"
                        :alt="c.name || 'Contact avatar'"
                        class="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      >
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-semibold text-gray-900 truncate">
                        {{ c.name || '—' }}
                      </div>
                      <div class="text-xs text-gray-600 truncate">
                        {{ c.employeeTitle || c.email || '—' }}
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        :disabled="idx === 0"
                        @click="moveContact(c.id, -1)"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        :disabled="idx === selectedContacts.length - 1"
                        @click="moveContact(c.id, 1)"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        class="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        @click="removeContact(c.id)"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                </ul>
              </div>

              <div class="min-w-0">
                <label class="block text-sm font-medium text-gray-700 mb-1">Add contacts</label>
                <UInput
                  v-model="contactSearch"
                  type="search"
                  placeholder="Search by name / email…"
                  icon="i-lucide-search"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />

                <div class="mt-2 rounded-md border border-gray-200 bg-white overflow-hidden">
                  <div v-if="employeesPending" class="px-3 py-3 text-sm text-gray-500">Loading employees…</div>
                  <div v-else-if="employeesError" class="px-3 py-3 text-sm text-red-700 bg-red-50">
                    {{ employeesError }}
                  </div>
                  <ul v-else class="divide-y divide-gray-200 max-h-72 overflow-auto">
                    <li
                      v-for="e in filteredEmployeeChoices"
                      :key="String(e.id)"
                      class="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50"
                    >
                      <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">{{ e.name || '—' }}</div>
                        <div class="text-xs text-gray-600 truncate">{{ e.employeeTitle || e.email || '—' }}</div>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 rounded-md bg-[rgba(13,94,130,1)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                        :disabled="selectedContactIdSet.has(String(e.id))"
                        @click="addContact(e.id)"
                      >
                        Add
                      </button>
                    </li>
                    <li v-if="filteredEmployeeChoices.length === 0" class="px-3 py-3 text-sm text-gray-500">
                      No matches.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            </div>
          </details>

          <details class="rounded-lg border border-gray-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary
              class="cursor-pointer list-none px-4 py-3 rounded-lg hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1"
            >
              <span class="text-sm font-semibold text-gray-900">Page media library</span>
              <p class="text-xs text-gray-500 mt-0.5">
                Upload PDFs and other files, then copy the URL to paste as a link in the content below.
              </p>
            </summary>
            <div class="border-t border-gray-100 px-4 pb-4 pt-3">
            <div class="grid gap-3 sm:grid-cols-2 mb-4">
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Display name (optional)</label>
                <input
                  v-model="assetUploadAlt"
                  type="text"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                  placeholder="Stored as alt in Payload; leave blank to use a name from the file"
                >
              </div>
              <div class="sm:col-span-2 relative z-10">
                <span class="block text-sm font-medium text-gray-700 mb-1">Upload file</span>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                  <input
                    :id="assetFileInputId"
                    ref="assetFileInputRef"
                    type="file"
                    class="sr-only"
                    accept="application/pdf,.pdf,image/*"
                    @change="onAssetFileInputChange"
                  >
                  <label
                    :for="assetFileInputId"
                    class="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 shrink-0"
                  >
                    Choose file…
                  </label>
                  <div
                    class="flex min-h-10 min-w-0 flex-1 items-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 text-sm text-gray-700"
                    aria-live="polite"
                  >
                    <span class="truncate">{{ selectedAssetFileLabel || 'No file selected' }}</span>
                  </div>
                </div>
                <p class="mt-1 text-xs text-gray-500">PDFs and images supported; other types allowed if Payload accepts them.</p>
              </div>
              <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                  :disabled="assetUploadPending"
                  @click="uploadPageAsset()"
                >
                  {{ assetUploadPending ? 'Uploading…' : 'Upload & copy URL' }}
                </button>
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  :disabled="mediaLibraryPending"
                  @click="refreshConnectPagesMedia()"
                >
                  Refresh list
                </button>
              </div>
              <div v-if="assetUploadError" class="sm:col-span-2 text-sm text-red-600">
                {{ assetUploadError }}
              </div>
              <div v-if="assetLibrarySuccess" class="sm:col-span-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                {{ assetLibrarySuccess }}
              </div>
            </div>

            <div class="mb-2">
              <UInput
                v-model="assetLibrarySearch"
                type="search"
                placeholder="Search by display name or filename…"
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                size="sm"
              />
            </div>

            <div class="rounded-md border border-gray-200 overflow-hidden">
              <div v-if="mediaLibraryPending" class="px-3 py-3 text-sm text-gray-500">Loading media…</div>
              <div v-else-if="mediaLibraryError" class="px-3 py-3 text-sm text-red-700 bg-red-50">
                {{ mediaLibraryError }}
              </div>
              <ul v-else class="divide-y divide-gray-200 max-h-64 overflow-auto">
                <li
                  v-for="a in filteredMediaAssets"
                  :key="String(a.id)"
                  class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-2 text-sm"
                  :class="String(a.id) === highlightedAssetId ? 'bg-[rgba(13,94,130,0.06)]' : 'hover:bg-gray-50'"
                >
                  <div class="min-w-0">
                    <div class="font-medium text-gray-900 truncate">{{ mediaDisplayName(a) }}</div>
                    <div v-if="mediaFilenameForDoc(a)" class="text-xs text-gray-500 truncate font-mono mt-0.5">
                      {{ mediaFilenameForDoc(a) }}
                    </div>
                    <div class="text-xs text-gray-400 truncate mt-0.5">
                      {{ formatDate(a.createdAt || a.updatedAt) }}
                    </div>
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-1.5">
                    <button
                      type="button"
                      class="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                      @click="copyAssetUrl(mediaUrlForDoc(a))"
                    >
                      Copy URL
                    </button>
                    <a
                      v-if="mediaUrlForDoc(a)"
                      :href="mediaUrlForDoc(a)!"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-[rgba(13,94,130,1)] hover:bg-gray-50"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      class="rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      :disabled="assetDeletePendingId === String(a.id)"
                      @click="deletePageAsset(a)"
                    >
                      {{ assetDeletePendingId === String(a.id) ? 'Deleting…' : 'Delete' }}
                    </button>
                  </div>
                </li>
                <li v-if="filteredMediaAssets.length === 0" class="px-3 py-3 text-sm text-gray-500">
                  No assets match your search.
                </li>
              </ul>
            </div>
            </div>
          </details>

          <!-- `open`: TipTap/ProseMirror must not mount inside a closed <details> (zero-size / no visible update). -->
          <details open class="rounded-lg border border-gray-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary
              class="cursor-pointer list-none px-4 py-3 rounded-lg hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1"
            >
              <span class="text-sm font-semibold text-gray-900">Content</span>
              <p class="text-xs text-gray-500 mt-0.5">
                Rich text for the live page.
              </p>
            </summary>
            <div class="border-t border-gray-100 px-4 pb-4 pt-3">
            <!-- v-if: @tiptap/vue-3 creates the editor in onMounted; if USlideover keeps this in DOM while closed, it was initializing with invalid/empty doc and never picking up loaded content. -->
            <UEditor
              ref="docsBodyUEditorRef"
              v-if="editorOpen"
              :key="`docs-ue-${editingId ?? 'new'}-${docsEditorMountKey}`"
              v-slot="{ editor }"
              v-model="docsBodyEditorModel"
              content-type="json"
              placeholder="Write page content…"
              class="w-full min-h-[220px]"
            >
              <UEditorToolbar
                :editor="editor"
                :items="editorToolbarItems"
                class="border-b border-gray-200 sticky top-0 inset-x-0 bg-white/95 backdrop-blur z-10 overflow-x-auto"
              />
              <UEditorDragHandle :editor="editor" />
            </UEditor>
            <div class="mt-3 space-y-2">
              <details class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <summary class="cursor-pointer text-xs font-semibold text-gray-700">Special blocks in content (videos, FAQ, forms)</summary>
                <p class="mt-2 text-xs text-gray-600 leading-relaxed">
                  FAQ and video lists are edited as <strong class="font-semibold text-gray-800">normal paragraph text</strong> (the <code class="text-[11px]">@connect-…</code> JSON) in this editor so they stay visible and editable after save.
                  The live site turns that line into accordions or video links — the dashboard is not WYSIWYG for that piece.
                  Pasting multi-line JSON may split across lines; on <strong class="font-semibold text-gray-800">Save</strong> it is merged so Payload stores valid JSON.
                  The array must be valid JSON (including the final <code class="text-[11px]">]</code>).
                  Optional <code class="text-[11px]">id</code> on FAQ items enables deep links (<code class="text-[11px]">/your/page#billing</code>).
                </p>
                <p class="mt-2 text-[11px] font-semibold text-gray-700">Video list</p>
                <pre class="mt-1 text-[11px] leading-snug overflow-auto max-h-32 whitespace-pre-wrap rounded border border-gray-200 bg-white p-2">@connect-videos [{"title":"Welcome","vimeoId":"123456789"}]</pre>
                <p class="mt-3 text-[11px] font-semibold text-gray-700">FAQ accordion</p>
                <pre class="mt-1 text-[11px] leading-snug overflow-auto max-h-40 whitespace-pre-wrap rounded border border-gray-200 bg-white p-2">@connect-faq [
  {
    "question": "Who can use this?",
    "answer": "Anyone with access.\n\nSecond paragraph if you use a blank line.",
    "id": "who"
  },
  {
    "question": "Where do I go for help?",
    "answer": "See the IT portal."
  }
]</pre>
                <p class="mt-3 text-[11px] font-semibold text-gray-700">Inline form embed</p>
                <pre class="mt-1 text-[11px] leading-snug overflow-auto max-h-24 whitespace-pre-wrap rounded border border-gray-200 bg-white p-2">@connect-form {"slug":"new-student-intake"}</pre>
              </details>
              <details class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <summary class="cursor-pointer text-xs font-semibold text-gray-700">Advanced: Lexical JSON</summary>
                <pre class="mt-2 text-[11px] leading-snug overflow-auto max-h-60 whitespace-pre-wrap">{{ lexicalJsonPretty }}</pre>
              </details>
            </div>
            </div>
          </details>

          <div class="flex items-center justify-between">
            <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
            <div class="flex gap-2 ml-auto">
              <button
                v-if="editingId"
                type="button"
                class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                :disabled="savePending"
                @click="deletePage()"
              >
                Delete
              </button>
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                :disabled="savePending"
                @click="editorOpen = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                :disabled="savePending"
                @click="savePage()"
              >
                {{ savePending ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { nextTick, unref, watch } from 'vue'
import { fetchAllConnectPages, getConnectPageBreadcrumbLabel } from '~/composables/useConnectPagesTree'
import { CONNECT_PAGE_CATEGORIES, type ConnectPageCategory } from '~/composables/useConnectPagesTree'
import { buildPagePathMap, buildPageTree } from '~/composables/useConnectPagesTree'
import { humanizeFilename } from '@shared/humanizeFilename'

const route = useRoute()
const router = useRouter()

type ConnectPage = {
  id: number
  title?: string | null
  slug?: string | null
  parent?: number | string | { id?: number | string } | null
  navCategory?: string | null
  content?: any
  contactsHeading?: string | null
  contacts?: any[] | null
  updatedAt?: string
  createdAt?: string
}

type TipTapNode = { type: string; [key: string]: any }

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-docs-me',
})

const canManage = computed(() => {
  const user = me.value
  if (!user) return false
  const roles: string[] = Array.isArray(user.roles) ? user.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const connectUserFetch = await useFetch<any>('/api/connect-users/me', {
  key: 'dashboard-docs-connect-user',
  immediate: false,
})

watch(canManage, (allowed) => {
  if (allowed) connectUserFetch.execute()
}, { immediate: true })

const connectUserDoc = computed(() => connectUserFetch.data.value?.doc ?? null)
const isConnectAdmin = computed(() => {
  const roles: string[] = [
    ...(Array.isArray(connectUserDoc.value?.roles) ? connectUserDoc.value.roles : []),
    ...(Array.isArray(connectUserDoc.value?.fields?.roles) ? connectUserDoc.value.fields.roles : []),
  ].filter((r): r is string => typeof r === 'string' && r.length > 0)
  return roles.includes('admin')
})

const sectionOptions = computed(() => {
  const editable = connectUserDoc.value?.editableSections ?? connectUserDoc.value?.fields?.editableSections
  const arr = Array.isArray(editable) ? editable : []
  return arr
    .map((s: any) => {
      const id = s?.id ?? s?.value ?? s
      const label = s?.title ?? s?.name ?? s?.label ?? String(id ?? '').trim()
      return { id, label }
    })
    .filter((o: any) => o.id != null && String(o.id).length > 0)
})

const search = ref('')

type EmployeeChoice = {
  id: number | string
  name?: string | null
  email?: string | null
  employeeTitle?: string | null
  phone?: string | null
  avatar?: { url: string } | null
}

const {
  data: employeesData,
  pending: employeesPending,
  error: employeesErrorRef,
  execute: refreshEmployees,
} = useFetch<any>('/api/employees', {
  key: 'dashboard-docs-employees',
  immediate: false,
})

watch(canManage, (allowed) => {
  if (allowed) refreshEmployees()
}, { immediate: true })

const employeesError = computed(() => {
  const e = employeesErrorRef.value as any
  return e?.message ?? e?.statusMessage ?? (e ? 'Failed to load employees' : null)
})

const employees = computed<EmployeeChoice[]>(() => {
  const arr = Array.isArray(employeesData.value?.employees) ? employeesData.value.employees : []
  return arr
})

const pagesData = ref<any>({ docs: [] })
const pagesPending = ref(false)
const pagesErrorRef = ref<any>(null)

const refreshPages = async () => {
  pagesPending.value = true
  pagesErrorRef.value = null
  try {
    pagesData.value = await fetchAllConnectPages({
      limit: 100,
      depth: 2,
      sort: '-updatedAt',
    })
  } catch (err) {
    pagesErrorRef.value = err
  } finally {
    pagesPending.value = false
  }
}

watch(canManage, (allowed) => {
  if (allowed) refreshPages()
}, { immediate: true })

const {
  data: connectPagesMediaData,
  pending: mediaLibraryPending,
  error: mediaLibraryErrorRef,
  execute: refreshConnectPagesMedia,
} = useFetch<any>('/api/connect-pages-media', {
  key: 'dashboard-docs-connect-pages-media',
  immediate: false,
  query: () => ({
    limit: 50,
    sort: '-createdAt',
    depth: 1,
  }),
})

const mediaLibraryError = computed(() => {
  const e = mediaLibraryErrorRef.value as any
  return e?.message ?? e?.statusMessage ?? (e ? 'Failed to load media library' : null)
})

function mediaDisplayName(a: any): string {
  const alt = a?.alt ?? a?.file?.alt
  if (typeof alt === 'string' && alt.trim()) return alt.trim()
  const fn = a?.file?.filename || a?.file?.name
  if (typeof fn === 'string' && fn.trim()) return humanizeFilename(fn)
  return 'Untitled asset'
}

function mediaUrlForDoc(a: any): string | null {
  const u = a?._normalizedUrl || a?.file?.url
  return typeof u === 'string' && u.length > 0 ? u : null
}

function mediaFilenameForDoc(a: any): string | null {
  const file = a?.file
  if (file && typeof file === 'object') {
    for (const key of ['filename', 'name', 'originalFilename'] as const) {
      const v = file[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  if (typeof a?.filename === 'string' && a.filename.trim()) return a.filename.trim()

  const url =
    typeof file === 'object' && file && typeof (file as { url?: unknown }).url === 'string'
      ? (file as { url: string }).url
      : typeof a?._normalizedUrl === 'string'
        ? a._normalizedUrl
        : null
  if (url) {
    const path = url.split('?')[0]
    const seg = path.split('/').filter(Boolean).pop()
    if (seg) {
      try {
        const decoded = decodeURIComponent(seg)
        if (decoded.includes('.')) return decoded
      } catch {
        if (seg.includes('.')) return seg
      }
    }
  }
  return null
}

const mediaAssets = computed(() => {
  const docs = Array.isArray(connectPagesMediaData.value?.docs) ? connectPagesMediaData.value.docs : []
  return docs
})

const assetLibrarySearch = ref('')
const filteredMediaAssets = computed(() => {
  const q = assetLibrarySearch.value.trim().toLowerCase()
  const list = mediaAssets.value
  if (!q) return list
  return list.filter((a: any) => {
    const name = mediaDisplayName(a).toLowerCase()
    const fn = (mediaFilenameForDoc(a) || '').toLowerCase()
    return name.includes(q) || fn.includes(q)
  })
})

const assetFileInputId = useId()
const assetUploadAlt = ref('')
const assetFileInputRef = ref<HTMLInputElement | null>(null)
const selectedAssetFileLabel = ref('')
const assetUploadPending = ref(false)
const assetUploadError = ref<string | null>(null)
const assetLibrarySuccess = ref<string | null>(null)
const highlightedAssetId = ref<string | null>(null)
const assetDeletePendingId = ref<string | null>(null)

const pages = computed<ConnectPage[]>(() => {
  const raw = pagesData.value
  const docs = Array.isArray(raw?.docs) ? raw.docs : []
  return docs
})

const pagePathById = computed(() => {
  const { pathById } = buildPagePathMap(pages.value)
  return pathById
})

const pagesError = computed(() => {
  const e = pagesErrorRef.value as any
  return e?.message ?? e?.statusMessage ?? (e ? 'Failed to load pages' : null)
})

const filteredPages = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return pages.value
  return pages.value.filter((p) => {
    const t = (p.title ?? '').toString().toLowerCase()
    const s = (p.slug ?? '').toString().toLowerCase()
    return t.includes(q) || s.includes(q)
  })
})

const pagePathLabelById = computed(() => {
  const out = new Map<number, string>()
  for (const page of pages.value) {
    out.set(page.id, getConnectPageBreadcrumbLabel(pages.value, page.id))
  }
  return out
})

type PageTreeNode = ReturnType<typeof buildPageTree>[number]

type TreeTableRow = {
  page: ConnectPage
  depth: number
  childCount: number
}

const pagesViewMode = ref<'list' | 'tree'>('list')
const treeCollapsed = ref<Record<string, boolean>>({})

const pagesTree = computed(() => buildPageTree(filteredPages.value))

function walkVisibleTreeRows(
  nodes: PageTreeNode[],
  depth: number,
  collapsed: Record<string, boolean>,
): TreeTableRow[] {
  const rows: TreeTableRow[] = []
  for (const node of nodes) {
    const id = String(node.page.id)
    rows.push({
      page: node.page as ConnectPage,
      depth,
      childCount: node.children.length,
    })
    if (node.children.length && !collapsed[id]) {
      rows.push(...walkVisibleTreeRows(node.children, depth + 1, collapsed))
    }
  }
  return rows
}

const visibleTreeRows = computed(() => walkVisibleTreeRows(pagesTree.value, 0, treeCollapsed.value))

function toggleTreeBranch(id: string) {
  treeCollapsed.value = { ...treeCollapsed.value, [id]: !treeCollapsed.value[id] }
}

watch(search, () => {
  treeCollapsed.value = {}
})

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const editorToolbarItems = [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } },
  ],
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' },
        { kind: 'heading', level: 4, icon: 'i-lucide-heading-4', label: 'Heading 4' },
      ],
    },
    {
      icon: 'i-lucide-list',
      tooltip: { text: 'Lists' },
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bulleted list' },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Numbered list' },
      ],
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Blockquote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code block' } },
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Inline code' } },
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Divider' } },
    { kind: 'clearFormatting', icon: 'i-lucide-rotate-ccw', tooltip: { text: 'Clear formatting' } },
  ],
] satisfies any

/** Valid empty TipTap JSON. Use `paragraph` with `content: []` — ProseMirror forbids `{ type: 'text', text: '' }`. */
const INITIAL_TIPTAP_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
} as const

// Editor state
const editorOpen = ref(false)

watch(editorOpen, (open) => {
  if (open && canManage.value) refreshConnectPagesMedia()
})

const editingId = ref<number | null>(null)
const form = ref<{ title: string; slug: string; parentId: string; sectionId: string; navCategory: string }>({
  title: '',
  slug: '',
  parentId: '',
  sectionId: '',
  navCategory: '',
})
const contentTipTap = ref<any>(JSON.parse(JSON.stringify(INITIAL_TIPTAP_DOC)))
/** Bumps when opening the slide-over so UEditor remounts with the loaded TipTap doc (avoids stale ProseMirror state). */
const docsEditorMountKey = ref(0)
/** Nuxt UI `Editor` exposes `editor` (TipTap instance); used to force `setContent` after mount (see watch below). */
const docsBodyUEditorRef = ref<any>(null)
const savePending = ref(false)
const saveError = ref<string | null>(null)

// Contacts editor state
const contactsHeading = ref('')
const contactIds = ref<string[]>([])
const contactSearch = ref('')

/** Clear slide-over fields without touching the route (openEdit/openCreate set query after). */
function clearEditorDraft() {
  editingId.value = null
  form.value = { title: '', slug: '', parentId: '', sectionId: '', navCategory: '' }
  contentTipTap.value = JSON.parse(JSON.stringify(INITIAL_TIPTAP_DOC))
  contactsHeading.value = ''
  contactIds.value = []
  contactSearch.value = ''
  assetUploadAlt.value = ''
  assetUploadError.value = null
  assetLibrarySuccess.value = null
  highlightedAssetId.value = null
  if (assetFileInputRef.value) assetFileInputRef.value.value = ''
  selectedAssetFileLabel.value = ''
  saveError.value = null
  savePending.value = false
}

/** Remove `edit` / `create` from the URL so the route watch does not reopen the slide-over after refresh (e.g. save → refreshPages → ?edit= still set → openEdit races with closed editor). */
function stripEditorRouteQuery() {
  const nextQuery = { ...route.query }
  delete (nextQuery as any).edit
  delete (nextQuery as any).create
  router.replace({ query: nextQuery })
}

function resetEditor() {
  clearEditorDraft()
  stripEditorRouteQuery()
}

const categoryOptions = CONNECT_PAGE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
const categoryLabelMap = new Map<string, string>(categoryOptions.map((c) => [c.value, c.label]))

function parentIdOf(page: ConnectPage) {
  if (page.parent == null) return null
  if (typeof page.parent === 'object') return page.parent.id == null ? null : String(page.parent.id)
  return String(page.parent)
}

const pageById = computed(() => {
  const out = new Map<string, ConnectPage>()
  for (const page of pages.value) out.set(String(page.id), page)
  return out
})

function effectiveCategoryValue(page: ConnectPage): string | null {
  const visited = new Set<string>()
  let current: ConnectPage | undefined = page
  while (current) {
    const navCategory = typeof current.navCategory === 'string' ? current.navCategory : ''
    if (navCategory && categoryLabelMap.has(navCategory)) return navCategory
    const currentId = String(current.id)
    if (visited.has(currentId)) break
    visited.add(currentId)
    const parentId = parentIdOf(current)
    current = parentId ? pageById.value.get(parentId) : undefined
  }
  return null
}

const pageCategoryLabelById = computed(() => {
  const out = new Map<number, string>()
  for (const page of pages.value) {
    const value = effectiveCategoryValue(page)
    if (value) out.set(page.id, categoryLabelMap.get(value) || value)
  }
  return out
})

function openCreate() {
  clearEditorDraft()
  docsEditorMountKey.value += 1
  editorOpen.value = true
  const nextQuery = { ...route.query }
  delete (nextQuery as any).edit
  router.replace({ query: { ...nextQuery, create: '1' } })
}

function normalizeRawLexicalForEditor(raw: unknown): any | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parsed && typeof parsed === 'object' && 'root' in (parsed as object) ? parsed : null
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && raw !== null && 'root' in raw) return raw as any
  /** Some Lexical serializers wrap editor state. */
  if (typeof raw === 'object' && raw !== null && 'editorState' in raw) {
    return normalizeRawLexicalForEditor((raw as { editorState?: unknown }).editorState)
  }
  return null
}

/** Resolve Lexical JSON from a Payload connect-page shape (top-level, fields, or nested). */
function extractLexicalFromConnectPageDoc(doc: any): any | null {
  if (!doc || typeof doc !== 'object') return null
  const candidates = [doc.content, doc.fields?.content, doc.data?.content]
  for (const raw of candidates) {
    const n = normalizeRawLexicalForEditor(raw)
    if (n?.root?.children && Array.isArray(n.root.children)) return n
  }
  return null
}

/** TipTap/prose mirror + UEditor choke on reactive proxies and some codeBlock payloads; always pass a plain JSON tree. */
function plainTipTapJsonClone(doc: unknown): any {
  return JSON.parse(JSON.stringify(doc))
}

/** ProseMirror throws on `{ type: 'text', text: '' }` (RangeError: Empty text nodes are not allowed). Recursively remove those nodes. */
function sanitizeTipTapJsonForProseMirror(input: unknown): any {
  const walk = (n: any): any => {
    if (n == null || typeof n !== 'object') return n
    if (n.type === 'text') {
      const t = n.text != null ? String(n.text) : ''
      if (t.length === 0) return null
      return { ...n, text: t }
    }
    if (Array.isArray(n)) return n.map(walk).filter((x) => x != null)
    const out: any = { ...n }
    if (Array.isArray(n.content)) out.content = n.content.map(walk).filter((x: any) => x != null)
    return out
  }
  return walk(JSON.parse(JSON.stringify(input)))
}

/**
 * Nuxt UI `UEditor` forwards `modelValue` into `useEditor({ content })`. A Vue reactive proxy there often
 * prevents ProseMirror from building the document (blank editor). This computed always yields a plain JSON
 * clone for the wrapper while `contentTipTap` stays the canonical ref for save / collapse logic.
 */
const docsBodyEditorModel = computed({
  get() {
    return sanitizeTipTapJsonForProseMirror(plainTipTapJsonClone(contentTipTap.value ?? INITIAL_TIPTAP_DOC))
  },
  set(v: any) {
    contentTipTap.value = v
  },
})

function tipTapDocHasMeaningfulText(doc: any): boolean {
  const walk = (nodes: any[] | undefined): boolean => {
    if (!Array.isArray(nodes)) return false
    for (const n of nodes) {
      if (n?.type === 'text' && String(n.text || '').trim()) return true
      if (n?.content && walk(n.content)) return true
      if (n?.type === 'codeBlock' && Array.isArray(n.content) && walk(n.content)) return true
    }
    return false
  }
  return walk(doc?.content)
}

/** Paragraph cannot store raw \\n in a single text leaf; split lines with hardBreak like the editor expects. */
function tipTapParagraphContentFromMultilineString(s: string): any[] {
  const lines = s.replace(/\r\n/g, '\n').split('\n')
  const out: any[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) out.push({ type: 'hardBreak' })
    const line = lines[i] ?? ''
    if (line.length > 0) out.push({ type: 'text', text: line })
  }
  return out
}

async function openEdit(p: ConnectPage) {
  clearEditorDraft()
  editingId.value = p.id
  const parentId = p.parent == null
    ? ''
    : typeof p.parent === 'object'
      ? String(p.parent.id ?? '')
      : String(p.parent)
  const navCategory = parentId ? '' : ((typeof p.navCategory === 'string' ? p.navCategory : '') || '')
  form.value = { title: (p.title ?? '').toString(), slug: (p.slug ?? '').toString(), parentId, sectionId: '', navCategory }
  contactsHeading.value = (p.contactsHeading ?? '').toString()
  contactIds.value = Array.isArray(p.contacts)
    ? p.contacts.map((c: any) => (typeof c === 'object' && c ? String(c.id ?? '') : String(c ?? ''))).filter((v: string) => v.length > 0)
    : []

  let tipTapDoc: any = JSON.parse(JSON.stringify(INITIAL_TIPTAP_DOC))
  try {
    const full = await $fetch<any>(`/api/connect-pages/${encodeURIComponent(String(p.id))}`, {
      query: { depth: 2 },
    })
    const lexical = extractLexicalFromConnectPageDoc(full)
    tipTapDoc = lexical ? lexicalToTipTap(lexical) : JSON.parse(JSON.stringify(INITIAL_TIPTAP_DOC))
  } catch {
    const lexical = extractLexicalFromConnectPageDoc(p)
    tipTapDoc = lexical ? lexicalToTipTap(lexical) : JSON.parse(JSON.stringify(INITIAL_TIPTAP_DOC))
  }
  if (!tipTapDocHasMeaningfulText(tipTapDoc)) {
    const fallback = extractLexicalFromConnectPageDoc(p)
    if (fallback) tipTapDoc = lexicalToTipTap(fallback)
  }
  contentTipTap.value = plainTipTapJsonClone(tipTapDoc)
  docsEditorMountKey.value += 1
  editorOpen.value = true
  const nextQuery = { ...route.query }
  delete (nextQuery as any).create
  router.replace({ query: { ...nextQuery, edit: String(p.id) } })
}

watch([canManage, pagesPending, pagesData, () => route.query.edit, () => route.query.create], () => {
  if (!canManage.value) return
  if (pagesPending.value) return

  const edit = route.query.edit
  const create = route.query.create

  if (typeof edit === 'string' && edit.trim()) {
    const id = Number(edit)
    const p = Number.isFinite(id) ? pages.value.find((x) => x.id === id) : undefined
    if (p && (!editorOpen.value || editingId.value !== p.id)) void openEdit(p)
    return
  }

  if (create === '1' && !editorOpen.value) {
    openCreate()
  }
}, { immediate: true })

const parentPageOptions = computed(() => (
  pages.value
    .filter((p) => p.id !== editingId.value)
    .map((p) => ({
      id: p.id,
      title: pagePathLabelById.value.get(p.id) || p.title?.trim() || `#${p.id} (${p.slug || 'untitled'})`,
    }))
))

// Convert Lexical (Payload) -> TipTap (UEditor)
function lexicalToTipTap(lexical: any): any {
  if (!lexical?.root?.children) return JSON.parse(JSON.stringify(INITIAL_TIPTAP_DOC))

  /** Match public page `collectPlainText` so `code` nodes with linebreaks / nested text round-trip. */
  const lexicalPlainFromNodes = (nodes: unknown): string => {
    if (nodes == null) return ''
    if (Array.isArray(nodes)) {
      let out = ''
      for (const n of nodes) out += lexicalPlainFromNodes(n)
      return out
    }
    if (typeof nodes !== 'object') return ''
    const n = nodes as any
    if (n.type === 'text' && typeof n.text === 'string') return n.text
    if (n.type === 'linebreak' || n.type === 'lineBreak') return '\n'
    if (Array.isArray(n.children)) return lexicalPlainFromNodes(n.children)
    return ''
  }

  const convert = (node: any): any[] => {
    if (!node) return []

    if (node.type === 'text') {
      const marks: any[] = []
      const format = Number(node.format) || 0
      if (format & 1) marks.push({ type: 'bold' })
      if (format & 2) marks.push({ type: 'italic' })
      if (format & 8) marks.push({ type: 'underline' })
      /** Lexical TextNode IS_CODE = 1 << 4 */
      if (format & 16) marks.push({ type: 'code' })
      return [{ type: 'text', text: node.text || '', ...(marks.length ? { marks } : {}) }]
    }

    if (node.type === 'inlineCode') {
      const raw =
        typeof node.text === 'string'
          ? node.text
          : (node.children || [])
              .filter((c: any) => c?.type === 'text')
              .map((c: any) => c.text || '')
              .join('')
      return raw
        ? [{ type: 'text', text: raw, marks: [{ type: 'code' }] }]
        : []
    }

    if (node.type === 'code') {
      const fromField = typeof node.code === 'string' ? node.code : ''
      const fromChildren = lexicalPlainFromNodes(node.children || []).replace(/\r\n/g, '\n')
      const text = (fromField || fromChildren).replace(/\r\n/g, '\n')
      const langRaw = node.language
      const language =
        langRaw != null && String(langRaw).trim() !== '' ? String(langRaw).trim() : null
      /**
       * Do NOT use TipTap `codeBlock` for @connect-faq / @connect-videos: large JSON often makes
       * setContent fail or render blank, which wipes the whole editor. Use a normal paragraph so
       * authors always see and edit the magic line; save still collapses to Lexical `code` in Payload.
       */
      if (/^\s*@connect-(faq|videos)\b/i.test(text)) {
        return [
          {
            type: 'paragraph',
            content: tipTapParagraphContentFromMultilineString(text),
          },
        ]
      }
      return [
        {
          type: 'codeBlock',
          attrs: { language },
          content: text ? [{ type: 'text', text }] : [],
        },
      ]
    }

    if (node.type === 'linebreak') {
      return [{ type: 'hardBreak' }]
    }

    if (node.type === 'paragraph') {
      const content = (node.children || []).flatMap(convert)
      return [{ type: 'paragraph', content: content.length ? content : [] }]
    }

    if (node.type === 'heading') {
      const level = Number(String(node.tag || 'h2').replace('h', '')) || 2
      const content = (node.children || []).flatMap(convert)
      return [{ type: 'heading', attrs: { level }, content }]
    }

    if (node.type === 'list') {
      const listType = node.listType === 'number' ? 'orderedList' : 'bulletList'
      const content = (node.children || []).flatMap(convert)
      return [{ type: listType, content }]
    }

    if (node.type === 'listitem') {
      // TipTap listItem usually wraps paragraphs; Lexical listitem may contain inline nodes directly.
      const inner = (node.children || []).flatMap(convert)
      const content = inner.length && inner.some((n: TipTapNode) => n.type === 'paragraph')
        ? inner
        : [{ type: 'paragraph', content: inner.length ? inner : [] }]
      return [{ type: 'listItem', content }]
    }

    if (node.type === 'link') {
      const href = node?.fields?.url || node?.url
      const newTab = !!(node?.fields?.newTab || node.newTab)
      const children = (node.children || []).flatMap(convert)
      return children.map((c: any) => {
        const marks = Array.isArray(c.marks) ? [...c.marks] : []
        marks.push({ type: 'link', attrs: { href, target: newTab ? '_blank' : null } })
        return { ...c, marks }
      })
    }

    if (node.type === 'autolink') {
      const href = node?.fields?.url || node?.url
      const children = (node.children || []).flatMap(convert)
      const linked = children.length ? children : [{ type: 'text', text: href }]
      return linked.map((c: any) => {
        const marks = Array.isArray(c.marks) ? [...c.marks] : []
        marks.push({ type: 'link', attrs: { href, target: '_blank' } })
        return { ...c, marks }
      })
    }

    if (Array.isArray(node.children)) {
      return node.children.flatMap(convert)
    }

    return []
  }

  const content = lexical.root.children.flatMap(convert)
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph', content: [] }],
  }
}

function tipTapParagraphPlainText(node: any): string {
  if (!node || node.type !== 'paragraph') return ''
  const parts: string[] = []
  const walk = (nodes: any[] | undefined) => {
    if (!Array.isArray(nodes)) return
    for (const x of nodes) {
      if (!x) continue
      if (x.type === 'text') parts.push(x.text || '')
      else if (x.type === 'hardBreak') parts.push('\n')
      else if (Array.isArray(x.content)) walk(x.content)
    }
  }
  walk(node.content)
  return parts.join('')
}

function connectMagicBlockJsonParses(raw: string): boolean {
  const t = raw.trim()
  if (t.toLowerCase().startsWith('@connect-videos')) {
    const jsonStr = t.replace(/^@connect-videos\s*/i, '').trim()
    if (!jsonStr) return false
    try {
      return Array.isArray(JSON.parse(jsonStr))
    } catch {
      return false
    }
  }
  if (t.toLowerCase().startsWith('@connect-faq')) {
    const jsonStr = t.replace(/^@connect-faq\s*/i, '').trim()
    if (!jsonStr) return false
    try {
      return Array.isArray(JSON.parse(jsonStr))
    } catch {
      return false
    }
  }
  return false
}

/** Merge pasted multi-paragraph @connect-* blocks into one code block so Payload stores valid JSON in one Lexical node. */
function collapseConnectMagicBlocksInTipTapDoc(doc: any): any {
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content)) return doc
  const content = doc.content
  const out: any[] = []
  let i = 0
  while (i < content.length) {
    const n = content[i]
    if (n?.type !== 'paragraph') {
      out.push(n)
      i++
      continue
    }
    let merged = tipTapParagraphPlainText(n).trim()
    const low = merged.toLowerCase()
    if (!low.startsWith('@connect-faq') && !low.startsWith('@connect-videos')) {
      out.push(n)
      i++
      continue
    }
    let j = i
    const max = Math.min(content.length, i + 80)
    let found = false
    while (j < max) {
      if (connectMagicBlockJsonParses(merged)) {
        out.push({
          type: 'codeBlock',
          attrs: { language: 'json' },
          content: merged ? [{ type: 'text', text: merged }] : [],
        })
        i = j + 1
        found = true
        break
      }
      const next = content[j + 1]
      if (next?.type !== 'paragraph') break
      j++
      merged += '\n' + tipTapParagraphPlainText(next).trim()
    }
    if (!found) {
      out.push(n)
      i++
    }
  }
  return { ...doc, content: out }
}

// Convert TipTap (UEditor) -> Lexical (Payload)
function tipTapToLexical(tipTap: any): any {
  if (!tipTap || tipTap.type !== 'doc') return null

  const formatFromMarks = (marks: any[] | undefined) => {
    let format = 0
    for (const m of marks || []) {
      if (m?.type === 'bold') format |= 1
      if (m?.type === 'italic') format |= 2
      if (m?.type === 'underline') format |= 8
      if (m?.type === 'code') format |= 16
    }
    return format
  }

  const tipTapFragmentPlainText = (nodes: any[] | undefined): string => {
    if (!Array.isArray(nodes) || !nodes.length) return ''
    let s = ''
    for (const n of nodes) {
      if (n?.type === 'text') s += n.text || ''
      else if (Array.isArray(n.content)) s += tipTapFragmentPlainText(n.content)
    }
    return s
  }

  const wrapWithLinkIfNeeded = (nodes: any[], marks: any[] | undefined) => {
    const linkMark = (marks || []).find((m) => m?.type === 'link')
    const href = linkMark?.attrs?.href
    if (!href) return nodes
    const newTab = linkMark?.attrs?.target === '_blank'
    return [{
      type: 'link',
      fields: { url: href, newTab, linkType: 'custom' },
      format: '',
      indent: 0,
      version: 3,
      children: nodes,
      direction: null,
    }]
  }

  const convert = (node: any): any[] => {
    if (!node) return []

    if (node.type === 'text') {
      const base = {
        mode: 'normal',
        text: node.text || '',
        type: 'text',
        style: '',
        detail: 0,
        format: formatFromMarks(node.marks),
        version: 1,
      }
      return wrapWithLinkIfNeeded([base], node.marks)
    }

    if (node.type === 'hardBreak') {
      return [{ type: 'linebreak', version: 1 }]
    }

    if (node.type === 'paragraph') {
      const children = (node.content || []).flatMap(convert)
      return [{
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children,
        direction: null,
        textStyle: '',
        textFormat: 0,
      }]
    }

    if (node.type === 'heading') {
      const level = node?.attrs?.level || 2
      const tag = `h${level}`
      const children = (node.content || []).flatMap(convert)
      return [{
        type: 'heading',
        tag,
        format: '',
        indent: 0,
        version: 1,
        children,
        direction: null,
      }]
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const listType = node.type === 'orderedList' ? 'number' : 'bullet'
      const children = (node.content || []).flatMap(convert)
      return [{
        type: 'list',
        listType,
        tag: listType === 'number' ? 'ol' : 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        children,
        direction: null,
      }]
    }

    if (node.type === 'listItem') {
      const children = (node.content || []).flatMap(convert)
      return [{
        type: 'listitem',
        value: 1,
        format: '',
        indent: 0,
        version: 1,
        children,
        direction: null,
      }]
    }

    if (node.type === 'codeBlock') {
      const codeStr = tipTapFragmentPlainText(node.content)
      const textChildren = codeStr
        ? [{
            type: 'text',
            version: 1,
            format: 0,
            style: '',
            detail: 0,
            mode: 'normal',
            text: codeStr,
          }]
        : []
      return [{
        type: 'code',
        version: 1,
        language: String(node.attrs?.language ?? '') || 'plaintext',
        format: '',
        indent: 0,
        direction: null,
        children: textChildren,
      }]
    }

    if (Array.isArray(node.content)) return node.content.flatMap(convert)
    return []
  }

  const children = (tipTap.content || []).flatMap(convert)
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: null,
    },
  }
}

const lexicalJsonPretty = computed(() => {
  const lexical = tipTapToLexical(contentTipTap.value)
  return JSON.stringify(lexical, null, 2)
})

const selectedContactIdSet = computed(() => new Set(contactIds.value.map(String)))

const selectedContacts = computed<EmployeeChoice[]>(() => {
  const byId = new Map<string, EmployeeChoice>()
  for (const e of employees.value) byId.set(String(e.id), e)
  return contactIds.value.map((id) => byId.get(String(id)) || ({ id } as EmployeeChoice))
})

const filteredEmployeeChoices = computed<EmployeeChoice[]>(() => {
  const q = contactSearch.value.trim().toLowerCase()
  const selected = selectedContactIdSet.value
  const pool = employees.value.filter((e) => !selected.has(String(e.id)))
  if (!q) return pool.slice(0, 50)
  return pool
    .filter((e) => {
      const name = (e.name ?? '').toString().toLowerCase()
      const email = (e.email ?? '').toString().toLowerCase()
      return name.includes(q) || email.includes(q)
    })
    .slice(0, 50)
})

function addContact(id: number | string) {
  const s = String(id)
  if (selectedContactIdSet.value.has(s)) return
  contactIds.value = [...contactIds.value, s]
}

function removeContact(id: number | string) {
  const s = String(id)
  contactIds.value = contactIds.value.filter((x) => x !== s)
}

function moveContact(id: number | string, delta: -1 | 1) {
  const s = String(id)
  const idx = contactIds.value.indexOf(s)
  if (idx < 0) return
  const next = idx + delta
  if (next < 0 || next >= contactIds.value.length) return
  const arr = [...contactIds.value]
  const [item] = arr.splice(idx, 1)
  arr.splice(next, 0, item)
  contactIds.value = arr
}

function toPayloadId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && String(n) === trimmed ? n : trimmed
}

function formatPayloadErrorData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const first = d['0']
  if (first && typeof first === 'object' && first !== null && 'message' in first) {
    const m = (first as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  if (typeof d.message === 'string' && d.message.trim()) return d.message.trim()
  return null
}

function clearAssetLibrarySuccessSoon(ms = 5000) {
  window.setTimeout(() => {
    assetLibrarySuccess.value = null
  }, ms)
}

async function copyAssetUrl(url: string | null) {
  if (!url) {
    assetUploadError.value = 'No URL available for this asset.'
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    assetUploadError.value = null
    assetLibrarySuccess.value = 'Copied URL to clipboard.'
    clearAssetLibrarySuccessSoon(4000)
  } catch {
    assetLibrarySuccess.value = null
    assetUploadError.value = `Could not copy to clipboard. URL: ${url}`
  }
}

function onAssetFileInputChange() {
  assetUploadError.value = null
  const el = assetFileInputRef.value
  selectedAssetFileLabel.value = el?.files?.[0]?.name ?? ''
}

async function uploadPageAsset() {
  assetUploadError.value = null
  assetLibrarySuccess.value = null
  const input = assetFileInputRef.value
  const file = input?.files?.[0]
  if (!file) {
    assetUploadError.value = 'Choose a file first.'
    return
  }
  assetUploadPending.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const alt = assetUploadAlt.value.trim()
    if (alt) body.append('alt', alt)
    const res = await $fetch<{ id: unknown; filename: string; url: string }>('/api/connect-pages-media/upload', {
      method: 'POST',
      body,
    })
    await navigator.clipboard.writeText(res.url)
    highlightedAssetId.value = res.id != null ? String(res.id) : null
    await refreshConnectPagesMedia()
    assetUploadError.value = null
    assetLibrarySuccess.value = `Uploaded “${res.filename || file.name}”. URL copied to clipboard.`
    clearAssetLibrarySuccessSoon(5000)
    if (input) {
      input.value = ''
      selectedAssetFileLabel.value = ''
    }
  } catch (e: unknown) {
    const err = e as { data?: unknown; statusMessage?: string; message?: string }
    const fromData = formatPayloadErrorData(err.data)
    assetUploadError.value = fromData || err.statusMessage || err.message || 'Upload failed'
  } finally {
    assetUploadPending.value = false
  }
}

async function deletePageAsset(a: any) {
  const id = a?.id
  if (id == null) return
  const sid = String(id)
  const label = mediaDisplayName(a)
  const fn = mediaFilenameForDoc(a)
  const confirmMsg = fn
    ? `Delete “${label}” (${fn}) from the library? This cannot be undone.`
    : `Delete “${label}” from the library? This cannot be undone.`
  if (!window.confirm(confirmMsg)) return

  assetUploadError.value = null
  assetLibrarySuccess.value = null
  assetDeletePendingId.value = sid
  try {
    await $fetch(`/api/connect-pages-media/${encodeURIComponent(sid)}`, { method: 'DELETE' })
    if (highlightedAssetId.value === sid) highlightedAssetId.value = null
    assetLibrarySuccess.value = 'Asset deleted.'
    clearAssetLibrarySuccessSoon(4000)
    await refreshConnectPagesMedia()
  } catch (e: unknown) {
    const err = e as { data?: unknown; statusMessage?: string; message?: string }
    assetUploadError.value = formatPayloadErrorData(err.data) || err.statusMessage || err.message || 'Delete failed'
  } finally {
    assetDeletePendingId.value = null
  }
}

async function savePage() {
  saveError.value = null
  if (!form.value.title.trim()) {
    saveError.value = 'Title is required.'
    return
  }
  if (!form.value.slug.trim()) {
    saveError.value = 'Slug is required.'
    return
  }
  if (!editingId.value && !isConnectAdmin.value && !form.value.sectionId) {
    saveError.value = 'Section is required.'
    return
  }
  if (!form.value.parentId && !form.value.navCategory) {
    saveError.value = 'Category is required for top-level pages.'
    return
  }

  const docForSave = collapseConnectMagicBlocksInTipTapDoc(
    JSON.parse(JSON.stringify(contentTipTap.value)) as any,
  )
  const content = tipTapToLexical(docForSave)
  const parent = form.value.parentId ? Number(form.value.parentId) : null
  const navCategory = parent ? undefined : (form.value.navCategory as ConnectPageCategory)
  const section = form.value.sectionId ? Number(form.value.sectionId) : undefined
  const contactsHeadingValue = contactsHeading.value.trim() || null
  const contacts = contactIds.value.map(toPayloadId).filter((v) => v != null)

  savePending.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/connect-pages-update/${editingId.value}`, {
        method: 'PATCH',
        body: {
          title: form.value.title.trim(),
          slug: form.value.slug.trim(),
          parent,
          navCategory,
          content,
          contactsHeading: contactsHeadingValue,
          contacts,
        },
      })
    } else {
      const created = await $fetch<any>('/api/connect-pages', {
        method: 'POST',
        body: {
          title: form.value.title.trim(),
          slug: form.value.slug.trim(),
          parent,
          navCategory,
          section,
          content,
          contactsHeading: contactsHeadingValue,
          contacts,
        },
      })
      editingId.value = created?.doc?.id ?? created?.id ?? null
    }
    editorOpen.value = false
    stripEditorRouteQuery()
    await refreshPages()
  } catch (err: any) {
    saveError.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to save.'
  } finally {
    savePending.value = false
  }
}

async function deletePage() {
  if (!editingId.value) return
  if (!confirm('Delete this page?')) return
  savePending.value = true
  saveError.value = null
  try {
    await $fetch(`/api/connect-pages/${editingId.value}`, { method: 'DELETE' })
    editorOpen.value = false
    stripEditorRouteQuery()
    await refreshPages()
  } catch (err: any) {
    saveError.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to delete.'
  } finally {
    savePending.value = false
  }
}

/**
 * Nuxt UI Editor.vue: `useEditor({ content: props.modelValue })` snapshots content once; the internal
 * `watch(() => props.modelValue, …)` bails while `editor.value` is still null and is not `immediate`,
 * so the first document never applies. Push the loaded TipTap JSON in after the editor exists.
 */
function syncDocsBodyEditorFromState(): boolean {
  if (!editorOpen.value || contentTipTap.value == null) return false
  const inst = docsBodyUEditorRef.value as any
  const ed = inst?.editor != null ? unref(inst.editor) : null
  if (!ed || ed.isDestroyed) return false
  let payload: any
  try {
    payload = sanitizeTipTapJsonForProseMirror(plainTipTapJsonClone(contentTipTap.value))
  } catch {
    return false
  }
  try {
    ed.commands.setContent(payload, { emitUpdate: false })
    return true
  } catch (err) {
    console.error('[dashboard/docs] TipTap setContent failed', err)
    return false
  }
}

watch(
  () => [editorOpen.value, docsEditorMountKey.value, editingId.value] as const,
  () => {
    if (!editorOpen.value) return
    void nextTick(() => {
      if (syncDocsBodyEditorFromState()) return
      void nextTick(() => {
        if (syncDocsBodyEditorFromState()) return
        requestAnimationFrame(() => {
          if (syncDocsBodyEditorFromState()) return
          setTimeout(() => syncDocsBodyEditorFromState(), 0)
          setTimeout(() => syncDocsBodyEditorFromState(), 50)
        })
      })
    })
  },
  { flush: 'post' },
)
</script>

