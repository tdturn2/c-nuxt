<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
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
          You don't have access to manage pages. Access is limited to Connect admins.
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

    <ConnectPageEditSlideover
      ref="pageEditorRef"
      v-model:open="editorOpen"
      :sync-route-query="true"
      :pages="pages"
      :section-options="sectionOptions"
      :can-manage="canManage"
      @saved="refreshPages"
      @deleted="refreshPages"
    />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { isConnectAdminUser } from '@shared/connectUserAccess'
import { fetchAllConnectPages, getConnectPageBreadcrumbLabel } from '~/composables/useConnectPagesTree'
import { CONNECT_PAGE_CATEGORIES } from '~/composables/useConnectPagesTree'
import { buildPageTree } from '~/composables/useConnectPagesTree'

const route = useRoute()

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

const { pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-docs-me',
})

const connectUserFetch = await useFetch<any>('/api/connect-users/me', {
  key: 'dashboard-docs-connect-user',
})

const canManage = computed(() => isConnectAdminUser(connectUserFetch.data.value?.doc))

const connectUserDoc = computed(() => connectUserFetch.data.value?.doc ?? null)

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

const pages = computed<ConnectPage[]>(() => {
  const raw = pagesData.value
  const docs = Array.isArray(raw?.docs) ? raw.docs : []
  return docs
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

const editorOpen = ref(false)
const pageEditorRef = ref<{
  openEdit: (p: ConnectPage) => void | Promise<void>
  openCreate: () => void
  openEditById: (id: string | number) => void | Promise<void>
  getEditingId: () => number | string | null
} | null>(null)

function openCreate() {
  pageEditorRef.value?.openCreate()
}

function openEdit(p: ConnectPage) {
  void pageEditorRef.value?.openEdit(p)
}

watch(
  [canManage, pagesPending, pagesData, pageEditorRef, () => route.query.edit, () => route.query.create],
  () => {
    if (!canManage.value) return
    if (pagesPending.value) return
    if (!pageEditorRef.value) return

    const edit = route.query.edit
    const create = route.query.create

    if (typeof edit === 'string' && edit.trim()) {
      const id = Number(edit)
      const p = Number.isFinite(id) ? pages.value.find((x) => x.id === id) : undefined
      const editingId = pageEditorRef.value.getEditingId?.() ?? null
      if (p && (!editorOpen.value || editingId !== p.id)) void pageEditorRef.value.openEdit(p)
      return
    }

    if (create === '1' && !editorOpen.value) {
      openCreate()
    }
  },
  { immediate: true },
)
</script>
