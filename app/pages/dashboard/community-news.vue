<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Community News</h1>
            <p class="mt-1 max-w-xl text-sm text-gray-600">
              This week’s chapel speakers, Eucharist schedule, and homepage slides, formatted as HTML for SendGrid. Copy the code and paste it into a SendGrid code module.
            </p>
          </div>
          <button
            v-if="canManage"
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
            :disabled="pending || !copySource"
            @click="copyHtml"
          >
            {{ copied ? 'Copied' : 'Copy code' }}
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManage"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Community News is limited to Connect admins.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>
          <div v-if="pending" class="py-8 text-gray-500">Building this week’s newsletter...</div>
          <iframe
            v-else-if="previewHtml"
            class="h-[820px] w-full rounded-lg border border-gray-200 bg-white"
            title="Community News preview"
            :srcdoc="previewHtml"
          />
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { chapelSpeakerName, chapelSpeakerPhoto, chapelSpeakerTitle } from '@shared/chapelSpeakerDisplay'
import { isHomeSliderPostModalHref } from '@shared/homeSlider'
import { toBrowserMediaUrl } from '@shared/mediaUrls'
import {
  buildCommunityNewsEmailHtml,
  type CommunityNewsEucharist,
  type CommunityNewsSlide,
  type CommunityNewsSpeaker,
} from '@shared/communityNewsEmail'

type WeekSpeaker = {
  name?: string
  speakerDescription?: string
  photo?: { url?: string } | string | null
  connectUser?: {
    name?: string
    employeeTitle?: string
    avatar?: { url?: string } | string | null
  } | null
}

type WeekEntry = {
  id: string | number
  date: string
  speaker?: WeekSpeaker | null
}

type EucharistEntry = {
  id: string | number
  date: string
  location?: string
  speakerName?: string
}

type CampusHoursDay = {
  date: string
  hours: string
  detail?: string
}

type EucharistResponse = {
  enabledThisWeek?: boolean
  entries?: EucharistEntry[]
  campusHours?: CampusHoursDay[]
}

type SliderDoc = {
  id?: string | number
  title?: string
  href?: string
  image?: { url?: string; file?: { url?: string } } | null
}

const { canAccessSection, pending: mePending } = useDashboardAccess()
const canManage = computed(() => canAccessSection('community-news'))

const PUBLIC_ORIGIN = 'https://connect.asburyseminary.edu'

const pending = ref(false)
const error = ref('')
const previewHtml = ref('')
const copySource = ref('')
const copied = ref(false)

function photoUrl(speaker?: WeekSpeaker | null): string {
  const image = chapelSpeakerPhoto(speaker)
  const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
  return toBrowserMediaUrl(raw) || raw
}

function chapelDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateStr
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    timeZone: 'UTC',
  })
  return `${formatted} at 11:00am`
}

function eucharistDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    timeZone: 'UTC',
  })
}

function slideImage(image: SliderDoc['image']): string {
  const raw = image?.url || image?.file?.url || ''
  return toBrowserMediaUrl(raw) || raw
}

function slideHref(href: string | undefined): string | undefined {
  const value = String(href || '').trim()
  if (!value || isHomeSliderPostModalHref(value)) return undefined
  return value
}

async function loadNewsletter() {
  if (!import.meta.client || !canManage.value) return
  pending.value = true
  error.value = ''
  try {
    const [chapel, eucharist, slider] = await Promise.all([
      $fetch<{ entries?: WeekEntry[] }>('/api/chapel/current-week'),
      $fetch<EucharistResponse>('/api/daily-eucharist/current-week'),
      $fetch<{ docs?: SliderDoc[] }>('/api/home-slider'),
    ])

    const speakers: CommunityNewsSpeaker[] = (chapel.entries || []).map((entry) => ({
      dateLabel: chapelDateLabel(entry.date),
      name: chapelSpeakerName(entry.speaker) || 'TBD',
      title: chapelSpeakerTitle(entry.speaker) || undefined,
      photoUrl: photoUrl(entry.speaker) || undefined,
    }))

    const eucharistRows: CommunityNewsEucharist[] = []
    const entries = Array.isArray(eucharist.entries) ? eucharist.entries : []
    const hours = Array.isArray(eucharist.campusHours) ? eucharist.campusHours : []
    if (eucharist.enabledThisWeek && entries.length) {
      for (const entry of entries) {
        eucharistRows.push({
          dateLabel: eucharistDateLabel(entry.date),
          detail: entry.speakerName?.trim() || entry.location?.trim() || 'Eucharist',
          extra: entry.speakerName && entry.location ? entry.location : undefined,
        })
      }
    } else {
      for (const day of hours) {
        eucharistRows.push({
          dateLabel: eucharistDateLabel(day.date),
          detail: day.hours,
          extra: day.detail || undefined,
        })
      }
    }

    const slides: CommunityNewsSlide[] = (slider.docs || [])
      .map((doc) => {
        const imageUrl = slideImage(doc.image)
        if (!imageUrl) return null
        return {
          imageUrl,
          alt: doc.title?.trim() || 'Community news slide',
          href: slideHref(doc.href),
        }
      })
      .filter((slide): slide is CommunityNewsSlide => Boolean(slide))

    const payload = {
      intro: 'We invite everyone to take advantage of the many opportunities to learn, serve, connect, and enrich our community.',
      speakers,
      eucharist: eucharistRows,
      slides,
    }
    previewHtml.value = buildCommunityNewsEmailHtml({ ...payload, origin: window.location.origin })
    copySource.value = buildCommunityNewsEmailHtml({ ...payload, origin: PUBLIC_ORIGIN })
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Failed to build the newsletter.'
    previewHtml.value = ''
    copySource.value = ''
  } finally {
    pending.value = false
  }
}

async function copyHtml() {
  if (!copySource.value) return
  await navigator.clipboard.writeText(copySource.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 2000)
}

watch(canManage, (allowed) => {
  if (allowed) loadNewsletter()
}, { immediate: true })
</script>
