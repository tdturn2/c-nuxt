<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <!-- Category Tabs + Create Post icon -->
    <div class="flex items-center justify-between gap-4 mb-6">
      <UTabs
        v-model="activeCategoryTab"
        :items="categoryTabs"
        class="flex-1 min-w-0"
      />
      <button
        type="button"
        aria-label="Create a post"
        class="shrink-0 p-2 rounded-full text-gray-500 hover:text-[rgba(13,94,130,1)] hover:bg-gray-100 transition-colors"
        @click="createPostModalOpen = true"
      >
        <UIcon name="i-heroicons-plus-circle" class="w-6 h-6" />
      </button>
    </div>

    <UModal
      v-model:open="createPostModalOpen"
      :ui="{ content: 'max-w-2xl', body: 'p-6' }"
    >
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900">Create a Post</h2>
      </template>
      <template #body>
        <AddPost
          :default-audience="activeCategoryTab as any"
          @post-created="onCreatePostSuccess"
          @cancel="createPostModalOpen = false"
        />
      </template>
    </UModal>

    <PostModal
      :post="selectedPost"
      :user="selectedPostUser"
      :open="isPostModalOpen"
      :current-user-id="currentUserId"
      :start-in-edit-mode="postModalStartInEditMode"
      :start-with-comments-open="postModalStartWithCommentsOpen"
      @update:open="handlePostModalOpenUpdate"
      @post-updated="handleModalPostUpdated"
      @post-deleted="handlePostDeleted"
    />

    <div v-if="pending || loadingUsers" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
    <div v-else-if="error" class="text-center py-8 text-red-600">
      Error loading timeline: {{ error }}
    </div>
    <div v-else-if="displayedPosts && displayedPosts.length > 0" class="space-y-0">
      <Post
        v-for="post in displayedPosts"
        :key="`${post.id}-${post.reactionRefreshAt ?? 0}`"
        :post="post"
        :user="post.user"
        :current-user-id="currentUserId"
        :allow-inline-edit="false"
        :allow-inline-comments="false"
        @post-updated="handlePostUpdated"
        @post-deleted="handlePostDeleted"
        @post-edit-request="openPostEditor"
        @post-comment-request="openPostComments"
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
  roles?: string[]
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
  roles?: string[]
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
  audience?: string[]
  categories?: string[]
  reactionRefreshAt?: number
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

// Get current authenticated user's PayloadCMS ID
const { currentUserId } = useMe()

// Category tabs for filtering
const categoryTabs = [
  { value: 'general', label: 'General' },
  { value: 'students', label: 'Students' },
  { value: 'employees', label: 'Employees' },
  { value: 'staff', label: 'Staff' },
  { value: 'faculty', label: 'Faculty' }
]

// Active category tab state
const activeCategoryTab = ref('general')

const createPostModalOpen = ref(false)
const isPostModalOpen = ref(false)
const selectedPost = ref<PostWithUser | null>(null)
const selectedPostUser = ref<User | null>(null)
const postModalStartInEditMode = ref(false)
const postModalStartWithCommentsOpen = ref(false)

const onCreatePostSuccess = async () => {
  await handlePostCreated()
  createPostModalOpen.value = false
}

const handlePostUpdated = (updatedPost: PostWithUser | Post) => {
  const updateList = (list: PostWithUser[]) => {
    const idx = list.findIndex(p => p.id === updatedPost.id)
    const existing = idx >= 0 ? list[idx] : null
    if (existing) {
      const next = [...list]
      next[idx!] = { ...existing, ...updatedPost, user: existing.user } as PostWithUser
      return next
    }
    return list
  }
  allPostsWithUsers.value = updateList(allPostsWithUsers.value)
  displayedPosts.value = updateList(displayedPosts.value)
}

const handleModalPostUpdated = (updatedPost: PostWithUser | Post) => {
  handlePostUpdated(updatedPost)
  if (selectedPost.value?.id === updatedPost.id) {
    selectedPost.value = { ...(selectedPost.value as any), ...updatedPost }
  }
}

const handlePostDeleted = (postId: number) => {
  allPostsWithUsers.value = allPostsWithUsers.value.filter(p => p.id !== postId)
  displayedPosts.value = displayedPosts.value.filter(p => p.id !== postId)
  if (selectedPost.value?.id === postId) {
    isPostModalOpen.value = false
    selectedPost.value = null
    selectedPostUser.value = null
    postModalStartInEditMode.value = false
  }
}

