<template>
  <UModal
    v-model:open="open"
    :ui="{
      overlay: 'bg-black/60',
      content: 'max-w-5xl w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-hidden ring-0 shadow-2xl divide-y-0',
      header: 'hidden p-0 min-h-0',
      body: 'p-0 sm:p-0 overflow-y-auto max-h-[90vh]',
    }"
  >
    <template #body="{ close }">
      <div class="bg-white">
        <div class="flex items-start justify-between gap-3 bg-[rgba(13,94,130,1)] px-4 py-3 text-white sm:px-5">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              Kentucky campus
            </p>
            <h2 class="text-lg font-bold leading-tight sm:text-xl">This Week's Campus Hours</h2>
            <p v-if="weekLabel" class="mt-0.5 text-sm text-white/85">{{ weekLabel }}</p>
            <p v-if="week?.season?.name" class="mt-0.5 text-xs text-white/75">{{ week.season.name }}</p>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/15"
              aria-label="Previous week"
              @click="shiftWeek(-7)"
            >
              <UIcon name="i-lucide-chevron-left" class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/15"
              aria-label="Next week"
              @click="shiftWeek(7)"
            >
              <UIcon name="i-lucide-chevron-right" class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/15"
              aria-label="Close"
              @click="close()"
            >
              <UIcon name="i-lucide-x" class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div v-if="pending" class="px-5 py-10 text-center text-sm text-gray-500">Loading hours…</div>
        <div v-else-if="error" class="px-5 py-8 text-center text-sm text-red-700">{{ error }}</div>
        <div v-else-if="!week?.days?.length" class="px-5 py-8 text-center text-sm text-gray-500">
          Hours have not been published for this week.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="px-3 py-2 text-left font-semibold text-gray-600"> </th>
                <th
                  v-for="day in week.days"
                  :key="day.date"
                  class="px-2 py-2 text-center font-semibold"
                  :class="isToday(day.date) ? 'bg-[rgba(13,94,130,0.12)] text-[rgba(10,69,92,1)]' : 'text-gray-700'"
                >
                  <div>{{ weekdayShortLabel(day.weekday) }}</div>
                  <div class="text-[11px] font-normal text-gray-500">{{ dayDateLabel(day.date) }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(facility, facilityIndex) in facilities"
                :key="facility.key"
                class="border-b border-gray-100"
              >
                <th class="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-800">
                  {{ facility.label }}
                </th>
                <template v-for="day in week.days" :key="`${day.date}-${facility.key}`">
                  <td
                    v-if="day.closedAll && facilityIndex === 0"
                    :rowspan="facilities.length"
                    class="px-2 py-2 text-center align-middle font-semibold uppercase tracking-wide text-gray-500"
                    :class="isToday(day.date) ? 'bg-[rgba(13,94,130,0.08)]' : 'bg-gray-50'"
                  >
                    Closed
                  </td>
                  <td
                    v-else-if="!day.closedAll"
                    class="px-2 py-2 text-center text-gray-800"
                    :class="isToday(day.date) ? 'bg-[rgba(13,94,130,0.08)] font-medium' : ''"
                  >
                    {{ displayHours(day.cells?.[facility.key]) }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <p v-if="footerNote" class="border-t border-gray-100 px-4 py-3 text-xs text-gray-600">
            {{ footerNote }}
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import {
  addDaysYmd,
  CAMPUS_HOURS_FACILITIES,
  formatCampusHoursDate,
  isClosedHours,
  weekdayShortLabel,
  ymdInTimeZone,
} from '@shared/campusHours'

type WeekDay = {
  date: string
  weekday: number
  cells: Record<string, string>
  closedAll: boolean
  notes: string[]
}

type WeekPayload = {
  today: string
  weekStart: string
  weekEnd: string
  season: { id: number; name: string | null; note: string | null } | null
  facilities: Array<{ key: string; label: string }>
  days: WeekDay[]
}

const open = defineModel<boolean>('open', { default: false })
const anchorDate = ref('')
const pending = ref(false)
const error = ref('')
const week = ref<WeekPayload | null>(null)

const facilities = computed(() => week.value?.facilities?.length ? week.value.facilities : [...CAMPUS_HOURS_FACILITIES])

const weekLabel = computed(() => {
  const start = week.value?.weekStart
  const end = week.value?.weekEnd
  if (!start || !end) return ''
  return `${formatCampusHoursDate(start)} – ${formatCampusHoursDate(end)}`
})

const footerNote = computed(() => {
  const notes = [
    week.value?.season?.note,
    ...(week.value?.days ?? []).flatMap((day) => day.notes ?? []),
  ]
    .map((note) => String(note || '').trim())
    .filter(Boolean)
  return [...new Set(notes)].join(' · ')
})

function isToday(ymd: string) {
  return ymd === ymdInTimeZone()
}

function dayDateLabel(ymd: string) {
  const formatted = formatCampusHoursDate(ymd)
  const parts = formatted.split(' ')
  return parts.slice(1).join(' ')
}

function displayHours(value: string | null | undefined) {
  const hours = String(value || '').trim()
  if (!hours) return '—'
  if (isClosedHours(hours)) return 'Closed'
  return hours
}

async function loadWeek() {
  pending.value = true
  error.value = ''
  try {
    const query = anchorDate.value ? `?date=${encodeURIComponent(anchorDate.value)}` : ''
    week.value = await $fetch<WeekPayload>(`/api/campus-hours/week${query}`)
    if (!anchorDate.value && week.value?.today) anchorDate.value = week.value.today
  } catch (err: any) {
    week.value = null
    error.value = err?.statusMessage || err?.message || 'Failed to load campus hours'
  } finally {
    pending.value = false
  }
}

function shiftWeek(days: number) {
  const from = week.value?.weekStart || anchorDate.value
  if (!from) return
  anchorDate.value = addDaysYmd(from, days)
  loadWeek()
}

watch(open, (isOpen) => {
  if (!isOpen) return
  if (!anchorDate.value) anchorDate.value = ''
  loadWeek()
})
</script>
