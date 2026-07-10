<template>
  <UApp>
    <div
      class="flex flex-col relative z-10"
      :class="isHome ? 'h-screen overflow-hidden' : 'min-h-screen'"
    >
      <Header v-if="!isSignIn" class="flex-shrink-0" />
      <main
        class="flex-1 relative z-10"
        :class="isHome ? 'min-h-0 overflow-hidden' : ''"
      >
        <NuxtPage />
      </main>
      <Footer v-if="!isSignIn" class="flex-shrink-0" />
      <NuxtRouteAnnouncer />
    </div>
    <AppContentSearch />
    <AdminDashboardFab />
    <!-- Audio Player using Howler -->
    <AudioPlayer />
    <!-- Video Player (Plyr + Vimeo) fixed at bottom -->
    <VideoPlayer />
  </UApp>
</template>

<script setup lang="ts">
import '../assets/css/main.css'

const route = useRoute()
const isHome = computed(() => route.path === '/')
const isSignIn = computed(() => route.path === '/signin')

// Force light mode for NuxtUI components
const colorMode = useColorMode()
colorMode.preference = 'light'
colorMode.value = 'light'

useHead({
  link: [
    { rel: 'icon', type: 'image/webp', href: '/connect-icon.webp' }
  ]
})
</script>
