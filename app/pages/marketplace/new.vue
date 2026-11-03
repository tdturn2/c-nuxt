<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between gap-3 mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Create Listing</h1>
          <NuxtLink to="/marketplace" class="text-sm text-[rgba(13,94,130,1)] hover:underline">
            Back to Marketplace
          </NuxtLink>
        </div>

        <form class="space-y-6" @submit.prevent="onSubmit">
          <div v-if="submitError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
            {{ submitError }}
          </div>
          <div v-if="submitSuccess" class="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
            Listing created successfully.
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <h2 class="text-lg font-semibold text-gray-900">Listing details</h2>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Title <span class="text-red-500">*</span></label>
              <input
                v-model="form.title"
                type="text"
                required
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="e.g. Dining table with 4 chairs"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description <span class="text-red-500">*</span></label>
              <ConnectFaqAnswerEditor v-model="descriptionDoc" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category <span class="text-red-500">*</span></label>
                <select v-model="form.category" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="">Select</option>
                  <option value="furniture">Furniture</option>
                  <option value="books">Books</option>
                  <option value="housing">Housing</option>
                  <option value="electronics">Electronics</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div v-if="showListingType">
                <label class="block text-sm font-medium text-gray-700 mb-1">Listing Type <span class="text-red-500">*</span></label>
                <select v-model="form.listingType" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="">Select</option>
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                  <option value="short_term_rental">Short Term Rental</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                <select v-model="form.priceType" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="amount">Fixed Price</option>
                  <option value="free">Free</option>
                  <option value="contact">Contact for Price</option>
                </select>
              </div>
              <div v-if="form.priceType === 'amount'">
                <label class="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input v-model.number="form.price" type="number" min="0" step="0.01" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <h2 class="text-lg font-semibold text-gray-900">Images</h2>
            <div>
              <input
                id="marketplace-images"
                type="file"
                accept="image/*"
                multiple
                class="sr-only"
                @change="onFilesSelected"
              />
              <label
                for="marketplace-images"
                class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
              >
                <UIcon name="i-heroicons-photo" class="h-4 w-4" />
                Choose images
              </label>
              <p class="mt-2 text-xs text-gray-500">Upload up to 10 images. Phone photos are resized automatically, then uploaded.</p>
            </div>

            <div v-if="selectedFiles.length" class="space-y-2">
              <div
                v-for="entry in selectedFiles"
                :key="entry.id"
                class="flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm"
                :class="entry.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-200'"
              >
                <div class="min-w-0">
                  <p class="truncate text-gray-900">{{ entry.file.name }}</p>
                  <p
                    class="text-xs"
                    :class="entry.status === 'failed' ? 'text-red-600' : entry.status === 'uploaded' ? 'text-green-700' : 'text-gray-500'"
                  >
                    {{ entry.status === 'failed' && entry.error ? entry.error : fileStatus(entry) }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-3">
                  <button
                    v-if="entry.status === 'failed'"
                    type="button"
                    class="text-xs font-medium text-[rgba(13,94,130,1)] hover:underline"
                    @click="retryUpload(entry.id)"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    class="text-xs font-medium text-red-600 hover:text-red-700"
                    @click="removeSelectedFile(entry.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="submitting || imagesBusy"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ submitting ? 'Creating...' : imagesBusy ? 'Uploading images...' : 'Create Listing' }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { compressMarketplaceImage } from '~/utils/compressMarketplaceImage'
import {
  emptyMarketplaceDescriptionDoc,
  marketplaceDescriptionText,
  marketplaceDescriptionToHtml,
} from '~/utils/marketplaceDescription'

const router = useRouter()

const form = ref({
  title: '',
  category: '',
  listingType: 'sale',
  priceType: 'amount' as 'amount' | 'free' | 'contact',
  price: null as number | null,
})
const descriptionDoc = ref(emptyMarketplaceDescriptionDoc())

type SelectedImage = {
  id: string
  file: File
  status: 'uploading' | 'uploaded' | 'failed'
  mediaId?: number
  error?: string
}

const selectedFiles = ref<SelectedImage[]>([])
const uploadTasks = new Map<string, Promise<void>>()
const uploadControllers = new Map<string, AbortController>()

const submitting = ref(false)
const imagesBusy = computed(() => selectedFiles.value.some((entry) => entry.status === 'uploading'))
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)
const showListingType = computed(() => form.value.category === 'housing')

watch(
  () => form.value.category,
  (category) => {
    if (category !== 'housing') form.value.listingType = 'sale'
  },
)

function apiErrorMessage(source: any, fallback: string): string {
  return (
    source?.data?.error ||
    source?.data?.message ||
    source?.statusMessage ||
    source?.message ||
    fallback
  )
}

