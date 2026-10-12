<template>
  <section class="w-full max-w-[180px]">
    <div class="overflow-hidden rounded-2xl bg-[#fffaf3] shadow-md ring-1 ring-[color-mix(in_srgb,var(--color-gold)_55%,white)]">
      <NuxtLink
        to="/guest-auxillary-services/dining-services"
        class="group block"
      >
        <div class="relative bg-gradient-to-b from-[#f6e7c0] via-[#fff6e4] to-[#fffaf3] px-3 pt-3">
          <p class="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a7020]">
            Dining Hall
          </p>
          <img
            :src="sandwich"
            alt="Crispy chicken sandwich from Dining Services"
            class="mx-auto -mb-1 mt-1 w-full origin-bottom drop-shadow-[0_14px_18px_rgba(90,48,12,0.28)] transition duration-300 group-hover:scale-[1.05]"
          >
        </div>
        <p class="px-3 pb-1 text-center text-base font-semibold tracking-tight text-gray-900 group-hover:text-[rgba(13,94,130,1)]">
          Dining Services
        </p>
      </NuxtLink>
      <div class="px-3 pb-3 pt-2">
        <a
          href="https://oncampusdining.com/asburyseminary/menu/"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[rgba(13,94,130,1)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[rgba(10,69,92,1)]"
        >
          Today's Menu
          <UIcon name="i-lucide-arrow-up-right" class="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import sandwich from '../../assets/dining-sandwich.png'
</script>
