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
              <textarea
                v-model="form.description"
                required
                rows="5"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="Describe condition, pickup details, etc."
              />
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
            <input
              type="file"
              accept="image/*"
              multiple
              class="block w-full text-sm text-gray-700"
              @change="onFilesSelected"
            />
            <p class="text-xs text-gray-500">Upload up to 10 images.</p>

            <div v-if="selectedFiles.length" class="space-y-2">
              <div
                v-for="(entry, index) in selectedFiles"
                :key="entry.id"
                class="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span class="truncate">{{ entry.file.name }}</span>
                <span class="text-xs text-gray-500">{{ fileStatus(index) }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="submitting"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ submitting ? 'Creating...' : 'Create Listing' }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const form = ref({
  title: '',
  description: '',
  category: '',
  listingType: 'sale',
  priceType: 'amount' as 'amount' | 'free' | 'contact',
  price: null as number | null,
})

const selectedFiles = ref<Array<{ id: string; file: File }>>([])
const uploadedMediaIds = ref<number[]>([])

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)
const showListingType = computed(() => form.value.category === 'housing')

watch(
  () => form.value.category,
  (category) => {
    if (category !== 'housing') form.value.listingType = 'sale'
  },
)

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  selectedFiles.value = files.slice(0, 10).map((file) => ({
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
    file,
  }))
  uploadedMediaIds.value = []
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
  submitSuccess.value = false
  submitting.value = true

  try {
    if (!form.value.title.trim() || !form.value.description.trim() || !form.value.category) {
      throw new Error('Please complete all required fields.')
    }
    if (showListingType.value && !form.value.listingType) {
      throw new Error('Please select a listing type.')
    }

    const mediaIds: number[] = []
    for (const entry of selectedFiles.value) {
      const id = await uploadMarketplaceMedia(entry.file)
      mediaIds.push(id)
      uploadedMediaIds.value = [...mediaIds]
    }

    const payload: Record<string, unknown> = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
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
    submitError.value = err?.data?.message ?? err?.message ?? 'Failed to create listing.'
  } finally {
    submitting.value = false
  }
}
</script>
