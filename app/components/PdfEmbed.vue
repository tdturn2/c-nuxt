<template>
  <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div class="min-w-0">
        <h2 class="truncate text-sm font-semibold text-gray-900">
          {{ title || 'PDF Document' }}
        </h2>
        <p class="truncate text-xs text-gray-500">{{ src }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          v-if="backTo"
          :to="backTo"
          class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgba(10,69,92,1)]"
        >
          Back to page
        </NuxtLink>
        <a
          :href="src"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Open in new tab
        </a>
        <a
          :href="src"
          download
          class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgba(10,69,92,1)]"
        >
          Download
        </a>
      </div>
    </div>

    <iframe
      :src="src"
      :title="title || 'PDF Document'"
      class="w-full rounded-b-lg"
      :style="{ height }"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  title?: string
  height?: string
  backTo?: string
}>(), {
  title: 'PDF Document',
  height: 'calc(100vh - 13rem)',
  backTo: '',
})
</script>
