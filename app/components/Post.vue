<template>
  <article class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <!-- Post Header -->
    <div class="p-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="displayUser.name"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-gray-600 font-semibold text-sm">
          {{ displayUser.name.charAt(0).toUpperCase() }}
        </span>
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-gray-900">{{ displayUser.name }}</h3>
        <p class="text-xs text-gray-500">{{ formatDate(post.createdAt) }}</p>
      </div>
    </div>

    <!-- Post Content -->
    <div v-if="postContent || youtubeEmbeds.length > 0" class="px-4 pb-4">
      <div 
        class="text-gray-900 whitespace-pre-wrap"
        :style="!isExpanded && shouldTruncate ? 'display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;' : ''"
      >
        <div v-html="formattedContent"></div>
      </div>
      <div v-if="youtubeEmbeds.length > 0" class="mt-4 space-y-4">
        <div
          v-for="(embed, index) in youtubeEmbeds"
          :key="index"
          class="aspect-video w-full rounded-lg overflow-hidden"
        >
          <iframe
            :src="embed"
            class="w-full h-full block"
            style="border: none; border-radius: 0.5rem;"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>
      <button
        v-if="shouldTruncate"
        @click="isExpanded = !isExpanded"
        class="mt-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        {{ isExpanded ? 'Show less' : 'Show more' }}
      </button>
    </div>

    <!-- Post Images -->
    <div v-if="post.images && post.images.length > 0" class="px-4 pb-4">
      <div v-if="post.images.length === 1 && post.images[0]?.image" class="rounded-xl overflow-hidden">
        <img
          :src="post.images[0].image.url"
          :alt="post.images[0].image.alt || 'Post image'"
          class="w-full h-auto object-cover"
        />
      </div>
      <div v-else class="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        <template v-for="(img, index) in post.images" :key="img.id">
          <img
            v-if="img.image"
            :src="img.image.url"
            :alt="img.image.alt || `Post image ${index + 1}`"
            class="w-full h-48 object-cover"
          />
        </template>
      </div>
    </div>

    <!-- Post Actions -->
    <div class="border-t border-gray-200 px-4 py-3 flex items-center gap-6">
      <button class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
        <span class="text-sm font-medium">Like</span>
      </button>
      <button class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span class="text-sm font-medium">Comment</span>
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
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
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  post: Post
  user: User | null
}>()

const displayUser = computed(() => props.user || props.post.author)

const avatarUrl = computed(() => {
  // Use user avatar if available
  if (props.user?.avatar) {
    // Handle avatar as object with url property
    if (props.user.avatar && typeof props.user.avatar === 'object' && 'url' in props.user.avatar) {
      const url = props.user.avatar.url
      if (typeof url === 'string' && url) {
        return url
      }
    }
    // Handle avatar as string (legacy)
    if (typeof props.user.avatar === 'string') {
      return props.user.avatar
    }
  }
  // Fallback to author avatar (legacy format - string)
  if (props.post.author?.avatar && typeof props.post.author.avatar === 'string') {
    return props.post.author.avatar
  }
  return null
})

const isExpanded = ref(false)

const shouldTruncate = computed(() => {
  if (!postContent.value) return false
  // Check if content has multiple lines or is long enough to need truncation
  const lines = postContent.value.split('\n')
  return lines.length > 3 || postContent.value.length > 200
})

// Extract YouTube URLs from Lexical content
const extractYouTubeLinks = (children: any[]): string[] => {
  const links: string[] = []
  
  children.forEach(child => {
    if (child.type === 'autolink' && child.fields?.url) {
      const url = child.fields.url
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        links.push(url)
      }
    }
    if (child.children) {
      links.push(...extractYouTubeLinks(child.children))
    }
  })
  
  return links
}

// Extract text content from Lexical JSON structure
const postContent = computed(() => {
  if (!props.post.content?.root?.children) return ''
  
  const extractText = (children: Array<{ 
    type: string
    children?: Array<{ type: string; text?: string }>
    fields?: { url?: string }
  }>): string => {
    return children
      .map(child => {
        // Skip autolink nodes (we'll handle YouTube separately)
        if (child.type === 'autolink') {
          return ''
        }
        if (child.type === 'text' && 'text' in child) {
          return (child as any).text || ''
        }
        if (child.children) {
          return extractText(child.children as any)
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  
  return extractText(props.post.content.root.children)
})

const youtubeLinks = computed(() => {
  if (!props.post.content?.root?.children) return []
  return extractYouTubeLinks(props.post.content.root.children)
})

const youtubeEmbeds = computed(() => {
  return youtubeLinks.value.map(url => {
    // Convert YouTube URL to embed format
    let videoId = ''
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || ''
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
    return null
  }).filter(Boolean) as string[]
})

const formattedContent = computed(() => {
  if (!postContent.value) return ''
  // Escape HTML and preserve line breaks
  return postContent.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }
}
</script>
