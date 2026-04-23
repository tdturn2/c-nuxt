<template>
  <header class="border-b border-white/10 bg-gradient-to-r from-[rgba(13,94,130,1)] to-[rgba(10,69,92,1)] sticky top-0 z-50">
    <div :class="headerContainerClass">
      
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center" noPrefetch>
          <img src="/connect-icon.webp" alt="Logo" class="w-[50px] h-auto py-1" />
        </NuxtLink>
        <nav v-if="isSignedIn" class="hidden md:flex items-center gap-6">
          <NuxtLink 
            to="/internal" 
            class="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <!-- <UIcon name="i-heroicons-building-library" class="w-5 h-5" /> -->
             Docs
          </NuxtLink>

        </nav>
      </div>
      
      <!-- Center nav: Home, Marketplace, Jobs -->
      <nav v-if="isSignedIn" class="flex items-center justify-center gap-2">
        <NuxtLink
          v-for="item in centerNavItems"
          :key="item.to"
          :to="item.to"
          :aria-label="item.label"
          :class="[
            'p-1.5 rounded-md transition-colors',
            isActive(item.to)
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/20'
          ]"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
        </NuxtLink>
      </nav>
      
      <div v-if="isSignedIn" class="flex items-center justify-end gap-1 relative z-[1] rounded-t-md">
        <!-- Grid Icon Dropdown -->
        <UNavigationMenu 
          :items="gridMenuItems" 
          content-orientation="horizontal" 
          class="flex items-center [&>div>div]:min-w-[320px]"
          :ui="{ content: 'min-w-[320px]' }"
        />
        
        <!-- Notification Bell Popover -->
        <UPopover :popper="{ placement: 'bottom-end' }">
          <button
            type="button"
            class="relative mt-0.5 mr-2 w-9 h-9 flex items-center justify-center rounded-md text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Notifications"
          >
            <UIcon name="i-heroicons-bell" class="w-5 h-5" />
            <span
              v-if="unreadCount > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>

          <template #content>
            <div class="w-[360px] p-2">
              <div class="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
                <button
                  type="button"
                  :class="[
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    isActiveTab('updates') ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  ]"
                  @click="setActiveTab('updates')"
                >
                  Updates
                  <span v-if="updatesUnreadCount > 0" class="ml-1 text-xs">({{ updatesUnreadCount }})</span>
                </button>
                <button
                  type="button"
                  :class="[
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    isActiveTab('mentions') ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                  ]"
                  @click="setActiveTab('mentions')"
                >
                  Mentions
                  <span v-if="mentionsUnreadCount > 0" class="ml-1 text-xs">({{ mentionsUnreadCount }})</span>
                </button>
              </div>

              <div v-if="tabNotifications.length === 0" class="py-6 text-center text-sm text-gray-500">
                {{ isActiveTab('updates') ? 'No priority updates' : 'No mentions yet' }}
              </div>

              <div v-else class="max-h-80 overflow-y-auto space-y-1">
                <button
                  v-for="notification in tabNotifications"
                  :key="notification.id"
                  type="button"
                  class="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  :class="notification.read ? '' : 'bg-blue-50'"
                  @click="openPostModal(notification.post.id, notification.id)"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ notification.post.author.name }}
                    </p>
                    <span class="text-xs text-gray-500 shrink-0">{{ formatNotificationTime(notification.createdAt) }}</span>
                  </div>
                  <p class="text-xs text-gray-600 mt-0.5">
                    {{ getPostPreview(notification.post.content).substring(0, 100) }}
                  </p>
                </button>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- Post Modal -->
        <PostModal 
          :post="selectedPost" 
          :user="selectedPostUser"
          :open="isPostModalOpen"
          @update:open="isPostModalOpen = $event"
          @post-updated="selectedPost = $event"
          @post-deleted="closePostModal"
        />
        
        <!-- Account dropdown (avatar trigger: Connect avatar or session image) -->
        <UDropdownMenu :items="accountDropdownItems" :popper="{ placement: 'bottom-end' }">
          <button
            type="button"
            class="flex items-center justify-center rounded-full ring-2 ring-white/50 hover:ring-white focus:outline-none focus:ring-2 focus:ring-white overflow-hidden w-9 h-9 shrink-0"
            aria-label="Account menu"
          >
            <img
              v-if="userAvatarUrl"
              :src="userAvatarUrl"
              :alt="session?.user?.name ?? 'Account'"
              class="w-full h-full object-cover"
            />
            <span
              v-else
              class="flex items-center justify-center w-full h-full bg-white/20 text-white font-semibold text-sm"
            >
              {{ (meUser?.name ?? session?.user?.name)?.charAt(0)?.toUpperCase() ?? '?' }}
            </span>
          </button>
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { DropdownMenuItem } from '@nuxt/ui'
import PostModal from './PostModal.vue'

