<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header class="mb-8">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Chapel</h1>
          <p class="mt-2 text-gray-600">This week's speakers and services.</p>
        </header>

        <div v-if="pending" class="mt-6 text-gray-500">Loading this week's chapel speakers...</div>
        <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ error.message || "Failed to load this week's chapel speakers." }}
        </div>
        <div v-else-if="!weekEntries.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No chapel speakers found for this week yet.
        </div>

        <section v-else class="mt-2">
          <ul class="grid grid-cols-1 items-stretch gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="item in weekEntries"
              :key="String(item.id)"
              class="min-w-0 h-full"
            >
              <article class="flex h-full flex-col items-center rounded-lg border border-gray-200 bg-white px-5 py-6 text-center shadow-sm">
                <h2 class="font-serif text-xl text-gray-900">
                  {{ weekdayDateLabel(item.date) }}
                </h2>
                <img
                  v-if="speakerPhotoUrl(item.speaker)"
                  :src="speakerPhotoUrl(item.speaker)"
                  :alt="item.speaker?.name || 'Chapel speaker'"
                  class="mt-4 aspect-square w-1/2 max-w-[140px] rounded-full border-4 border-[var(--color-gold)] object-cover object-top bg-gray-100"
                >
                <div
                  v-else
                  class="mt-4 aspect-square w-1/2 max-w-[140px] rounded-full border-4 border-[var(--color-gold)] bg-gray-200"
                  aria-hidden="true"
                />
                <p class="mt-4 text-base font-semibold text-gray-900">
                  {{ item.speaker?.name || 'TBD' }}
                </p>
                <p v-if="speakerTitle(item.speaker)" class="mt-1 max-w-[16rem] text-sm leading-snug text-gray-600">
                  {{ speakerTitle(item.speaker) }}
                </p>
                <p v-if="item.title" class="mt-2 max-w-[16rem] text-sm font-medium text-[rgba(13,94,130,1)]">
                  {{ item.title }}
                </p>

                <div
                  v-if="entryAudioUrl(item) || entryMessageVideo(item)"
                  class="mt-auto flex items-center justify-center gap-2 pt-4"
                >
                  <button
                    v-if="entryAudioUrl(item)"
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.18)]"
                    aria-label="Play audio message"
                    @click="playEntryAudio(item)"
                  >
                    <UIcon name="i-heroicons-play" class="h-4 w-4" />
                  </button>
                  <button
                    v-if="entryMessageVideo(item)"
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.18)]"
                    aria-label="Play video message"
                    @click="playEntryVideo(item)"
                  >
                    <UIcon name="i-heroicons-film" class="h-4 w-4" />
                  </button>
                </div>
                <div v-else class="mt-auto" aria-hidden="true" />
              </article>
            </li>
          </ul>
        </section>

        <section class="mt-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-2xl font-semibold text-gray-900">Daily Eucharist</h2>
            <NuxtLink
              to="/chapel/daily-eucharist"
              class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
            >
              View full schedule
            </NuxtLink>
          </div>
          <div v-if="dailyPending" class="mt-3 text-sm text-gray-500">Loading Daily Eucharist summary...</div>
          <div v-else-if="dailyError" class="mt-3 text-sm text-red-700">
            Failed to load Daily Eucharist summary.
          </div>
          <template v-else>
            <p class="mt-3 text-sm font-medium text-gray-900">
              {{ dailyStatusLabel }}
            </p>
            <p v-if="dailySummary" class="mt-1 text-sm text-gray-700">{{ dailySummary }}</p>
            <ul v-if="dailyEnabledThisWeek && dailyEntries.length" class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <li
                v-for="entry in dailyEntries"
                :key="String(entry.id)"
                class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <p class="text-xs uppercase tracking-wide text-[rgba(13,94,130,1)]">{{ weekdayDateLabel(entry.date) }}</p>
                <p class="mt-1 text-sm font-semibold text-gray-900">{{ entry.speakerName || 'TBD' }}</p>
                <p class="mt-0.5 text-sm text-gray-600">{{ entry.location || 'Location TBD' }}</p>
              </li>
            </ul>
            <ul v-else-if="!dailyEntries.length && campusHours.length" class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <li
                v-for="day in campusHours"
                :key="day.date"
                class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <p class="text-xs uppercase tracking-wide text-[rgba(13,94,130,1)]">{{ weekdayDateLabel(day.date) }}</p>
                <p class="mt-1 text-sm font-semibold text-gray-900">{{ day.hours }}</p>
              </li>
            </ul>
          </template>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { chapelSpeakerPhoto, chapelSpeakerTitle } from '@shared/chapelSpeakerDisplay'
import { chapelMp3PublicUrl } from '@shared/chapelMp3'
import { toBrowserMediaUrl } from '@shared/mediaUrls'

