<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Media</h1>
          <p class="mt-1 text-sm text-gray-600">
            Manage files stored in Connect S3. Page assets are the shared library used by pages, sliders, and chapel. User media includes avatars, post images, and publication photos.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          You do not have access to manage media. Access is limited to staff.
        </div>

        <template v-else>
          <div class="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-100/80 p-0.5" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              role="tab"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="library === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="library = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {{ success }}
          </div>

          <div
            v-if="library === 'page-assets'"
            class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 class="text-sm font-semibold text-gray-900">Upload page asset</h2>
            <p class="mt-0.5 text-xs text-gray-500">Images, PDFs, and common office documents. The file URL is copied after upload.</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                v-model="uploadAlt"
                type="text"
                placeholder="Display name / alt (optional)"
                class="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
              <input
                ref="uploadInputRef"
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                :disabled="uploading"
                @click="uploadPageAsset"
              >
                {{ uploading ? 'Uploading...' : 'Upload' }}
              </button>
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                :disabled="pending"
                @click="refresh()"
              >
                Refresh
              </button>
            </div>
          </div>

          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <UInput
              v-model="search"
              type="search"
              icon="i-lucide-search"
              placeholder="Search name or filename..."
              class="max-w-md"
            />
            <div class="flex flex-wrap items-center gap-2">
              <select
                v-if="library === 'user-media'"
                v-model="userKind"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All kinds</option>
                <option value="avatars">Avatars</option>
                <option value="post-images">Post images</option>
                <option value="pubs-images">Publications</option>
              </select>
              <span class="text-sm text-gray-600">
                {{ filteredDocs.length }} shown
                <span v-if="totalDocs" class="text-gray-400">/ {{ totalDocs }}</span>
              </span>
            </div>
          </div>

          <div v-if="pending" class="py-8 text-gray-500">Loading media...</div>
          <div v-else-if="!filteredDocs.length" class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No files match this view.
          </div>
          <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <li
              v-for="doc in filteredDocs"
              :key="String(doc.id)"
              class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <button type="button" class="block w-full" @click="previewDoc = doc">
                <div class="flex aspect-square items-center justify-center bg-gray-50">
                  <img
                    v-if="mediaIsImage(doc) && mediaUrl(doc)"
                    :src="mediaUrl(doc)!"
                    :alt="mediaDisplayName(doc)"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  >
                  <div v-else class="px-3 text-center">
                    <UIcon name="i-lucide-file" class="mx-auto h-8 w-8 text-gray-400" />
                    <p class="mt-2 truncate text-xs text-gray-500">{{ mediaFilename(doc) || 'File' }}</p>
                  </div>
                </div>
              </button>
              <div class="space-y-2 p-3">
                <p class="truncate text-sm font-medium text-gray-900" :title="mediaDisplayName(doc)">
                  {{ mediaDisplayName(doc) }}
                </p>
                <p class="truncate text-xs text-gray-500">
                  {{ formatMediaBytes(doc.filesize) }}
                  <span v-if="library === 'user-media'"> · {{ userMediaKindLabel(doc.kind) }}</span>
                </p>
                <p class="truncate text-xs text-gray-400">{{ formatMediaDate(doc.createdAt) }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
                    @click="copyUrl(doc)"
                  >
                    Copy URL
                  </button>
                  <a
                    v-if="mediaUrl(doc)"
                    :href="mediaUrl(doc)!"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-[rgba(13,94,130,1)] hover:bg-gray-50"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    class="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    :disabled="deletingId === String(doc.id)"
                    @click="deleteDoc(doc)"
                  >
                    {{ deletingId === String(doc.id) ? 'Deleting...' : 'Delete' }}
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              :disabled="page <= 1 || pending"
              @click="page -= 1"
            >
              Previous
            </button>
            <span class="text-sm text-gray-600">Page {{ page }} of {{ totalPages }}</span>
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              :disabled="page >= totalPages || pending"
              @click="page += 1"
            >
              Next
            </button>
          </div>
        </template>
      </div>
    </main>

    <UModal v-model:open="previewOpen" :ui="{ content: 'max-w-3xl', body: 'p-4' }">
      <template #header>
        <h3 class="truncate text-base font-semibold text-gray-900">{{ previewDoc ? mediaDisplayName(previewDoc) : 'Preview' }}</h3>
      </template>
      <template #body>
        <div v-if="previewDoc">
          <img
            v-if="mediaIsImage(previewDoc) && mediaUrl(previewDoc)"
            :src="mediaUrl(previewDoc)!"
            :alt="mediaDisplayName(previewDoc)"
            class="max-h-[70vh] w-full rounded-md object-contain"
          >
          <p v-else class="text-sm text-gray-600">
            Preview is not available for this file type.
            <a
              v-if="mediaUrl(previewDoc)"
              :href="mediaUrl(previewDoc)!"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[rgba(13,94,130,1)] hover:underline"
            >
              Open file
            </a>
          </p>
          <p class="mt-3 break-all font-mono text-xs text-gray-500">{{ mediaUrl(previewDoc) }}</p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  formatMediaBytes,
  formatMediaDate,
  mediaDisplayName,
  mediaFilename,
  mediaIsImage,
  mediaUrl,
  userMediaKindLabel,
  type DashboardMediaDoc,
} from '~/utils/dashboardMedia'

