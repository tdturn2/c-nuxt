<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-gray-900">Chapel Calendar</h1>
            <p class="mt-2 text-gray-600">Who is in Estes Chapel this month.</p>
          </div>
          <NuxtLink
            to="/media/chapel"
            class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
          >
            Chapel archive
          </NuxtLink>
        </header>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div class="min-w-0">
          <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                  aria-label="Previous month"
                  @click="shiftMonth(-1)"
                >
                  <UIcon name="i-lucide-chevron-left" class="h-5 w-5" />
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                  aria-label="Next month"
                  @click="shiftMonth(1)"
                >
                  <UIcon name="i-lucide-chevron-right" class="h-5 w-5" />
                </button>
              </div>
              <h2 class="text-lg font-semibold text-gray-900">{{ monthLabel }}</h2>
              <button
                type="button"
                class="rounded-md px-2 py-1 text-sm font-medium text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.08)]"
                @click="goToToday"
              >
                Today
              </button>
            </div>

            <div v-if="pending" class="px-4 py-16 text-center text-sm text-gray-500">Loading chapel schedule…</div>
            <div v-else-if="error" class="px-4 py-10 text-center text-sm text-red-700">
              Could not load this month’s chapel schedule.
            </div>
            <div v-else>
              <div
                v-if="monthThemes.length"
                class="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2"
              >
                <span
                  v-for="theme in monthThemes"
                  :key="theme.id"
                  class="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  :style="{ backgroundColor: themeSwatch(theme.color), color: themeInk(theme.color) }"
                >
                  <span class="truncate">{{ theme.label }}</span>
                  <span class="font-medium opacity-80">{{ formatThemeRange(theme.startDate, theme.endDate) }}</span>
                </span>
              </div>
              <div class="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <div v-for="label in weekdayLabels" :key="label" class="px-1 py-2">{{ label }}</div>
              </div>
              <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="relative">
                <div class="grid grid-cols-7">
                  <button
                    v-for="(cell, index) in week.cells"
                    :key="cell?.date || `pad-${weekIndex}-${index}`"
                    type="button"
                    class="relative min-h-24 border-b border-r border-gray-100 p-1.5 text-left sm:min-h-32 sm:p-2"
                    :class="cellClass(cell)"
                    :style="cellStyle(cell, week.barRows)"
                    :disabled="!cell"
                    :aria-label="cell ? cellAria(cell) : undefined"
                    @click="cell && selectDate(cell.date)"
                  >
                    <template v-if="cell">
                      <span
                        class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold"
                        :class="cell.date === today ? 'bg-[rgba(13,94,130,1)] text-white' : 'text-gray-700'"
                      >
                        {{ cell.day }}
                      </span>
                      <div v-if="cell.services.length" class="mt-1 flex flex-col items-center">
                        <div class="flex -space-x-2">
                          <template v-for="service in cell.services.slice(0, 2)" :key="service.id">
                            <img
                              v-if="service.photo"
                              :src="service.photo"
                              :alt="service.speakerName"
                              class="h-10 w-10 rounded-full border-2 border-[var(--color-gold)] bg-gray-100 object-cover object-top sm:h-12 sm:w-12"
                            >
                            <span
                              v-else
                              class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-[rgba(13,94,130,0.12)] text-xs font-semibold text-[rgba(10,69,92,1)] sm:h-12 sm:w-12"
                            >
                              {{ initials(service.speakerName) }}
                            </span>
                          </template>
                        </div>
                        <p class="mt-1 hidden max-w-full text-center text-[11px] font-medium leading-tight text-gray-800 sm:block">
                          {{ cell.services[0]?.speakerName }}
                        </p>
                      </div>
                    </template>
                  </button>
                </div>
                <div
                  v-if="week.bars.length"
                  class="pointer-events-none absolute inset-x-0 bottom-1 grid grid-cols-7 px-0.5"
                  :style="{ rowGap: '2px' }"
                >
                  <div
                    v-for="bar in week.bars"
                    :key="bar.key"
                    class="mx-0.5 truncate rounded px-1 py-0.5 text-center text-[10px] font-semibold leading-tight sm:text-[11px]"
                    :style="{
                      gridColumn: `${bar.col + 1} / span ${bar.span}`,
                      gridRow: bar.row + 1,
                      backgroundColor: themeSwatch(bar.color),
                      color: themeInk(bar.color),
                    }"
                  >
                    {{ bar.label }}
                  </div>
                </div>
              </div>
            </div>
          </section>
          <NuxtLink
            to="/chapel/daily-eucharist"
            class="mt-4 inline-flex text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
          >
            Daily Eucharist
          </NuxtLink>
          </div>

          <aside class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-[rgba(13,94,130,1)]">
              {{ selectedLabel }}
            </p>
            <div v-if="selectedThemes.length" class="mt-3 space-y-2">
              <div
                v-for="theme in selectedThemes"
                :key="theme.id"
                class="rounded-lg px-3 py-2"
                :style="{ backgroundColor: themeTint(theme.color, 0.16) }"
              >
                <p class="text-sm font-semibold text-gray-900">{{ theme.label }}</p>
                <p class="text-xs text-gray-600">{{ formatThemeRange(theme.startDate, theme.endDate) }}</p>
                <p v-if="theme.note" class="mt-1 text-sm text-gray-700">{{ theme.note }}</p>
              </div>
            </div>
            <div v-if="!selectedServices.length" class="mt-4 text-sm text-gray-500">
              No chapel service on this day.
            </div>
            <ul v-else class="mt-4 space-y-5">
              <li v-for="service in selectedServices" :key="service.id" class="text-center">
                <img
                  v-if="service.photo"
                  :src="service.photo"
                  :alt="service.speakerName"
                  class="mx-auto h-28 w-28 rounded-full border-4 border-[var(--color-gold)] object-cover object-top"
                >
                <div
                  v-else
                  class="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--color-gold)] bg-gray-100 text-2xl font-semibold text-gray-500"
                >
                  {{ initials(service.speakerName) }}
                </div>
                <p class="mt-3 text-base font-semibold text-gray-900">{{ service.speakerName }}</p>
                <p v-if="service.speakerTitle" class="mt-1 text-sm leading-snug text-gray-600">{{ service.speakerTitle }}</p>
                <p v-if="service.title" class="mt-2 text-sm font-medium text-[rgba(13,94,130,1)]">{{ service.title }}</p>
                <div
                  v-if="service.date < today && (service.audioUrl || service.video)"
                  class="mt-3 flex items-center justify-center gap-2"
                >
                  <button
                    v-if="service.audioUrl"
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.18)]"
                    aria-label="Play audio"
                    @click="playServiceAudio(service)"
                  >
                    <UIcon name="i-heroicons-play" class="h-4 w-4" />
                  </button>
                  <button
                    v-if="service.video"
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)] hover:bg-[rgba(13,94,130,0.18)]"
                    :aria-label="service.video.label"
                    @click="playServiceVideo(service)"
                  >
                    <UIcon name="i-heroicons-film" class="h-4 w-4" />
                  </button>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { chapelSpeakerName, chapelSpeakerPhoto, chapelSpeakerTitle } from '@shared/chapelSpeakerDisplay'
