<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
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
      v-if="slides.length"
      class="relative z-0 mb-12 w-full"
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
            class="h-auto w-full"
          >
        </NuxtLink>
        <div v-else class="block bg-gray-50">
          <img
            :src="getImageUrl(item.image)"
            :alt="item.title || 'Connect highlight'"
            class="h-auto w-full"
          >
        </div>
      </UCarousel>
    </section>

    <div class="relative z-10">
      <div v-if="initialLoading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
      <div v-else-if="postsError" class="text-center py-8 text-red-600">
        Error loading timeline: {{ postsError }}
      </div>
      <div v-else-if="displayedPosts.length > 0" class="space-y-0">
        <Post
          v-for="post in displayedPosts"
          :key="post.id"
          :post="post"
          :user="post.user"
          :current-user-id="currentUserId"
          :current-user="meUser"
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
      <div v-else class="py-8 text-center">
        <p class="text-sm text-gray-500">No posts yet</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { hasFacultyHubAccess } from '@shared/facultyHubAccess'
import { hasStaffHubAccess } from '@shared/staffHubAccess'
import { normalizeConnectUserRoles } from '@shared/connectUserAccess'
import { authorIdFromPost, partitionTimelinePosts } from '~/utils/timelineFeed'

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

const { data, pending, error: postsError, refresh } = await useFetch<TimelineResponse>(apiUrl)
const { data: sliderData } = await useFetch<{ docs?: HomeSlide[] }>('/api/home-slider', {
  key: 'connect-home-slider',
})

const { fetchUsers } = useUsers()
const config = useRuntimeConfig()
const payloadBaseUrl = String(config.public.connectApi || '').replace(/\/$/, '')

// Get current authenticated user's PayloadCMS ID
const { currentUserId, user: meUser } = useMe()
const { connectUserDoc, canAccessFacultyHub, canAccessStaffHub } = useAudienceHubAccess()

const viewerUser = computed(() => connectUserDoc.value || meUser.value)
const viewerRoles = computed(() => normalizeConnectUserRoles(viewerUser.value))
const canSeeAllAudiencePosts = computed(() => viewerRoles.value.includes('admin'))
const canSeeStudentPosts = computed(() => true)
const canSeeFacultyPosts = computed(() =>
  canSeeAllAudiencePosts.value || canAccessFacultyHub.value || hasFacultyHubAccess(viewerUser.value),
)
const canSeeStaffPosts = computed(() =>
  canSeeAllAudiencePosts.value || canAccessStaffHub.value || hasStaffHubAccess(viewerUser.value),
)
const canSeeEmployeePosts = computed(() => canSeeFacultyPosts.value || canSeeStaffPosts.value)

const slides = computed<HomeSlide[]>(() => {
  return Array.isArray(sliderData.value?.docs) ? sliderData.value.docs : []
})

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

/** Full-page spinner only until the first posts payload arrives. */
const initialLoading = computed(() => pending.value && !allPostsWithUsers.value.length)

const displayedPosts = ref<PostWithUser[]>([])

const olderPostsVisibleCount = ref(OLDER_BATCH_SIZE)
const hiddenOlderCount = ref(0)

const hasMoreOlderPosts = computed(() => hiddenOlderCount.value > 0)

const showOlderPostsLabel = computed(() => {
  const count = Math.min(hiddenOlderCount.value, OLDER_BATCH_SIZE)
  return count === 1 ? 'Show 1 older post' : `Show ${count} older posts`
})

function showOlderPosts() {
  olderPostsVisibleCount.value += OLDER_BATCH_SIZE
  filterPosts()
}

const filterPosts = () => {
  const feed = partitionTimelinePosts(allPostsWithUsers.value, {
    canSeeAll: canSeeAllAudiencePosts.value,
    canSeeStudents: canSeeStudentPosts.value,
    canSeeFaculty: canSeeFacultyPosts.value,
    canSeeStaff: canSeeStaffPosts.value,
    canSeeEmployees: canSeeEmployeePosts.value,
  }, {
    olderVisibleCount: olderPostsVisibleCount.value,
    recentMs: RECENT_MS,
  })
  displayedPosts.value = feed.displayed
  hiddenOlderCount.value = feed.hiddenOlderCount
}

filterPosts()

watch(
  [canSeeStudentPosts, canSeeFacultyPosts, canSeeStaffPosts, canSeeEmployeePosts, meUser, connectUserDoc],
  () => {
    filterPosts()
  },
)

const POSTS_POLL_MS = 30_000
let postsPollInterval: ReturnType<typeof setInterval> | null = null
let reloadInFlight: Promise<void> | null = null

async function hydratePostsFromData() {
  if (!data.value?.docs || data.value.docs.length === 0) {
    allPostsWithUsers.value = []
    filterPosts()
    return
  }

  try {
    const docs = data.value.docs
    const authorIds = [...new Set(docs.map((post) => authorIdFromPost(post.author)).filter((id): id is number => id != null))]
    const usersMap = await fetchUsers(authorIds)

    const previousById = new Map(allPostsWithUsers.value.map(post => [post.id, post]))
    allPostsWithUsers.value = docs.map((post) => {
      const previous = previousById.get(post.id)
      const authorId = authorIdFromPost(post.author)
      return {
        ...post,
        reactionRefreshAt: previous?.reactionRefreshAt,
        user: (authorId != null ? usersMap.get(authorId) : undefined) || previous?.user || null,
      }
    }) as PostWithUser[]

    filterPosts()
  } catch (err) {
    console.error('Error loading users from connect-users:', err)
    filterPosts()
  }
}

async function reloadTimeline() {
  if (reloadInFlight) return reloadInFlight
  reloadInFlight = (async () => {
    await refresh()
    await hydratePostsFromData()
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
  await reloadTimeline()

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
