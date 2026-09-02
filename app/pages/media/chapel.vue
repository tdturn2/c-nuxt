<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
  <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
          Chapel Archive
        </h1>
        <p class="mt-2 text-gray-600 max-w-2xl">
          Asbury Seminary chapel services. Browse by campus and listen to past episodes.
        </p>
      </header>

      <section v-if="weeklySpeaker" class="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <img
            v-if="speakerImageUrl(weeklySpeaker)"
            :src="speakerImageUrl(weeklySpeaker)"
            :alt="speakerDisplayName(weeklySpeaker) || 'Chapel speaker'"
            class="h-28 w-28 rounded-lg object-cover border border-gray-200"
          >
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-[rgba(13,94,130,1)]">This Week's Speaker</p>
            <h2 class="mt-1 text-lg font-semibold text-gray-900">{{ speakerDisplayName(weeklySpeaker) || 'Chapel Speaker' }}</h2>
            <p v-if="speakerDisplayTitle(weeklySpeaker)" class="mt-2 text-sm text-gray-700 whitespace-pre-line">
              {{ speakerDisplayTitle(weeklySpeaker) }}
            </p>
          </div>
        </div>
      </section>

      <!-- Search -->
      <div class="mb-6">
        <UInput
          v-model="searchQuery"
          placeholder="Search by title or speaker..."
          size="md"
          class="max-w-md"
        >
          <template #leading>
            <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400" />
          </template>
        </UInput>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-4 mb-6">
        <div class="flex items-center gap-2">
          <label for="campus" class="text-sm font-medium text-gray-700">Campus</label>
          <USelectMenu
            id="campus"
            v-model="selectedCampus"
            :items="campusOptions"
            value-attribute="value"
            class="w-40"
          >
            <template #leading>
              <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-gray-500" />
            </template>
          </USelectMenu>
        </div>
        <div class="flex items-center gap-2">
          <label for="speaker" class="text-sm font-medium text-gray-700">Speaker</label>
          <USelectMenu
            id="speaker"
            v-model="selectedSpeaker"
            :items="speakerOptions"
            value-attribute="id"
            label-attribute="label"
            class="w-48"
          >
            <template #leading>
              <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-500" />
            </template>
          </USelectMenu>
          <UButton
            v-if="selectedSpeaker?.id && selectedSpeaker.id !== 0"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="clearSpeaker"
            class="text-gray-500 hover:text-gray-700"
          >
            Clear
          </UButton>
        </div>
        <div class="flex items-center gap-2">
          <label for="sort" class="text-sm font-medium text-gray-700">Sort</label>
          <USelectMenu
            id="sort"
            v-model="sortOrder"
            :items="sortOptions"
            value-attribute="value"
            class="w-40"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="flex justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 text-[rgba(13,94,130,1)] animate-spin" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-6 text-red-800">
        {{ error.message || 'Failed to load chapel episodes.' }}
      </div>

      <!-- Empty -->
      <div v-else-if="episodes.length === 0" class="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        <UIcon name="i-heroicons-speaker-wave" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p class="font-medium">{{ searchQuery.trim() ? 'No episodes match your search' : 'No episodes found' }}</p>
        <p class="text-sm mt-1">{{ searchQuery.trim() ? 'Try a different search term.' : 'Try changing the campus filter or check back later.' }}</p>
      </div>

      <!-- Episode cards -->
      <div v-else>
        <p v-if="searchQuery.trim()" class="mb-3 text-sm text-gray-500">
          Showing {{ episodes.length }} match{{ episodes.length === 1 ? '' : 'es' }} for "{{ searchQuery.trim() }}"
        </p>
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="ep in episodeCards"
            :key="ep.id"
            class="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[rgba(13,94,130,0.35)] hover:shadow-md"
          >
            <div class="flex gap-3">
              <img
                v-if="ep.imageUrl"
                :src="ep.imageUrl"
                :alt="ep.speakerName || 'Chapel speaker'"
                class="h-12 w-12 shrink-0 rounded-full object-cover"
              >
              <div
                v-else
                class="h-12 w-12 shrink-0 rounded-full bg-gray-100"
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {{ formatDate(ep.date) }}
                </p>
                <h2 class="mt-0.5 font-semibold text-gray-900 transition-colors group-hover:text-[rgba(13,94,130,1)] line-clamp-2">
                  {{ ep.title || 'Chapel' }}
                </h2>
                <p v-if="ep.speakerName" class="mt-0.5 text-sm text-gray-600 line-clamp-2">
                  {{ ep.speakerName }}
                  <span v-if="ep.speakerTitle" class="text-gray-500">
                    · {{ ep.speakerTitle }}
                  </span>
                </p>
              </div>
            </div>

            <div class="mt-auto grid grid-cols-1 gap-2 pt-4">
              <UButton
                variant="soft"
                color="primary"
                size="sm"
                block
                leading-icon="i-heroicons-play"
                @click="playEpisode(ep)"
              >
                Play Audio
              </UButton>
              <div class="grid grid-cols-2 gap-2">
                <UButton
                  variant="soft"
                  color="neutral"
                  size="sm"
                  :disabled="!getEpisodeVimeoId(ep)"
                  leading-icon="i-heroicons-film"
                  @click="playEpisodeVideo(ep)"
                >
                  Sermon
                </UButton>
                <UButton
                  variant="soft"
                  color="neutral"
                  size="sm"
                  :disabled="!getEpisodeVimeoFullId(ep)"
                  leading-icon="i-heroicons-film"
                  @click="playEpisodeFullVideo(ep)"
                >
                  Full Service
                </UButton>
              </div>
            </div>
          </li>
        </ul>

        <!-- Pagination: hide when searching -->
        <div v-if="totalPages > 1 && !searchQuery.trim()" class="mt-8 flex items-center justify-center gap-2">
          <UButton
            variant="soft"
            color="neutral"
            size="sm"
            :disabled="page <= 1"
            @click="page = Math.max(1, page - 1)"
            leading-icon="i-heroicons-chevron-left"
          >
            Previous
          </UButton>
          <span class="px-4 text-sm text-gray-600">
            Page {{ page }} of {{ totalPages }}
          </span>
          <UButton
            variant="soft"
            color="neutral"
            size="sm"
            :disabled="page >= totalPages"
            @click="page = Math.min(totalPages, page + 1)"
            trailing-icon="i-heroicons-chevron-right"
          >
            Next
          </UButton>
        </div>
      </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { chapelSpeakerName, chapelSpeakerPhoto, chapelSpeakerTitle } from '@shared/chapelSpeakerDisplay'
