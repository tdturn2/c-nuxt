<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Chapel</h1>
            <p class="mt-1 text-sm text-gray-600">Latest episodes first. Add or edit from one modal.</p>
          </div>
          <button
            v-if="canManageDashboard"
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            @click="openCreateModal"
          >
            Add an Episode
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success }}</div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Date</th>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Speaker</th>
                  <th class="px-4 py-2 text-left font-semibold">Campus</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">Loading episodes...</td>
                </tr>
                <tr v-else-if="!episodes.length" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">No episodes found.</td>
                </tr>
                <tr v-for="episode in episodes" :key="String(episode.id)" class="border-t border-gray-200">
                  <td class="px-4 py-3 text-gray-700">{{ formatDate(episode.date) }}</td>
                  <td class="px-4 py-3 font-medium text-gray-900">{{ episode.title || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ episodeSpeakerName(episode) }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ episode.campus || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ episodeStatusLabel(episode) }}</td>
                  <td class="px-4 py-3 text-right">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="openEditModal(episode)">
                      Edit
                    </button>
                    <button
                      type="button"
                      class="ml-3 text-red-700 hover:underline"
                      @click="deleteEpisode(episode.id)"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </main>

    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ isEditing ? 'Edit Chapel Episode' : 'Add Chapel Episode' }}</h2>
            <p class="mt-1 text-sm text-gray-600">Use the same form for create and update.</p>
          </div>
          <button type="button" class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" @click="closeModal">
            Close
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitEpisode">
          <div class="rounded-md border border-gray-200 p-3">
            <h3 class="text-sm font-semibold text-gray-900">Speaker</h3>
            <div class="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <USelectMenu
                  v-model="selectedSpeakerOption"
                  :items="speakerSelectItems"
                  value-attribute="id"
                  label-attribute="label"
                  searchable
                  search-input-placeholder="Search speakers..."
                  placeholder="Select speaker"
                />
              </div>
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="openSpeakerModal"
              >
                Add speaker
              </button>
            </div>
          </div>

          <div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p class="font-medium">Is this episode in the future?</p>
            <label class="mt-2 inline-flex items-center gap-2">
              <input v-model="form.isFutureEpisode" type="checkbox">
              Yes, keep as draft with active = false and is_podcast = false
            </label>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <input v-model="form.episode.date" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm" required>
            <input v-model="form.episode.title" type="text" placeholder="Episode title (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <textarea
              v-model="form.episode.description"
              rows="3"
              placeholder="Episode description (optional, shown on public Chapel page)"
              class="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <select v-model="form.episode.campus" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="KY">Kentucky</option>
              <option value="FL">Orlando</option>
            </select>
            <input v-model="form.episode.vimeo_id" type="text" placeholder="Sermon Vimeo ID (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input v-model="form.episode.vimeo_full_id" type="text" placeholder="Full Service Vimeo ID (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input v-model="form.episode.youtube" type="text" placeholder="YouTube URL (optional)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <input :value="selectedMp3Label" type="text" readonly placeholder="No MP3 selected" class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm sm:col-span-2">
            <details class="rounded-lg border border-gray-200 bg-white sm:col-span-2 [&_summary::-webkit-details-marker]:hidden">
              <summary class="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                <span class="text-sm font-medium text-gray-900">MP3 upload and selector</span>
                <p class="text-xs text-gray-500">Upload a new MP3 or pick an existing one.</p>
              </summary>
              <div class="border-t border-gray-100 p-3">
                <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto] mb-3">
                  <input ref="uploadMp3InputRef" type="file" accept=".mp3,audio/mpeg" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                  <button
                    type="button"
                    class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    :disabled="uploadingMp3"
                    @click="uploadMp3Asset"
                  >
                    {{ uploadingMp3 ? 'Uploading...' : 'Upload MP3' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="form.episode.mp3 = ''"
                  >
                    Clear
                  </button>
                </div>
                <UInput
                  v-model="mp3LibrarySearch"
                  type="search"
                  placeholder="Search MP3 assets..."
                  icon="i-lucide-search"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
                <ul class="mt-2 max-h-56 overflow-auto rounded-md border border-gray-200 divide-y divide-gray-200">
                  <li
                    v-for="asset in filteredMp3Assets"
                    :key="String(asset.id)"
                    class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-gray-900">{{ mp3Label(asset) }}</p>
                      <p class="truncate text-xs text-gray-500">{{ asset?.file?.filename || '' }}</p>
                    </div>
                    <button
                      type="button"
                      class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-[rgba(13,94,130,1)] hover:bg-gray-50"
                      @click="form.episode.mp3 = String(asset.id)"
                    >
                      Select
                    </button>
                  </li>
                  <li v-if="!filteredMp3Assets.length" class="px-3 py-3 text-sm text-gray-500">No matching MP3 assets.</li>
                </ul>
              </div>
            </details>
            <div class="flex items-center gap-4 rounded-md border border-gray-200 px-3 py-2 text-sm">
              <label class="inline-flex items-center gap-2">
                <input v-model="form.episode.active" type="checkbox" :disabled="form.isFutureEpisode">
                Active
              </label>
              <label class="inline-flex items-center gap-2">
                <input v-model="form.episode.is_podcast" type="checkbox" :disabled="form.isFutureEpisode">
                Is podcast
              </label>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
              {{ saving ? 'Saving...' : isEditing ? 'Update episode' : 'Create episode' }}
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeModal">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="speakerModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Add Speaker</h2>
            <p class="mt-1 text-sm text-gray-600">Create a speaker, then it will be selected in the episode form.</p>
          </div>
          <button type="button" class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50" @click="closeSpeakerModal">
            Close
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="saveSpeaker">
          <div class="grid gap-3 sm:grid-cols-2">
            <input v-model="speakerForm.name" type="text" placeholder="Speaker name" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <label class="inline-flex items-center gap-2 text-sm"><input v-model="speakerForm.active" type="checkbox"> Active</label>
            <input :value="selectedPhotoLabel" type="text" readonly placeholder="No photo selected" class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
          </div>

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
                  :key="String(asset.id)"
                  class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div class="min-w-0">
                    <p class="truncate font-medium text-gray-900">{{ mediaLabel(asset) }}</p>
                    <p class="truncate text-xs text-gray-500">{{ asset?.file?.filename || '' }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-[rgba(13,94,130,1)] hover:bg-gray-50"
                    @click="speakerForm.photo = asset.id"
                  >
                    Select
                  </button>
                </li>
                <li v-if="!filteredMediaAssets.length" class="px-3 py-3 text-sm text-gray-500">No matching assets.</li>
              </ul>
            </div>
          </details>

          <textarea
            v-model="speakerForm.speakerDescription"
            rows="3"
            placeholder="Speaker description"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <div class="flex items-center gap-2">
            <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
              {{ speakerSaving ? 'Saving...' : 'Save speaker' }}
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="closeSpeakerModal">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type DashboardChapelSpeaker = { id: string | number; name: string }
type ChapelEpisode = {
  id: string | number
  date?: string
  title?: string
  description?: string | null
  campus?: string
  active?: boolean
  is_podcast?: boolean
  mp3?: string | number | { id?: string | number } | null
  vimeo?: string | null
  vimeo_id?: string | null
  vimeo_full?: string | null
  vimeo_full_id?: string | null
  youtube?: string | null
  speaker?: { id?: string | number; name?: string } | string | number | null
}

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', { key: 'dashboard-chapel-me' })
const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const episodes = ref<ChapelEpisode[]>([])
const speakers = ref<DashboardChapelSpeaker[]>([])
const mediaAssets = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const modalOpen = ref(false)
const speakerModalOpen = ref(false)
const editingEpisodeId = ref<string | number | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadMp3InputRef = ref<HTMLInputElement | null>(null)
const uploadAlt = ref('')
const uploadingPhoto = ref(false)
const uploadingMp3 = ref(false)
const speakerSaving = ref(false)
const assetLibrarySearch = ref('')
const mp3LibrarySearch = ref('')
const selectedSpeakerOption = ref<{ id: string; label: string } | undefined>(undefined)
const mp3Assets = ref<any[]>([])

const form = ref({
  isFutureEpisode: true,
  episode: {
    date: '',
    title: '',
    description: '',
    campus: 'KY',
    mp3: '',
    vimeo: '',
    vimeo_id: '',
    vimeo_full: '',
    vimeo_full_id: '',
    youtube: '',
    active: true,
    is_podcast: true,
  },
  speaker: {
    speakerId: '' as string,
  },
})

const speakerForm = ref({
  name: '',
  speakerDescription: '',
  photo: null as string | number | null,
  active: true,
})

const isEditing = computed(() => editingEpisodeId.value != null)

watch(
  () => form.value.isFutureEpisode,
  (isFuture) => {
    if (isFuture) {
      form.value.episode.active = false
      form.value.episode.is_podcast = false
    } else if (!isEditing.value) {
      form.value.episode.active = true
      form.value.episode.is_podcast = true
    }
  },
  { immediate: true },
)

function resetForm() {
  editingEpisodeId.value = null
  form.value = {
    isFutureEpisode: true,
    episode: {
      date: '',
      title: '',
      description: '',
      campus: 'KY',
      mp3: '',
      vimeo: '',
      vimeo_id: '',
      vimeo_full: '',
      vimeo_full_id: '',
      youtube: '',
      active: true,
      is_podcast: true,
    },
    speaker: {
      speakerId: '',
    },
  }
  selectedSpeakerOption.value = undefined
  speakerForm.value = {
    name: '',
    speakerDescription: '',
    photo: null,
    active: true,
  }
}

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function episodeSpeakerName(ep: ChapelEpisode): string {
  if (!ep.speaker) return '—'
  if (typeof ep.speaker === 'object') return ep.speaker.name || `#${String(ep.speaker.id || '—')}`
  return `#${String(ep.speaker)}`
}

function episodeStatusLabel(ep: ChapelEpisode): string {
  if (ep.active === false && ep.is_podcast === false) return 'Draft'
  if (ep.active === false) return 'Inactive'
  return 'Published'
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
  if (!speakerForm.value.photo) return ''
  const match = mediaAssets.value.find((asset: any) => String(asset.id) === String(speakerForm.value.photo))
  return match ? mediaLabel(match) : `Asset #${String(speakerForm.value.photo)}`
})

function mp3Label(asset: any) {
  const filename = asset?.file?.filename || asset?.filename || asset?.file?.name || ''
  return filename || `Asset #${asset?.id}`
}

const filteredMp3Assets = computed(() => {
  const q = mp3LibrarySearch.value.trim().toLowerCase()
  if (!q) return mp3Assets.value
  return mp3Assets.value.filter((asset: any) => {
    const label = mp3Label(asset).toLowerCase()
    const filename = String(asset?.file?.filename || '').toLowerCase()
    return label.includes(q) || filename.includes(q)
  })
})

const selectedMp3Label = computed(() => {
  if (!form.value.episode.mp3) return ''
  const match = mp3Assets.value.find((asset: any) => String(asset.id) === String(form.value.episode.mp3))
  return match ? mp3Label(match) : `Asset #${String(form.value.episode.mp3)}`
})

const speakerSelectItems = computed(() => {
  return speakers.value.map((speaker) => ({
    id: String(speaker.id),
    label: speaker.name || `Speaker ${String(speaker.id)}`,
  }))
})

function speakerIdFromEpisode(ep: ChapelEpisode): string {
  if (!ep.speaker) return ''
  if (typeof ep.speaker === 'object' && ep.speaker.id != null) return String(ep.speaker.id)
  return typeof ep.speaker === 'string' || typeof ep.speaker === 'number' ? String(ep.speaker) : ''
}

function mp3IdFromEpisode(ep: ChapelEpisode): string {
  if (!ep.mp3) return ''
  if (typeof ep.mp3 === 'object' && ep.mp3.id != null) return String(ep.mp3.id)
  return String(ep.mp3)
}

function openCreateModal() {
  resetForm()
  selectedSpeakerOption.value = undefined
  modalOpen.value = true
}

function openEditModal(ep: ChapelEpisode) {
  resetForm()
  editingEpisodeId.value = ep.id
  form.value = {
    isFutureEpisode: ep.active === false || ep.is_podcast === false,
    episode: {
      date: ep.date ? String(ep.date).slice(0, 10) : '',
      title: ep.title || '',
      description: ep.description != null ? String(ep.description) : '',
      campus: ep.campus || 'KY',
      mp3: mp3IdFromEpisode(ep),
      vimeo: ep.vimeo || '',
      vimeo_id: ep.vimeo_id || '',
      vimeo_full: ep.vimeo_full || '',
      vimeo_full_id: ep.vimeo_full_id || '',
      youtube: ep.youtube || '',
      active: ep.active !== false,
      is_podcast: ep.is_podcast !== false,
    },
    speaker: {
      speakerId: (() => {
        const raw = speakerIdFromEpisode(ep)
        return raw ? String(raw) : ''
      })(),
    },
  }
  const selectedId = String(form.value.speaker.speakerId || '')
  const fromList = speakerSelectItems.value.find((item) => item.id === selectedId)
  const fallbackLabel =
    typeof ep.speaker === 'object' && typeof ep.speaker?.name === 'string' && ep.speaker.name.trim()
      ? ep.speaker.name.trim()
      : `Speaker ${selectedId}`
  selectedSpeakerOption.value = selectedId ? (fromList || { id: selectedId, label: fallbackLabel }) : undefined
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  selectedSpeakerOption.value = undefined
}

function openSpeakerModal() {
  speakerModalOpen.value = true
}

function closeSpeakerModal() {
  speakerModalOpen.value = false
}

async function loadEpisodes() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/dashboard/chapel')
    episodes.value = Array.isArray(res?.docs) ? res.docs : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load chapel episodes.'
  } finally {
    loading.value = false
  }
}

