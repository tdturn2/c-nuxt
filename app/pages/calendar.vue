<template>
  <div class="h-full flex bg-gray-50 min-h-0">
    <LeftColumn />
    <RightColumn>
      <div class="mx-auto w-full max-w-6xl px-4 py-6">
        <header class="mb-4">
          <h1 class="text-2xl font-bold text-gray-900">Calendar</h1>
          <p class="mt-1 text-sm text-gray-600">
            Google Calendar today, with support for future unified Connect calendar events.
          </p>
        </header>

        <div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <iframe
            :src="embedUrl"
            class="h-[75vh] w-full rounded-lg border-0"
            title="Asbury calendar"
            loading="lazy"
          />
        </div>
      </div>
    </RightColumn>
  </div>
</template>

<script setup lang="ts">
const { data } = await useFetch<{ embedUrl?: string }>('/api/calendar/unified', {
  key: 'calendar-unified',
})

const embedUrl = computed(() => {
  return data.value?.embedUrl || 'https://calendar.google.com/calendar/embed?src=asburyseminary.edu'
})

useHead({
  title: 'Calendar | Asbury Connect',
})
</script>
