<template>
  <UModal
    v-model:open="isOpen"
    :close="false"
    :ui="{
      overlay: 'bg-black/70',
      content: 'max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden ring-0 shadow-2xl divide-y-0',
      header: 'hidden p-0 min-h-0',
      body: 'p-0 sm:p-0 overflow-y-auto max-h-[90vh]'
    }"
  >
    <template #body="{ close }">
      <div v-if="post" class="relative">
        <button
          type="button"
          class="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label="Close"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="h-4 w-4" />
        </button>
        <Post
          :post="post"
          :user="user"
          :current-user-id="currentUserId"
          :current-user="meUser"
          :start-in-edit-mode="startInEditMode"
          :start-with-comments-open="startWithCommentsOpen"
          in-modal
          @post-updated="(p) => emit('postUpdated', p)"
          @post-deleted="(id) => emit('postDeleted', id)"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import Post from './Post.vue'

interface Author {
  id: number
  name: string
  avatar: string | null
  bio: string
  email: string
}

interface User {
  id: number
  name: string
  avatar: {
    id: number
    url: string
    alt: string
  } | null
  bio: string
  email: string
}

interface Image {
  id: string
  image: {
    id: number
    url: string
    alt: string
    width: number
    height: number
  }
}

interface Post {
  id: number
  author: Author
  content: {
    root: {
      children: Array<{
        type: string
        children?: Array<{
          type: string
          text?: string
        }>
      }>
    }
  }
  images: Image[]
  categories?: string[]
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  post: Post | null
  user: User | null
  open: boolean
  currentUserId?: number
  startInEditMode?: boolean
  startWithCommentsOpen?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  postUpdated: [post: Post]
  postDeleted: [postId: number]
}>()

// Get current authenticated user's PayloadCMS ID if not provided
const { currentUserId: meUserId, user: meUser } = useMe()
const currentUserId = computed(() => props.currentUserId ?? meUserId.value)

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})
</script>
