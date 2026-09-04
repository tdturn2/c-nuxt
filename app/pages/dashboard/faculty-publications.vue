<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Faculty Publications</h1>
            <p class="mt-1 text-sm text-gray-600">Browse and edit all publication records, including author.</p>
            <NuxtLink
              v-if="canManageAdmin"
              to="/dashboard/featured-publications"
              class="mt-2 inline-block text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
            >
              Featured publications
            </NuxtLink>
          </div>
          <button
            v-if="canManageAdmin"
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            @click="openCreateModal"
          >
            Add Publication
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to this dashboard section.
        </div>
        <div
          v-else-if="!canManageAdmin"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          Faculty publications management is limited to Connect admins.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success }}</div>

          <div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Filter by author</label>
              <USelectMenu
                v-model="selectedFacultyOption"
                :items="facultyFilterItems"
                value-attribute="id"
                label-attribute="label"
                searchable
                search-input-placeholder="Search faculty..."
                placeholder="All authors"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Search publications</label>
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search by title..."
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
              />
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Cover</th>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Author</th>
                  <th class="px-4 py-2 text-left font-semibold">Type</th>
                  <th class="px-4 py-2 text-left font-semibold">Release date</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">Loading publications...</td>
                </tr>
                <tr v-else-if="!publications.length" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">No publications found.</td>
                </tr>
                <tr
                  v-for="pub in publications"
                  :key="String(pub.id)"
                  class="border-t border-gray-200"
                >
                  <td class="px-4 py-3">
                    <div class="h-16 w-12 overflow-hidden rounded border border-gray-200 bg-gray-100">
                      <img
                        v-if="pub.imageUrl"
                        :src="pub.imageUrl"
                        :alt="pub.title"
                        class="h-full w-full object-cover"
                      >
                    </div>
                  </td>
                  <td class="px-4 py-3 font-medium text-gray-900">{{ pub.title || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">
                    <div>{{ pub.ownerName || '—' }}</div>
                    <div v-if="pub.ownerEmail" class="text-xs text-gray-500">{{ pub.ownerEmail }}</div>
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ typeLabel(pub.type) }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ formatReleaseDate(pub.releaseDate) }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="openEditModal(pub)">
                      Edit
                    </button>
                    <button type="button" class="ml-3 text-red-700 hover:underline" @click="deletePublication(pub.id)">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              v-if="!loading && totalDocs > 0"
              class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
            >
              <p>
                Page {{ page }} of {{ totalPages }}
                ({{ totalDocs }} publication{{ totalDocs === 1 ? '' : 's' }})
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  :disabled="!hasPrevPage || loading"
                  @click="goToPage(page - 1)"
                >
                  Previous
                </button>
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  :disabled="!hasNextPage || loading"
                  @click="goToPage(page + 1)"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </main>

    <UModal v-model:open="modalOpen" :ui="{ content: 'max-w-2xl', body: 'overflow-y-auto max-h-[85vh]' }">
      <template #body>
        <h2 class="text-lg font-semibold text-gray-900">{{ editingId ? 'Edit publication' : 'Add publication' }}</h2>
        <form class="mt-4 space-y-4" @submit.prevent="savePublication">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Author</label>
            <USelectMenu
              v-model="formAuthorOption"
              :items="facultySelectItems"
              value-attribute="id"
              label-attribute="label"
              searchable
              search-input-placeholder="Search faculty..."
              placeholder="Select author"
            />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <select v-model="form.type" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option v-for="opt in PUBLICATION_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Release date</label>
              <input v-model="form.releaseDate" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input v-model="form.title" type="text" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea v-model="form.description" rows="3" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Link</label>
            <input v-model="form.link" type="url" placeholder="https://..." class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          </div>
          <div class="flex items-center gap-4">
            <div class="h-24 w-20 overflow-hidden rounded border border-gray-200 bg-gray-100">
              <img v-if="form.imageUrl" :src="form.imageUrl" :alt="form.title" class="h-full w-full object-cover">
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageChange">
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                :disabled="uploadingImage || !formOwnerId"
                @click="imageInputRef?.click()"
              >
                {{ uploadingImage ? 'Uploading...' : form.imageId ? 'Change image' : 'Upload image' }}
              </button>
              <button
                v-if="form.imageId"
                type="button"
                class="rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                @click="form.imageId = null; form.imageUrl = null"
              >
                Remove image
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2 pt-2">
            <button
              type="submit"
              class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="saving || !formOwnerId"
            >
              {{ saving ? 'Saving...' : editingId ? 'Update publication' : 'Create publication' }}
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeModal">
              Cancel
            </button>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { toBrowserMediaUrl } from '@shared/mediaUrls'

