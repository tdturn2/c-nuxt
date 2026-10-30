<template>
  <section
    v-if="visible"
    class="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    aria-labelledby="profile-nudge-title"
  >
    <h2 id="profile-nudge-title" class="text-base font-semibold text-gray-900">
      Your profile
    </h2>
    <p class="mt-2 text-sm text-gray-700">
      Sharing a bit about yourself helps foster community within the seminary.
      It is optional, but encouraged.
    </p>
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/profile"
        class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgba(10,69,92,1)]"
      >
        Update profile
      </NuxtLink>
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        @click="remindLater"
      >
        Remind me later
      </button>
      <button
        type="button"
        class="px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
        @click="dismissForever"
      >
        Don't ask again
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
const { visible, remindLater, dismissForever } = useProfileNudge()
</script>
