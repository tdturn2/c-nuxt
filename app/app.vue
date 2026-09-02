<template>
  <UApp>
    <div
      class="flex flex-col relative z-10"
      :class="isHome ? 'h-screen overflow-hidden' : 'min-h-screen'"
    >
      <div v-if="!isSignIn" class="sticky top-0 z-50 flex-shrink-0">
        <Header />
        <ImpersonationBanner />
      </div>
      <main
        class="flex-1 relative z-10 min-h-0"
        :class="isHome ? 'overflow-hidden flex flex-col' : ''"
      >
        <div :class="isHome ? 'flex-1 min-h-0' : ''">
          <NuxtPage />
        </div>
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
