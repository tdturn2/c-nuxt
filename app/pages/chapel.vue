<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold tracking-tight text-[rgba(13,94,130,1)]">CHAPEL</h1>
        <h2 class="mt-6 text-2xl font-semibold text-gray-900">Chapel This Week</h2>

        <div v-if="pending" class="mt-6 text-gray-500">Loading this week's chapel speakers...</div>
        <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ error.message || "Failed to load this week's chapel speakers." }}
        </div>
        <div v-else-if="!weekEntries.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No chapel speakers found for this week yet.
        </div>

        <section v-else class="mt-6">
          <ul class="space-y-4">
            <li
              v-for="item in weekEntries"
              :key="String(item.id)"
              class="group w-full lg:w-3/4 mx-auto rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[rgba(13,94,130,0.3)] transition-all"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                <div class="flex-shrink-0 rounded-md bg-[rgba(2,34,50,1)] text-[#E8C766] px-3 py-2 min-w-[72px] text-center border border-[rgba(255,255,255,0.08)] flex flex-col items-center justify-center">
                  <p class="text-[12px] leading-none tracking-wide">
                    {{ monthLabel(item.date) }}
                  </p>
                  <p class="mt-1 text-[36px] leading-[0.9] font-semibold">
                    {{ dayLabel(item.date) }}
                  </p>
                  <p class="mt-1 text-[20px] leading-none tracking-[0.02em]">
                    {{ yearLabel(item.date) }}
                  </p>
                </div>

                <div class="min-w-0 flex-1 flex flex-col justify-center">
                  <h2 class="font-semibold text-gray-900 group-hover:text-[rgba(13,94,130,1)] transition-colors line-clamp-2">
                    {{ item.speaker?.name || 'TBD' }}
                  </h2>
                  <p v-if="item.speaker?.speakerDescription" class="mt-1 text-sm text-gray-700 italic line-clamp-2">
                    {{ item.speaker.speakerDescription }}
                  </p>
                  <p class="mt-1 text-sm text-gray-700">Speaking on {{ weekdayDateLabel(item.date) }}</p>
                </div>

                <img
                  v-if="speakerPhotoUrl(item.speaker)"
                  :src="speakerPhotoUrl(item.speaker)"
                  :alt="item.speaker?.name || 'Chapel speaker'"
                  class="h-28 w-28 rounded-lg object-cover border border-gray-200 bg-gray-100 flex-shrink-0 self-center"
                >
              </div>
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
type WeekSpeaker = {
  id?: string | number
  name?: string
  speakerDescription?: string
  photo?: { url?: string } | null
}

type WeekEntry = {
  id: string | number
  date: string
  title?: string
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
const payloadBaseUrl = String(config.public.payloadBaseUrl || '').replace(/\/$/, '')
const { data, pending, error } = await useFetch<{ entries?: WeekEntry[] }>('/api/chapel/current-week', {
  key: 'chapel-current-week',
})
const { data: dailyData, pending: dailyPending, error: dailyError } = await useFetch<DailyEucharistResponse>(
  '/api/daily-eucharist/current-week',
  { key: 'chapel-daily-eucharist-summary' },
)

const weekEntries = computed(() => (Array.isArray(data.value?.entries) ? data.value!.entries! : []))
const dailyEnabledThisWeek = computed(() => dailyData.value?.enabledThisWeek === true)
const dailySummary = computed(() => (typeof dailyData.value?.summary === 'string' ? dailyData.value.summary.trim() : ''))
const dailyEntries = computed(() => (Array.isArray(dailyData.value?.entries) ? dailyData.value.entries : []))

function speakerPhotoUrl(speaker?: WeekSpeaker | null): string {
  const raw = String(speaker?.photo?.url || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return payloadBaseUrl ? `${payloadBaseUrl}${raw.startsWith('/') ? raw : `/${raw}`}` : raw
}

function weekdayDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function parseSafeDate(dateStr: string): Date | null {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function monthLabel(dateStr: string): string {
  const d = parseSafeDate(dateStr)
  return d ? d.toLocaleDateString('en-US', { month: 'short' }) : '---'
}

function dayLabel(dateStr: string): string {
  const d = parseSafeDate(dateStr)
  return d ? d.toLocaleDateString('en-US', { day: '2-digit' }) : '--'
}

function yearLabel(dateStr: string): string {
  const d = parseSafeDate(dateStr)
  return d ? d.toLocaleDateString('en-US', { year: 'numeric' }) : '----'
}
</script>
