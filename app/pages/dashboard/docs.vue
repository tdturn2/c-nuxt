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
            <div class="flex items-center gap-2">
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
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
        </template>
      </div>
    </main>

    <USlideover v-model:open="editorOpen" :ui="{ content: 'max-w-3xl w-full', body: 'overflow-y-auto' }" @update:open="(v) => !v && resetEditor()">
      <template #header>
        <div class="flex flex-col gap-0.5">
          <p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {{ editingId ? 'Edit page' : 'Create page' }}
          </p>
          <h2 class="text-base font-semibold text-gray-900 truncate">
            {{ form.title?.trim() || (editingId ? `Page #${editingId}` : 'New page') }}
          </h2>
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

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Content</h3>
            <UEditor
              v-slot="{ editor }"
              v-model="contentTipTap"
              placeholder="Write page content…"
              class="w-full"
            >
              <UEditorToolbar
                :editor="editor"
                :items="editorToolbarItems"
                class="border-b border-gray-200 sticky top-0 inset-x-0 bg-white/95 backdrop-blur z-10 overflow-x-auto"
              />
              <UEditorDragHandle :editor="editor" />
            </UEditor>
            <div class="mt-3">
              <details class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <summary class="cursor-pointer text-xs font-semibold text-gray-700">Advanced: Lexical JSON</summary>
                <pre class="mt-2 text-[11px] leading-snug overflow-auto max-h-60 whitespace-pre-wrap">{{ lexicalJsonPretty }}</pre>
              </details>
            </div>
          </div>

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
import { getConnectPageBreadcrumbLabel } from '~/composables/useConnectPagesTree'
import { CONNECT_PAGE_CATEGORIES, type ConnectPageCategory } from '~/composables/useConnectPagesTree'

type ConnectPage = {
  id: number
  title?: string | null
  slug?: string | null
  parent?: number | string | { id?: number | string } | null
  navCategory?: string | null
  content?: any
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

const search = ref('')

const {
  data: pagesData,
  pending: pagesPending,
  error: pagesErrorRef,
  execute: refreshPages,
} = useFetch<any>('/api/connect-pages', {
  key: 'dashboard-docs-pages',
  immediate: false,
  query: () => ({ limit: 500, sort: '-updatedAt', depth: 1 }),
})

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

// Editor state
const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const form = ref<{ title: string; slug: string; parentId: string; navCategory: string }>({
  title: '',
  slug: '',
  parentId: '',
  navCategory: '',
})
const contentTipTap = ref<any>({ type: 'doc', content: [] })
const savePending = ref(false)
const saveError = ref<string | null>(null)

function resetEditor() {
  editingId.value = null
  form.value = { title: '', slug: '', parentId: '', navCategory: '' }
  contentTipTap.value = { type: 'doc', content: [] }
  saveError.value = null
  savePending.value = false
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
  resetEditor()
  editorOpen.value = true
}

function openEdit(p: ConnectPage) {
  resetEditor()
  editingId.value = p.id
  const parentId = p.parent == null
    ? ''
    : typeof p.parent === 'object'
      ? String(p.parent.id ?? '')
      : String(p.parent)
  const navCategory = parentId ? '' : ((typeof p.navCategory === 'string' ? p.navCategory : '') || '')
  form.value = { title: (p.title ?? '').toString(), slug: (p.slug ?? '').toString(), parentId, navCategory }
  contentTipTap.value = p.content ? lexicalToTipTap(p.content) : { type: 'doc', content: [] }
  editorOpen.value = true
}

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
  if (!lexical?.root?.children) return { type: 'doc', content: [] }

  const convert = (node: any): any[] => {
    if (!node) return []

    if (node.type === 'text') {
      const marks: any[] = []
      const format = Number(node.format) || 0
      if (format & 1) marks.push({ type: 'bold' })
      if (format & 2) marks.push({ type: 'italic' })
      if (format & 8) marks.push({ type: 'underline' })
      return [{ type: 'text', text: node.text || '', ...(marks.length ? { marks } : {}) }]
    }

    if (node.type === 'linebreak') {
      return [{ type: 'hardBreak' }]
    }

    if (node.type === 'paragraph') {
      const content = (node.children || []).flatMap(convert)
      return [{ type: 'paragraph', content: content.length ? content : [{ type: 'text', text: '' }] }]
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
        : [{ type: 'paragraph', content: inner.length ? inner : [{ type: 'text', text: '' }] }]
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
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }
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
    }
    return format
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
  if (!form.value.parentId && !form.value.navCategory) {
    saveError.value = 'Category is required for top-level pages.'
    return
  }

  const content = tipTapToLexical(contentTipTap.value)
  const parent = form.value.parentId ? Number(form.value.parentId) : null
  const navCategory = parent ? undefined : (form.value.navCategory as ConnectPageCategory)

  savePending.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/connect-pages/update/${editingId.value}`, {
        method: 'PATCH',
        body: { title: form.value.title.trim(), slug: form.value.slug.trim(), parent, navCategory, content },
      })
    } else {
      const created = await $fetch<any>('/api/connect-pages', {
        method: 'POST',
        body: { title: form.value.title.trim(), slug: form.value.slug.trim(), parent, navCategory, content },
      })
      editingId.value = created?.doc?.id ?? created?.id ?? null
    }
    editorOpen.value = false
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
    await refreshPages()
  } catch (err: any) {
    saveError.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to delete.'
  } finally {
    savePending.value = false
  }
}
</script>

