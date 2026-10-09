<template>
  <section class="bcw-intro bg-[#f3f4f6] px-6 py-12 sm:px-8 sm:py-14">
    <div
      class="mx-auto"
      :class="align === 'left' ? 'max-w-6xl text-left' : 'max-w-3xl text-center'"
    >
      <p
        v-if="lead"
        class="text-[15px] leading-relaxed text-gray-700 sm:text-base"
        :class="title || body || items?.length ? 'mb-5' : ''"
      >
        {{ lead }}
      </p>
      <h2
        v-if="title"
        class="font-bold tracking-tight text-gray-900"
        :class="align === 'left' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'"
      >
        {{ title }}
      </h2>
      <p
        v-if="body"
        class="text-[15px] leading-relaxed text-gray-700 sm:text-base"
        :class="title ? 'mt-4' : ''"
      >
        {{ body }}
      </p>
      <ul v-if="items?.length" class="mt-5 space-y-1 text-[15px] leading-relaxed text-gray-800 sm:text-base">
        <li v-for="item in items" :key="item">
          {{ item }}
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    lead?: string
    title?: string
    body?: string
    items?: string[]
    align?: 'center' | 'left'
  }>(),
  {
    align: 'center',
  },
)
</script>
