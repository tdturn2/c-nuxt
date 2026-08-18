<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <div class="mb-6">
      <UTabs
        v-model="activeCategoryTab"
        :items="categoryTabs"
        :ui="{
          list: 'bg-transparent p-0 rounded-none gap-1',
          indicator: 'bg-transparent border-none shadow-none',
          trigger: 'rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100/80 aria-selected:bg-gray-100 aria-selected:text-gray-700 data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700'
        }"
        class="min-w-0"
      />
    </div>

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
      v-if="activeCategoryTab === 'home' && slides.length"
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
          v-if="item.href"
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
        <div v-else class="block bg-gray-50">
          <img
            :src="getImageUrl(item.image)"
            :alt="item.title || 'Connect highlight'"
            class="w-full h-auto"
          >
        </div>
      </UCarousel>
    </section>

    <section
      v-if="activeCategoryTab === 'home'"
      class="mb-16 w-full"
    >
      <ChapelHomeCard />
    </section>

    <section
      v-if="activeCategoryTab === 'home' && featuredBooks.length"
      class="mb-4 w-full"
    >
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-semibold text-gray-900">Featured Faculty Publications</h2>
        <NuxtLink
          to="/latest-books"
          class="text-xs font-medium text-[rgba(13,94,130,1)] hover:underline"
        >
          View all
        </NuxtLink>
      </div>
      <UMarquee
        pause-on-hover
        overlay
        class="rounded-xl bg-white py-4 [--duration:40s] [--gap:--spacing(6)]"
      >
        <NuxtLink
          v-for="book in featuredBooks"
          :key="String(book.id)"
          :to="book.link || '/latest-books'"
          :target="isExternalLink(book.link) ? '_blank' : undefined"
          :rel="isExternalLink(book.link) ? 'noopener noreferrer' : undefined"
          class="block shrink-0"
        >
          <div class="h-52 w-36 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
            <img
              :src="book.image"
              :alt="book.title || 'Featured faculty publication'"
              class="h-full w-full object-contain p-1.5"
            >
          </div>
        </NuxtLink>
      </UMarquee>
    </section>

    <template v-if="showFeed">
      <div v-if="initialLoading" class="text-center py-8">
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
    </template>
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

interface FeaturedBook {
  id: string | number
  image: string
  title?: string
  link?: string | null
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
const { data: featuredBooksData } = useFetch<{ books?: FeaturedBook[] }>('/api/books/featured', {
  key: 'connect-featured-books',
  lazy: true,
})

const { fetchUsers } = useUsers()
const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.connectApi || '').replace(/\/$/, '')

// Get current authenticated user's PayloadCMS ID
const { currentUserId } = useMe()

