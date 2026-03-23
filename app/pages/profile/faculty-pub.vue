<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Faculty Publications</h1>

      <div v-if="authLoading" class="text-center py-8">
        <div class="text-gray-500">Loading profile...</div>
      </div>

      <div v-else-if="!meUser" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">You must be signed in to edit your profile.</div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">{{ error }}</div>
      </div>

      <div v-else class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Publications</h2>
          <button
            type="button"
            @click="openEditModal(null)"
            class="px-3 py-2 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors"
          >
            Add Publication
          </button>
        </div>

        <div v-if="publications.length === 0" class="text-sm text-gray-500 py-4">
          No publications yet. Click Add Publication to add one.
        </div>

        <div v-else class="overflow-x-auto border border-gray-200 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Release date</th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Cover</th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(pub, idx) in publications" :key="pub.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{{ typeLabel(pub.type) }}</td>
                <td class="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" :title="pub.title">{{ pub.title || '—' }}</td>
                <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{{ formatReleaseDate(pub.releaseDate) }}</td>
                <td class="px-4 py-2 whitespace-nowrap">
                  <div class="w-12 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-gray-200">
                    <img v-if="pub.imageUrl" :src="pub.imageUrl" :alt="pub.title" class="w-full h-full object-cover" />
                    <span v-else class="text-xs text-gray-400">—</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-right text-sm whitespace-nowrap">
                  <button
                    type="button"
                    @click="openEditModal(idx)"
                    class="text-[rgba(13,94,130,1)] hover:text-[rgba(10,69,92,1)] font-medium mr-3"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    @click="removePublication(idx)"
                    class="text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

    <!-- Edit modal -->
    <UModal v-model:open="editModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ editingIndex === null ? 'New publication' : 'Edit publication' }}</h3>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  v-model="editingPub.type"
                  class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option
                    v-for="opt in PUBLICATION_TYPE_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Release date</label>
                <input
                  v-model="editingPub.releaseDate"
                  type="date"
                  class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                v-model="editingPub.title"
                type="text"
                class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Publication title"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="editingPub.description"
                rows="3"
                class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Brief description"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
              <input
                v-model="editingPub.link"
                type="url"
                class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div class="flex items-center gap-4">
              <div class="w-20 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
                <img v-if="editingPub.imageUrl" :src="editingPub.imageUrl" :alt="editingPub.title" class="w-full h-full object-cover" />
                <span v-else class="text-xs text-gray-500">No image</span>
              </div>
              <div class="flex-1">
                <input
                  ref="editModalImageInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleEditModalImageChange"
                />
                <button
                  type="button"
                  @click="editModalImageInput?.click()"
                  :disabled="uploadingImageId !== null"
                  class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ uploadingImageId !== null ? 'Uploading...' : editingPub.imageId ? 'Change image' : 'Add image' }}
                </button>
                <button
                  v-if="editingPub.imageId"
                  type="button"
                  @click="editingPub.imageId = null; editingPub.imageUrl = null"
                  class="ml-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  Remove image
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="editModalOpen = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="saveEditModal"
              :disabled="savingEdit"
              class="px-4 py-2 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ savingEdit ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
type EditablePublication = {
  id: string
  apiId?: string | number | null
  type: string
  title: string
  description: string
  link: string | null
  releaseDate: string | null
  imageId: number | null
  imageUrl: string | null
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
  { label: 'Other Media', value: 'other-media' }
]

const { user: meUser, loading: authLoading, refresh } = useMe()
const config = useRuntimeConfig()
const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

const savingEdit = ref(false)
const error = ref<string | null>(null)
const uploadingImageId = ref<string | null>(null)
const editModalImageInput = ref<HTMLInputElement | null>(null)

const editModalOpen = ref(false)
const editingIndex = ref<number | null>(null) // null = new publication
const editingPub = ref<EditablePublication>({
  id: '',
  apiId: null,
  type: 'book',
  title: '',
  description: '',
  link: null,
  releaseDate: null,
  imageId: null,
  imageUrl: null
})

const normalizeUrl = (url: string) => {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? `${payloadBaseUrl}${url}` : `${payloadBaseUrl}/${url}`
}

const publications = ref<EditablePublication[]>([])

