<template>
  <section class="bcw-intro bg-[#f3f4f6] px-6 py-12 sm:px-8 sm:py-14">
    <div class="mx-auto max-w-3xl text-center">
      <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {{ title }}
      </h2>
      <p class="mt-4 text-[15px] leading-relaxed text-gray-700 sm:text-base">
        {{ body }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  body: string
}>()
</script>
