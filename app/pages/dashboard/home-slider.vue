<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Home Slider</h1>
          <p class="mt-1 text-sm text-gray-600">Manage image slides and links for the Connect homepage.</p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <form class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm" @submit.prevent="saveItem">
            <h2 class="text-base font-semibold text-gray-900">{{ editingId ? 'Edit slide' : 'Add slide' }}</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <input v-model="form.title" type="text" placeholder="Title (defaults to filename)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input v-model="form.href" type="text" placeholder="Link (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input :value="selectedImageLabel" type="text" readonly placeholder="No image selected" class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
              <input v-model.number="form.sortOrder" type="number" placeholder="Sort order" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input v-model="form.startAt" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input v-model="form.endAt" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
            <details class="mt-3 rounded-lg border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden">
              <summary class="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                <span class="text-sm font-medium text-gray-900">Page media library selector</span>
                <p class="text-xs text-gray-500">Upload or pick from Connect Page Assets.</p>
              </summary>
              <div class="border-t border-gray-100 p-3">
                <div class="grid gap-3 sm:grid-cols-2 mb-3">
                  <input
                    v-model="uploadAlt"
                    type="text"
                    placeholder="Image alt/name (optional)"
                    class="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                  <div class="flex gap-2">
                    <input ref="uploadInputRef" type="file" accept="image/*" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                    <button
                      type="button"
                      class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      :disabled="uploadingImage"
                      @click="uploadImageAsset"
                    >
                      {{ uploadingImage ? 'Uploading...' : 'Upload' }}
                    </button>
                  </div>
                </div>
                <UInput
                  v-model="assetLibrarySearch"
                  type="search"
                  placeholder="Search assets..."
                  icon="i-lucide-search"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
                <ul class="mt-2 max-h-56 overflow-auto rounded-md border border-gray-200 divide-y divide-gray-200">
                  <li
                    v-for="asset in filteredMediaAssets"
                    :key="String(resolveAssetId(asset) ?? mediaLabel(asset))"
                    class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-gray-900">{{ mediaLabel(asset) }}</p>
                      <p class="truncate text-xs text-gray-500">{{ asset?.file?.filename || '' }}</p>
                    </div>
                    <button
                      type="button"
                      :class="isSelectedAsset(asset)
                        ? 'rounded border border-[rgba(13,94,130,0.35)] bg-[rgba(13,94,130,0.08)] px-2 py-1 text-xs text-[rgba(10,69,92,1)]'
                        : 'rounded border border-gray-200 bg-white px-2 py-1 text-xs text-[rgba(13,94,130,1)] hover:bg-gray-50'"
                      @click="selectImage(asset)"
                    >
                      {{ isSelectedAsset(asset) ? 'Selected' : 'Select' }}
                    </button>
                  </li>
                  <li v-if="!filteredMediaAssets.length" class="px-3 py-3 text-sm text-gray-500">No matching assets.</li>
                </ul>
              </div>
            </details>
            <p class="mt-2 text-xs text-gray-500">
              Selected image ID: {{ selectedImageId ?? 'none' }}
            </p>
            <div class="mt-3 flex items-center gap-4 text-sm">
              <label class="inline-flex items-center gap-2"><input v-model="form.active" type="checkbox"> Active</label>
              <label class="inline-flex items-center gap-2"><input v-model="form.openInNewTab" type="checkbox"> Open in new tab</label>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
                {{ editingId ? 'Update slide' : 'Create slide' }}
              </button>
              <button
                v-if="editingId"
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="resetForm"
              >
                Cancel
              </button>
            </div>
          </form>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>

          <p class="mb-2 text-xs text-gray-500">
            Drag the handle to reorder slides.
            <span v-if="savingOrder" class="text-[rgba(13,94,130,1)]">Saving order...</span>
          </p>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="w-10 px-2 py-2"><span class="sr-only">Reorder</span></th>
                  <th class="px-4 py-2 text-left font-semibold">Preview</th>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Link</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-left font-semibold">Order</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="7" class="px-4 py-4 text-gray-500">Loading slider items...</td>
                </tr>
                <tr v-else-if="!items.length" class="border-t border-gray-200">
                  <td colspan="7" class="px-4 py-4 text-gray-500">No slider items found.</td>
                </tr>
                <tr
                  v-for="(item, itemIndex) in items"
                  :key="item.id"
                  class="border-t border-gray-200 transition-colors"
                  :class="{
                    'opacity-60': draggedId === item.id,
                    'bg-[rgba(13,94,130,0.06)]': dropTargetId === item.id,
                  }"
                  @dragover="onRowDragOver($event, item)"
                  @dragleave="dropTargetId = null"
                  @drop="onRowDrop($event, itemIndex)"
                >
                  <td class="px-2 py-3 align-middle">
                    <span
                      class="inline-flex cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing touch-none"
                      aria-label="Drag to reorder"
                      draggable="true"
                      @dragstart="onRowDragStart($event, item, itemIndex)"
                      @dragend="onRowDragEnd"
                    >
                      <UIcon name="i-heroicons-bars-3-bottom-right" class="h-5 w-5" />
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <img
                      v-if="slidePreviewUrl(item)"
                      :src="slidePreviewUrl(item) || ''"
                      :alt="item.title || 'Slide preview'"
                      class="h-10 w-16 rounded border border-gray-200 bg-gray-50 object-cover"
                    >
                    <span v-else class="text-gray-400">—</span>
                  </td>
                  <td class="px-4 py-3 font-medium text-gray-900">{{ item.title }}</td>
                  <td class="px-4 py-3 text-gray-700 truncate max-w-[260px]">{{ item.href }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ item.active ? 'Active' : 'Inactive' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ item.sortOrder ?? 0 }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="startEdit(item)">Edit</button>
                    <button type="button" class="text-red-700 hover:underline" @click="removeItem(item.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { DashboardSliderItem } from '~/composables/useDashboardContent'