import { chapelMp3PublicUrl } from '@shared/chapelMp3'
import { ymdInTimeZone } from '@shared/campusHours'
import {
  formatThemeRange,
  primaryThemeForDate,
  themeBarsForWeek,
  themeInk,
  themeSwatch,
  themeTint,
  themesOnDate,
  type ChapelCalendarTheme,
} from '@shared/chapelCalendarThemes'
import { mediaDisplayUrl, toBrowserMediaUrl } from '@shared/mediaUrls'

type Speaker = {
  name?: string
  speakerDescription?: string
  photo?: { url?: string } | string | null
  connectUser?: {
    name?: string
    employeeTitle?: string
    avatar?: { url?: string } | string | null
  } | string | number | null
}

type Episode = {
  id: string | number
  date?: string
  title?: string
  campus?: string
  length?: string | null
  size?: string | null
  mp3?: { id?: number | string; url?: string } | number | string | null
  mp3Url?: string | null
  vimeo?: string | null
  vimeo_id?: string | null
  vimeo_full?: string | null
  vimeo_full_id?: string | null
  youtube?: string | null
  speaker?: Speaker | null
}

type ServiceVideo = {
  label: string
  title: string
  vimeoId?: string
  youtubeId?: string
}

type Service = {
  id: string
  date: string
  title: string
  speakerName: string
  speakerTitle: string
  photo: string
  audioUrl: string
  video: ServiceVideo | null
}

const { playTrack } = useAudioPlayer()
const { playVideo } = useVideoPlayer()

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = ymdInTimeZone()
const monthCursor = ref(today.slice(0, 7))
const selectedDate = ref(today)