const openPostEditor = (post: PostWithUser) => {
  selectedPost.value = post
  selectedPostUser.value = post.user
  postModalStartInEditMode.value = true
  postModalStartWithCommentsOpen.value = false
  isPostModalOpen.value = true
}

const openPostComments = (post: PostWithUser) => {
  selectedPost.value = post
  selectedPostUser.value = post.user
  postModalStartInEditMode.value = false
  postModalStartWithCommentsOpen.value = true
  isPostModalOpen.value = true
}

const handlePostModalOpenUpdate = (open: boolean) => {
  isPostModalOpen.value = open
  if (!open) {
    postModalStartInEditMode.value = false
    postModalStartWithCommentsOpen.value = false
  }
}

const handlePostCreated = async () => {
  // Refresh the timeline data after a new post is created
  await refresh()
  
  // Refresh user data from connect-users for the new posts
  if (data.value?.docs && data.value.docs.length > 0) {
    loadingUsers.value = true
    try {
      const docs = data.value.docs
      // Extract unique author IDs from posts
      const authorIds = [...new Set(docs.map(post => post.author.id))]
      
      // Fetch users from connect-users collection
      const usersMap = await fetchUsers(authorIds)
      
      // Update with user data from connect-users
      allPostsWithUsers.value = docs.map(post => ({
        ...post,
        user: usersMap.get(post.author.id) || null
      })) as PostWithUser[]
      
      // Apply filtering after updating posts
      filterPosts()
    } catch (err) {
      console.error('Error loading users from connect-users:', err)
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

// Filter posts based on active category tab
const filterPosts = () => {
  if (!allPostsWithUsers.value.length) {
    displayedPosts.value = []
    return
  }
  
  const category = activeCategoryTab.value
  
  if (category === 'general') {
    // General: posts with audience "all" or null/undefined/empty array
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      !post.audience || 
      post.audience.length === 0 || 
      post.audience.includes('all')
    )
  } else if (category === 'students') {
    // Students: posts with audience "students"
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      post.audience && post.audience.includes('students')
    )
  } else if (category === 'employees') {
    // Employees: posts with audience "employees"
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      post.audience && post.audience.includes('employees')
    )
  } else if (category === 'staff') {
    // Staff: posts with audience "staff" OR "employees"
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      post.audience && (
        post.audience.includes('staff') || 
        post.audience.includes('employees')
      )
    )
  } else if (category === 'faculty') {
    // Faculty: posts with audience "faculty" OR "employees"
    displayedPosts.value = allPostsWithUsers.value.filter(post => 
      post.audience && (
        post.audience.includes('faculty') || 
        post.audience.includes('employees')
      )
    )
  } else {
    // Default: show all posts
    displayedPosts.value = allPostsWithUsers.value
  }

  // Pin posts with category "pinned" to the top
  displayedPosts.value = [...displayedPosts.value].sort((a, b) => {
    const aPinned = a.categories?.includes('pinned') ?? false
    const bPinned = b.categories?.includes('pinned') ?? false
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })
}

// Watch for category tab changes and filter posts
watch(activeCategoryTab, () => {
  filterPosts()
}, { immediate: false })

// Fetch user data after component mounts (client-side only)
// This ensures we're pulling from connect-users collection, not just populated author data
onMounted(async () => {
  if (!data.value?.docs || data.value.docs.length === 0) {
    return
  }
  
  loadingUsers.value = true
  try {
    const docs = data.value.docs
    // Extract unique author IDs from posts
    const authorIds = [...new Set(docs.map(post => post.author.id))]
    
    // Fetch users from connect-users collection via useUsers composable
    const usersMap = await fetchUsers(authorIds)
    
    // Update posts with user data from connect-users
    allPostsWithUsers.value = docs.map(post => ({
      ...post,
      // Use user data from connect-users, fallback to author data if user not found
      user: usersMap.get(post.author.id) || null
    })) as PostWithUser[]
    
    // Apply filtering after user data is loaded
    filterPosts()
  } catch (err) {
    console.error('Error loading users from connect-users:', err)
  } finally {
    loadingUsers.value = false
  }
})
</script>
