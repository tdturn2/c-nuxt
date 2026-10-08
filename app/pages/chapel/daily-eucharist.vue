<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold tracking-tight text-[rgba(13,94,130,1)]">Daily Eucharist</h1>

        <div v-if="pending" class="mt-6 text-gray-500">Loading Daily Eucharist...</div>
        <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ error.message || 'Failed to load Daily Eucharist.' }}
        </div>
        <template v-else>
          <div v-if="summary" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
            {{ summary }}
          </div>

          <div v-if="enabledThisWeek && entries.length" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="item in entries"
              :key="String(item.id)"
              class="group min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[rgba(13,94,130,0.25)]"
            >
              <div class="mb-3 inline-flex rounded-md bg-[rgba(2,34,50,1)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#E8C766]">
                {{ weekdayDateLabel(item.date) }}
              </div>
              <img
                v-if="item.speakerPhotoUrl || item.connectUser?.avatarUrl"
                :src="item.speakerPhotoUrl || item.connectUser?.avatarUrl || ''"
                :alt="item.speakerName || 'Speaker'"
                class="h-40 w-full rounded-lg object-cover bg-gray-100"
              >
              <div v-else class="h-40 w-full rounded-lg bg-gray-100" />

              <h2
                v-if="item.speakerName"
                class="mt-4 text-lg font-semibold text-gray-900 group-hover:text-[rgba(13,94,130,1)] transition-colors"
              >
                {{ item.speakerName }}
              </h2>
              <p class="mt-1 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {{ item.location || 'Location TBD' }}
              </p>
            </article>
          </div>
          <section v-else class="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div class="border-b border-gray-100 px-4 py-3">
              <h2 class="text-lg font-semibold text-gray-900">{{ monthLabel }}</h2>
              <p class="mt-0.5 text-sm text-gray-600">Standing Eucharist times for this month.</p>
            </div>
            <div v-if="monthPending" class="px-4 py-16 text-center text-sm text-gray-500">Loading this month…</div>
            <div v-else-if="monthError" class="px-4 py-10 text-center text-sm text-red-700">
              Could not load this month’s Eucharist schedule.
            </div>
            <template v-else>
              <div class="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <div v-for="label in weekdayLabels" :key="label" class="px-1 py-2">{{ label }}</div>
              </div>
              <div class="grid grid-cols-7">
                <div
                  v-for="(cell, index) in monthCells"
                  :key="cell?.date || `pad-${index}`"
                  class="min-h-20 border-b border-r border-gray-100 p-1.5 sm:min-h-28 sm:p-2"
                  :class="cell ? 'bg-white' : 'bg-gray-50'"
                >
                  <template v-if="cell">
                    <span
                      class="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold"
                      :class="cell.date === today ? 'bg-[rgba(13,94,130,1)] text-white' : 'text-gray-700'"
                    >
                      {{ cell.day }}
                    </span>
                    <p v-if="cell.hours" class="mt-1 text-[11px] font-semibold leading-tight text-[rgba(13,94,130,1)] sm:text-xs">
                      {{ cell.hours }}
                    </p>
                    <p v-if="cell.speakerName" class="mt-0.5 text-[11px] font-medium leading-tight text-gray-900">
                      {{ cell.speakerName }}
                    </p>
                    <p v-if="cell.location" class="mt-0.5 text-[11px] leading-tight text-gray-600">
                      {{ cell.location }}
                    </p>
                    <p v-if="cell.detail" class="mt-0.5 text-[11px] leading-tight text-gray-500">
                      {{ cell.detail }}
                    </p>
                  </template>
                </div>
              </div>
            </template>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ymdInTimeZone } from '@shared/campusHours'

type DailyEucharistEntry = {
  id: string | number
  date: string
  location: string
  speakerName: string
  connectUser?: {
    id?: string | number
    name?: string
    avatarUrl?: string | null
  } | null
  speakerPhotoUrl?: string | null
}

type DailyEucharistResponse = {
  enabledThisWeek?: boolean
  summary?: string
  entries?: DailyEucharistEntry[]
}

type MonthDay = {
  date: string
  hours: string
  detail: string
  location: string
  speakerName: string
}

type MonthResponse = {
  today?: string
  month?: string
  days?: MonthDay[]
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = ymdInTimeZone()

const { data, pending, error } = await useFetch<DailyEucharistResponse>('/api/daily-eucharist/current-week', {
  key: 'daily-eucharist-current-week',
})
const { data: monthData, pending: monthPending, error: monthError } = await useFetch<MonthResponse>(
  '/api/daily-eucharist/month',
  { key: 'daily-eucharist-month' },
)

const enabledThisWeek = computed(() => data.value?.enabledThisWeek === true)
const summary = computed(() => (typeof data.value?.summary === 'string' ? data.value.summary.trim() : ''))
const entries = computed(() => (Array.isArray(data.value?.entries) ? data.value.entries : []))

const monthKey = computed(() => monthData.value?.month || today.slice(0, 7))
const monthLabel = computed(() => {
  const [year, month] = monthKey.value.split('-').map(Number)
  if (!year || !month) return monthKey.value
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
})

const monthCells = computed(() => {
  const [year, month] = monthKey.value.split('-').map(Number)
  if (!year || !month) return []
  const byDate = new Map((monthData.value?.days || []).map((day) => [day.date, day]))
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<(MonthDay & { day: number }) | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${monthKey.value}-${String(day).padStart(2, '0')}`
    const scheduled = byDate.get(date)
    cells.push({
      date,
      day,
      hours: scheduled?.hours || '',
      detail: scheduled?.detail || '',
      location: scheduled?.location || '',
      speakerName: scheduled?.speakerName || '',
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

function weekdayDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
</script>