const monthStart = computed(() => `${monthCursor.value}-01`)
const nextMonthStart = computed(() => `${addMonths(monthCursor.value, 1)}-01`)
const monthEnd = computed(() => {
  const [year, month] = monthCursor.value.split('-').map(Number)
  if (!year || !month) return monthStart.value
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${monthCursor.value}-${String(days).padStart(2, '0')}`
})

const { data, pending, error } = await useFetch<{ docs?: Episode[] }>('/api/chapel-podcasts', {
  query: computed(() => ({
    limit: 100,
    depth: 2,
    sort: 'date',
    'where[date][greater_than_equal]': monthStart.value,
    'where[date][less_than]': nextMonthStart.value,
  })),
  watch: [monthCursor],
})

const { data: themeData } = await useFetch<{ docs?: ChapelCalendarTheme[] }>('/api/chapel-calendar-themes', {
  query: computed(() => ({
    from: monthStart.value,
    to: monthEnd.value,
  })),
  watch: [monthCursor],
})

const monthThemes = computed(() => {
  const docs = Array.isArray(themeData.value?.docs) ? themeData.value.docs : []
  return docs.filter((theme) => theme.active !== false && theme.endDate >= monthStart.value && theme.startDate <= monthEnd.value)
})

const services = computed(() => {
  const docs = Array.isArray(data.value?.docs) ? data.value.docs : []
  return docs
    .map(toService)
    .filter((service): service is Service => Boolean(service))
    .sort((a, b) => a.date.localeCompare(b.date))
})

const servicesByDate = computed(() => {
  const map = new Map<string, Service[]>()
  for (const service of services.value) {
    const list = map.get(service.date) || []
    list.push(service)
    map.set(service.date, list)
  }
  return map
})

const cells = computed(() => {
  const [year, month] = monthCursor.value.split('-').map(Number)
  if (!year || !month) return []
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const out: Array<{ date: string; day: number; services: Service[] } | null> = []
  for (let i = 0; i < firstWeekday; i++) out.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${monthCursor.value}-${String(day).padStart(2, '0')}`
    out.push({ date, day, services: servicesByDate.value.get(date) || [] })
  }
  while (out.length % 7 !== 0) out.push(null)
  return out
})

const weeks = computed(() => {
  const out: Array<{
    cells: Array<{ date: string; day: number; services: Service[] } | null>
    bars: ReturnType<typeof themeBarsForWeek>
    barRows: number
  }> = []
  for (let i = 0; i < cells.value.length; i += 7) {
    const slice = cells.value.slice(i, i + 7)
    const bars = themeBarsForWeek(
      slice.map((cell) => cell?.date ?? null),
      monthThemes.value,
    )
    out.push({
      cells: slice,
      bars,
      barRows: bars.reduce((max, bar) => Math.max(max, bar.row + 1), 0),
    })
  }
  return out
})

const monthLabel = computed(() => {
  const [year, month] = monthCursor.value.split('-').map(Number)
  if (!year || !month) return monthCursor.value
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
})

const selectedServices = computed(() => servicesByDate.value.get(selectedDate.value) || [])
const selectedThemes = computed(() => themesOnDate(monthThemes.value, selectedDate.value))
const selectedLabel = computed(() => formatLongDate(selectedDate.value))

function focusSelection() {
  if (pending.value) return
  if (servicesByDate.value.get(selectedDate.value)?.length) return
  const inMonth = services.value.filter((service) => service.date.startsWith(monthCursor.value))
  const upcoming = inMonth.find((service) => service.date >= today) || inMonth[0]
  if (upcoming) selectedDate.value = upcoming.date
}

focusSelection()
watch([monthCursor, pending], focusSelection)

function shiftMonth(delta: number) {
  monthCursor.value = addMonths(monthCursor.value, delta)
  if (!selectedDate.value.startsWith(monthCursor.value)) {
    selectedDate.value = today.startsWith(monthCursor.value) ? today : `${monthCursor.value}-01`
  }
}

function goToToday() {
  monthCursor.value = today.slice(0, 7)
  selectedDate.value = today
}

function selectDate(date: string) {
  selectedDate.value = date
}