const route = useRoute()
const { activeTab } = useFeedFilter()

const centerNavItems = [
  { to: '/', icon: 'i-heroicons-home', label: 'Home' },
  { to: '/marketplace', icon: 'i-heroicons-shopping-bag', label: 'Marketplace' },
  { to: '/jobs', icon: 'i-heroicons-briefcase', label: 'Jobs' },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
const {
  tabNotifications,
  unreadCount,
  updatesUnreadCount,
  mentionsUnreadCount,
  setActiveTab,
  isActiveTab,
  fetchNotifications,
  markAsRead,
  markPostAsRead,
} = useNotifications()
const { fetchUser } = useUsers()
const { data: session, getCsrfToken } = useAuth()
const { user: meUser } = useMe()
const isSignedIn = computed(() => Boolean(session.value?.user?.email))
const headerContainerClass = computed(() =>
  isSignedIn.value
    ? 'container mx-auto grid grid-cols-3 items-center min-h-[60px]'
    : 'container mx-auto flex items-center min-h-[60px]'
)

const handleSignOut = async () => {
  try {
    // Get CSRF token the same way as on the signin page
    let csrfToken = await getCsrfToken()
    if (!csrfToken) {
      const res = await fetch('/api/auth/csrf')
      if (res.ok) {
        const data = await res.json()
        csrfToken = data?.csrfToken
      }
    }

    if (!csrfToken) {
      console.error('Missing CSRF token for sign out, falling back to direct redirect.')
      // Last-resort fallback: let the backend handle it
      if (import.meta.client) {
        window.location.href = '/api/auth/signout?callbackUrl=/signin'
      }
      return
    }

    // Call Auth.js signout endpoint directly
    const res = await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrfToken,
        callbackUrl: '/signin',
        json: 'true'
      } as any)
    })

    if (!res.ok) {
      throw new Error(`Sign out failed with status ${res.status}`)
    }

    // Hard redirect to force full app/auth state reset.
    if (import.meta.client) {
      window.location.href = '/signin'
    }
  } catch (err) {
    console.error('Error during sign out', err)
    if (import.meta.client) {
      // Last-resort fallback that still reaches auth backend even if JS state is stale.
      window.location.href = '/api/auth/signout?callbackUrl=/signin'
    }
  }
}

// Avatar: prefer Connect profile avatar (Payload), fallback to session (OAuth) image
const userAvatarUrl = computed(() => {
  const fromMe = meUser.value?.avatar?.url
  if (fromMe) return fromMe
  return session.value?.user?.image ?? null
})

const profileUsername = computed(() => {
  const email = session.value?.user?.email || ''
  if (!email) return ''
  return email.replace('@asburyseminary.edu', '').toLowerCase()
})

// Post modal state
const selectedPostId = ref<number | null>(null)
const selectedPost = ref<any>(null)
const selectedPostUser = ref<any>(null)
const isPostModalOpen = ref(false)

// Grid menu items
const gridMenuItems = ref<NavigationMenuItem[]>([
  {
    label: '',
    icon: 'i-heroicons-squares-2x2',
    children: [
      {
        label: 'Email',
        icon: 'i-heroicons-envelope',
        to: 'https://mail.google.com/a/asburyseminary.edu',
        target: '_blank'
      },
      {
        label: 'Calendar',
        icon: 'i-heroicons-calendar',
        to: 'https://calendar.google.com/calendar/',
        target: '_blank'
      },
      {
        label: 'Canvas',
        icon: 'i-heroicons-academic-cap',
        to: 'https://asburyseminary.instructure.com/',
        target: '_blank'
      },
      {
        label: 'Library',
        icon: 'i-heroicons-book-open',
        to: 'http://guides.asburyseminary.edu/home',
        target: '_blank'
      },
      {
        label: 'Paycom',
        icon: 'i-heroicons-currency-dollar',
        to: 'https://paycomonline.com/',
        target: '_blank'
      },
      {
        label: 'EARS',
        icon: 'i-heroicons-bell-alert',
        to: '/departments/library/emergency-alert-response-system-ears/'
      },
      {
        label: 'Portal',
        icon: 'i-heroicons-squares-2x2',
        to: 'https://portal.asburyseminary.edu',
        target: '_blank'
      },
    ]
  }
])