type WeekSpeaker = {
  id?: string | number
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

type WeekEntry = {
  id: string | number
  date: string
  title?: string
  description?: string | null
  campus?: string | null
  length?: string | null
  size?: string | null
  mp3?: { id?: number | string; url?: string } | number | string | null
  mp3Url?: string | null
  vimeo?: string | null
  vimeo_id?: string | null
  youtube?: string | null
  speaker?: WeekSpeaker | null
}

type MessageVideo = {
  title: string
  vimeoId?: string
  youtubeId?: string
}

type DailyEucharistEntry = {
  id: string | number
  date: string
  location: string
  speakerName: string
}

type CampusHoursEucharist = {
  date: string
  hours: string
}

type DailyEucharistResponse = {
  enabledThisWeek?: boolean
  summary?: string
  entries?: DailyEucharistEntry[]
  campusHours?: CampusHoursEucharist[]
}

const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.connectApi || '').replace(/\/$/, '')
const { playTrack } = useAudioPlayer()
const { playVideo } = useVideoPlayer()

const { data, pending, error } = useFetch<{ entries?: WeekEntry[] }>('/api/chapel/current-week', {
  key: 'chapel-current-week',
  lazy: true,
})
const { data: dailyData, pending: dailyPending, error: dailyError } = useFetch<DailyEucharistResponse>(
  '/api/daily-eucharist/current-week',
  { key: 'chapel-daily-eucharist-summary', lazy: true },
)

const weekEntries = computed(() => (Array.isArray(data.value?.entries) ? data.value!.entries! : []))
const dailyEnabledThisWeek = computed(() => dailyData.value?.enabledThisWeek === true)
const dailySummary = computed(() => (typeof dailyData.value?.summary === 'string' ? dailyData.value.summary.trim() : ''))
const dailyEntries = computed(() => (Array.isArray(dailyData.value?.entries) ? dailyData.value.entries : []))
const campusHours = computed(() => (Array.isArray(dailyData.value?.campusHours) ? dailyData.value.campusHours : []))
const dailyStatusLabel = computed(() => {
  if (dailyEnabledThisWeek.value && dailyEntries.value.length) return 'Eucharist is scheduled this week.'
  if (!dailyEntries.value.length && campusHours.value.length) return 'Eucharist is scheduled this week.'
  return 'No Eucharist this week.'
})

function speakerPhotoUrl(speaker?: WeekSpeaker | null): string {
  const image = chapelSpeakerPhoto(speaker)
  const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
  if (!raw.trim()) return ''
  const proxied = toBrowserMediaUrl(raw)
  if (proxied?.startsWith('/')) return proxied
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return payloadBaseUrl ? `${payloadBaseUrl}${raw.startsWith('/') ? raw : `/${raw}`}` : raw
}

function speakerTitle(speaker?: WeekSpeaker | null): string {
  return chapelSpeakerTitle(speaker)
}

function weekdayDateLabel(dateStr: string): string {
  const d = parseSafeDate(dateStr)
  if (!d) return dateStr
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function parseSafeDate(dateStr: string): Date | null {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function hasChapelAudio(entry: WeekEntry): boolean {
  const mp3 = entry.mp3
  if (mp3 != null) {
    if (typeof mp3 === 'object' && (mp3.url || mp3.id != null)) return true
    if (typeof mp3 === 'number' && Number.isFinite(mp3)) return true
    if (typeof mp3 === 'string' && mp3.trim()) return true
  }
  if (typeof entry.mp3Url === 'string' && entry.mp3Url.trim()) return true
  if (entry.length != null && String(entry.length).trim() !== '') return true
  if (entry.size != null && String(entry.size).trim() !== '') return true
  return false
}

function entryAudioUrl(entry: WeekEntry): string {
  if (!hasChapelAudio(entry)) return ''
  const linked = typeof entry.mp3 === 'object' && entry.mp3?.url ? String(entry.mp3.url) : ''
  if (linked) return linked
  if (typeof entry.mp3Url === 'string' && entry.mp3Url.trim()) return entry.mp3Url.trim()
  return chapelMp3PublicUrl(entry.date, entry.campus) || ''
}

function mediaId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function youtubeVideoId(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const fromUrl = raw.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)
  return fromUrl?.[1] || (/^[\w-]{6,}$/.test(raw) ? raw : '')
}

/** Sermon / message video only — not full-service recordings. */
function entryMessageVideo(entry: WeekEntry): MessageVideo | null {
  const title = entry.title?.trim() || entry.speaker?.name || 'Chapel'
  const sermon = mediaId(entry.vimeo_id ?? entry.vimeo)
  if (sermon) return { title, vimeoId: sermon }
  const youtubeId = youtubeVideoId(entry.youtube)
  if (youtubeId) return { title, youtubeId }
  return null
}

function playEntryAudio(entry: WeekEntry) {
  const audio = entryAudioUrl(entry)
  if (!audio) return
  playTrack({
    id: Number(entry.id) || 0,
    audio,
    title: entry.title?.trim() || 'Chapel',
    artist: entry.speaker?.name || 'Asbury Seminary Chapel',
    artwork: speakerPhotoUrl(entry.speaker) || '/estes-icon.png',
    album: 'Chapel',
  })
}

function playEntryVideo(entry: WeekEntry) {
  const video = entryMessageVideo(entry)
  if (!video) return
  playVideo({
    title: video.title,
    vimeoId: video.vimeoId,
    youtubeId: video.youtubeId,
  })
}
</script>
