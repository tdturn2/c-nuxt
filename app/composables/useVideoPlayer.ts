import { ref, computed } from 'vue'

export interface VideoTrack {
  vimeoId: string
  title: string
}

const currentVideo = ref<VideoTrack | null>(null)

export const useVideoPlayer = () => {
  const playVideo = (video: VideoTrack) => {
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
