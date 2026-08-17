<template>
  <div class="h-full flex bg-gray-50 min-h-0">
    <LeftColumn />
    <RightColumn>
      <div class="mx-auto flex w-full max-w-[1200px]">
        <div class="min-w-0 flex-1">
          <Timeline api-url="/api/posts" />
        </div>
        <aside class="hidden w-72 flex-shrink-0 border-l border-gray-200/80 xl:block">
          <div class="flex flex-col items-center space-y-8 px-6 pt-[5.25rem]">
            <KeenersComicsCard />
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
import firstFruitsLogo from '../../assets/first-fruits.svg'

useHead({
  title: 'Asbury Connect'
})
</script>
