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
          You do not have access to this dashboard section.
        </div>

        <template v-else>
          <form class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm" @submit.prevent="saveItem">
            <h2 class="text-base font-semibold text-gray-900">{{ editingId ? 'Edit slide' : 'Add slides' }}</h2>
            <p v-if="!editingId" class="mt-1 text-xs text-gray-500">
              All fields are optional. Select or upload several images to create one slide per image.
            </p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <input v-model="form.title" type="text" placeholder="Title (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input v-model="form.href" type="text" placeholder="Link (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <div class="min-w-0">
                <div v-if="form.images.length" class="flex flex-wrap gap-1.5 rounded-md border border-gray-300 bg-gray-50 px-2 py-2">
                  <span
                    v-for="imageId in form.images"
                    :key="String(imageId)"
                    class="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
                  >
                    <span class="truncate">{{ imageLabelById(imageId) }}</span>
                    <button type="button" class="shrink-0 text-gray-400 hover:text-gray-700" :aria-label="`Remove ${imageLabelById(imageId)}`" @click="removeSelectedImage(imageId)">×</button>
                  </span>
                </div>
                <input
                  v-else
                  type="text"
                  readonly
                  placeholder="No image selected (optional)"
                  class="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                >
              </div>
              <input v-model="form.sortOrder" type="number" placeholder="Sort order (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <label class="block text-xs text-gray-500">
                Start date (optional)
                <input v-model="form.startAt" type="date" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
              </label>
              <label class="block text-xs text-gray-500">
                End date (optional)
                <input v-model="form.endAt" type="date" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
              </label>
            </div>
            <details class="mt-3 rounded-lg border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden">
              <summary class="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                <span class="text-sm font-medium text-gray-900">Page media library selector</span>
                <p class="text-xs text-gray-500">
                  {{ editingId ? 'Upload or pick an image from Connect Page Assets.' : 'Upload or pick one or more images from Connect Page Assets.' }}
                </p>
              </summary>
              <div class="border-t border-gray-100 p-3">
                <div class="mb-3 grid gap-2">
                  <input
                    v-model="uploadAlt"
                    type="text"
                    placeholder="Image alt/name (optional)"
                    class="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                  <div class="flex min-w-0 items-center gap-2">
                    <input
                      ref="uploadInputRef"
                      type="file"
                      accept="image/*"
                      :multiple="!editingId"
                      class="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      :disabled="uploadingImage"
                      @change="uploadImageAsset({ silentIfEmpty: true })"
                    >
                    <button
                      type="button"
                      class="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      :disabled="uploadingImage"
                      @click="uploadImageAsset()"
                    >
                      {{ uploadingImage ? uploadProgressLabel : 'Upload' }}
                    </button>
                  </div>
                  <p class="text-xs text-gray-500">Images upload when you choose them. The list below shows images only.</p>
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
                      {{ isSelectedAsset(asset) ? (editingId ? 'Selected' : 'Deselect') : 'Select' }}
                    </button>
                  </li>
                  <li v-if="!filteredMediaAssets.length" class="px-3 py-3 text-sm text-gray-500">No matching assets.</li>
                </ul>
              </div>
            </details>
            <p class="mt-2 text-xs text-gray-500">
              {{ selectedImagesSummary }}
            </p>
            <div class="mt-3 flex items-center gap-4 text-sm">
              <label class="inline-flex items-center gap-2"><input v-model="form.active" type="checkbox"> Active</label>
              <label class="inline-flex items-center gap-2"><input v-model="form.openInNewTab" type="checkbox"> Open in new tab</label>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button
                type="submit"
                class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                :disabled="saving"
              >
                {{ submitLabel }}
              </button>
              <button
                v-if="editingId || form.images.length"
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="resetForm"
              >
                {{ editingId ? 'Cancel' : 'Clear' }}
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
                  <td class="px-4 py-3 font-medium text-gray-900">{{ item.title || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700 truncate max-w-[260px]">{{ item.href || '—' }}</td>
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
import { buildHomeSliderCreateItems } from '@shared/homeSlider'
import type { DashboardSliderItem } from '~/composables/useDashboardContent'
import { mediaIsImage } from '~/utils/dashboardMedia'

const { listSliderItems, createSliderItem, updateSliderItem, deleteSliderItem } = useDashboardContent()
const { mePending, canAccessSection } = useDashboardAccess()
const canManageDashboard = computed(() => canAccessSection('home-slider'))

const items = ref<DashboardSliderItem[]>([])
const mediaAssets = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadAlt = ref('')
const uploadingImage = ref(false)
const uploadProgressLabel = ref('Uploading...')
const assetLibrarySearch = ref('')
const editingId = ref<string | number | null>(null)
const saving = ref(false)
const form = ref({
  title: '',
  href: '',
  images: [] as Array<string | number>,
  active: true,
  openInNewTab: false,
  sortOrder: '',
  startAt: '',
  endAt: '',
})

function resolveAssetId(asset: any): string | number | null {
  if (!asset || typeof asset !== 'object') return null
  const id = asset.id ?? asset._id ?? asset.doc?.id ?? null
  if (id === null || id === undefined || id === '') return null
  return id as string | number
}

function emptyForm() {
  return {
    title: '',
    href: '',
    images: [] as Array<string | number>,
    active: true,
    openInNewTab: false,
    sortOrder: '',
    startAt: '',
    endAt: '',
  }
}

function resetForm() {
  editingId.value = null
  form.value = emptyForm()
}

function startEdit(item: DashboardSliderItem) {
  editingId.value = item.id
  const imageId = item.image?.id ?? (typeof item.image === 'number' || typeof item.image === 'string' ? item.image : null)
  form.value = {
    title: item.title || '',
    href: item.href || '',
    images: imageId == null || imageId === '' ? [] : [imageId],
    active: item.active !== false,
    openInNewTab: !!item.openInNewTab,
    sortOrder: item.sortOrder == null ? '' : String(item.sortOrder),
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

function imageLabelById(id: string | number): string {
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(id))
  return match ? mediaLabel(match) : `Asset #${String(id)}`
}

const filteredMediaAssets = computed(() => {
  const images = mediaAssets.value.filter((asset: any) => mediaIsImage(asset))
  const q = assetLibrarySearch.value.trim().toLowerCase()
  if (!q) return images
  return images.filter((asset: any) => {
    const label = mediaLabel(asset).toLowerCase()
    const filename = String(asset?.file?.filename || asset?.filename || '').toLowerCase()
    return label.includes(q) || filename.includes(q)
  })
})

const selectedImagesSummary = computed(() => {
  const ids = form.value.images
  if (!ids.length) return 'No image selected'
  if (ids.length === 1) return `Selected image ID: ${String(ids[0])}`
  return `${ids.length} images selected`
})

const submitLabel = computed(() => {
  if (saving.value) return editingId.value ? 'Updating...' : 'Creating...'
  if (editingId.value) return 'Update slide'
  const count = Math.max(form.value.images.length, 1)
  return count === 1 ? 'Create slide' : `Create ${count} slides`
})

function addSelectedImage(id: string | number) {
  if (editingId.value) {
    form.value.images = [id]
    return
  }
  if (form.value.images.some((existing) => String(existing) === String(id))) return
  form.value.images = [...form.value.images, id]
}

function removeSelectedImage(id: string | number) {
  form.value.images = form.value.images.filter((existing) => String(existing) !== String(id))
}

function selectImage(asset: any) {
  const id = resolveAssetId(asset)
  if (id == null) {
    error.value = 'Selected asset is missing an ID.'
    return
  }
  error.value = null
  if (isSelectedAsset(asset) && !editingId.value) {
    removeSelectedImage(id)
    return
  }
  addSelectedImage(id)
}

function isSelectedAsset(asset: any): boolean {
  const id = resolveAssetId(asset)
  if (id == null) return false
  return form.value.images.some((existing) => String(existing) === String(id))
}

async function loadMediaAssets() {
  try {
    const res: any = await $fetch('/api/connect-pages-media', {
      query: { limit: 200, sort: '-createdAt', depth: 1, kind: 'image' },
    })
    const docs = Array.isArray(res?.docs) ? res.docs : []
    mediaAssets.value = docs.filter((asset: any) => mediaIsImage(asset))
  } catch {
    mediaAssets.value = []
  }
}

async function uploadImageAsset(opts?: { silentIfEmpty?: boolean }) {
  const chosen = Array.from(uploadInputRef.value?.files || [])
  if (!chosen.length) {
    if (!opts?.silentIfEmpty) error.value = 'Choose image file(s) to upload.'
    return
  }
  const files = chosen.filter((file) => mediaIsImage({ mimeType: file.type, filename: file.name }))
  if (!files.length) {
    error.value = 'Choose image files (jpg, png, gif, webp, or svg).'
    return
  }

  uploadingImage.value = true
  uploadProgressLabel.value = files.length > 1 ? `Uploading 1 of ${files.length}...` : 'Uploading...'
  error.value = null
  try {
    const uploadedIds: Array<string | number> = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      uploadProgressLabel.value = files.length > 1 ? `Uploading ${i + 1} of ${files.length}...` : 'Uploading...'
      const body = new FormData()
      body.append('file', file)
      if (uploadAlt.value.trim()) body.append('alt', uploadAlt.value.trim())
      const res: any = await $fetch('/api/connect-pages-media/upload', {
        method: 'POST',
        body,
      })
      if (res?.id != null) uploadedIds.push(res.id)
    }
    await loadMediaAssets()
    for (const id of uploadedIds) addSelectedImage(id)
    if (uploadInputRef.value) uploadInputRef.value.value = ''
    uploadAlt.value = ''
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Failed to upload image.'
  } finally {
    uploadingImage.value = false
    uploadProgressLabel.value = 'Uploading...'
  }
}

async function saveItem() {
  error.value = null
  saving.value = true
  try {
    if (editingId.value) {
      await updateSliderItem(editingId.value, {
        title: form.value.title.trim(),
        href: form.value.href.trim(),
        image: form.value.images[0] ?? null,
        active: form.value.active,
        openInNewTab: form.value.openInNewTab,
        sortOrder: form.value.sortOrder === '' ? 0 : Number(form.value.sortOrder),
        startAt: form.value.startAt || null,
        endAt: form.value.endAt || null,
      })
    } else {
      const payloads = buildHomeSliderCreateItems({
        images: form.value.images,
        title: form.value.title,
        href: form.value.href,
        active: form.value.active,
        openInNewTab: form.value.openInNewTab,
        sortOrder: form.value.sortOrder,
        startAt: form.value.startAt || null,
        endAt: form.value.endAt || null,
        existingItems: items.value,
      })
      if (payloads.length === 1) {
        await createSliderItem(payloads[0])
      } else {
        await createSliderItem({ items: payloads })
      }
    }
    resetForm()
    await loadItems()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save slider item.'
  } finally {
    saving.value = false
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
