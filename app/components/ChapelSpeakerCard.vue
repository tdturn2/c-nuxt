<template>
  <section v-if="speakers.length" class="w-full max-w-[180px]">
    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div class="border-b border-gray-100 px-3 py-2">
        <h2 class="text-center text-sm font-semibold text-gray-900">Chapel This Week</h2>
      </div>

      <UCarousel
        v-slot="{ item }"
        :items="speakers"
        :start-index="startIndex"
        loop
        arrows
        dots
        :ui="{
          item: 'basis-full ps-0',
          container: 'ms-0',
          controls: 'inset-x-0',
          arrows: 'px-0.5',
          prev: 'size-7 bg-white/90 border border-gray-200 shadow-sm',
          next: 'size-7 bg-white/90 border border-gray-200 shadow-sm',
          dots: 'mt-2 mb-2',
        }"
        class="relative mx-auto w-full"
      >
        <NuxtLink
          to="/chapel"
          class="flex flex-col items-center px-3 pb-1 pt-3 text-center"
        >
          <img
            v-if="item.photoUrl"
            :src="item.photoUrl"
            :alt="item.name"
            class="aspect-square w-[112px] rounded-full border-2 border-[var(--color-gold)] object-cover object-top bg-gray-100"
          >
          <div
            v-else
            class="flex aspect-square w-[112px] items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-gray-100"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-user" class="h-10 w-10 text-gray-400" />
          </div>
          <p class="mt-2 text-[11px] font-medium uppercase tracking-wide text-[rgba(13,94,130,1)]">
            {{ item.weekday }}
          </p>
          <p class="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
            {{ item.name }}
          </p>
          <p
            v-if="item.title"
            class="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-600"
          >
            {{ item.title }}
          </p>
        </NuxtLink>
      </UCarousel>
    </div>
  </section>
</template>

<script setup lang="ts">
import { chapelSpeakerName, chapelSpeakerPhoto, chapelSpeakerTitle } from '@shared/chapelSpeakerDisplay'
import { toBrowserMediaUrl } from '@shared/mediaUrls'

type WeekSpeaker = {
  id?: string | number
  name?: string | null
  speakerDescription?: string | null
  photo?: { url?: string | null } | string | number | null
  connectUser?: {
    id?: number | string
    name?: string | null
    employeeTitle?: string | null
    avatar?: { url?: string | null } | string | null
  } | string | number | null
}

type WeekEntry = {
  id: string | number
  date: string
  title?: string
  speaker?: WeekSpeaker | null
}

type SpeakerSlide = {
  id: string
  date: string
  weekday: string
  name: string
  title: string
  photoUrl: string
}

const { data } = useFetch<{ entries?: WeekEntry[] }>('/api/chapel/current-week', {
  key: 'chapel-current-week-home',
  lazy: true,
})

const speakers = computed<SpeakerSlide[]>(() => {
  const entries = Array.isArray(data.value?.entries) ? data.value.entries : []
  return entries.map((entry) => {
    const name = chapelSpeakerName(entry.speaker) || 'TBD'
    const title = chapelSpeakerTitle(entry.speaker)
    const image = chapelSpeakerPhoto(entry.speaker)
    const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
    const proxied = raw ? toBrowserMediaUrl(raw) : ''
    const photoUrl = proxied?.startsWith('/')
      ? proxied
      : (raw.startsWith('/') || raw.startsWith('http') ? raw : '')

    return {
      id: String(entry.id),
      date: entry.date,
      weekday: weekdayLabel(entry.date),
      name,
      title,
      photoUrl,
    }
  })
})

const startIndex = computed(() => {
  const list = speakers.value
  if (!list.length) return 0
  const today = todayYmd()
  const exact = list.findIndex((s) => s.date === today)
  if (exact >= 0) return exact
  const upcoming = list.findIndex((s) => s.date > today)
  return upcoming >= 0 ? upcoming : list.length - 1
})

function todayYmd(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>