const PAGE_SIZE = 48

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-media-me',
})
const canManageDashboard = computed(() => {
  const roles = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((role: unknown) => ['staff', 'admin'].includes(String(role).toLowerCase()))
})

const tabs = [
  { id: 'page-assets' as const, label: 'Page assets' },
  { id: 'user-media' as const, label: 'User media' },
]
const library = ref<'page-assets' | 'user-media'>('page-assets')
const page = ref(1)
const userKind = ref('')
const search = ref('')
const error = ref('')
const success = ref('')
const uploading = ref(false)
const deletingId = ref<string | null>(null)
const uploadAlt = ref('')
const uploadInputRef = ref<HTMLInputElement | null>(null)
const previewDoc = ref<DashboardMediaDoc | null>(null)
const previewOpen = computed({
  get: () => previewDoc.value != null,
  set: (open: boolean) => {
    if (!open) previewDoc.value = null
  },
})

const listUrl = computed(() => (
  library.value === 'page-assets' ? '/api/connect-pages-media' : '/api/dashboard/media/user'
))

const listQuery = computed(() => ({
  limit: PAGE_SIZE,
  page: page.value,
  sort: '-createdAt' as const,
  ...(library.value === 'user-media' && userKind.value ? { kind: userKind.value } : {}),
}))

const {
  data: mediaData,
  pending,
  refresh,
} = await useFetch<any>(() => listUrl.value, {
  key: 'dashboard-media-list',
  query: listQuery,
  immediate: canManageDashboard.value,
  watch: [listUrl, listQuery],
})

watch(canManageDashboard, (allowed) => {
  if (allowed && !mediaData.value) refresh()
})

watch([library, userKind], () => {
  page.value = 1
  search.value = ''
})

const docs = computed<DashboardMediaDoc[]>(() => (
  Array.isArray(mediaData.value?.docs) ? mediaData.value.docs : []
))
const totalDocs = computed(() => Number(mediaData.value?.totalDocs) || docs.value.length)
const totalPages = computed(() => Math.max(1, Number(mediaData.value?.totalPages) || 1))

const filteredDocs = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return docs.value
  return docs.value.filter((doc) => {
    const name = mediaDisplayName(doc).toLowerCase()
    const filename = (mediaFilename(doc) || '').toLowerCase()
    const kind = userMediaKindLabel(doc.kind).toLowerCase()
    return name.includes(query) || filename.includes(query) || kind.includes(query)
  })
})

function clearNoticeSoon() {
  window.setTimeout(() => {
    success.value = ''
  }, 4000)
}

async function copyUrl(doc: DashboardMediaDoc) {
  const url = mediaUrl(doc)
  if (!url) {
    error.value = 'No URL available for this file.'
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    error.value = ''
    success.value = 'Copied URL to clipboard.'
    clearNoticeSoon()
  } catch {
    error.value = `Could not copy. URL: ${url}`
  }
}

async function uploadPageAsset() {
  const file = uploadInputRef.value?.files?.[0]
  if (!file) {
    error.value = 'Choose a file first.'
    return
  }
  uploading.value = true
  error.value = ''
  success.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const alt = uploadAlt.value.trim()
    if (alt) body.append('alt', alt)
    const res = await $fetch<{ filename?: string; url?: string }>('/api/connect-pages-media/upload', {
      method: 'POST',
      body,
    })
    if (res.url) await navigator.clipboard.writeText(res.url).catch(() => undefined)
    uploadAlt.value = ''
    if (uploadInputRef.value) uploadInputRef.value.value = ''
    page.value = 1
    await refresh()
    success.value = `Uploaded “${res.filename || file.name}”.`
    clearNoticeSoon()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Upload failed.'
  } finally {
    uploading.value = false
  }
}

async function deleteDoc(doc: DashboardMediaDoc) {
  const id = doc.id
  if (id == null) return
  const label = mediaDisplayName(doc)
  const filename = mediaFilename(doc)
  const confirmMsg = filename
    ? `Delete “${label}” (${filename}) from S3? This cannot be undone.`
    : `Delete “${label}” from S3? This cannot be undone.`
  if (!window.confirm(confirmMsg)) return

  deletingId.value = String(id)
  error.value = ''
  success.value = ''
  try {
    const path = library.value === 'page-assets'
      ? `/api/connect-pages-media/${encodeURIComponent(String(id))}`
      : `/api/dashboard/media/user/${encodeURIComponent(String(id))}`
    await $fetch(path, { method: 'DELETE' })
    if (previewDoc.value && String(previewDoc.value.id) === String(id)) previewDoc.value = null
    await refresh()
    success.value = 'File deleted.'
    clearNoticeSoon()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Delete failed.'
  } finally {
    deletingId.value = null
  }
}
</script>
