<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Daily Eucharist</h1>
          <p class="mt-1 text-sm text-gray-600">Manage weekly toggle/summary and Daily Eucharist schedule entries.</p>
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

          <form class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm" @submit.prevent="saveSettings">
            <h2 class="text-base font-semibold text-gray-900">This Week Settings</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                <input v-model="settingsForm.enabledThisWeek" type="checkbox">
                Is there Eucharist this week?
              </label>
              <input
                v-model="settingsForm.name"
                type="text"
                placeholder="Settings record name (e.g. Default)"
                class="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
              <textarea
                v-model="settingsForm.summary"
                rows="3"
                placeholder="Summary shown on /chapel and Daily Eucharist pages (optional)"
                class="sm:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div class="mt-4">
              <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
                Save settings
              </button>
            </div>
          </form>

          <form class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm" @submit.prevent="saveEntry">
            <h2 class="text-base font-semibold text-gray-900">{{ editingEntryId ? 'Edit entry' : 'Add entry' }}</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <input v-model="entryForm.date" type="date" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <select v-model="entryForm.connectUser" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">No Connect user selected</option>
                <option v-for="user in users" :key="String(user.id)" :value="String(user.id)">
                  {{ userLabel(user) }}
                </option>
              </select>
              <input
                v-model="entryForm.eucharistSpeaker"
                type="text"
                placeholder="Speaker display override (optional)"
                class="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
              <select v-model="entryForm.location" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select location</option>
                <option v-for="location in locations" :key="location" :value="location">
                  {{ location }}
                </option>
              </select>
              <input :value="selectedPhotoLabel" type="text" readonly placeholder="No speaker photo selected" class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
            </div>
            <details class="mt-3 rounded-lg border border-gray-200 bg-white [&_summary::-webkit-details-marker]:hidden">
              <summary class="cursor-pointer list-none px-3 py-2 hover:bg-gray-50">
                <span class="text-sm font-medium text-gray-900">Speaker photo selector</span>
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
                      @click="selectPhoto(asset)"
                    >
                      {{ isSelectedAsset(asset) ? 'Selected' : 'Select' }}
                    </button>
                  </li>
                  <li v-if="!filteredMediaAssets.length" class="px-3 py-3 text-sm text-gray-500">No matching assets.</li>
                </ul>
              </div>
            </details>
            <div class="mt-3 flex items-center gap-4 text-sm">
              <label class="inline-flex items-center gap-2"><input v-model="entryForm.active" type="checkbox"> Active</label>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
                {{ editingEntryId ? 'Update entry' : 'Create entry' }}
              </button>
              <button
                v-if="editingEntryId"
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="resetEntryForm"
              >
                Cancel
              </button>
            </div>
          </form>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Date</th>
                  <th class="px-4 py-2 text-left font-semibold">Speaker</th>
                  <th class="px-4 py-2 text-left font-semibold">Location</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">Loading Daily Eucharist entries...</td>
                </tr>
                <tr v-else-if="!entries.length" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">No entries found.</td>
                </tr>
                <tr v-for="entry in entries" :key="String(entry.id)" class="border-t border-gray-200">
                  <td class="px-4 py-3 text-gray-700">{{ displayDate(entry.date) }}</td>
                  <td class="px-4 py-3 font-medium text-gray-900">
                    {{ entry.eucharistSpeaker || entry.connectUser?.name || 'TBD' }}
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ entry.location || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ entry.active === false ? 'Inactive' : 'Active' }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="startEdit(entry)">Edit</button>
                    <button type="button" class="text-red-700 hover:underline" @click="removeEntry(entry.id)">Delete</button>
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
type DashboardUser = { id: string | number; name?: string; email?: string }
type EucharistEntry = {
  id: string | number
  date?: string
  connectUser?: { id?: string | number; name?: string } | string | number | null
  eucharistSpeaker?: string
  speakerPhoto?: { id?: string | number } | string | number | null
  location?: string
  active?: boolean
}

const locations = [
  'Estes Chapel',
  'Fletcher Chapel',
  'Gym',
  'McKenna Chapel',
  'Royal Auditorium',
  'Richard Allen Chapel',
  'Community House',
  'Campus Green',
  'Student Center',
]

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', { key: 'dashboard-daily-eucharist-me' })
const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const users = ref<DashboardUser[]>([])
const entries = ref<EucharistEntry[]>([])
const editingEntryId = ref<string | number | null>(null)

const settingsForm = ref({
  name: 'Default',
  enabledThisWeek: false,
  summary: '',
})

const entryForm = ref({
  date: '',
  connectUser: '',
  eucharistSpeaker: '',
  speakerPhoto: null as string | number | null,
  location: '',
  active: true,
})

const mediaAssets = ref<any[]>([])
const uploadInputRef = ref<HTMLInputElement | null>(null)
const uploadAlt = ref('')
const uploadingImage = ref(false)
const assetLibrarySearch = ref('')

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
  if (!entryForm.value.speakerPhoto) return ''
  const match = mediaAssets.value.find((asset: any) => String(resolveAssetId(asset)) === String(entryForm.value.speakerPhoto))
  return match ? mediaLabel(match) : `Asset #${String(entryForm.value.speakerPhoto)}`
})

