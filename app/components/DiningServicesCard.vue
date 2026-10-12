<template>
  <div class="flex w-full max-w-[180px] flex-col items-center rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
    <NuxtLink
      to="/guest-auxillary-services/dining-services"
      class="flex w-full flex-col items-center rounded-lg transition hover:opacity-90"
    >
      <div class="flex h-24 w-full items-center justify-center rounded-lg bg-[rgba(13,94,130,0.08)]">
        <UIcon name="i-lucide-utensils" class="h-10 w-10 text-[rgba(13,94,130,1)]" />
      </div>
      <p class="mt-3 text-center text-sm font-semibold text-gray-900">Dining Services</p>
    </NuxtLink>
    <a
      href="https://oncampusdining.com/asburyseminary/menu/"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[rgba(10,69,92,1)]"
    >
      Today's Menu
    </a>
  </div>
</template>
