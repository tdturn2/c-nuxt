<template>
  <section v-if="speakers.length" class="w-full max-w-[180px]">
    <div class="overflow-hidden rounded-2xl bg-gradient-to-b from-[#e7f2f6] via-white to-white shadow-md ring-1 ring-[color-mix(in_srgb,var(--color-gold)_55%,white)]">
      <h2 class="px-3 pt-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a7020]">
        Chapel This Week
      </h2>

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
          dots: 'mt-2 mb-2.5',
        }"
        class="relative mx-auto w-full"
      >
        <NuxtLink
          to="/chapel"
          class="group flex flex-col items-center px-3 pb-1 pt-2 text-center"
        >
          <div class="rounded-full p-1">
            <img
              v-if="item.photoUrl"
              :src="item.photoUrl"
              :alt="item.name"
              class="aspect-square w-[116px] rounded-full bg-gray-100 object-cover object-top shadow-[0_10px_18px_rgba(13,94,130,0.22)] ring-[3px] ring-[var(--color-gold)] ring-offset-2 ring-offset-white"
            >
            <div
              v-else
              class="flex aspect-square w-[116px] items-center justify-center rounded-full bg-gray-100 shadow-[0_10px_18px_rgba(13,94,130,0.22)] ring-[3px] ring-[var(--color-gold)] ring-offset-2 ring-offset-white"
              aria-hidden="true"
            >
              <UIcon name="i-lucide-user" class="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(13,94,130,1)]">
            {{ item.weekday }}
          </p>
          <p class="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
            {{ item.name }}
          </p>
          <p
            v-if="item.title"
            class="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500"
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