function isSelectedAsset(asset: any): boolean {
  const id = resolveAssetId(asset)
  if (id == null || entryForm.value.speakerPhoto == null) return false
  return String(id) === String(entryForm.value.speakerPhoto)
}

function selectPhoto(asset: any) {
  const id = resolveAssetId(asset)
  if (id == null) {
    error.value = 'Selected asset is missing an ID.'
    return
  }
  error.value = null
  entryForm.value.speakerPhoto = id
}

function displayDate(value?: string) {
  if (!value) return '—'
  const dateOnly = String(value).slice(0, 10)
  const d = new Date(`${dateOnly}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? dateOnly : d.toLocaleDateString()
}

function userLabel(user: DashboardUser) {
  const name = String(user.name || '').trim()
  const email = String(user.email || '').trim()
  return name || email || `#${String(user.id)}`
}

function toUserId(value: EucharistEntry['connectUser']): string {
  if (!value) return ''
  if (typeof value === 'object') return value.id != null ? String(value.id) : ''
  return String(value)
}

function toPhotoId(value: EucharistEntry['speakerPhoto']): string | number | null {
  if (!value) return null
  if (typeof value === 'object') return value.id != null ? value.id : null
  return value
}

function resetEntryForm() {
  editingEntryId.value = null
  entryForm.value = {
    date: '',
    connectUser: '',
    eucharistSpeaker: '',
    speakerPhoto: null,
    location: '',
    active: true,
  }
}

function startEdit(entry: EucharistEntry) {
  editingEntryId.value = entry.id
  entryForm.value = {
    date: entry.date ? String(entry.date).slice(0, 10) : '',
    connectUser: toUserId(entry.connectUser),
    eucharistSpeaker: entry.eucharistSpeaker || '',
    speakerPhoto: toPhotoId(entry.speakerPhoto),
    location: entry.location || '',
    active: entry.active !== false,
  }
}

async function loadSettings() {
  const res: any = await $fetch('/api/dashboard/daily-eucharist/settings')
  const doc = res?.doc
  settingsForm.value = {
    name: doc?.name || 'Default',
    enabledThisWeek: doc?.dailyEucharist?.enabledThisWeek === true,
    summary: typeof doc?.dailyEucharist?.summary === 'string' ? doc.dailyEucharist.summary : '',
  }
}

async function loadEntries() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/dashboard/daily-eucharist/entries')
    entries.value = Array.isArray(res?.docs) ? res.docs : []
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  const res: any = await $fetch('/api/dashboard/daily-eucharist/users')
  users.value = Array.isArray(res?.docs) ? res.docs : []
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
    if (res?.id != null) entryForm.value.speakerPhoto = res.id
    if (uploadInputRef.value) uploadInputRef.value.value = ''
    uploadAlt.value = ''
  } catch (e: any) {
    error.value = e?.message || 'Failed to upload image.'
  } finally {
    uploadingImage.value = false
  }
}

async function saveSettings() {
  error.value = null
  success.value = null
  try {
    await $fetch('/api/dashboard/daily-eucharist/settings', {
      method: 'PATCH',
      body: {
        name: settingsForm.value.name,
        dailyEucharist: {
          enabledThisWeek: settingsForm.value.enabledThisWeek,
          summary: settingsForm.value.summary,
        },
      },
    })
    success.value = 'Daily Eucharist settings saved.'
  } catch (e: any) {
    error.value = e?.message || 'Failed to save settings.'
  }
}

async function saveEntry() {
  error.value = null
  success.value = null
  const speakerName = entryForm.value.eucharistSpeaker.trim()
  if (!entryForm.value.date || !entryForm.value.location || (!entryForm.value.connectUser && !speakerName)) {
    error.value = 'Date, location, and either a speaker user or manual speaker name are required.'
    return
  }

  const payload = {
    date: entryForm.value.date,
    connectUser: entryForm.value.connectUser,
    eucharistSpeaker: speakerName,
    speakerPhoto: entryForm.value.speakerPhoto,
    location: entryForm.value.location,
    active: entryForm.value.active,
  }

  try {
    if (editingEntryId.value != null) {
      await $fetch(`/api/dashboard/daily-eucharist/entries/${encodeURIComponent(String(editingEntryId.value))}`, {
        method: 'PATCH',
        body: payload,
      })
      success.value = 'Daily Eucharist entry updated.'
    } else {
      await $fetch('/api/dashboard/daily-eucharist/entries', {
        method: 'POST',
        body: payload,
      })
      success.value = 'Daily Eucharist entry created.'
    }
    resetEntryForm()
    await loadEntries()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save entry.'
  }
}

async function removeEntry(id: string | number) {
  if (!confirm('Delete this Daily Eucharist entry?')) return
  error.value = null
  success.value = null
  try {
    await $fetch(`/api/dashboard/daily-eucharist/entries/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
    })
    if (editingEntryId.value === id) resetEntryForm()
    success.value = 'Daily Eucharist entry deleted.'
    await loadEntries()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete entry.'
  }
}

async function loadAll() {
  if (!canManageDashboard.value) return
  error.value = null
  try {
    await Promise.all([loadSettings(), loadEntries(), loadUsers(), loadMediaAssets()])
  } catch (e: any) {
    error.value = e?.message || 'Failed to load Daily Eucharist dashboard data.'
  }
}

watch(canManageDashboard, () => loadAll(), { immediate: true })
</script>
