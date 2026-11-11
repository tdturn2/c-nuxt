<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <div class="flex h-[calc(100dvh-9rem)] min-h-[28rem] min-w-0 flex-1 flex-nowrap overflow-hidden">
      <div
        class="h-full min-h-0 w-full shrink-0 border-gray-200 md:w-80 md:border-r"
        :class="conversationId ? 'hidden md:block' : 'block'"
      >
        <MessagesInbox :active-id="conversationId" />
      </div>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <NuxtPage />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MessagesInbox from '~/components/messages/MessagesInbox.vue'

const route = useRoute()
const conversationId = computed(() => {
  const id = Number.parseInt(String(route.params.id || ''), 10)
  return Number.isInteger(id) && id > 0 ? id : null
})
</script>
