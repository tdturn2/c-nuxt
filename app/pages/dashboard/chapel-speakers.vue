<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Chapel Speakers</h1>
          <p class="mt-1 text-sm text-gray-600">Add and edit chapel speakers independently from episode entries.</p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <span class="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                Speakers: <span class="font-semibold text-gray-900">{{ speakers.length }}</span>
              </span>
              <UInput
                v-model="speakerSearch"
                type="search"
                placeholder="Search speakers..."
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                size="sm"
                class="w-72"
              />
            </div>
            <button
              type="button"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
              @click="openCreateSpeakerModal"
            >
              Add New
            </button>
          </div>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Name</th>
                  <th class="px-4 py-2 text-left font-semibold">Speaker Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Connect User</th>
                  <th class="px-4 py-2 text-left font-semibold">Photo ID</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">Loading speakers...</td>
                </tr>
                <tr v-else-if="!filteredSpeakers.length" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">No speakers found.</td>
                </tr>
                <tr v-for="speaker in filteredSpeakers" :key="String(speaker.id)" class="border-t border-gray-200">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ speaker.name || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ speaker.speakerDescription || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ connectUserLabel(speaker) }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ speaker.photo?.id ?? speaker.photo ?? '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ speaker.active === false ? 'Inactive' : 'Active' }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="startEdit(speaker)">Edit</button>
                    <button type="button" class="text-red-700 hover:underline" @click="removeSpeaker(speaker.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <UModal v-model:open="speakerModalOpen" :ui="{ content: 'max-w-2xl' }">
            <template #header>
              <h2 class="text-base font-semibold text-gray-900">{{ editingId ? 'Edit speaker' : 'Add speaker' }}</h2>
            </template>
            <template #body>
              <form class="space-y-3" @submit.prevent="saveSpeaker">
                <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
                <USelectMenu
                  v-model="selectedSpeakerId"
                  :items="speakerSelectOptions"
                  value-attribute="value"
                  label-attribute="label"
                  searchable
                  placeholder="Add new speaker"
                />
                <div class="grid gap-3 sm:grid-cols-2">
                  <input v-model="form.name" type="text" placeholder="Speaker name" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <USelectMenu
                    v-model="form.connectUser"
                    :items="connectUserOptions"
                    value-attribute="value"
                    label-attribute="label"
                    searchable
                    placeholder="Select Connect user (optional)"
                  />
                  <input :value="selectedPhotoLabel" type="text" readonly placeholder="No photo selected" class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                </div>
                <img
                  v-if="selectedPhotoUrl"
                  :src="selectedPhotoUrl"
                  alt=""
                  class="h-20 w-20 rounded-lg object-cover border border-gray-200"
                >
                <details class="rounded-lg border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden">
                  <summary class="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                    <span class="text-sm font-medium text-gray-900">Speaker photo selector</span>
                    <p class="text-xs text-gray-500">Upload or pick a speaker photo.</p>
                  </summary>
                  <div class="border-t border-gray-100 p-3">
                    <div class="grid gap-3 sm:grid-cols-2 mb-3">
                      <input v-model="uploadAlt" type="text" placeholder="Photo alt/name (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <div class="flex gap-2">
                        <input ref="uploadInputRef" type="file" accept="image/*" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                        <button
                          type="button"
                          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          :disabled="uploadingPhoto"
                          @click="uploadPhotoAsset"
                        >
                          {{ uploadingPhoto ? 'Uploading...' : 'Upload' }}
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
                          @click="selectPhoto(asset)"
                        >
                          {{ isSelectedAsset(asset) ? 'Selected' : 'Select' }}
                        </button>
                      </li>
                      <li v-if="!filteredMediaAssets.length" class="px-3 py-3 text-sm text-gray-500">No matching assets.</li>
                    </ul>
                  </div>
                </details>
                <textarea
                  v-model="form.speakerDescription"
                  rows="3"
                  placeholder="Speaker title/description"
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <div class="flex items-center gap-4 text-sm">
                  <label class="inline-flex items-center gap-2"><input v-model="form.active" type="checkbox"> Active</label>
                </div>
                <div class="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="closeSpeakerModal"
                  >
                    Cancel
                  </button>
                  <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
                    {{ editingId ? 'Update speaker' : 'Create speaker' }}
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
type ChapelSpeaker = {
  id: string | number
  name?: string
  speakerDescription?: string
  photo?: { id?: string | number } | string | number | null
  connectUser?: { id?: string | number; name?: string; email?: string } | string | number | null
  active?: boolean
}
type ConnectUserOption = { label: string; value: string }

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', { key: 'dashboard-chapel-speakers-me' })
const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const speakers = ref<ChapelSpeaker[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadAlt = ref('')
const uploadingPhoto = ref(false)
const assetLibrarySearch = ref('')
const speakerSearch = ref('')
const editingId = ref<string | number | null>(null)
const selectedSpeakerId = ref('')
const speakerModalOpen = ref(false)
const mediaAssets = ref<any[]>([])
const connectUsers = ref<Array<{ id: string | number; name?: string; email?: string }>>([])
const form = ref({
  name: '',
  speakerDescription: '',
  photo: null as string | number | null,
  connectUser: '' as string,
  active: true,
})

function resolveAssetId(asset: any): string | number | null {
  if (!asset || typeof asset !== 'object') return null
  const id = asset.id ?? asset._id ?? asset.doc?.id ?? null
  if (id === null || id === undefined || id === '') return null
  return id as string | number
}

function mediaLabel(asset: any) {
  const alt = typeof asset?.alt === 'string' && asset.alt.trim() ? asset.alt.trim() : ''
  const filename = asset?.file?.filename || asset?.filename || asset?.file?.name || ''
  if (alt && filename) return `${alt} (${filename})`
  return alt || filename || `Asset #${asset?.id}`
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

const selectedPhotoLabel = computed(() => {
  if (!form.value.photo) return ''
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(form.value.photo))
  return match ? mediaLabel(match) : `Asset #${String(form.value.photo)}`
})

const selectedPhotoUrl = computed(() => {
  if (!form.value.photo) return ''
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(form.value.photo))
  const raw =
    (typeof match?._normalizedUrl === 'string' && match._normalizedUrl) ||
    (typeof match?.url === 'string' && match.url) ||
    (typeof match?.file?.url === 'string' && match.file.url) ||
    ''
  return raw
})

