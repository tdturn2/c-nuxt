<template>
  <Teleport to="body">
    <div
      v-if="isVisible && filteredUsers.length > 0"
      class="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto w-64"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    >
      <div
        v-for="(user, index) in filteredUsers"
        :key="user.id"
        @click="selectUser(user)"
        @mouseenter="selectedIndex = index"
        :class="[
          'px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100',
          selectedIndex === index ? 'bg-gray-100' : ''
        ]"
      >
        <div v-if="user.avatar" class="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
          <img :src="user.avatar" :alt="user.name" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
          <span class="text-xs text-gray-600 font-semibold">{{ user.name.charAt(0).toUpperCase() }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">{{ user.name }}</div>
          <div class="text-xs text-gray-500 truncate">{{ user.email }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { MentionUser } from '~/composables/useMentions'

interface Props {
  isVisible: boolean
  users: MentionUser[]
  selectedIndex: number
  position: { top: number; left: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [user: MentionUser]
  updateSelectedIndex: [index: number]
}>()

const filteredUsers = computed(() => props.users)

const selectUser = (user: MentionUser) => {
  emit('select', user)
}

// Expose selectedIndex for parent to control
const selectedIndex = computed({
  get: () => props.selectedIndex,
  set: (value) => emit('updateSelectedIndex', value)
})
</script>
