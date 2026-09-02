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
          <ul class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="item in weekEntries"
              :key="String(item.id)"
              class="min-w-0"
            >
              <article class="flex flex-col items-center rounded-lg border border-gray-200 bg-white px-5 py-6 text-center shadow-sm">
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
                <p v-if="item.speaker?.speakerDescription" class="mt-1 max-w-[16rem] text-sm leading-snug text-gray-600">
                  {{ item.speaker.speakerDescription }}
                </p>
                <p v-if="item.title" class="mt-2 max-w-[16rem] text-sm font-medium text-[rgba(13,94,130,1)]">
                  {{ item.title }}
                </p>
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
              {{ dailyEnabledThisWeek ? 'Eucharist is scheduled this week.' : 'No Eucharist this week.' }}
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
          </template>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { toBrowserMediaUrl } from '@shared/mediaUrls'

type WeekSpeaker = {
  id?: string | number
  name?: string
  speakerDescription?: string
  photo?: { url?: string } | string | null
}

type WeekEntry = {
  id: string | number
  date: string
  title?: string
  description?: string | null
  speaker?: WeekSpeaker | null
}

type DailyEucharistEntry = {
  id: string | number
  date: string
  location: string
  speakerName: string
}

type DailyEucharistResponse = {
  enabledThisWeek?: boolean
  summary?: string
  entries?: DailyEucharistEntry[]
}

const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.connectApi || '').replace(/\/$/, '')
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

function speakerPhotoUrl(speaker?: WeekSpeaker | null): string {
  const image = speaker?.photo
  const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
  if (!raw.trim()) return ''
  const proxied = toBrowserMediaUrl(raw)
  if (proxied?.startsWith('/')) return proxied
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return payloadBaseUrl ? `${payloadBaseUrl}${raw.startsWith('/') ? raw : `/${raw}`}` : raw
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
</script>
