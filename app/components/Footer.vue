<template>
  <footer class="bg-gradient-to-r from-[rgba(13,94,130,1)] to-[rgba(10,69,92,1)]">
    <div class="container mx-auto px-4 py-1 text-center text-sm text-white">
      <p class="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>&copy; {{ new Date().getFullYear() }} AsburyConnect. Asbury Theological Seminary</span>
        <span class="text-white/50" aria-hidden="true">·</span>
        <button
          type="button"
          class="underline decoration-white/40 underline-offset-2 hover:decoration-white"
          @click="reportBugOpen = true"
        >
          Report a bug
        </button>
      </p>
    </div>

    <ReportBugModal v-model:open="reportBugOpen" />
  </footer>
</template>

<script setup lang="ts">
const reportBugOpen = ref(false)
</script>
