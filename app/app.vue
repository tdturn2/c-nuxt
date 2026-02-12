<template>
  <UApp>
    <div class="flex min-h-screen flex-col">
      <Header />
      <main class="flex-1">
        <NuxtPage />
      </main>
      <Footer />
      <NuxtRouteAnnouncer />
    </div>
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
