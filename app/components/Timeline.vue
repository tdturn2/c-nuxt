<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Add Post Component - Only show for Community tab (client-side only) -->
    <AddPost v-if="showAddPost" @post-created="handlePostCreated" />
    
    <div v-if="pending || loadingUsers" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
    <div v-else-if="error" class="text-center py-8 text-red-600">
      Error loading timeline: {{ error }}
    </div>
    <div v-else-if="displayedPosts && displayedPosts.length > 0" class="space-y-6">
      <Post
        v-for="post in displayedPosts"
        :key="post.id"
        :post="post"
        :user="post.user"
        :current-user-id="currentUserId"
      />
    </div>
    <div v-else class="text-center py-8 text-gray-500">
      No posts yet
    </div>
  </div>
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
  categories?: string[]
  createdAt: string
  updatedAt: string
}

interface PostWithUser extends Post {
  user: User | null
}

interface TimelineResponse {
  docs: Post[]
  totalDocs: number
  page: number
  totalPages: number
}

const props = defineProps<{
  apiUrl?: string
}>()

const apiUrl = props.apiUrl || '/api/posts'

const { data, pending, error, refresh } = await useFetch<TimelineResponse>(apiUrl)

const { fetchUsers } = useUsers()
const { activeTab } = useFeedFilter()

// Get current authenticated user's PayloadCMS ID
const { currentPayloadUserId } = useCurrentUser()
const currentUserId = computed(() => currentPayloadUserId.value)

// Only show AddPost on client side and when community tab is active
const showAddPost = ref(false)

const handlePostCreated = async () => {
  // Refresh the timeline data after a new post is created
  await refresh()
  
  // Refresh user data for the new posts
  if (data.value?.docs && data.value.docs.length > 0) {
    loadingUsers.value = true
    try {
      const docs = data.value.docs
      const authorIds = docs.map(post => post.author.id)
      const usersMap = await fetchUsers(authorIds)
      
      // Update with user data
      allPostsWithUsers.value = docs.map(post => ({
        ...post,
        user: usersMap.get(post.author.id) || null
      })) as PostWithUser[]
      
      // Apply filtering after updating posts
      filterPosts()
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      loadingUsers.value = false
    }
  }
}

// Initialize synchronously to match server render
const allPostsWithUsers = ref<PostWithUser[]>(
  data.value?.docs?.map(post => ({
    ...post,
    user: null
  })) as PostWithUser[] || []
)

const loadingUsers = ref(false)

// Use a ref for displayed posts to prevent hydration mismatch
// Initialize with all posts (no filtering during SSR) - ensure same on server and client
const displayedPosts = ref<PostWithUser[]>(
  data.value?.docs?.map(post => ({
    ...post,
    user: null
  })) as PostWithUser[] || []
)

// Filter posts based on active tab
const filterPosts = () => {
  if (!allPostsWithUsers.value.length) {
    displayedPosts.value = []
    return
  }
  
  if (activeTab.value === 'latest') {
    // Latest: posts with "official" category
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      post.categories && post.categories.includes('official')
    )
  } else if (activeTab.value === 'community') {
    // Community: posts without "official" category
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      !post.categories || !post.categories.includes('official')
    )
  } else if (activeTab.value === 'profs') {
    // Profs: placeholder for now (return all or filter as needed)
    displayedPosts.value = allPostsWithUsers.value
  } else {
    displayedPosts.value = allPostsWithUsers.value
  }
}

// Watch for tab changes and filter posts
watch(activeTab, () => {
  filterPosts()
}, { immediate: false })

// Fetch user data after component mounts (client-side only)
onMounted(async () => {
  // Enable AddPost on client side
  showAddPost.value = activeTab.value === 'community'
  
  if (!data.value?.docs || data.value.docs.length === 0) {
    return
  }
  
  loadingUsers.value = true
  try {
    const docs = data.value.docs
    const authorIds = docs.map(post => post.author.id)
    const usersMap = await fetchUsers(authorIds)
    
    // Update with user data
    allPostsWithUsers.value = docs.map(post => ({
      ...post,
      user: usersMap.get(post.author.id) || null
    })) as PostWithUser[]
    
    // Apply filtering after user data is loaded
    filterPosts()
  } catch (err) {
    console.error('Error loading users:', err)
  } finally {
    loadingUsers.value = false
  }
})

// Watch activeTab to show/hide AddPost (only on client)
watch(activeTab, (newTab) => {
  if (import.meta.client) {
    showAddPost.value = newTab === 'community'
  }
})
</script>
