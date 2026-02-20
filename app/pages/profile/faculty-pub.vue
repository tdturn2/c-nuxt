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

      <div v-else class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Publications</h2>
          <button
            type="button"
            @click="addPublication"
            class="px-3 py-2 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors"
          >
            Add Publication
          </button>
        </div>

        <div v-if="publications.length === 0" class="text-sm text-gray-500">
          No publications yet.
        </div>

        <div v-for="(pub, idx) in publications" :key="pub.id" class="border border-gray-200 rounded-lg p-4 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  v-model="pub.type"
                  class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="book">Book</option>
                  <option value="podcast-episode">Podcast Episode</option>
                  <option value="article">Article</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Release Date</label>
                <input
                  v-model="pub.releaseDate"
                  type="date"
                  class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="button"
              @click="removePublication(idx)"
              class="text-sm text-red-600 hover:text-red-800 hover:underline"
            >
              Remove
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              v-model="pub.title"
              type="text"
              class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              v-model="pub.description"
              rows="3"
              class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Purchase Link (optional)</label>
            <input
              v-model="pub.purchaseLink"
              type="url"
              class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div class="flex items-center gap-4">
            <div class="w-20 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-gray-200">
              <img v-if="pub.imageUrl" :src="pub.imageUrl" :alt="pub.title" class="w-full h-full object-cover" />
              <span v-else class="text-xs text-gray-500">No image</span>
            </div>
            <div class="flex-1">
              <input
                :ref="(el) => setImageInputRef(el as HTMLInputElement | null, pub.id)"
                type="file"
                accept="image/*"
                class="hidden"
                @change="(e) => handlePublicationImageChange(e, pub.id)"
              />
              <button
                type="button"
                @click="triggerImageSelect(pub.id)"
                :disabled="uploadingImageId === pub.id"
                class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ uploadingImageId === pub.id ? 'Uploading...' : 'Change Image' }}
              </button>
              <button
                v-if="pub.imageId"
                type="button"
                @click="clearPublicationImage(pub.id)"
                class="ml-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                Remove Image
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <NuxtLink
            to="/"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </NuxtLink>
          <button
            type="button"
            @click="save"
            :disabled="saving || !hasChanges"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type EditablePublication = {
  id: string
  type: string
  title: string
  description: string
  purchaseLink: string | null
  releaseDate: string | null // yyyy-mm-dd
  imageId: number | null
  imageUrl: string | null
}

const { user: meUser, loading: authLoading, refresh } = useMe()
const config = useRuntimeConfig()
const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

const saving = ref(false)
const error = ref<string | null>(null)

const uploadingImageId = ref<string | null>(null)
const imageInputRefs = new Map<string, HTMLInputElement>()

const setImageInputRef = (el: HTMLInputElement | null, pubId: string) => {
  if (!el) return
  imageInputRefs.set(pubId, el)
}

const triggerImageSelect = (pubId: string) => {
  imageInputRefs.get(pubId)?.click()
}

const normalizeUrl = (url: string) => {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? `${payloadBaseUrl}${url}` : `${payloadBaseUrl}/${url}`
}

const publications = ref<EditablePublication[]>([])
const initialJson = ref<string>('')

const hasChanges = computed(() => JSON.stringify(publications.value) !== initialJson.value)

function applyUser(user: any) {
  const pubs: any[] = Array.isArray(user.publications) ? user.publications : []
  publications.value = pubs.map((p: any) => ({
    id: p.id || `${Date.now()}-${Math.random()}`,
    type: p.type || 'book',
    title: p.title || '',
    description: p.description || '',
    purchaseLink: p.purchaseLink || null,
    releaseDate: p.releaseDate ? String(p.releaseDate).slice(0, 10) : null,
    imageId: typeof p.image === 'number' ? p.image : (p.image?.id ?? null),
    imageUrl: p.image?.url ? normalizeUrl(p.image.url) : null
  }))
  initialJson.value = JSON.stringify(publications.value)
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })

const addPublication = () => {
  publications.value.unshift({
    id: `${Date.now()}-${Math.random()}`,
    type: 'book',
    title: '',
    description: '',
    purchaseLink: null,
    releaseDate: null,
    imageId: null,
    imageUrl: null
  })
}

const removePublication = (idx: number) => {
  publications.value.splice(idx, 1)
}

const clearPublicationImage = (pubId: string) => {
  const pub = publications.value.find(p => p.id === pubId)
  if (!pub) return
  pub.imageId = null
  pub.imageUrl = null
}

const handlePublicationImageChange = async (e: Event, pubId: string) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    uploadingImageId.value = pubId
    const form = new FormData()
    form.append('file', file)

    const media: any = await $fetch('/api/media/upload', {
      method: 'POST',
      body: form
    })

    const pub = publications.value.find(p => p.id === pubId)
    if (pub) {
      pub.imageId = media.id
      pub.imageUrl = media.url || null
    }

    // reset input
    target.value = ''
  } catch (err: any) {
    console.error('Error uploading publication image:', err)
    error.value = err.data?.message || 'Failed to upload image'
  } finally {
    uploadingImageId.value = null
  }
}

const save = async () => {
  if (!hasChanges.value || saving.value) return
  try {
    saving.value = true
    error.value = null

    const payloadPublications = publications.value.map(p => ({
      id: p.id,
      type: p.type || 'other',
      title: p.title || '',
      description: p.description || '',
      purchaseLink: p.purchaseLink || null,
      releaseDate: p.releaseDate ? new Date(p.releaseDate).toISOString() : null,
      image: p.imageId || null
    }))

    const updated: any = await $fetch('/api/employees/profile', {
      method: 'PATCH',
      body: {
        publications: payloadPublications
      }
    })

    const pubs: any[] = Array.isArray(updated.publications) ? updated.publications : []
    publications.value = pubs.map((p: any) => ({
      id: p.id || `${Date.now()}-${Math.random()}`,
      type: p.type || 'book',
      title: p.title || '',
      description: p.description || '',
      purchaseLink: p.purchaseLink || null,
      releaseDate: p.releaseDate ? String(p.releaseDate).slice(0, 10) : null,
      imageId: typeof p.image === 'number' ? p.image : (p.image?.id ?? null),
      imageUrl: p.image?.url ? normalizeUrl(p.image.url) : null
    }))

    initialJson.value = JSON.stringify(publications.value)
  } catch (err: any) {
    console.error('Error updating faculty profile:', err)
    error.value = err.data?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (import.meta.client) refresh()
})
</script>

