<template>
  <section class="rounded-xl border border-gray-200 bg-[#f4f6f7] px-4 py-4 sm:px-5">
    <div class="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1fr)] sm:gap-5">
      <div class="flex min-w-0 items-start gap-3">
        <img
          :src="estesIcon"
          alt="Estes Chapel"
          class="h-16 w-16 shrink-0 object-contain"
        >
        <div class="min-w-0">
          <p class="text-sm leading-5 text-[rgba(13,94,130,1)]">
            Stream at
            <a
              href="https://asbury.to/live"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold underline underline-offset-2 hover:text-[rgba(10,69,92,1)]"
            >asbury.to/live</a>
            or on
            <a
              href="https://www.facebook.com/asburyseminary"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold underline underline-offset-2 hover:text-[rgba(10,69,92,1)]"
            >Facebook</a>.
          </p>
          <NuxtLink
            to="/chapel"
            class="mt-2 inline-flex items-center justify-center rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[rgba(10,69,92,1)]"
          >
            Wilmore Chapel Schedule
          </NuxtLink>
        </div>
      </div>

      <div class="hidden h-16 w-px bg-[rgba(13,94,130,1)] sm:block" aria-hidden="true" />
      <div class="h-px w-full bg-[rgba(13,94,130,1)] sm:hidden" aria-hidden="true" />

      <div class="min-w-0">
        <NuxtLink
          to="/chapel/daily-eucharist"
          class="text-base font-semibold text-[rgba(13,94,130,1)] hover:underline"
        >
          Daily Eucharist
        </NuxtLink>
        <p class="mt-1 text-sm leading-5 text-[rgba(13,94,130,0.9)]">
          {{ dailyStatus }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import estesIcon from '../../assets/estes-icon.png'

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

const { data } = useFetch<DailyEucharistResponse>('/api/daily-eucharist/current-week', {
  key: 'chapel-daily-eucharist-summary',
  lazy: true,
})

const dailyStatus = computed(() => {
  if (data.value?.enabledThisWeek !== true) {
    return 'No Daily Eucharist scheduled this week'
  }

  const entries = Array.isArray(data.value.entries) ? data.value.entries : []
  const next = entries[0]
  if (next) {
    const when = weekdayLabel(next.date)
    const speaker = next.speakerName || 'TBD'
    const location = next.location || 'Location TBD'
    return [when, speaker, location].filter(Boolean).join(' · ')
  }

  return 'Eucharist is scheduled this week.'
})

function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>
