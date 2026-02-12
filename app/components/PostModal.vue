<template>
  <UModal 
    v-model:open="isOpen"
    :ui="{ 
      content: 'max-w-2xl max-h-[90vh]',
      body: 'overflow-y-auto'
    }"
  >
    <template #body>
      <div v-if="post">
        <Post :post="post" :user="user" />
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
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})
</script>
