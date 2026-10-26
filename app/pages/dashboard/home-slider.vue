<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Home Slider</h1>
          <p class="mt-1 text-sm text-gray-600">Manage image slides, URLs, and post modal links for the Connect homepage.</p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to this dashboard section.
        </div>

        <template v-else>
          <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                <span class="font-semibold text-gray-900">{{ activeCount }}</span> active
                <span class="text-gray-400">·</span>
                <span class="font-semibold text-gray-900">{{ inactiveCount }}</span> inactive
              </p>
              <p class="mt-1 text-xs text-gray-500">
                <template v-if="listFiltered">Clear the search and status filter to drag slides into a new order.</template>
                <template v-else>
                  Drag the handle to reorder.
                  <span v-if="savingOrder" class="text-[rgba(13,94,130,1)]">Saving order...</span>
                </template>
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
              @click="openCreate"
            >
              Add slide
            </button>
          </div>

          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <UInput
              v-model="listSearch"
              type="search"
              placeholder="Search title or link..."
              icon="i-lucide-search"
              color="neutral"
              variant="outline"
              size="sm"
              class="w-full sm:max-w-xs"
            />
            <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
              <button
                v-for="option in statusFilters"
                :key="option.value"
                type="button"
                class="rounded-md px-3 py-1.5 font-medium"
                :class="statusFilter === option.value
                  ? 'bg-[rgba(13,94,130,1)] text-white'
                  : 'text-gray-600 hover:bg-gray-50'"
                @click="statusFilter = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div v-if="error && !editorOpen" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>

          <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div v-if="loading" class="px-4 py-8 text-sm text-gray-500">Loading slider items...</div>
            <div v-else-if="!items.length" class="px-4 py-10 text-center">
              <p class="text-sm font-medium text-gray-900">No slides yet</p>
              <p class="mt-1 text-sm text-gray-500">Add an image slide for the Connect homepage.</p>
              <button
                type="button"
                class="mt-4 rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
                @click="openCreate"
              >
                Add slide
              </button>
            </div>
            <div v-else-if="!visibleItems.length" class="px-4 py-8 text-sm text-gray-500">No slides match this filter.</div>
            <ul v-else class="divide-y divide-gray-200">
              <li
                v-for="(item, itemIndex) in visibleItems"
                :key="item.id"
                class="flex flex-col gap-3 px-3 py-3 transition-colors sm:flex-row sm:items-center sm:gap-4 sm:px-4"
                :class="{
                  'opacity-60': draggedId === item.id,
                  'bg-[rgba(13,94,130,0.06)]': dropTargetId === item.id,
                  'bg-gray-50/80': item.active === false && dropTargetId !== item.id,
                }"
                @dragover="onRowDragOver($event, item)"
                @dragleave="dropTargetId = null"
                @drop="onRowDrop($event, itemIndex)"
              >
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    v-if="!listFiltered"
                    class="inline-flex cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing touch-none"
                    aria-label="Drag to reorder"
                    draggable="true"
                    @dragstart="onRowDragStart($event, item, itemIndex)"
                    @dragend="onRowDragEnd"
                  >
                    <UIcon name="i-lucide-grip-vertical" class="h-5 w-5" />
                  </span>
                  <button
                    type="button"
                    class="group flex min-w-0 flex-1 items-center gap-3 text-left"
                    @click="startEdit(item)"
                  >
                    <img
                      v-if="slidePreviewUrl(item)"
                      :src="slidePreviewUrl(item) || ''"
                      :alt="item.title || 'Slide preview'"
                      class="h-16 w-28 shrink-0 rounded-md border border-gray-200 bg-gray-100 object-cover"
                    >
                    <div
                      v-else
                      class="flex h-16 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400"
                    >
                      No image
                    </div>
                    <div class="min-w-0">
                      <p class="truncate font-medium text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
                        {{ item.title || 'Untitled slide' }}
                      </p>
                      <p class="mt-0.5 truncate text-sm text-gray-600">{{ linkLabel(item.href) }}</p>
                      <p class="mt-0.5 text-xs text-gray-500">{{ scheduleLabel(item) }}</p>
                    </div>
                  </button>
                </div>
                <div class="flex items-center justify-between gap-3 sm:justify-end">
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="item.active !== false"
                    :aria-label="item.active !== false ? `Set ${item.title || 'slide'} inactive` : `Set ${item.title || 'slide'} active`"
                    class="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium disabled:opacity-50"
                    :class="item.active !== false
                      ? 'border-[rgba(13,94,130,0.35)] bg-[rgba(13,94,130,0.08)] text-[rgba(10,69,92,1)]'
                      : 'border-gray-200 bg-white text-gray-600'"
                    :disabled="togglingId === item.id"
                    @click="setItemActive(item, item.active === false)"
                  >
                    <span
                      class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
                      :class="item.active !== false ? 'bg-[rgba(13,94,130,1)]' : 'bg-gray-300'"
                    >
                      <span
                        class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition"
                        :class="item.active !== false ? 'translate-x-4' : 'translate-x-0.5'"
                      />
                    </span>
                    {{ togglingId === item.id ? 'Saving...' : (item.active !== false ? 'Active' : 'Inactive') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-[rgba(13,94,130,1)] hover:bg-gray-50"
                    @click="startEdit(item)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-md px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    @click="removeItem(item.id)"
                  >
                    Delete
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <UModal v-model:open="editorOpen" :ui="{ content: 'max-w-3xl', body: 'overflow-y-auto max-h-[85vh]' }">
            <template #body>
              <h2 class="text-lg font-semibold text-gray-900">{{ editingId ? 'Edit slide' : 'Add slides' }}</h2>
              <p v-if="!editingId" class="mt-1 text-sm text-gray-500">
                All fields are optional. Select or upload several images to create one slide per image.
              </p>
              <form class="mt-4 space-y-4" @submit.prevent="saveItem">
                <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <label class="block text-sm text-gray-700">
                    Title
                    <input v-model="form.title" type="text" placeholder="Optional" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  </label>
                  <label class="block text-sm text-gray-700">
                    Link type
                    <select v-model="form.linkType" class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                      <option value="none">No link</option>
                      <option value="url">URL</option>
                      <option value="post">Post (opens in modal)</option>
                    </select>
                  </label>
                  <label v-if="form.linkType === 'url'" class="block text-sm text-gray-700 sm:col-span-2">
                    URL
                    <input v-model="form.href" type="text" placeholder="https:// or /path" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  </label>
                  <div v-else-if="form.linkType === 'post'" class="space-y-2 sm:col-span-2">
                    <UInput
                      v-model="postSearch"
                      type="search"
                      placeholder="Search posts by text or author..."
                      icon="i-lucide-search"
                      color="neutral"
                      variant="outline"
                      size="sm"
                    />
                    <ul class="max-h-48 overflow-auto rounded-md border border-gray-200 divide-y divide-gray-200 bg-white">
                      <li
                        v-for="post in filteredPostOptions"
                        :key="String(post.id)"
                        class="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <div class="min-w-0">
                          <p class="line-clamp-2 text-gray-900">{{ postPreview(post) || `Post #${post.id}` }}</p>
                          <p class="mt-0.5 truncate text-xs text-gray-500">
                            #{{ post.id }} · {{ post.author?.name || post.author?.email || 'Unknown author' }}
                          </p>
                        </div>
                        <button
                          type="button"
                          :class="String(form.postId) === String(post.id)
                            ? 'shrink-0 rounded border border-[rgba(13,94,130,0.35)] bg-[rgba(13,94,130,0.08)] px-2 py-1 text-xs text-[rgba(10,69,92,1)]'
                            : 'shrink-0 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-[rgba(13,94,130,1)] hover:bg-gray-50'"
                          @click="form.postId = String(post.id)"
                        >
                          {{ String(form.postId) === String(post.id) ? 'Selected' : 'Select' }}
                        </button>
                      </li>
                      <li v-if="postsLoading" class="px-3 py-3 text-sm text-gray-500">Loading posts...</li>
                      <li v-else-if="!filteredPostOptions.length" class="px-3 py-3 text-sm text-gray-500">No matching posts.</li>
                    </ul>
                  </div>
                  <label class="block text-sm text-gray-700">
                    Sort order
                    <input v-model="form.sortOrder" type="number" placeholder="Optional" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  </label>
                  <label class="block text-sm text-gray-700">
                    Start date
                    <input v-model="form.startAt" type="date" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  </label>
                  <label class="block text-sm text-gray-700">
                    End date
                    <input v-model="form.endAt" type="date" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  </label>
                </div>

                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-800">
                  <label class="inline-flex items-center gap-2">
                    <input v-model="form.active" type="checkbox" class="rounded border-gray-300">
                    Active on the homepage
                  </label>
                  <label v-if="form.linkType === 'url'" class="inline-flex items-center gap-2">
                    <input v-model="form.openInNewTab" type="checkbox" class="rounded border-gray-300">
                    Open in new tab
                  </label>
                </div>

                <div>
                  <p class="text-sm font-medium text-gray-900">Image</p>
                  <p class="mt-0.5 text-xs text-gray-500">
                    {{ editingId ? 'Choose one image. Leave it empty for a text-only slide.' : 'Choose one or more images. Each image becomes its own slide.' }}
                  </p>
                  <div v-if="form.images.length" class="mt-2 flex flex-wrap gap-2">
                    <span
                      v-for="imageId in form.images"
                      :key="String(imageId)"
                      class="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-1 pl-1 pr-2 text-xs text-gray-700"
                    >
                      <img
                        v-if="previewForImageId(imageId)"
                        :src="previewForImageId(imageId) || ''"
                        alt=""
                        class="h-8 w-12 rounded object-cover"
                      >
                      <span class="truncate">{{ imageLabelById(imageId) }}</span>
                      <button type="button" class="shrink-0 text-gray-400 hover:text-gray-700" :aria-label="`Remove ${imageLabelById(imageId)}`" @click="removeSelectedImage(imageId)">×</button>
                    </span>
                  </div>
                  <p v-else class="mt-2 text-xs text-gray-500">No image selected</p>
                </div>

                <div class="rounded-lg border border-gray-200">
                  <div class="grid gap-2 border-b border-gray-100 p-3">
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
                  </div>
                  <div class="p-3">
                    <UInput
                      v-model="assetLibrarySearch"
                      type="search"
                      placeholder="Search images..."
                      icon="i-lucide-search"
                      color="neutral"
                      variant="outline"
                      size="sm"
                    />
                    <div v-if="filteredMediaAssets.length" class="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-auto sm:grid-cols-4">
                      <button
                        v-for="asset in filteredMediaAssets"
                        :key="String(resolveAssetId(asset) ?? mediaLabel(asset))"
                        type="button"
                        class="overflow-hidden rounded-md border text-left"
                        :class="isSelectedAsset(asset)
                          ? 'border-[rgba(13,94,130,1)] ring-2 ring-[rgba(13,94,130,0.35)]'
                          : 'border-gray-200 hover:border-gray-300'"
                        @click="selectImage(asset)"
                      >
                        <img
                          v-if="mediaPreviewUrl(asset)"
                          :src="mediaPreviewUrl(asset) || ''"
                          :alt="mediaLabel(asset)"
                          class="h-20 w-full bg-gray-100 object-cover"
                        >
                        <div v-else class="flex h-20 items-center justify-center bg-gray-100 text-xs text-gray-400">No preview</div>
                        <span class="block truncate px-1.5 py-1 text-[11px] text-gray-700">{{ mediaLabel(asset) }}</span>
                      </button>
                    </div>
                    <p v-else class="mt-3 text-sm text-gray-500">No matching images.</p>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="editorOpen = false"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                    :disabled="saving"
                  >
                    {{ submitLabel }}
                  </button>
                </div>
              </form>
            </template>
          </UModal>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  buildHomeSliderCreateItems,
  homeSliderLinkTypeFromHref,
  parseHomeSliderPostModalHref,
  resolveHomeSliderHref,
  type HomeSliderLinkType,
} from '@shared/homeSlider'
import { toBrowserMediaUrl } from '@shared/mediaUrls'
import type { DashboardSliderItem } from '~/composables/useDashboardContent'
import { mediaIsImage } from '~/utils/dashboardMedia'

const { listSliderItems, createSliderItem, updateSliderItem, deleteSliderItem } = useDashboardContent()
const { mePending, canAccessSection } = useDashboardAccess()
const canManageDashboard = computed(() => canAccessSection('home-slider'))

const items = ref<DashboardSliderItem[]>([])
const mediaAssets = ref<any[]>([])
const postOptions = ref<any[]>([])
const postsLoading = ref(false)
const postSearch = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadAlt = ref('')
const uploadingImage = ref(false)
const uploadProgressLabel = ref('Uploading...')
const assetLibrarySearch = ref('')
const editingId = ref<string | number | null>(null)
const editorOpen = ref(false)
const fallbackPreviewUrl = ref<string | null>(null)
const saving = ref(false)
const togglingId = ref<string | number | null>(null)
const listSearch = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const statusFilters = [
  { label: 'All', value: 'all' as const },
  { label: 'Active', value: 'active' as const },
  { label: 'Inactive', value: 'inactive' as const },
]
let suppressLinkReset = false
const form = ref({
  title: '',
  linkType: 'none' as HomeSliderLinkType,
  href: '',
  postId: '',
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
    linkType: 'none' as HomeSliderLinkType,
    href: '',
    postId: '',
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
  postSearch.value = ''
  fallbackPreviewUrl.value = null
  assetLibrarySearch.value = ''
  form.value = emptyForm()
}

function openCreate() {
  suppressLinkReset = true
  resetForm()
  error.value = null
  editorOpen.value = true
  void nextTick(() => {
    suppressLinkReset = false
  })
}

async function startEdit(item: DashboardSliderItem) {
  suppressLinkReset = true
  editingId.value = item.id
  const imageId = item.image?.id ?? (typeof item.image === 'number' || typeof item.image === 'string' ? item.image : null)
  const linkType = homeSliderLinkTypeFromHref(item.href)
  const postId = parseHomeSliderPostModalHref(item.href)
  fallbackPreviewUrl.value = slidePreviewUrl(item)
  form.value = {
    title: item.title || '',
    linkType,
    href: linkType === 'url' ? (item.href || '') : '',
    postId: postId == null ? '' : String(postId),
    images: imageId == null || imageId === '' ? [] : [imageId],
    active: item.active !== false,
    openInNewTab: linkType === 'url' ? !!item.openInNewTab : false,
    sortOrder: item.sortOrder == null ? '' : String(item.sortOrder),
    startAt: item.startAt ? String(item.startAt).slice(0, 10) : '',
    endAt: item.endAt ? String(item.endAt).slice(0, 10) : '',
  }
  error.value = null
  editorOpen.value = true
  if (linkType === 'post') void loadPostOptions()
  await nextTick()
  suppressLinkReset = false
}

function postPreview(post: any): string {
  const collect = (node: any): string => {
    if (!node) return ''
    if (node.type === 'text') return String(node.text || '')
    const children = Array.isArray(node.children) ? node.children.map(collect).join('') : ''
    return ['paragraph', 'heading', 'listitem'].includes(node.type) ? `${children}\n` : children
  }
  return collect(post?.content?.root).trim()
}

function isSlideActive(item: DashboardSliderItem) {
  return item.active !== false
}

function scheduleLabel(item: DashboardSliderItem): string {
  const formatDay = (value: string) => {
    const day = String(value).slice(0, 10)
    const [year, month, date] = day.split('-').map(Number)
    if (!year || !month || !date) return day
    return new Date(year, month - 1, date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  const start = item.startAt ? formatDay(String(item.startAt)) : ''
  const end = item.endAt ? formatDay(String(item.endAt)) : ''
  if (start && end) return `${start} – ${end}`
  if (start) return `Starts ${start}`
  if (end) return `Ends ${end}`
  return 'Always on'
}

function linkLabel(href: unknown): string {
  const postId = parseHomeSliderPostModalHref(href)
  if (postId != null) {
    const match = postOptions.value.find((post) => String(post.id) === String(postId))
    const preview = match ? postPreview(match) : ''
    return preview ? `Post #${postId}: ${preview}` : `Post #${postId} (modal)`
  }
  if (typeof href === 'string' && href.trim()) return href.trim()
  return '—'
}

const filteredPostOptions = computed(() => {
  const q = postSearch.value.trim().toLowerCase()
  if (!q) return postOptions.value
  return postOptions.value.filter((post) => {
    const haystack = `${postPreview(post)} ${post.author?.name || ''} ${post.author?.email || ''} ${post.id}`.toLowerCase()
    return haystack.includes(q)
  })
})

async function loadPostOptions() {
  if (!canManageDashboard.value) return
  postsLoading.value = true
  try {
    const res: any = await $fetch('/api/posts', {
      query: { limit: 100, sort: '-createdAt' },
    })
    postOptions.value = Array.isArray(res?.docs) ? res.docs : []
  } catch {
    postOptions.value = []
  } finally {
    postsLoading.value = false
  }
}

const activeCount = computed(() => items.value.filter((item) => isSlideActive(item)).length)
const inactiveCount = computed(() => items.value.length - activeCount.value)
const listFiltered = computed(() => statusFilter.value !== 'all' || listSearch.value.trim().length > 0)
const visibleItems = computed(() => {
  const q = listSearch.value.trim().toLowerCase()
  return items.value.filter((item) => {
    if (statusFilter.value === 'active' && !isSlideActive(item)) return false
    if (statusFilter.value === 'inactive' && isSlideActive(item)) return false
    if (!q) return true
    return `${item.title || ''} ${linkLabel(item.href)}`.toLowerCase().includes(q)
  })
})

watch(
  () => form.value.linkType,
  (linkType) => {
    if (suppressLinkReset) return
    if (linkType === 'post') {
      form.value.openInNewTab = false
      if (!postOptions.value.length) void loadPostOptions()
    }
    if (linkType !== 'url') form.value.openInNewTab = false
    if (linkType !== 'post') form.value.postId = ''
    if (linkType !== 'url') form.value.href = ''
  },
)

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

function mediaPreviewUrl(image: any): string | null {
  if (!image || typeof image !== 'object') return null
  return toBrowserMediaUrl(image._normalizedUrl || image.url || image.file?.url || null)
}

function slidePreviewUrl(item: DashboardSliderItem): string | null {
  return mediaPreviewUrl(item.image)
}

function imageLabelById(id: string | number): string {
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(id))
  return match ? mediaLabel(match) : `Asset #${String(id)}`
}

function previewForImageId(id: string | number): string | null {
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(id))
  if (match) return mediaPreviewUrl(match)
  if (form.value.images.length === 1 && String(form.value.images[0]) === String(id)) return fallbackPreviewUrl.value
  return null
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

const submitLabel = computed(() => {
  if (saving.value) return editingId.value ? 'Updating...' : 'Creating...'
  if (editingId.value) return 'Update slide'
  const count = Math.max(form.value.images.length, 1)
  return count === 1 ? 'Create slide' : `Create ${count} slides`
})

function addSelectedImage(id: string | number) {
  if (editingId.value) {
    form.value.images = [id]
    const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(id))
    fallbackPreviewUrl.value = match ? mediaPreviewUrl(match) : null
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
  if (form.value.linkType === 'post' && !form.value.postId.trim()) {
    error.value = 'Select a post for the modal link.'
    return
  }
  const href = resolveHomeSliderHref({
    linkType: form.value.linkType,
    href: form.value.href,
    postId: form.value.postId,
  })
  const openInNewTab = form.value.linkType === 'url' ? form.value.openInNewTab : false
  saving.value = true
  try {
    if (editingId.value) {
      await updateSliderItem(editingId.value, {
        title: form.value.title.trim(),
        href,
        image: form.value.images[0] ?? null,
        active: form.value.active,
        openInNewTab,
        sortOrder: form.value.sortOrder === '' ? 0 : Number(form.value.sortOrder),
        startAt: form.value.startAt || null,
        endAt: form.value.endAt || null,
      })
    } else {
      const payloads = buildHomeSliderCreateItems({
        images: form.value.images,
        title: form.value.title,
        href,
        active: form.value.active,
        openInNewTab,
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
    editorOpen.value = false
    await loadItems()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save slider item.'
  } finally {
    saving.value = false
  }
}

async function setItemActive(item: DashboardSliderItem, active: boolean) {
  if (isSlideActive(item) === active || togglingId.value != null) return
  const previous = item.active
  item.active = active
  if (editingId.value === item.id) form.value.active = active
  togglingId.value = item.id
  error.value = null
  try {
    await updateSliderItem(item.id, { active })
  } catch (e: any) {
    item.active = previous
    if (editingId.value === item.id) form.value.active = previous !== false
    error.value = e?.message || 'Failed to update slide status.'
  } finally {
    togglingId.value = null
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
  if (draggedId.value == null || listFiltered.value) return
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
    if (editingId.value === id) editorOpen.value = false
    await loadItems()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete slider item.'
  }
}

watch(editorOpen, (open) => {
  if (!open) resetForm()
})

watch(canManageDashboard, () => loadItems(), { immediate: true })
watch(canManageDashboard, () => loadMediaAssets(), { immediate: true })
watch(canManageDashboard, (allowed) => {
  if (allowed) void loadPostOptions()
}, { immediate: true })
</script>
