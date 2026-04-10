import { ref, computed } from 'vue'

/** Exactly one of `vimeoId` or `youtubeId` should be set. */
export interface VideoTrack {
  title: string
  vimeoId?: string
  youtubeId?: string
}

const currentVideo = ref<VideoTrack | null>(null)

export const useVideoPlayer = () => {
  const playVideo = (video: VideoTrack) => {
    if (!video.vimeoId?.trim() && !video.youtubeId?.trim()) return
    const { stop: stopAudio } = useAudioPlayer()
    stopAudio()
    currentVideo.value = video
  }

  const close = () => {
    currentVideo.value = null
  }

  return {
    currentVideo: computed(() => currentVideo.value),
    playVideo,
    close
  }
}