const { listSliderItems, createSliderItem, updateSliderItem, deleteSliderItem } = useDashboardContent()
const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', { key: 'dashboard-home-slider-me' })

const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const items = ref<DashboardSliderItem[]>([])
const mediaAssets = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadAlt = ref('')
const uploadingImage = ref(false)
const assetLibrarySearch = ref('')
const editingId = ref<string | number | null>(null)
const form = ref({
  title: '',
  href: '',
  image: null as string | number | null,
  active: true,
  openInNewTab: false,
  sortOrder: 0,
  startAt: '',
  endAt: '',
})

function resolveAssetId(asset: any): string | number | null {
  if (!asset || typeof asset !== 'object') return null
  const id = asset.id ?? asset._id ?? asset.doc?.id ?? null
  if (id === null || id === undefined || id === '') return null
  return id as string | number
}

const selectedImageId = computed<string | number | null>(() => {
  const id = form.value.image
  if (id === null || id === undefined || id === '') return null
  return id
})

function resetForm() {
  editingId.value = null
  form.value = {
    title: '',
    href: '',
    image: null,
    active: true,
    openInNewTab: false,
    sortOrder: 0,
    startAt: '',
    endAt: '',
  }
}

function startEdit(item: DashboardSliderItem) {
  editingId.value = item.id
  form.value = {
    title: item.title || '',
    href: item.href || '',
    image: item.image?.id || item.image || null,
    active: item.active !== false,
    openInNewTab: !!item.openInNewTab,
    sortOrder: Number(item.sortOrder || 0),
    startAt: item.startAt ? String(item.startAt).slice(0, 10) : '',
    endAt: item.endAt ? String(item.endAt).slice(0, 10) : '',
  }
}

async function loadItems() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = null
  try {
    const res = await listSliderItems()
    items.value = Array.isArray(res?.docs) ? res.docs : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load slider items.'
  } finally {
    loading.value = false
  }
}

function mediaLabel(asset: any) {
  const alt = typeof asset?.alt === 'string' && asset.alt.trim() ? asset.alt.trim() : ''
  const filename = asset?.file?.filename || asset?.filename || asset?.file?.name || ''
  if (alt && filename) return `${alt} (${filename})`
  return alt || filename || `Asset #${asset?.id}`
}

function mediaFilename(asset: any): string {
  return String(asset?.file?.filename || asset?.filename || asset?.file?.name || '').trim()
}

function pagesMediaBrowserUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const input = raw.trim()
  if (!input) return null
  const match = input.match(/\/api\/connect-pages-media\/file\/([^/?#]+)/i)
  if (match?.[1]) return `/api/connect-pages-media/file/${encodeURIComponent(match[1])}`
  return input
}

function mediaPreviewUrl(image: any): string | null {
  if (!image || typeof image !== 'object') return null
  return pagesMediaBrowserUrl(image._normalizedUrl || image.url || image.file?.url || null)
}

function slidePreviewUrl(item: DashboardSliderItem): string | null {
  return mediaPreviewUrl(item.image)
}

function selectedImageTitle(): string {
  if (selectedImageId.value == null) return ''
  const asset = mediaAssets.value.find(
    (item: any) => String(resolveAssetId(item)) === String(selectedImageId.value),
  )
  return mediaFilename(asset)
}

const filteredMediaAssets = computed(() => {
  const q = assetLibrarySearch.value.trim().toLowerCase()
  if (!q) return mediaAssets.value
  return mediaAssets.value.filter((asset: any) => {
    const label = mediaLabel(asset).toLowerCase()
    const filename = String(asset?.file?.filename || '').toLowerCase()
    return label.includes(q) || filename.includes(q)
  })
})

const selectedImageLabel = computed(() => {
  if (!selectedImageId.value) return ''
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(selectedImageId.value))
  return match ? mediaLabel(match) : `Asset #${String(selectedImageId.value)}`
})

function selectImage(asset: any) {
  const id = resolveAssetId(asset)
  if (id == null) {
    error.value = 'Selected asset is missing an ID.'
    return
  }
  error.value = null
  form.value.image = id
  if (!form.value.title.trim()) form.value.title = mediaFilename(asset)
}

function isSelectedAsset(asset: any): boolean {
  const id = resolveAssetId(asset)
  if (id == null || selectedImageId.value == null) return false
  return String(id) === String(selectedImageId.value)
}

async function loadMediaAssets() {
  try {
    const res: any = await $fetch('/api/connect-pages-media', {
      query: { limit: 100, sort: '-createdAt', depth: 1 },
    })
    mediaAssets.value = Array.isArray(res?.docs) ? res.docs : []
  } catch {
    mediaAssets.value = []
  }
}

async function uploadImageAsset() {
  const file = uploadInputRef.value?.files?.[0]
  if (!file) {
    error.value = 'Choose an image file to upload.'
    return
  }
  uploadingImage.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    if (uploadAlt.value.trim()) body.append('alt', uploadAlt.value.trim())
    const res: any = await $fetch('/api/connect-pages-media/upload', {
      method: 'POST',
      body,
    })
    await loadMediaAssets()
    if (res?.id != null) form.value.image = res.id
    if (!form.value.title.trim()) {
      form.value.title = mediaFilename(res) || file.name
    }
    if (uploadInputRef.value) uploadInputRef.value.value = ''
    uploadAlt.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload image.'
  } finally {
    uploadingImage.value = false
  }
}

async function saveItem() {
  error.value = null
  if (selectedImageId.value == null) {
    error.value = 'An image is required.'
    return
  }

  const title = form.value.title.trim() || selectedImageTitle()
  if (!title) {
    error.value = 'Title could not be derived from the selected image filename.'
    return
  }

  const payload = {
    title,
    href: form.value.href.trim(),
    image: selectedImageId.value,
    active: form.value.active,
    openInNewTab: form.value.openInNewTab,
    sortOrder: Number(form.value.sortOrder || 0),
    startAt: form.value.startAt || null,
    endAt: form.value.endAt || null,
  }

  try {
    if (editingId.value) {
      await updateSliderItem(editingId.value, payload)
    } else {
      await createSliderItem(payload)
    }
    resetForm()
    await loadItems()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save slider item.'
  }
}

const draggedId = ref<string | number | null>(null)
const dropTargetId = ref<string | number | null>(null)
const draggedIndex = ref(0)
const savingOrder = ref(false)

function onRowDragStart(e: DragEvent, item: DashboardSliderItem, index: number) {
  draggedId.value = item.id
  draggedIndex.value = index
  e.dataTransfer?.setData('text/plain', String(item.id))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onRowDragEnd() {
  draggedId.value = null
  dropTargetId.value = null
}

function onRowDragOver(e: DragEvent, item: DashboardSliderItem) {
  if (draggedId.value == null) return
  e.preventDefault()
  if (draggedId.value !== item.id) dropTargetId.value = item.id
}

async function onRowDrop(e: DragEvent, targetIndex: number) {
  if (draggedId.value == null) return
  e.preventDefault()

  const fromIndex = draggedIndex.value
  dropTargetId.value = null
  draggedId.value = null
  if (fromIndex === targetIndex) return

  const previous = items.value
  const next = [...previous]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return
  next.splice(targetIndex, 0, moved)

  const reordered = next.map((item, index) => ({ ...item, sortOrder: index }))
  items.value = reordered

  const changed = reordered.filter((item) => {
    const before = previous.find((candidate) => candidate.id === item.id)
    return Number(before?.sortOrder ?? 0) !== item.sortOrder
  })
  if (!changed.length) return

  savingOrder.value = true
  error.value = null
  try {
    await Promise.all(changed.map((item) => updateSliderItem(item.id, { sortOrder: item.sortOrder })))
  } catch (err: any) {
    items.value = previous
    error.value = err?.message || 'Failed to save slide order.'
  } finally {
    savingOrder.value = false
  }
}

async function removeItem(id: string | number) {
  if (!confirm('Delete this slider item?')) return
  error.value = null
  try {
    await deleteSliderItem(id)
    if (editingId.value === id) resetForm()
    await loadItems()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete slider item.'
  }
}

watch(canManageDashboard, () => loadItems(), { immediate: true })
watch(canManageDashboard, () => loadMediaAssets(), { immediate: true })
</script>