import { toBrowserMediaUrl } from '@shared/mediaUrls'

interface ChapelEpisode {
  id: number
  date?: string
  title?: string
  campus?: string
  speaker?: {
    id?: number
    name?: string
    speakerDescription?: string
    photo?: { url?: string } | string | null
    connectUser?: {
      id?: number | string
      name?: string
      employeeTitle?: string
      avatar?: { url?: string } | string | null
    } | string | number | null
  }
  mp3?: { url?: string }
  vimeo?: string
  vimeo_id?: string
  vimeo_full?: string
  vimeo_full_id?: string
}

interface WeeklySpeaker {
  id: number | string
  name?: string
  speakerDescription?: string
  photo?: { url?: string } | string | null
  connectUser?: {
    id?: number | string
    name?: string
    employeeTitle?: string
    avatar?: { url?: string } | string | null
  } | string | number | null
}
interface CurrentWeekResponse {
  entries?: Array<{
    speaker?: WeeklySpeaker | null
  }>
}

type SpeakerOption = { id: number; name: string; label: string }
type CampusOption = { label: string; value: string | null }
type SortOption = { label: string; value: string }

interface ChapelResponse {
  docs: ChapelEpisode[]
  totalDocs: number
  page: number
  totalPages: number
  limit: number
}

const { playVideo } = useVideoPlayer()
const { playTrack } = useAudioPlayer()
const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.connectApi || '').replace(/\/$/, '')

const page = ref(1)
const limit = 18
const searchQuery = ref('')
const debouncedSearch = ref('')

// Debounce search input so we don't fire on every keystroke
let searchTimer: ReturnType<typeof setTimeout>
watch(searchQuery, (val) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 1 // reset to page 1 on new search
  }, 300)
})

const campusOptions: CampusOption[] = [
  { label: 'All campuses', value: null },
  { label: 'Kentucky', value: 'KY' },
  { label: 'Florida', value: 'FL' }
]
const selectedCampus = ref<CampusOption | undefined>(campusOptions[1])
const sortOrder = ref<SortOption>({ label: 'Newest first', value: '-date' })
const sortOptions: SortOption[] = [
  { label: 'Newest first', value: '-date' },
  { label: 'Oldest first', value: 'date' }
]

const selectedSpeaker = ref<SpeakerOption | undefined>(undefined)
const speakerOptions = ref<SpeakerOption[]>([])

// Fetch speakers once for the dropdown (no campus filter so list is complete)
const { data: speakersData } = await useFetch<ChapelResponse>('/api/chapel-podcasts', {
  query: {
    'where[active][equals]': true,
    sort: '-date',
    limit: 500,
    page: 1,
    depth: 2,
  },
})

const speakerOptionsList = computed(() => {
  const docs = speakersData.value?.docs ?? []
  const seen = new Set<number>()
  const list: SpeakerOption[] = []
  for (const doc of docs) {
    const s = doc.speaker
    if (s?.id && !seen.has(s.id)) {
      seen.add(s.id)
      const name = s.name || `Speaker ${s.id}`
      list.push({ id: s.id, name, label: name })
    }
  }
  list.sort((a, b) => a.name.localeCompare(b.name))
  return list
})

watch(speakerOptionsList, (list) => {
  const allOption: SpeakerOption = { id: 0, name: 'All speakers', label: 'All speakers' }
  speakerOptions.value = [allOption, ...list]
  if (!selectedSpeaker.value) {
    selectedSpeaker.value = allOption
  }
}, { immediate: true })

