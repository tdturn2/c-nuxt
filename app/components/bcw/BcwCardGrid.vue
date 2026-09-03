<template>
  <section class="bcw-cards bg-[#f3f4f6] px-6 pb-14 sm:px-8 sm:pb-16">
    <div
      class="mx-auto grid max-w-6xl gap-6"
      :class="cards.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'"
    >
      <article
        v-for="card in cards"
        :key="card.title"
        class="overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-gray-200/80"
      >
        <div class="aspect-[16/10] overflow-hidden bg-gray-100">
          <img
            :src="card.image"
            :alt="card.title"
            class="h-full w-full object-cover"
            loading="lazy"
          >
        </div>
        <div class="px-5 py-5 sm:px-6 sm:py-6">
          <h3 class="flex items-start gap-2.5 text-base font-bold text-gray-900 sm:text-lg">
            <span
              class="mt-1.5 h-2.5 w-2.5 shrink-0"
              :style="{ backgroundColor: accent }"
              aria-hidden="true"
            />
            <span>{{ card.title }}</span>
          </h3>
          <p class="mt-3 text-sm leading-relaxed text-gray-700">
            {{ card.body }}
          </p>
          <NuxtLink
            v-if="card.to"
            :to="card.to"
            class="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-gray-900 hover:opacity-80"
          >
            {{ card.moreLabel || 'More' }}
            <span :style="{ color: accent }" aria-hidden="true">&gt;</span>
          </NuxtLink>
          <a
            v-else-if="card.href"
            :href="card.href"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-gray-900 hover:opacity-80"
          >
            {{ card.moreLabel || 'More' }}
            <span :style="{ color: accent }" aria-hidden="true">&gt;</span>
          </a>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { BCW_ACCENT, type BcwCard } from '@shared/bcwPages'

withDefaults(
  defineProps<{
    cards: BcwCard[]
    accent?: string
  }>(),
  {
    accent: BCW_ACCENT,
  },
)
</script>
