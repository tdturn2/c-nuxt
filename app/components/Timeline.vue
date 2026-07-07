<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <!-- Category Tabs + Create Post icon -->
    <div class="flex items-center justify-between gap-4 mb-6">
      <UTabs
        v-model="activeCategoryTab"
        :items="categoryTabs"
        :ui="{
          list: 'bg-transparent p-0 rounded-none gap-1',
          indicator: 'bg-transparent border-none shadow-none',
          trigger: 'rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100/80 aria-selected:bg-gray-100 aria-selected:text-gray-700 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700'
        }"
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

    <section
      v-if="activeCategoryTab === 'official' && slides.length"
      class="mb-12 w-full"
    >
      <UCarousel
        v-slot="{ item }"
        loop
        :autoplay="{ delay: 5000 }"
        arrows
        dots
        :items="slides"
        :ui="{
          item: 'basis-full ps-0',
          container: 'ms-0',
          controls: 'inset-x-2',
          prev: 'bg-white/90 border border-gray-200',
          next: 'bg-white/90 border border-gray-200',
          dots: 'mt-3'
        }"
      >
        <NuxtLink
          :to="item.href || '/'"
          :target="item.openInNewTab ? '_blank' : undefined"
          :rel="item.openInNewTab ? 'noopener noreferrer' : undefined"
          class="block bg-gray-50"
        >
          <img
            :src="getImageUrl(item.image)"
            :alt="item.title || 'Connect highlight'"
            class="w-full h-auto"
          >
        </NuxtLink>
      </UCarousel>
    </section>

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
      <div v-if="hasMoreOlderPosts" class="border-t border-gray-200 py-6 text-center">
        <button
          type="button"
          class="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          @click="showOlderPosts"
        >
          {{ showOlderPostsLabel }}
        </button>
      </div>
    </div>
    <div v-else-if="hasMoreOlderPosts" class="py-8 text-center">
      <p class="mb-4 text-sm text-gray-500">No recent posts in this feed.</p>
      <button
        type="button"
        class="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        @click="showOlderPosts"
      >
        {{ showOlderPostsLabel }}
      </button>
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

interface HomeSlide {
  id: number | string
  title?: string
  href?: string
  openInNewTab?: boolean
  image?: any
}

const props = defineProps<{
  apiUrl?: string
}>()

const apiUrl = props.apiUrl || '/api/posts'

const RECENT_DAYS = 8
const OLDER_BATCH_SIZE = 10
const RECENT_MS = RECENT_DAYS * 24 * 60 * 60 * 1000

const { data, pending, error, refresh } = await useFetch<TimelineResponse>(apiUrl)
const { data: sliderData } = await useFetch<{ docs?: HomeSlide[] }>('/api/home-slider', {
  key: 'connect-home-slider',
})

const { fetchUsers } = useUsers()
const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.payloadBaseUrl || '').replace(/\/$/, '')

// Get current authenticated user's PayloadCMS ID
const { currentUserId } = useMe()

// Category tabs for filtering
const categoryTabs = [
  { value: 'official', label: 'Official' },
  { value: 'students', label: 'Students' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' }
]

// Active category tab state
const activeCategoryTab = ref('official')
const slides = computed<HomeSlide[]>(() => {
  return Array.isArray(sliderData.value?.docs) ? sliderData.value.docs : []
})

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

function getImageUrl(image: any) {
  if (!image) return '/estes-icon.png'
  const raw =
    typeof image === 'object'
      ? (image.url || image.file?.url || image._normalizedUrl || null)
      : null
  if (!raw) return '/estes-icon.png'
  if (String(raw).startsWith('http')) return raw
  return `${payloadBaseUrl}${raw}`
}

const handlePostUpdated = (updatedPost: PostWithUser | Post) => {
  const idx = allPostsWithUsers.value.findIndex(p => p.id === updatedPost.id)
  if (idx >= 0) {
    const existing = allPostsWithUsers.value[idx]
    const next = [...allPostsWithUsers.value]
    next[idx] = { ...existing, ...updatedPost, user: existing.user } as PostWithUser
    allPostsWithUsers.value = next
  }
  filterPosts()
  if (selectedPost.value?.id === updatedPost.id) {
    selectedPost.value = { ...(selectedPost.value as any), ...updatedPost }
  }
}

const handleModalPostUpdated = (updatedPost: PostWithUser | Post) => {
  handlePostUpdated(updatedPost)
}

const handlePostDeleted = (postId: number) => {
  allPostsWithUsers.value = allPostsWithUsers.value.filter(p => p.id !== postId)
  filterPosts()
  if (selectedPost.value?.id === postId) {
    isPostModalOpen.value = false
    selectedPost.value = null
    selectedPostUser.value = null
    postModalStartInEditMode.value = false
    postModalStartWithCommentsOpen.value = false
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
  olderPostsVisibleCount.value = 0
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
const displayedPosts = ref<PostWithUser[]>([])

const olderPostsVisibleCount = ref(0)
const hiddenOlderCount = ref(0)

const hasMoreOlderPosts = computed(() => hiddenOlderCount.value > 0)

const showOlderPostsLabel = computed(() => {
  const count = Math.min(hiddenOlderCount.value, OLDER_BATCH_SIZE)
  return count === 1 ? 'Show 1 older post' : `Show ${count} older posts`
})

function isPinnedPost(post: PostWithUser) {
  return post.categories?.includes('pinned') ?? false
}

function isRecentPost(post: PostWithUser) {
  const created = new Date(post.createdAt).getTime()
  if (!Number.isFinite(created)) return true
  return Date.now() - created <= RECENT_MS
}

function sortByNewest(posts: PostWithUser[]) {
  return [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

function showOlderPosts() {
  olderPostsVisibleCount.value += OLDER_BATCH_SIZE
  filterPosts()
}

// Filter posts based on active category tab
const filterPosts = () => {
  if (!allPostsWithUsers.value.length) {
    displayedPosts.value = []
    hiddenOlderCount.value = 0
    return
  }

  const category = activeCategoryTab.value
  let categoryFiltered: PostWithUser[]

  if (category === 'official') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      !post.audience ||
      post.audience.length === 0 ||
      post.audience.includes('all'),
    )
  } else if (category === 'students') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      post.audience && post.audience.includes('students'),
    )
  } else if (category === 'staff') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      post.audience && (
        post.audience.includes('staff') ||
        post.audience.includes('employees')
      ),
    )
  } else if (category === 'faculty') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      post.audience && (
        post.audience.includes('faculty') ||
        post.audience.includes('employees')
      ),
    )
  } else {
    categoryFiltered = allPostsWithUsers.value
  }

  const pinned = sortByNewest(categoryFiltered.filter(isPinnedPost))
  const nonPinned = categoryFiltered.filter((post) => !isPinnedPost(post))
  const recent = sortByNewest(nonPinned.filter(isRecentPost))
  const older = sortByNewest(nonPinned.filter((post) => !isRecentPost(post)))
  const olderVisible = older.slice(0, olderPostsVisibleCount.value)

  displayedPosts.value = [...pinned, ...recent, ...olderVisible]
  hiddenOlderCount.value = Math.max(0, older.length - olderVisible.length)
}

filterPosts()

// Watch for category tab changes and filter posts
watch(activeCategoryTab, () => {
  olderPostsVisibleCount.value = 0
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