// Directory menu (Student + Employee) - vertical dropdown with people icon
const directoryMenuItems = ref<NavigationMenuItem[]>([
  {
    label: '',
    icon: 'i-heroicons-user-group',
    children: [
      { label: 'Student Directory', to: '/student-directory' },
      { label: 'Faculty Directory', to: '/faculty-directory' },
      { label: 'Employee Directory', to: '/employee-directory' }
    ]
  }
])

// Media menu - vertical dropdown
const mediaMenuItems = ref<NavigationMenuItem[]>([
  {
    label: '',
    icon: 'i-heroicons-film',
    children: [
      { label: 'WesWorld', to: '/media/wesworld' },
      { label: 'It\'s Elementary', to: '/media/elementary' },
      { label: 'Chapel', to: '/media/chapel' }
    ]
  }
])

// Account dropdown items (avatar trigger, user label + profile links)
const accountDropdownItems = computed<DropdownMenuItem[][]>(() => {
  const labelAvatar = userAvatarUrl.value ? { src: userAvatarUrl.value } : undefined
  return [
  [
    {
      label: (meUser.value?.name ?? session.value?.user?.name) ?? 'Account',
      avatar: labelAvatar,
      type: 'label'
    }
  ],
  [
    { label: 'Update Profile', icon: 'i-heroicons-user-circle', to: '/profile/avatar' },
    { label: 'Alumni Profile', icon: 'i-heroicons-academic-cap', to: '/profile/alumni' },
    { label: 'Employee Profile', icon: 'i-heroicons-identification', to: '/profile/employee' },
    { label: 'Faculty Profile', icon: 'i-heroicons-academic-cap', to: '/profile/faculty' },
    { label: 'Faculty Publications', icon: 'i-heroicons-book-open', to: '/profile/faculty-pub' },
    { label: 'Student Profile', icon: 'i-heroicons-user', to: '/profile/student' }
  ],
  [
    {
      label: 'Sign Out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: handleSignOut
    }
  ]
] })

const closePostModal = () => {
  isPostModalOpen.value = false
  selectedPost.value = null
  selectedPostUser.value = null
}

// Open post in modal
const openPostModal = async (postId: number, notificationId?: string) => {
  try {
    // Mark notification as read
    if (notificationId) {
      markAsRead(notificationId)
    } else {
      markPostAsRead(postId)
    }
    
    // Fetch full post data
    const post: any = await $fetch(`/api/posts/${postId}`, {
      credentials: 'include'
    })
    
    selectedPost.value = post
    selectedPostId.value = postId
    
    // Fetch user data for the post
    if (post?.author?.id) {
      const user = await fetchUser(post.author.id)
      selectedPostUser.value = user
    }
    
    isPostModalOpen.value = true
  } catch (error) {
    console.error('Error opening post:', error)
  }
}

const tabs: Array<{ id: string; label: string }> = [
  // { id: 'latest', label: 'Latest' }
  // { id: 'community', label: 'Community' }
]

// Extract text preview from Lexical content
const getPostPreview = (content: any): string => {
  if (!content?.root?.children) return ''
  
  const extractText = (children: any[]): string => {
    return children
      .map(child => {
        if (child.type === 'text' && child.text) {
          return child.text
        }
        if (child.children) {
          return extractText(child.children)
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')
  }
  
  const text = extractText(content.root.children)
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

// Format notification time
const formatNotificationTime = (dateString: string): string => {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

// Fetch notifications on mount and set up polling (client-side only)
let notificationInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  if (import.meta.client) {
    await fetchNotifications()
    
    // Refresh notifications every 30 seconds
    notificationInterval = setInterval(() => {
      fetchNotifications()
    }, 30000)
  }
})

onUnmounted(() => {
  if (notificationInterval) {
    clearInterval(notificationInterval)
  }
})
</script>

<style scoped>
/* :deep(.childLinkWrapper) {
   max-width: 200px !important;
   display: block !important;
} */
</style>