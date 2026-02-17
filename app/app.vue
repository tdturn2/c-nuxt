<template>
  <UApp>
    <div class="flex min-h-screen flex-col relative z-10">
      <Header />
      <main class="flex-1 relative z-10">
        <NuxtPage />
      </main>
      <Footer />
      <NuxtRouteAnnouncer />
    </div>
    <!-- Audio Player using Howler -->
    <AudioPlayer />
  </UApp>
</template>

<script setup lang="ts">
import '../assets/css/main.css'

useHead({
  link: [
    { rel: 'icon', type: 'image/webp', href: '/connect-icon.webp' }
  ]
})
</script>
