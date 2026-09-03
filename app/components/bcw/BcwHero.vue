<template>
  <section
    class="bcw-hero relative flex w-full items-center justify-center overflow-hidden bg-[#b8c98d]"
    :style="{
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'top center',
    }"
  >
    <div class="relative z-10 flex w-full max-w-4xl items-center justify-center px-6 py-10 sm:py-12 lg:py-14">
      <img
        :src="lockupImage"
        :alt="alt"
        class="h-auto w-full max-w-[560px] select-none sm:max-w-[640px]"
        draggable="false"
      >
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    backgroundImage: string
    lockupImage: string
    alt?: string
  }>(),
  {
    alt: 'A Thriving Culture — Asbury Theological Seminary',
  },
)
</script>
