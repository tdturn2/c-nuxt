<template>
  <div class="space-y-6" aria-hidden="true">
    <!-- Toolbar -->
    <div v-if="toolbar === 'filters'" class="flex flex-wrap items-end gap-3 sm:gap-4">
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <USkeleton class="h-4 w-24" />
        <USkeleton class="h-9 w-full min-w-[10rem] sm:w-56 rounded-md" />
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <USkeleton class="h-4 w-16" />
        <USkeleton class="h-9 w-full min-w-[10rem] sm:w-56 rounded-md" />
      </div>
      <div class="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
        <USkeleton class="h-9 w-full rounded-md" />
      </div>
    </div>
    <div v-else class="mb-2 w-full sm:max-w-md">
      <USkeleton class="h-9 w-full rounded-md" />
    </div>

    <!-- Optional count line (student directory) -->
    <USkeleton v-if="showCountLine" class="h-4 w-48" />

    <!-- Card grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="n in cardCount"
        :key="`dir-skel-${n}`"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center"
      >
        <USkeleton class="h-28 w-28 rounded-full shrink-0 mb-3" />
        <div class="w-full space-y-2">
          <USkeleton class="h-4 w-4/5 mx-auto" />
          <USkeleton class="h-3 w-3/5 mx-auto" />
          <USkeleton class="h-3 w-2/3 mx-auto" />
        </div>
        <div class="mt-3 pt-3 border-t border-gray-100 w-full space-y-2">
          <USkeleton class="h-3 w-full" />
          <USkeleton class="h-3 w-4/5" />
        </div>
      </div>
    </div>

    <!-- Pagination row placeholder -->
    <div v-if="showPaginationRow" class="mt-6 flex flex-wrap items-center justify-center gap-3">
      <USkeleton class="h-9 w-24 rounded-md" />
      <USkeleton class="h-4 w-32" />
      <USkeleton class="h-9 w-20 rounded-md" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Search-only bar vs filters + search (employee directory). */
    toolbar?: 'search' | 'filters'
    /** Number of placeholder cards (default matches a full first screen). */
    cardCount?: number
    showCountLine?: boolean
    showPaginationRow?: boolean
  }>(),
  {
    toolbar: 'search',
    cardCount: 8,
    showCountLine: false,
    showPaginationRow: false,
  },
)
</script>