function clearSpeaker() {
  const all = speakerOptions.value.find(s => s.id === 0)
  selectedSpeaker.value = all ?? { id: 0, name: 'All speakers', label: 'All speakers' }
}

// Reset to page 1 when filters change
watch([selectedCampus, selectedSpeaker, sortOrder], () => {
  page.value = 1
})

const queryParams = computed(() => {
  const params: Record<string, string | number | boolean> = {
    'where[active][equals]': true,
    sort: sortOrder.value?.value ?? '-date',
    limit: debouncedSearch.value.trim() ? 100 : limit, // fetch more when searching
    page: page.value,
    depth: 2,
  }

  const campus = selectedCampus.value?.value
  if (campus) {
    params['where[campus][equals]'] = campus
  }

  const speakerId = selectedSpeaker.value?.id
  if (speakerId && speakerId !== 0) {
    params['where[speaker][equals]'] = speakerId
  }

  // Server-side search across title and speaker name
  const q = debouncedSearch.value.trim()
  if (q) {
    params['where[or][0][title][contains]'] = q
    params['where[or][1][speaker.name][contains]'] = q
  }

  return params
})

const { data, pending, error } = await useFetch<ChapelResponse>('/api/chapel-podcasts', {
  query: queryParams,
  watch: [queryParams]
})
const { data: weeklySpeakerData } = await useFetch<CurrentWeekResponse>('/api/chapel/current-week', {
  key: 'chapel-weekly-speaker',
})

const episodes = computed(() => data.value?.docs ?? [])
const episodeCards = computed(() =>
  episodes.value.map((ep) => ({
    ...ep,
    imageUrl: speakerImageUrl(ep.speaker),
    speakerName: speakerDisplayName(ep.speaker),
    speakerTitle: speakerDisplayTitle(ep.speaker),
  })),
)
const totalPages = computed(() => data.value?.totalPages ?? 1)
const weeklySpeaker = computed(() => {
  const entries = weeklySpeakerData.value?.entries
  if (!Array.isArray(entries) || entries.length === 0) return null
  for (const entry of entries) {
    if (entry?.speaker?.id && entry.speaker.name) return entry.speaker
  }
  return null
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHAPEL_MP3_BASE = 'https://s3.amazonaws.com/ats-chapel'

function getChapelMp3Url(ep: ChapelEpisode): string {
  const folder = ep.campus?.toLowerCase() === 'fl' ? 'fl' : 'ky'
  if (!ep.date) return ''
  try {
    const d = new Date(ep.date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${CHAPEL_MP3_BASE}/${folder}/${y}${m}${day}.mp3`
  } catch {
    return ''
  }
}

function playEpisode(ep: ChapelEpisode) {
  const audio = getChapelMp3Url(ep)
  if (!audio) return
  playTrack({
    id: ep.id,
    audio,
    title: ep.title || 'Chapel',
    artist: speakerDisplayName(ep.speaker) || 'Asbury Seminary Chapel',
    artwork: speakerImageUrl(ep.speaker) || '/estes-icon.png',
    album: 'Chapel'
  })
}

function getEpisodeVimeoId(ep: ChapelEpisode): string | undefined {
  const raw = ep.vimeo_id ?? ep.vimeo
  if (raw == null) return undefined
  const s = String(raw).trim()
  return s || undefined
}

function getEpisodeVimeoFullId(ep: ChapelEpisode): string | undefined {
  const raw = ep.vimeo_full_id ?? ep.vimeo_full
  if (raw == null) return undefined
  const s = String(raw).trim()
  return s || undefined
}

function playEpisodeVideo(ep: ChapelEpisode) {
  const vimeoId = getEpisodeVimeoId(ep)
  if (!vimeoId) return
  playVideo({ vimeoId, title: ep.title || 'Chapel' })
}

function playEpisodeFullVideo(ep: ChapelEpisode) {
  const vimeoId = getEpisodeVimeoFullId(ep)
  if (!vimeoId) return
  playVideo({ vimeoId, title: (ep.title || 'Chapel') + ' (Full Service)' })
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(dateStr)
  }
}

function getImageUrl(image?: { url?: string | null } | string | null): string {
  const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
  if (!raw) return ''
  const proxied = toBrowserMediaUrl(raw)
  if (proxied?.startsWith('/')) return proxied
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('http')) return raw
  return `${payloadBaseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`
}

function speakerDisplayName(speaker?: WeeklySpeaker | ChapelEpisode['speaker'] | null): string {
  return chapelSpeakerName(speaker)
}

function speakerDisplayTitle(speaker?: WeeklySpeaker | ChapelEpisode['speaker'] | null): string {
  return chapelSpeakerTitle(speaker)
}

function speakerImageUrl(speaker?: WeeklySpeaker | ChapelEpisode['speaker'] | null): string {
  return getImageUrl(chapelSpeakerPhoto(speaker))
}
</script>