function patchFile(id: string, patch: Partial<SelectedImage>) {
  selectedFiles.value = selectedFiles.value.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const room = Math.max(0, 10 - selectedFiles.value.length)
  const files = Array.from(input.files || []).slice(0, room)
  submitError.value = null
  const next = files.map((file) => ({
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    status: 'uploading' as const,
  }))
  selectedFiles.value = [...selectedFiles.value, ...next]
  for (const entry of next) startUpload(entry)
  input.value = ''
}

function removeSelectedFile(id: string) {
  uploadControllers.get(id)?.abort()
  uploadControllers.delete(id)
  uploadTasks.delete(id)
  selectedFiles.value = selectedFiles.value.filter((file) => file.id !== id)
  if (!selectedFiles.value.some((file) => file.status === 'failed')) submitError.value = null
}

function retryUpload(id: string) {
  const entry = selectedFiles.value.find((file) => file.id === id)
  if (!entry || entry.status === 'uploading') return
  submitError.value = null
  patchFile(id, { status: 'uploading', error: undefined, mediaId: undefined })
  startUpload({ ...entry, status: 'uploading', error: undefined, mediaId: undefined })
}

function fileStatus(entry: SelectedImage): string {
  if (entry.status === 'uploaded') return 'Uploaded'
  if (entry.status === 'failed') return 'Failed'
  return 'Uploading...'
}

function startUpload(entry: SelectedImage) {
  uploadControllers.get(entry.id)?.abort()
  const controller = new AbortController()
  uploadControllers.set(entry.id, controller)
  const task = (async () => {
    try {
      const mediaId = await uploadMarketplaceMedia(entry.file, controller.signal)
      if (!selectedFiles.value.some((file) => file.id === entry.id)) return
      patchFile(entry.id, { status: 'uploaded', mediaId, error: undefined })
    } catch (err: any) {
      if (controller.signal.aborted || !selectedFiles.value.some((file) => file.id === entry.id)) return
      const message = apiErrorMessage(err, 'Failed to upload image')
      patchFile(entry.id, { status: 'failed', error: message })
      submitError.value = `${entry.file.name} failed to upload. Remove it, or retry, then create the listing.`
    } finally {
      if (uploadControllers.get(entry.id) === controller) uploadControllers.delete(entry.id)
      if (uploadTasks.get(entry.id) === task) uploadTasks.delete(entry.id)
    }
  })()
  uploadTasks.set(entry.id, task)
}

async function uploadMarketplaceMedia(file: File, signal?: AbortSignal): Promise<number> {
  const prepared = await compressMarketplaceImage(file)
  if (signal?.aborted) throw new DOMException('The upload was cancelled.', 'AbortError')
  const formData = new FormData()
  formData.append('file', prepared)
  formData.append('alt', form.value.title || prepared.name)

  const response = await fetch('/api/marketplace/media/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    signal,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(apiErrorMessage(json, 'Failed to upload image'))
  }
  if (!json?.id) {
    throw new Error('Upload succeeded but no media ID was returned')
  }
  return Number(json.id)
}

async function onSubmit() {
  submitError.value = null
  submitSuccess.value = false
  submitting.value = true

  try {
    const description = marketplaceDescriptionToHtml(descriptionDoc.value)
    if (!form.value.title.trim() || !marketplaceDescriptionText(description) || !form.value.category) {
      throw new Error('Please complete all required fields.')
    }
    if (showListingType.value && !form.value.listingType) {
      throw new Error('Please select a listing type.')
    }

    await Promise.all([...uploadTasks.values()])
    const failed = selectedFiles.value.filter((entry) => entry.status === 'failed')
    if (failed.length) {
      throw new Error('Remove the image that failed to upload, or retry it, then create the listing.')
    }
    const mediaIds = selectedFiles.value
      .map((entry) => entry.mediaId)
      .filter((id): id is number => typeof id === 'number')

    const payload: Record<string, unknown> = {
      title: form.value.title.trim(),
      description,
      category: form.value.category,
      listingType: showListingType.value ? form.value.listingType : 'sale',
      priceType: form.value.priceType,
      media: mediaIds,
      status: 'active',
    }
    if (form.value.priceType === 'amount') payload.price = form.value.price ?? 0

    await $fetch('/api/marketplace/create', {
      method: 'POST',
      body: payload,
      credentials: 'include',
    })

    submitSuccess.value = true
    setTimeout(() => {
      router.push('/marketplace')
    }, 500)
  } catch (err: any) {
    submitError.value = apiErrorMessage(err, 'Failed to create listing.')
  } finally {
    submitting.value = false
  }
}
</script>