async function loadSpeakers() {
  if (!canManageDashboard.value) return
  const res: any = await $fetch('/api/dashboard/chapel-speakers')
  speakers.value = Array.isArray(res?.docs) ? res.docs : []
}

async function loadMediaAssets() {
  try {
    const res: any = await $fetch('/api/speaker-photos', {
      query: { limit: 100, sort: '-createdAt', depth: 1 },
    })
    mediaAssets.value = Array.isArray(res?.docs) ? res.docs : []
  } catch {
    mediaAssets.value = []
  }
}

async function loadMp3Assets() {
  try {
    const res: any = await $fetch('/api/chapel-podcast-media', {
      query: { limit: 100, sort: '-createdAt', depth: 1 },
    })
    mp3Assets.value = Array.isArray(res?.docs) ? res.docs : []
  } catch {
    mp3Assets.value = []
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
    if (res?.id != null) speakerForm.value.photo = res.id
    if (uploadInputRef.value) uploadInputRef.value.value = ''
    uploadAlt.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload photo.'
  } finally {
    uploadingPhoto.value = false
  }
}

async function uploadMp3Asset() {
  const file = uploadMp3InputRef.value?.files?.[0]
  if (!file) {
    error.value = 'Choose an MP3 file to upload.'
    return
  }
  uploadingMp3.value = true
  error.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    const res: any = await $fetch('/api/chapel-podcast-media/upload', { method: 'POST', body })
    await loadMp3Assets()
    if (res?.id != null) form.value.episode.mp3 = String(res.id)
    if (uploadMp3InputRef.value) uploadMp3InputRef.value.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload MP3.'
  } finally {
    uploadingMp3.value = false
  }
}

