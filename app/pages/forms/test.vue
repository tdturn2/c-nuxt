<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
      <h1 class="text-2xl font-bold text-gray-900">Forms test</h1>
      <p class="text-sm text-gray-600">
        Quick links for development/testing.
      </p>

      <div class="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
        <div class="text-sm text-gray-700">
          Current test slug:
          <code class="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{{ slug }}</code>
        </div>
        <NuxtLink
          class="inline-flex items-center rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
          :to="`/forms/${encodeURIComponent(slug)}`"
        >
          Open form
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const slug = 'duplicating-paper-delivery'
</script>