// Category tabs for filtering
const categoryTabs = [
  { value: 'home', label: 'Home' },
  { value: 'students', label: 'Students' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' }
]

// Active category tab state
const activeCategoryTab = ref('home')
const showFeed = computed(() => activeCategoryTab.value !== 'home')
const slides = computed<HomeSlide[]>(() => {
  return Array.isArray(sliderData.value?.docs) ? sliderData.value.docs : []
})
const featuredBooks = computed<FeaturedBook[]>(() =>
  Array.isArray(featuredBooksData.value?.books) ? featuredBooksData.value.books : []
)

const isPostModalOpen = ref(false)
const selectedPost = ref<PostWithUser | null>(null)
const selectedPostUser = ref<User | null>(null)
const postModalStartInEditMode = ref(false)
const postModalStartWithCommentsOpen = ref(false)

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

function isExternalLink(link?: string | null) {
  return typeof link === 'string' && /^https?:\/\//i.test(link)
}

const handlePostUpdated = (updatedPost: PostWithUser | Post) => {
  const idx = allPostsWithUsers.value.findIndex(p => p.id === updatedPost.id)
  if (idx >= 0) {
    const existing = allPostsWithUsers.value[idx]
    const next = [...allPostsWithUsers.value]
    next[idx] = { ...existing, ...updatedPost, user: existing!.user } as PostWithUser
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

// Initialize synchronously to match server render
const allPostsWithUsers = ref<PostWithUser[]>(
  data.value?.docs?.map(post => ({
    ...post,
    user: null
  })) as PostWithUser[] || []
)

const loadingUsers = ref(false)
/** Full-page spinner only on first hydrate; polls refresh in place. */
const initialLoading = computed(() => (pending.value && !allPostsWithUsers.value.length) || loadingUsers.value)

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

function isGeneralAudience(post: PostWithUser) {
  return !post.audience ||
    post.audience.length === 0 ||
    post.audience.includes('all') ||
    post.audience.includes('general')
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

  if (category === 'home') {
    categoryFiltered = allPostsWithUsers.value.filter(isGeneralAudience)
  } else if (category === 'students') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      isGeneralAudience(post) || post.audience?.includes('students'),
    )
  } else if (category === 'staff') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      isGeneralAudience(post) ||
      post.audience?.includes('staff') ||
      post.audience?.includes('employees'),
    )
  } else if (category === 'faculty') {
    categoryFiltered = allPostsWithUsers.value.filter(post =>
      isGeneralAudience(post) ||
      post.audience?.includes('faculty') ||
      post.audience?.includes('employees'),
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

const POSTS_POLL_MS = 30_000
let postsPollInterval: ReturnType<typeof setInterval> | null = null
let reloadInFlight: Promise<void> | null = null

async function hydratePostsFromData(opts?: { showLoading?: boolean }) {
  const showLoading = opts?.showLoading === true
  if (!data.value?.docs || data.value.docs.length === 0) {
    allPostsWithUsers.value = []
    filterPosts()
    return
  }

  if (showLoading) loadingUsers.value = true
  try {
    const docs = data.value.docs
    const authorIds = [...new Set(docs.map(post => post.author.id))]
    const usersMap = await fetchUsers(authorIds)

    // Preserve in-memory reaction refresh stamps when the same post is re-fetched.
    const previousById = new Map(allPostsWithUsers.value.map(post => [post.id, post]))
    allPostsWithUsers.value = docs.map((post) => {
      const previous = previousById.get(post.id)
      return {
        ...post,
        reactionRefreshAt: previous?.reactionRefreshAt,
        user: usersMap.get(post.author.id) || previous?.user || null,
      }
    }) as PostWithUser[]

    filterPosts()
  } catch (err) {
    console.error('Error loading users from connect-users:', err)
  } finally {
    if (showLoading) loadingUsers.value = false
  }
}

async function reloadTimeline(opts?: { showLoading?: boolean }) {
  if (reloadInFlight) return reloadInFlight
  reloadInFlight = (async () => {
    await refresh()
    await hydratePostsFromData(opts)
  })().finally(() => {
    reloadInFlight = null
  })
  return reloadInFlight
}

function onTimelineVisibilityChange() {
  if (document.visibilityState === 'visible') {
    void reloadTimeline()
  }
}

function onTimelineWindowFocus() {
  void reloadTimeline()
}

// Fetch user data after component mounts (client-side only)
// This ensures we're pulling from connect-users collection, not just populated author data
onMounted(async () => {
  // useFetch caches by URL; in this SPA, client-side navigation back to the feed would
  // otherwise reuse a stale list and hide posts created elsewhere (e.g. the dashboard).
  await reloadTimeline({ showLoading: true })

  if (!import.meta.client) return

  postsPollInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      void reloadTimeline()
    }
  }, POSTS_POLL_MS)

  document.addEventListener('visibilitychange', onTimelineVisibilityChange)
  window.addEventListener('focus', onTimelineWindowFocus)
})

onUnmounted(() => {
  if (postsPollInterval) {
    clearInterval(postsPollInterval)
    postsPollInterval = null
  }
  if (import.meta.client) {
    document.removeEventListener('visibilitychange', onTimelineVisibilityChange)
    window.removeEventListener('focus', onTimelineWindowFocus)
  }
})
</script>