type FacultyOption = { id: string; label: string }
type PublicationRow = {
  id: string | number
  type: string
  title: string
  description: string
  link: string | null
  releaseDate: string | null
  imageId: number | null
  imageUrl: string | null
  ownerId: string | null
  ownerName: string | null
  ownerEmail: string | null
}

const PUBLICATION_TYPE_OPTIONS = [
  { label: 'Journal Article', value: 'journal-article' },
  { label: 'Book', value: 'book' },
  { label: 'Book Chapter', value: 'book-chapter' },
  { label: 'Conference Paper', value: 'conference-paper' },
  { label: 'Essay', value: 'essay' },
  { label: 'Blog Post', value: 'blog-post' },
  { label: 'YouTube Video', value: 'youtube-video' },
  { label: 'Podcast Episode', value: 'podcast-episode' },
  { label: 'Interview', value: 'interview' },
  { label: 'Sermon', value: 'sermon' },
  { label: 'Lecture', value: 'lecture' },
  { label: 'Other Media', value: 'other-media' },
] as const

const PUBLICATIONS_PER_PAGE = 25

const { mePending, isAdmin, canAccessSection } = useDashboardAccess()
const canManageDashboard = computed(() => canAccessSection('faculty-publications'))
const canManageAdmin = isAdmin

const facultyMembers = ref<FacultyOption[]>([])
const selectedFacultyOption = ref<FacultyOption | undefined>(undefined)
const selectedFacultyId = computed(() => selectedFacultyOption.value?.id || '')
const searchQuery = ref('')
const publications = ref<PublicationRow[]>([])
const page = ref(1)
const totalPages = ref(1)
const totalDocs = ref(0)
const hasNextPage = ref(false)
const hasPrevPage = ref(false)
const loading = ref(false)
const saving = ref(false)
const uploadingImage = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const modalOpen = ref(false)
const editingId = ref<string | number | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const formAuthorOption = ref<FacultyOption | undefined>(undefined)
const formOwnerId = computed(() => formAuthorOption.value?.id || '')

const form = ref({
  type: 'book',
  title: '',
  description: '',
  link: '',
  releaseDate: '',
  imageId: null as number | null,
  imageUrl: null as string | null,
})

const facultySelectItems = computed(() => facultyMembers.value)
const facultyFilterItems = computed(() => [
  { id: '', label: 'All authors' },
  ...facultyMembers.value,
])

function typeLabel(type: string): string {
  return PUBLICATION_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type || 'Other'
}

function formatReleaseDate(date: string | null): string {
  if (!date) return '—'
  const d = date.slice(0, 10)
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return d
  }
}

function lexicalToText(value: unknown): string {
  const lexical = value as { root?: { children?: unknown[] } }
  if (!lexical?.root?.children) return typeof value === 'string' ? value : ''
  const extract = (children: unknown[]): string =>
    children
      .map((child) => {
        const node = child as { type?: string; text?: string; children?: unknown[] }
        if (node?.type === 'text' && typeof node.text === 'string') return node.text
        if (Array.isArray(node?.children)) return extract(node.children)
        return ''
      })
      .join('')
  return extract(lexical.root.children)
}

function textToLexical(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', text: text || '', version: 1 }],
        },
      ],
    },
  }
}

function ensureFacultyOption(id: string | null, name?: string | null, email?: string | null) {
  if (!id) return undefined
  const existing = facultyMembers.value.find((f) => f.id === id)
  if (existing) return existing
  const option = {
    id,
    label: name || email || `User #${id}`,
  }
  facultyMembers.value = [...facultyMembers.value, option].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  )
  return option
}

function mapPublication(doc: any): PublicationRow {
  const image = doc?.image
  const imageUrl =
    typeof image === 'object' && image?.url
      ? toBrowserMediaUrl(String(image.url)) || String(image.url)
      : null
  const imageId = typeof image === 'number' ? image : (typeof image?.id === 'number' ? image.id : null)
  const owner = doc?.owner
  const ownerId =
    typeof owner === 'object' && owner?.id != null
      ? String(owner.id)
      : owner != null
        ? String(owner)
        : null
  const ownerName =
    typeof owner === 'object'
      ? (owner.name || owner.email || null)
      : null
  const ownerEmail = typeof owner === 'object' ? (owner.email || null) : null
  if (ownerId) ensureFacultyOption(ownerId, ownerName, ownerEmail)
  return {
    id: doc.id,
    type: doc.type || 'book',
    title: doc.title || '',
    description: lexicalToText(doc.description),
    link: doc.link || null,
    releaseDate: doc.releaseDate ? String(doc.releaseDate).slice(0, 10) : null,
    imageId,
    imageUrl,
    ownerId,
    ownerName,
    ownerEmail,
  }
}