function typeLabel(type: string) {
  const opt = PUBLICATION_TYPE_OPTIONS.find(o => o.value === type)
  return opt ? opt.label : type || 'Other'
}

function formatReleaseDate(date: string | null) {
  if (!date) return '—'
  const d = date.slice(0, 10)
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return d
  }
}

function lexicalToText(value: any): string {
  if (!value?.root?.children) return typeof value === 'string' ? value : ''
  const extract = (children: any[]): string =>
    children
      .map((child) => {
        if (child?.type === 'text' && typeof child?.text === 'string') return child.text
        if (Array.isArray(child?.children)) return extract(child.children)
        return ''
      })
      .join('')
  return extract(value.root.children)
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
          children: [
            { type: 'text', text: text || '', version: 1 }
          ]
        }
      ]
    }
  }
}

function mapPublicationFromApi(p: any): EditablePublication {
  return {
    id: String(p?.id || `${Date.now()}-${Math.random()}`),
    apiId: p?.id ?? null,
    type: p?.type || 'book',
    title: p?.title || '',
    description: lexicalToText(p?.description),
    link: p?.link || null,
    releaseDate: p?.releaseDate ? String(p.releaseDate).slice(0, 10) : null,
    imageId: typeof p?.image === 'number' ? p.image : (p?.image?.id ?? null),
    imageUrl: p?.image?.url ? normalizeUrl(p.image.url) : null
  }
}

function applyUser(user: any) {
  const pubs: any[] = Array.isArray(user.publications) ? user.publications : []
  publications.value = pubs.map(mapPublicationFromApi)
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })

function openEditModal(index: number | null) {
  if (index === null) {
    editingIndex.value = null
    editingPub.value = {
      id: `${Date.now()}-${Math.random()}`,
      apiId: null,
      type: 'book',
      title: '',
      description: '',
      link: null,
      releaseDate: null,
      imageId: null,
      imageUrl: null
    }
  } else {
    const pub = publications.value[index]
    if (!pub) return
    editingIndex.value = index
    editingPub.value = { ...pub }
  }
  editModalOpen.value = true
}

async function saveEditModal() {
  savingEdit.value = true
  error.value = null
  try {
    const pub = { ...editingPub.value }
    const body: Record<string, any> = {
      type: pub.type || 'book',
      title: pub.title || '',
      image: pub.imageId ?? null,
      description: textToLexical(pub.description || ''),
      link: pub.link || null,
      releaseDate: pub.releaseDate || null
    }

    let saved: any
    if (pub.apiId) {
      saved = await $fetch(`/api/connect-user-publications/update/${pub.apiId}`, {
        method: 'PATCH',
        body
      })
    } else {
      saved = await $fetch('/api/connect-user-publications/create', {
        method: 'POST',
        body
      })
    }

    const mapped = mapPublicationFromApi(saved)
    if (editingIndex.value === null) {
      publications.value.unshift(mapped)
    } else {
      publications.value[editingIndex.value] = mapped
    }
    editModalOpen.value = false
  } catch (err: any) {
    console.error('Error saving publications:', err)
    error.value = err.data?.message || 'Failed to save'
  } finally {
    savingEdit.value = false
  }
}

async function handleEditModalImageChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    uploadingImageId.value = 'modal'
    const form = new FormData()
    form.append('file', file)
    form.append('kind', 'pubs-images')
    const media: any = await $fetch('/api/connect-user-media/upload', { method: 'POST', body: form })
    editingPub.value.imageId = media.id
    editingPub.value.imageUrl = media.url ? normalizeUrl(media.url) : null
  } catch (err: any) {
    console.error('Error uploading image:', err)
    error.value = err.data?.message || 'Failed to upload image'
  } finally {
    uploadingImageId.value = null
  }
  target.value = ''
}

async function removePublication(idx: number) {
  const pub = publications.value[idx]
  if (!pub) return
  try {
    error.value = null
    if (pub.apiId) {
      await $fetch(`/api/connect-user-publications/delete/${pub.apiId}`, {
        method: 'DELETE'
      })
    }
    publications.value.splice(idx, 1)
  } catch (err: any) {
    console.error('Error removing publication:', err)
    error.value = err.data?.message || 'Failed to remove publication'
  }
}

onMounted(() => {
  if (import.meta.client) refresh()
})
</script>
