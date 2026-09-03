<template>
  <section class="bcw-section-header relative overflow-hidden bg-white">
    <div class="relative mx-auto grid max-w-6xl items-center lg:grid-cols-2">
      <div class="relative z-10 px-6 py-10 sm:px-8 sm:py-12 lg:py-14 lg:pr-10">
        <div class="flex items-stretch gap-3">
          <span
            class="mt-0.5 w-1.5 shrink-0 rounded-sm self-stretch"
            :style="{ backgroundColor: accent }"
            aria-hidden="true"
          />
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-800 sm:text-xs">
              {{ eyebrow }}
            </p>
            <h1 class="mt-3 font-serif text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              {{ title }}
            </h1>
            <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-gray-700 sm:text-base">
              {{ body }}
            </p>
          </div>
        </div>
      </div>

      <div class="relative min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]">
        <img
          :src="image"
          :alt="imageAlt"
          class="absolute inset-0 h-full w-full object-cover object-center"
        >
        <div
          class="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white to-transparent lg:w-1/3"
          aria-hidden="true"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { BCW_ACCENT } from '@shared/bcwPages'

withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    body: string
    image: string
    imageAlt?: string
    accent?: string
  }>(),
  {
    imageAlt: '',
    accent: BCW_ACCENT,
  },
)
</script>
