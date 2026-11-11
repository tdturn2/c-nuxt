<template>
  <MessageThread v-if="conversationId" class="min-h-0 flex-1" :conversation-id="conversationId" />
  <p v-else class="p-6 text-sm text-gray-500">Conversation not found.</p>
</template>

<script setup lang="ts">
import MessageThread from '~/components/messages/MessageThread.vue'

const route = useRoute()
const conversationId = computed(() => {
  const id = Number.parseInt(String(route.params.id || ''), 10)
  return Number.isInteger(id) && id > 0 ? id : 0
})
</script>
