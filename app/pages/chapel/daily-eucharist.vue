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
          <div class="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p class="text-sm font-semibold text-gray-900">
              {{ enabledThisWeek ? 'Eucharist is scheduled this week.' : 'No Eucharist this week.' }}
            </p>
            <p v-if="summary" class="mt-1 text-sm text-gray-700">{{ summary }}</p>
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

              <h2 class="mt-4 text-lg font-semibold text-gray-900 group-hover:text-[rgba(13,94,130,1)] transition-colors">
                {{ item.speakerName || 'TBD' }}
              </h2>
              <p class="mt-1 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {{ item.location || 'Location TBD' }}
              </p>
            </article>
          </div>
          <div
            v-else-if="enabledThisWeek"
            class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600"
          >
            No Daily Eucharist entries found for this week yet.
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
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

const { data, pending, error } = await useFetch<DailyEucharistResponse>('/api/daily-eucharist/current-week', {
  key: 'daily-eucharist-current-week',
})

const enabledThisWeek = computed(() => data.value?.enabledThisWeek === true)
const summary = computed(() => (typeof data.value?.summary === 'string' ? data.value.summary.trim() : ''))
const entries = computed(() => (Array.isArray(data.value?.entries) ? data.value.entries : []))

function weekdayDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
</script>
