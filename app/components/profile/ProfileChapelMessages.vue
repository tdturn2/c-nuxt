<template>
  <div class="mt-5 space-y-3">
    <div v-if="loading" class="text-sm text-gray-500">Loading chapel messages…</div>
    <div
      v-else-if="error"
      class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ error }}
    </div>
    <p v-else-if="messages.length === 0" class="text-sm text-gray-500">
      No chapel messages listed.
    </p>
    <ul v-else class="space-y-3">
      <li
        v-for="message in messages"
        :key="message.id"
        class="rounded-lg bg-gray-50 px-4 py-3"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
          {{ formatDate(message.date) }}
        </p>
        <h3 class="mt-0.5 text-sm font-semibold text-gray-900">
          {{ message.title?.trim() || 'Chapel' }}
        </h3>
        <p v-if="message.description?.trim()" class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
          {{ message.description.trim() }}
        </p>
        <div
          v-if="audioUrl(message) || sermonId(message) || fullServiceId(message)"
          class="mt-3 flex flex-wrap gap-2"
        >
          <UButton
            v-if="audioUrl(message)"
            variant="soft"
            color="primary"
            size="xs"
            leading-icon="i-heroicons-play"
            @click="playAudio(message)"
          >
            Play audio
          </UButton>
          <UButton
            v-if="sermonId(message)"
            variant="soft"
            color="neutral"
            size="xs"
            leading-icon="i-heroicons-film"
            @click="playSermon(message)"
          >
            Sermon
          </UButton>
          <UButton
            v-if="fullServiceId(message)"
            variant="soft"
            color="neutral"
            size="xs"
            leading-icon="i-heroicons-film"
            @click="playFullService(message)"
          >
            Full service
          </UButton>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { chapelMp3PublicUrl } from '@shared/chapelMp3'
import { chapelSpeakerName, chapelSpeakerPhoto } from '@shared/chapelSpeakerDisplay'
import { toBrowserMediaUrl } from '@shared/mediaUrls'

type ChapelMessage = {
  id: number
  date?: string
  title?: string | null
  description?: string | null
  campus?: string | null
  speaker?: {
    name?: string | null
    photo?: { url?: string | null } | string | number | null
    connectUser?: { avatar?: { url?: string | null } | string | null } | string | number | null
  } | number | null
  mp3?: { id?: number | string; url?: string } | number | string | null
  mp3Url?: string | null
  length?: string | null
  size?: string | null
  vimeo?: string | null
  vimeo_id?: string | null
  vimeo_full?: string | null
  vimeo_full_id?: string | null
}

const props = defineProps<{
  userId: number
}>()

const { playTrack } = useAudioPlayer()
const { playVideo } = useVideoPlayer()
const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.connectApi || '').replace(/\/$/, '')

const loading = ref(true)
const error = ref<string | null>(null)
const messages = ref<ChapelMessage[]>([])

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const dateOnly = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
  const d = new Date(`${dateOnly || dateStr}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function hasAudio(message: ChapelMessage): boolean {
  const mp3 = message.mp3
  if (mp3 != null) {
    if (typeof mp3 === 'object' && (mp3.url || mp3.id != null)) return true
    if (typeof mp3 === 'number' && Number.isFinite(mp3)) return true
    if (typeof mp3 === 'string' && mp3.trim()) return true
  }
  if (message.length != null && String(message.length).trim() !== '') return true
  if (message.size != null && String(message.size).trim() !== '') return true
  return false
}

function audioUrl(message: ChapelMessage): string {
  if (!hasAudio(message)) return ''
  const linked = typeof message.mp3 === 'object' && message.mp3?.url ? String(message.mp3.url) : ''
  if (linked) return linked
  if (typeof message.mp3Url === 'string' && message.mp3Url.trim()) return message.mp3Url.trim()
  return chapelMp3PublicUrl(message.date, message.campus) || ''
}

function mediaId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function sermonId(message: ChapelMessage): string {
  return mediaId(message.vimeo_id ?? message.vimeo)
}

function fullServiceId(message: ChapelMessage): string {
  const full = mediaId(message.vimeo_full_id ?? message.vimeo_full)
  if (!full || full === sermonId(message)) return ''
  return full
}

function imageUrl(message: ChapelMessage): string {
  const speaker = message.speaker && typeof message.speaker === 'object' ? message.speaker : null
  const image = chapelSpeakerPhoto(speaker)
  const raw = typeof image === 'string' ? image : image?.url ? String(image.url) : ''
  if (!raw.trim()) return ''
  const proxied = toBrowserMediaUrl(raw)
  if (proxied?.startsWith('/')) return proxied
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return payloadBaseUrl ? `${payloadBaseUrl}${raw.startsWith('/') ? raw : `/${raw}`}` : raw
}

function playAudio(message: ChapelMessage) {
  const audio = audioUrl(message)
  if (!audio) return
  const speaker = message.speaker && typeof message.speaker === 'object' ? message.speaker : null
  playTrack({
    id: message.id,
    audio,
    title: message.title?.trim() || 'Chapel',
    artist: chapelSpeakerName(speaker) || 'Asbury Seminary Chapel',
    artwork: imageUrl(message) || '/estes-icon.png',
    album: 'Chapel',
  })
}

function playSermon(message: ChapelMessage) {
  const vimeoId = sermonId(message)
  if (!vimeoId) return
  playVideo({ vimeoId, title: message.title?.trim() || 'Chapel' })
}

function playFullService(message: ChapelMessage) {
  const vimeoId = fullServiceId(message)
  if (!vimeoId) return
  playVideo({ vimeoId, title: `${message.title?.trim() || 'Chapel'} (Full Service)` })
}

async function loadMessages() {
  loading.value = true
  error.value = null
  try {
    const result = await $fetch<{ docs?: ChapelMessage[] }>(`/api/users/${props.userId}/chapel-messages`)
    messages.value = Array.isArray(result?.docs) ? result.docs : []
  } catch (err: any) {
    messages.value = []
    error.value = err?.data?.message || err?.statusMessage || err?.message || 'Failed to load chapel messages.'
  } finally {
    loading.value = false
  }
}

watch(() => props.userId, () => {
  loadMessages()
}, { immediate: true })
</script>