const filteredSpeakers = computed(() => {
  const query = speakerSearch.value.trim().toLowerCase()
  if (!query) return speakers.value
  return speakers.value.filter((speaker) => {
    const name = String(speaker.name || '').toLowerCase()
    const title = String(speaker.speakerDescription || '').toLowerCase()
    const userText = connectUserLabel(speaker).toLowerCase()
    return name.includes(query) || title.includes(query) || userText.includes(query)
  })
})

const connectUserOptions = computed<ConnectUserOption[]>(() => [
  { label: 'No Connect user selected', value: '' },
  ...connectUsers.value.map((user) => ({
    label: user.name?.trim() || user.email?.trim() || `User #${String(user.id)}`,
    value: String(user.id),
  })),
])

function isSelectedAsset(asset: any): boolean {
  const id = resolveAssetId(asset)
  if (id == null || form.value.photo == null) return false
  return String(id) === String(form.value.photo)
}

function selectPhoto(asset: any) {
  const id = resolveAssetId(asset)
  if (id == null) {
    error.value = 'Selected asset is missing an ID.'
    return
  }
  error.value = null
  form.value.photo = id
}

function photoIdFromSpeaker(speaker: ChapelSpeaker): string | number | null {
  if (!speaker.photo) return null
  if (typeof speaker.photo === 'object') return speaker.photo.id ?? null
  return speaker.photo
}

/** Normalize USelectMenu model (string id or { value, label }) for API body. */
function connectUserToPayload(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const v = (value as { value?: unknown }).value
    if (v == null || v === '') return null
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
    if (typeof v === 'string') return v.trim() || null
  }
  return null
}

function connectUserIdFromSpeaker(speaker: ChapelSpeaker): string {
  if (!speaker.connectUser) return ''
  if (typeof speaker.connectUser === 'object' && speaker.connectUser.id != null) return String(speaker.connectUser.id)
  if (typeof speaker.connectUser === 'string' || typeof speaker.connectUser === 'number') return String(speaker.connectUser)
  return ''
}

function connectUserLabel(speaker: ChapelSpeaker): string {
  if (!speaker.connectUser) return '—'
  if (typeof speaker.connectUser === 'object') {
    return speaker.connectUser.name?.trim() || speaker.connectUser.email?.trim() || `#${String(speaker.connectUser.id || '—')}`
  }
  const id = String(speaker.connectUser)
  const match = connectUsers.value.find((user) => String(user.id) === id)
  if (!match) return `#${id}`
  return match.name?.trim() || match.email?.trim() || `#${id}`
}

