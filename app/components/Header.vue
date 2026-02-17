<template>
  <header class="border-b border-white/10 bg-gradient-to-r from-[rgba(13,94,130,1)] to-[rgba(10,69,92,1)] sticky top-0 z-50">
    <div class="container mx-auto grid grid-cols-3">
      
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center" noPrefetch>
          <img src="/connect-icon.webp" alt="Logo" class="w-[50px] h-auto" />
        </NuxtLink>
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink 
            to="/internal" 
            class="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <UIcon name="i-heroicons-building-library" class="w-5 h-5" />
          </NuxtLink>
        </nav>
      </div>
      
      <!-- Feeds -->
      <div class="flex items-center gap-1 backdrop-blur-sm rounded-lg p-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-all',
            activeTab === tab.id
              ? 'bg-white text-[rgba(13,94,130,1)] shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
      
      <div class="flex justify-center relative p-4 z-[1] rounded-t-md">
        <!-- Grid Icon Dropdown -->
        <UNavigationMenu 
          :items="gridMenuItems" 
          content-orientation="horizontal" 
          class="flex items-center [&>div>div]:min-w-[320px]"
          :ui="{ content: 'min-w-[320px]' }"
        />
        
        <!-- Notification Bell Icon Dropdown -->
        <UNavigationMenu 
          :items="notificationMenuItems" 
          content-orientation="vertical" 
          class="flex items-center [&>div>div]:min-w-[320px]"
          :ui="{ content: 'min-w-[320px]' }"
        />

        <!-- Post Modal -->
        <PostModal 
          :post="selectedPost" 
          :user="selectedPostUser"
          :open="isPostModalOpen"
          @update:open="isPostModalOpen = $event"
        />
        
        <!-- Account Avatar Icon Dropdown -->
        <UNavigationMenu :items="accountMenuItems" class="flex items-center [&>div>div]:min-w-[200px]" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import PostModal from './PostModal.vue'

const { activeTab } = useFeedFilter()
const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()
const { fetchUser } = useUsers()

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
        label: 'Jobs',
        icon: 'i-heroicons-briefcase',
        to: '/jobs'
      },
      {
        label: 'Canvas',
        icon: 'i-heroicons-academic-cap',
        to: 'https://asburyseminary.instructure.com/',
        target: '_blank'
      },
      {
        label: 'Class Search',
        icon: 'i-heroicons-magnifying-glass',
        to: '/classes'
      },
      {
        label: 'B.L. Fisher Library',
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
      {
        label: 'Forums',
        icon: 'i-heroicons-chat-bubble-left-right',
        to: '/forums/'
      },
      {
        label: 'ThriveU',
        icon: 'i-heroicons-arrow-trending-up',
        to: 'https://thriveu.asburyseminary.edu',
        target: '_blank'
      },
      {
        label: 'Employee Directory',
        icon: 'i-heroicons-users',
        to: '/employee-directory'
      }
    ]
  }
])

// Notification menu items - reactive based on notifications
const notificationMenuItems = computed<NavigationMenuItem[]>(() => [
  {
    label: '',
    icon: 'i-heroicons-bell',
    badge: unreadCount.value > 0 ? (unreadCount.value > 99 ? '99+' : unreadCount.value.toString()) : undefined,
    children: [
      ...(notifications.value.length === 0 
        ? [{
            type: 'label',
            label: 'No new notifications',
            class: 'py-4 text-center text-sm text-gray-500'
          }]
        : notifications.value.map(notification => ({
            label: `${notification.post.author.name} • ${formatNotificationTime(notification.createdAt)}`,
            description: getPostPreview(notification.post.content).substring(0, 80) + (getPostPreview(notification.post.content).length > 80 ? '...' : ''),
            badge: !notification.read ? 'New' : undefined,
            class: notification.read ? '' : 'bg-blue-50',
            onClick: () => openPostModal(notification.post.id)
          }))
      )
    ]
  }
])

// Account menu items
const accountMenuItems = ref<NavigationMenuItem[]>([
  {
    label: '',
    icon: 'i-heroicons-user',
    children: [
      {
        label: 'Profile'
      },
      {
        label: 'Account Settings'
      },
      {
        type: 'label',
        label: ''
      },
      {
        label: 'Help & Support'
      },
      {
        type: 'label',
        label: ''
      },
      {
        label: 'Sign Out'
      }
    ]
  }
])

// Open post in modal
const openPostModal = async (postId: number) => {
  try {
    // Mark notification as read
    markAsRead(postId)
    
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

const tabs = [
  { id: 'latest', label: 'Latest' },
  { id: 'community', label: 'Community' }
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