function resetForm(preselectOwnerId?: string) {
  editingId.value = null
  form.value = {
    type: 'book',
    title: '',
    description: '',
    link: '',
    releaseDate: '',
    imageId: null,
    imageUrl: null,
  }
  formAuthorOption.value =
    facultyMembers.value.find((f) => f.id === (preselectOwnerId || selectedFacultyId.value)) ||
    undefined
}

async function loadFaculty() {
  if (!canManageAdmin.value) return
  try {
    const res: any = await $fetch('/api/dashboard/faculty-publications/faculty')
    facultyMembers.value = (Array.isArray(res?.docs) ? res.docs : []).map((user: any) => ({
      id: String(user.id),
      label: user.name || user.email || `Faculty #${user.id}`,
    }))
  } catch (e: any) {
    error.value = e?.message || 'Failed to load faculty members.'
  }
}

function applyPublicationListMeta(res: any) {
  publications.value = (Array.isArray(res?.docs) ? res.docs : []).map(mapPublication)
  totalDocs.value = Number.isFinite(Number(res?.totalDocs)) ? Number(res.totalDocs) : publications.value.length
  totalPages.value = Math.max(1, Number.isFinite(Number(res?.totalPages)) ? Number(res.totalPages) : 1)
  hasNextPage.value = res?.hasNextPage === true
  hasPrevPage.value = res?.hasPrevPage === true
  if (Number.isFinite(Number(res?.page)) && Number(res.page) >= 1) page.value = Number(res.page)
}

async function loadPublications(targetPage = page.value) {
  if (!canManageAdmin.value) {
    publications.value = []
    return
  }
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/dashboard/faculty-publications', {
      query: {
        page: targetPage,
        limit: PUBLICATIONS_PER_PAGE,
        ...(selectedFacultyId.value ? { owner: selectedFacultyId.value } : {}),
        ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {}),
      },
    })
    applyPublicationListMeta(res)
    if (!publications.value.length && targetPage > 1) {
      await loadPublications(targetPage - 1)
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load publications.'
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  if (nextPage < 1 || loading.value) return
  if (totalPages.value > 0 && nextPage > totalPages.value) return
  void loadPublications(nextPage)
}

function openCreateModal() {
  resetForm()
  modalOpen.value = true
}

function openEditModal(pub: PublicationRow) {
  editingId.value = pub.id
  form.value = {
    type: pub.type,
    title: pub.title,
    description: pub.description,
    link: pub.link || '',
    releaseDate: pub.releaseDate || '',
    imageId: pub.imageId,
    imageUrl: pub.imageUrl,
  }
  formAuthorOption.value = ensureFacultyOption(pub.ownerId, pub.ownerName, pub.ownerEmail)
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function handleImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !formOwnerId.value) return
  uploadingImage.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    const res: any = await $fetch(
      `/api/dashboard/faculty-publications/${encodeURIComponent(formOwnerId.value)}/image`,
      {
        method: 'POST',
        body,
      },
    )
    form.value.imageId = res?.id ?? null
    form.value.imageUrl = res?.url ? toBrowserMediaUrl(String(res.url)) || String(res.url) : null
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload image.'
  } finally {
    uploadingImage.value = false
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}

async function savePublication() {
  if (!formOwnerId.value) {
    error.value = 'Author is required.'
    return
  }
  saving.value = true
  error.value = null
  success.value = null
  const body: Record<string, unknown> = {
    type: form.value.type,
    title: form.value.title.trim(),
    description: textToLexical(form.value.description || ''),
    link: form.value.link.trim() || null,
    releaseDate: form.value.releaseDate || null,
    image: form.value.imageId,
    owner: Number(formOwnerId.value),
  }
  try {
    if (editingId.value != null) {
      await $fetch(`/api/dashboard/faculty-publications/${encodeURIComponent(String(editingId.value))}`, {
        method: 'PATCH',
        body,
      })
      success.value = 'Publication updated.'
    } else {
      await $fetch('/api/dashboard/faculty-publications', { method: 'POST', body })
      success.value = 'Publication created.'
    }
    closeModal()
    await loadPublications(editingId.value != null ? page.value : 1)
  } catch (e: any) {
    error.value = e?.message || 'Failed to save publication.'
  } finally {
    saving.value = false
  }
}

async function deletePublication(id: string | number) {
  if (!confirm('Delete this publication?')) return
  error.value = null
  success.value = null
  try {
    await $fetch(`/api/dashboard/faculty-publications/${encodeURIComponent(String(id))}`, { method: 'DELETE' })
    success.value = 'Publication deleted.'
    await loadPublications(page.value)
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete publication.'
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadPublications(1)
  }, 250)
})

watch(selectedFacultyId, () => {
  page.value = 1
  void loadPublications(1)
})

watch(canManageAdmin, async (ok) => {
  if (!ok) return
  await loadFaculty()
  await loadPublications(1)
}, { immediate: true })
</script>