function cellClass(cell: { date: string; services: Service[] } | null) {
  if (!cell) return 'bg-gray-50/80'
  const themed = Boolean(primaryThemeForDate(monthThemes.value, cell.date))
  const selected = cell.date === selectedDate.value
  if (selected && themed) return 'ring-2 ring-inset ring-[rgba(13,94,130,0.75)]'
  if (selected) return 'bg-[rgba(232,199,102,0.18)] ring-2 ring-inset ring-[rgba(13,94,130,0.35)]'
  if (themed) return 'hover:brightness-95'
  if (cell.services.length) return 'bg-white hover:bg-[rgba(13,94,130,0.04)]'
  return 'bg-white'
}

function cellStyle(cell: { date: string } | null, barRows: number) {
  const style: Record<string, string> = {}
  if (barRows > 0) {
    const pad = `${barRows * 1.2 + 0.5}rem`
    style.paddingBottom = pad
    style.minHeight = `calc(8rem + ${pad})`
  }
  if (!cell) return style
  const theme = primaryThemeForDate(monthThemes.value, cell.date)
  if (theme) {
    style.backgroundColor = themeTint(theme.color, cell.date === selectedDate.value ? 0.28 : 0.14)
  }
  return style
}

function cellAria(cell: { date: string; services: Service[] }) {
  const labels = themesOnDate(monthThemes.value, cell.date).map((theme) => theme.label)
  const speakers = cell.services.map((service) => service.speakerName).filter(Boolean)
  return [formatLongDate(cell.date), ...labels, ...speakers].join('. ')
}

function addMonths(ym: string, delta: number) {
  const [year, month] = ym.split('-').map(Number)
  const next = new Date(Date.UTC(year || 2026, (month || 1) - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

function toService(episode: Episode): Service | null {
  const date = String(episode.date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const title = episode.title?.trim() || ''
  const speakerName = chapelSpeakerName(episode.speaker) || 'TBD'
  return {
    id: String(episode.id),
    date,
    title,
    speakerName,
    speakerTitle: chapelSpeakerTitle(episode.speaker),
    photo: speakerPhoto(episode.speaker),
    audioUrl: chapelAudioUrl(episode),
    video: chapelVideo(episode, title || speakerName),
  }
}

function playServiceAudio(service: Service) {
  if (!service.audioUrl) return
  playTrack({
    id: Number(service.id) || 0,
    audio: service.audioUrl,
    title: service.title || 'Chapel',
    artist: service.speakerName || 'Asbury Seminary Chapel',
    artwork: service.photo || '/estes-icon.png',
    album: 'Chapel',
  })
}

function playServiceVideo(service: Service) {
  if (!service.video) return
  playVideo({
    title: service.video.title,
    vimeoId: service.video.vimeoId,
    youtubeId: service.video.youtubeId,
  })
}

function chapelAudioUrl(episode: Episode): string {
  if (!hasChapelAudio(episode)) return ''
  const linked = typeof episode.mp3 === 'object' && episode.mp3?.url ? String(episode.mp3.url) : ''
  if (linked) return linked
  return chapelMp3PublicUrl(episode.date, episode.campus) || ''
}

function hasChapelAudio(episode: Episode): boolean {
  const mp3 = episode.mp3
  if (mp3 != null) {
    if (typeof mp3 === 'object' && (mp3.url || mp3.id != null)) return true
    if (typeof mp3 === 'number' && Number.isFinite(mp3)) return true
    if (typeof mp3 === 'string' && mp3.trim()) return true
  }
  if (episode.length != null && String(episode.length).trim() !== '') return true
  if (episode.size != null && String(episode.size).trim() !== '') return true
  return false
}

function chapelVideo(episode: Episode, title: string): ServiceVideo | null {
  const sermon = mediaId(episode.vimeo_id ?? episode.vimeo)
  if (sermon) return { label: 'Play sermon video', title, vimeoId: sermon }
  const full = mediaId(episode.vimeo_full_id ?? episode.vimeo_full)
  if (full) return { label: 'Play full service video', title: `${title} (Full Service)`, vimeoId: full }
  const youtubeId = youtubeVideoId(episode.youtube)
  if (youtubeId) return { label: 'Play video', title, youtubeId }
  return null
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

function speakerPhoto(speaker?: Speaker | null): string {
  const image = chapelSpeakerPhoto(speaker)
  const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
  if (!raw.trim()) return ''
  return mediaDisplayUrl(raw, 256) || toBrowserMediaUrl(raw) || raw
}

function initials(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '')).toUpperCase() || '?'
}

function formatLongDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
</script>