async function submitEpisode() {
  error.value = null
  success.value = null
  form.value.speaker.speakerId = selectedSpeakerOption.value?.id
    ? String(selectedSpeakerOption.value.id)
    : String(form.value.speaker.speakerId || '')
  if (!form.value.episode.date) {
    error.value = 'Episode date is required.'
    return
  }
  if (!form.value.speaker.speakerId) {
    error.value = 'Select a speaker or add one first.'
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await $fetch(`/api/dashboard/chapel/${encodeURIComponent(String(editingEpisodeId.value))}`, {
        method: 'PATCH',
        body: form.value,
      })
      success.value = 'Chapel episode updated.'
    } else {
      await $fetch('/api/dashboard/chapel', { method: 'POST', body: form.value })
      success.value = 'Chapel episode created.'
    }
    closeModal()
    await loadEpisodes()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save chapel episode.'
  } finally {
    saving.value = false
  }
}

async function saveSpeaker() {
  error.value = null
  if (!speakerForm.value.name.trim()) {
    error.value = 'Speaker name is required.'
    return
  }

  speakerSaving.value = true
  try {
    const created: any = await $fetch('/api/dashboard/chapel-speakers/create', {
      method: 'POST',
      body: speakerForm.value,
    })
    await loadSpeakers()
    if (created?.id != null) {
      const createdId = String(created.id)
      form.value.speaker.speakerId = createdId
      selectedSpeakerOption.value = speakerSelectItems.value.find((item) => item.id === createdId) || undefined
    }
    closeSpeakerModal()
    success.value = 'Speaker created and selected.'
  } catch (e: any) {
    error.value = e?.message || 'Failed to create speaker.'
  } finally {
    speakerSaving.value = false
  }
}

async function deleteEpisode(id: string | number) {
  if (!confirm('Delete this chapel episode?')) return
  error.value = null
  success.value = null
  try {
    await $fetch(`/api/dashboard/chapel/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
    })
    success.value = 'Chapel episode deleted.'
    await loadEpisodes()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete chapel episode.'
  }
}

watch(canManageDashboard, () => loadEpisodes(), { immediate: true })
watch(canManageDashboard, () => loadSpeakers(), { immediate: true })
watch(canManageDashboard, () => loadMediaAssets(), { immediate: true })
watch(canManageDashboard, () => loadMp3Assets(), { immediate: true })

watch(
  () => [selectedSpeakerOption.value, speakerSelectItems.value.length] as const,
  (val) => {
    const selected = Array.isArray(val) ? val[0] : undefined
    form.value.speaker.speakerId = selected?.id ? String(selected.id) : ''
  },
  { immediate: true },
)
</script>
