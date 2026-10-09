<template>
  <div class="flex h-full min-h-0 bg-gray-50">
    <LeftColumn />
    <RightColumn>
      <div class="mx-auto flex w-full max-w-[1480px]">
        <div class="min-w-0 flex-1">
          <Timeline api-url="/api/posts" />
        </div>
        <aside class="hidden w-72 shrink-0 border-l border-gray-200/80 xl:block">
          <div class="flex flex-col items-center space-y-8 px-6 pt-6">
            <FeaturedPublicationsCard />
            <ChapelSpeakerCard />
            <NuxtLink
              to="/chapel"
              class="w-full max-w-[180px] overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-gray-200 hover:shadow"
            >
              <img
                :src="estesIcon"
                alt="Estes Chapel"
                class="mx-auto w-full max-w-[96px] object-contain"
              >
              <p class="mt-2 text-center text-sm font-semibold text-gray-900">Chapel and Eucharist Schedule</p>
            </NuxtLink>
            <KeenersComicsCard />
            <DiningServicesCard />
            <NuxtLink to="/media/elementary" class="w-full max-w-[180px]">
              <img
                src="https://ats-edu.storage.googleapis.com/uploads/Elementary_Podcast_Square_Cover.jpg"
                alt="It's Elementary"
                class="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
            </NuxtLink>
            <NuxtLink to="/first-fruits" class="w-full max-w-[180px]">
              <img
                :src="firstFruitsLogo"
                alt="First Fruits"
                class="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
            </NuxtLink>
          </div>
        </aside>
      </div>
    </RightColumn>
  </div>
</template>

<script setup lang="ts">
import estesIcon from '../../assets/estes-icon.png'
import firstFruitsLogo from '../../assets/first-fruits.svg'
import { CHAPEL_LIVE_EMBED_URL, CHAPEL_LIVE_TITLE, isChapelLiveWindow } from '@shared/chapelLive'
import type { PlayerTrack } from '../composables/useVideoPlayer'

useHead({
  title: 'Asbury Connect'
})

const { currentVideo, playVimeoCollection } = useVideoPlayer()
const { currentTrack } = useAudioPlayer()
let dismissedThisVisit = false

function embedUrl(video: PlayerTrack | null): string {
  if (!video || video.mode !== 'vimeoCollection') return ''
  return video.iframeUrl
}

function maybeOpenChapelLive() {
  if (dismissedThisVisit || !isChapelLiveWindow()) return
  if (embedUrl(currentVideo.value) === CHAPEL_LIVE_EMBED_URL) return
  // playVimeoCollection stops audio, so leave an in-progress video or message alone.
  if (currentVideo.value || currentTrack.value) return
  playVimeoCollection({
    title: CHAPEL_LIVE_TITLE,
    iframeUrl: CHAPEL_LIVE_EMBED_URL,
  })
}

watch(currentVideo, (next, prev) => {
  if (embedUrl(prev) === CHAPEL_LIVE_EMBED_URL && !next) dismissedThisVisit = true
})

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  maybeOpenChapelLive()
  timer = setInterval(maybeOpenChapelLive, 15_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