function resetForm() {
  editingId.value = null
  selectedSpeakerId.value = ''
  form.value = {
    name: '',
    speakerDescription: '',
    photo: null,
    connectUser: '',
    active: true,
  }
}

const speakerSelectOptions = computed(() => [
  { label: 'Add new speaker', value: '' },
  ...speakers.value.map((speaker) => ({
    label: speaker.name || `Speaker #${String(speaker.id)}`,
    value: String(speaker.id),
  })),
])

function startEdit(speaker: ChapelSpeaker) {
  editingId.value = speaker.id
  selectedSpeakerId.value = String(speaker.id)
  form.value = {
    name: speaker.name || '',
    speakerDescription: speaker.speakerDescription || '',
    photo: photoIdFromSpeaker(speaker),
    connectUser: connectUserIdFromSpeaker(speaker),
    active: speaker.active !== false,
  }
  speakerModalOpen.value = true
}

function handleSelectedSpeakerChange() {
  if (!selectedSpeakerId.value) {
    resetForm()
    return
  }
  const selected = speakers.value.find((speaker) => String(speaker.id) === selectedSpeakerId.value)
  if (!selected) return
  startEdit(selected)
}

function openCreateSpeakerModal() {
  resetForm()
  speakerModalOpen.value = true
}

function closeSpeakerModal() {
  speakerModalOpen.value = false
  resetForm()
}

async function loadSpeakers() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/dashboard/chapel-speakers')
    speakers.value = Array.isArray(res?.docs) ? res.docs : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load chapel speakers.'
  } finally {
    loading.value = false
  }
}

async function loadConnectUsers() {
  if (!canManageDashboard.value) return
  try {
    const res: any = await $fetch('/api/dashboard/chapel-speakers/users')
    connectUsers.value = Array.isArray(res?.docs) ? res.docs : []
  } catch {
    connectUsers.value = []
  }
}

async function loadMediaAssets() {
  try {
    const res: any = await $fetch('/api/speaker-photos', {
      query: { limit: 1000, pagination: 'false', sort: '-createdAt', depth: 1 },
    })
    mediaAssets.value = Array.isArray(res?.docs) ? res.docs : []
  } catch (e: any) {
    mediaAssets.value = []
    error.value = e?.statusMessage || e?.message || 'Failed to load speaker photos.'
  }
}

async function uploadPhotoAsset() {
  const file = uploadInputRef.value?.files?.[0]
  if (!file) {
    error.value = 'Choose an image file to upload.'
    return
  }
  uploadingPhoto.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    if (uploadAlt.value.trim()) body.append('alt', uploadAlt.value.trim())
    const res: any = await $fetch('/api/speaker-photos/upload', { method: 'POST', body })
    await loadMediaAssets()
    if (res?.id != null) form.value.photo = res.id
    if (uploadInputRef.value) uploadInputRef.value.value = ''
    uploadAlt.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload photo.'
  } finally {
    uploadingPhoto.value = false
  }
}

async function saveSpeaker() {
  error.value = null
  if (!form.value.name.trim()) {
    error.value = 'Speaker name is required.'
    return
  }

  const payload = {
    name: form.value.name.trim(),
    speakerDescription: form.value.speakerDescription.trim() || null,
    photo: form.value.photo,
    connectUser: connectUserToPayload(form.value.connectUser as unknown),
    active: form.value.active,
  }

  try {
    if (editingId.value != null) {
      await $fetch(`/api/dashboard/chapel-speakers/${encodeURIComponent(String(editingId.value))}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/dashboard/chapel-speakers/create', {
        method: 'POST',
        body: payload,
      })
    }
    closeSpeakerModal()
    await loadSpeakers()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save chapel speaker.'
  }
}

async function removeSpeaker(id: string | number) {
  if (!confirm('Delete this speaker?')) return
  error.value = null
  try {
    await $fetch(`/api/dashboard/chapel-speakers/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
    })
    if (editingId.value === id) resetForm()
    await loadSpeakers()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete chapel speaker.'
  }
}

watch(canManageDashboard, () => loadSpeakers(), { immediate: true })
watch(canManageDashboard, () => loadMediaAssets(), { immediate: true })
watch(canManageDashboard, () => loadConnectUsers(), { immediate: true })
watch(selectedSpeakerId, () => handleSelectedSpeakerChange())
</script>
