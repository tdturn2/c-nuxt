<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between gap-3 mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Edit Listing</h1>
          <NuxtLink :to="`/marketplace/${id}`" class="text-sm text-[rgba(13,94,130,1)] hover:underline">
            Back to Listing
          </NuxtLink>
        </div>

        <template v-if="pending">
          <ConnectDirectorySkeleton :show-count-line="false" :show-pagination-row="false" />
        </template>

        <form v-else class="space-y-6" @submit.prevent="onSubmit">
          <div v-if="submitError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">{{ submitError }}</div>
          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input v-model="form.title" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea v-model="form.description" rows="5" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select v-model="form.category" class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="furniture">Furniture</option>
                <option value="books">Books</option>
                <option value="housing">Housing</option>
                <option value="electronics">Electronics</option>
                <option value="other">Other</option>
              </select>
              <select v-if="showListingType" v-model="form.listingType" class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
                <option value="short_term_rental">Short Term Rental</option>
              </select>
              <select v-model="form.status" class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select v-model="form.priceType" class="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="amount">Fixed Price</option>
                <option value="free">Free</option>
                <option value="contact">Contact for Price</option>
              </select>
              <input
                v-if="form.priceType === 'amount'"
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.01"
                class="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <h2 class="text-lg font-semibold text-gray-900">Images</h2>

            <div v-if="mediaDraft.length" class="space-y-2">
              <div
                v-for="(item, index) in mediaDraft"
                :key="item.id"
                class="flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span class="truncate">{{ item.filename || `Image #${item.id}` }}</span>
                <div class="flex items-center gap-2">
                  <button type="button" class="text-gray-600 hover:text-gray-800 disabled:opacity-40" :disabled="index === 0" @click="moveExistingImage(index, -1)">Up</button>
                  <button type="button" class="text-gray-600 hover:text-gray-800 disabled:opacity-40" :disabled="index === mediaDraft.length - 1" @click="moveExistingImage(index, 1)">Down</button>
                  <button type="button" class="text-red-600 hover:text-red-700" @click="removeExistingImage(item.id)">Remove</button>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500">No images currently attached.</p>

            <input
              type="file"
              accept="image/*"
              multiple
              class="block w-full text-sm text-gray-700"
              @change="onFilesSelected"
            />
            <p class="text-xs text-gray-500">Add up to 10 total images.</p>

            <div v-if="selectedFiles.length" class="space-y-2">
              <div
                v-for="(entry, index) in selectedFiles"
                :key="entry.id"
                class="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span class="truncate">{{ entry.file.name }}</span>
                <div class="flex items-center gap-2">
                  <button type="button" class="text-gray-600 hover:text-gray-800 disabled:opacity-40 text-xs" :disabled="index === 0" @click="moveSelectedFile(index, -1)">Up</button>
                  <button type="button" class="text-gray-600 hover:text-gray-800 disabled:opacity-40 text-xs" :disabled="index === selectedFiles.length - 1" @click="moveSelectedFile(index, 1)">Down</button>
                  <button type="button" class="text-red-600 hover:text-red-700 text-xs" @click="removeSelectedFile(entry.id)">Remove</button>
                  <span class="text-xs text-gray-500">{{ fileStatus(index) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button type="submit" :disabled="submitting" class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50">
              {{ submitting ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

type MarketplaceListing = {
  id: number
  title: string
  description: string
  category: string
  listingType: 'sale' | 'rent' | 'short_term_rental'
  priceType: 'amount' | 'free' | 'contact'
  price?: number | null
  status: 'active' | 'sold' | 'archived'
  media?: Array<{ id: number; filename?: string; url?: string } | number>
}

const { data, pending, error } = await useLazyFetch<MarketplaceListing>(() => `/api/marketplace/${id.value}`, {
  watch: [id],
})

const form = ref({
  title: '',
  description: '',
  category: 'other',
  listingType: 'sale' as 'sale' | 'rent' | 'short_term_rental',
  priceType: 'amount' as 'amount' | 'free' | 'contact',
  price: null as number | null,
  status: 'active' as 'active' | 'sold' | 'archived',
})

const showListingType = computed(() => form.value.category === 'housing')
const mediaDraft = ref<Array<{ id: number; filename?: string; url?: string }>>([])
const selectedFiles = ref<Array<{ id: string; file: File }>>([])
const uploadedMediaIds = ref<number[]>([])

watch(data, (doc) => {
  if (!doc) return
  const existingMedia = Array.isArray(doc.media)
    ? doc.media
        .map((entry) => {
          if (typeof entry === 'number') return { id: entry }
          if (entry && typeof entry === 'object' && typeof entry.id === 'number') return entry
          return null
        })
        .filter(Boolean) as Array<{ id: number; filename?: string; url?: string }>
    : []

  form.value = {
    title: doc.title || '',
    description: doc.description || '',
    category: doc.category || 'other',
    listingType: doc.listingType || 'sale',
    priceType: doc.priceType || 'amount',
    price: typeof doc.price === 'number' ? doc.price : null,
    status: doc.status || 'active',
  }
  mediaDraft.value = existingMedia
  selectedFiles.value = []
  uploadedMediaIds.value = []
}, { immediate: true })

const submitting = ref(false)
const submitError = ref<string | null>(null)

watch(
  () => form.value.category,
  (category) => {
    if (category !== 'housing') form.value.listingType = 'sale'
  },
)

function removeExistingImage(mediaId: number) {
  mediaDraft.value = mediaDraft.value.filter((item) => item.id !== mediaId)
}

function moveExistingImage(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= mediaDraft.value.length) return
  const copy = [...mediaDraft.value]
  const [moved] = copy.splice(index, 1)
  copy.splice(target, 0, moved)
  mediaDraft.value = copy
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const remainingSlots = Math.max(0, 10 - mediaDraft.value.length)
  selectedFiles.value = files.slice(0, remainingSlots).map((file) => ({
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
    file,
  }))
  uploadedMediaIds.value = []
}

function moveSelectedFile(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= selectedFiles.value.length) return
  const copy = [...selectedFiles.value]
  const [moved] = copy.splice(index, 1)
  copy.splice(target, 0, moved)
  selectedFiles.value = copy
}

function removeSelectedFile(id: string) {
  selectedFiles.value = selectedFiles.value.filter((file) => file.id !== id)
}

function fileStatus(index: number): string {
  if (uploadedMediaIds.value[index]) return 'Uploaded'
  if (submitting.value) return 'Uploading...'
  return 'Pending'
}

async function uploadMarketplaceMedia(file: File): Promise<number> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('alt', form.value.title || file.name)

  const response = await fetch('/api/marketplace/media/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json?.message || json?.statusMessage || 'Failed to upload image')
  }
  if (!json?.id) {
    throw new Error('Upload succeeded but no media ID was returned')
  }
  return Number(json.id)
}

async function onSubmit() {
  submitError.value = null
  submitting.value = true
  try {
    const newMediaIds: number[] = []
    for (const entry of selectedFiles.value) {
      const mediaId = await uploadMarketplaceMedia(entry.file)
      newMediaIds.push(mediaId)
      uploadedMediaIds.value = [...newMediaIds]
    }

    const mergedMediaIds = [...mediaDraft.value.map((item) => item.id), ...newMediaIds]

    await $fetch(`/api/marketplace/${id.value}`, {
      method: 'PATCH',
      body: {
        ...form.value,
        listingType: showListingType.value ? form.value.listingType : 'sale',
        price: form.value.priceType === 'amount' ? (form.value.price ?? 0) : null,
        media: mergedMediaIds,
      },
      credentials: 'include',
    })
    router.push(`/marketplace/${id.value}`)
  } catch (err: any) {
    submitError.value = err?.data?.message || err?.message || 'Failed to save listing'
  } finally {
    submitting.value = false
  }
}

watch(error, (e) => {
  if (e) submitError.value = (e as any)?.data?.message || (e as any)?.statusMessage || 'Failed to load listing'
})
</script>
