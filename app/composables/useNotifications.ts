interface NotificationPost {
  id: number
  author: {
    id: number
    name: string
    avatar?: {
      url: string
    } | null
  }
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
  createdAt: string
  categories?: string[]
}

interface Notification {
  id: number
  post: NotificationPost
  read: boolean
  createdAt: string
}

export const useNotifications = () => {
  const notifications = useState<Notification[]>('notifications', () => [])
  const readNotificationIds = useState<Set<number>>('read-notifications', () => new Set())
  // Load read notifications from localStorage
  const loadReadNotifications = () => {
    if (import.meta.client) {
      const stored = localStorage.getItem('read-notifications')
      if (stored) {
        try {
          const ids = JSON.parse(stored) as number[]
          readNotificationIds.value = new Set(ids)
        } catch (e) {
          console.error('Error loading read notifications:', e)
        }
      }
    }
  }

  // Save read notifications to localStorage
  const saveReadNotifications = () => {
    if (import.meta.client) {
      localStorage.setItem('read-notifications', JSON.stringify(Array.from(readNotificationIds.value)))
    }
  }

  // Fetch priority posts and convert to notifications
  const fetchNotifications = async () => {
    // Only fetch on client side
    if (!import.meta.client) return
    
    try {
      const response = await $fetch<{ docs: NotificationPost[] }>('/api/posts', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      }).catch((error) => {
        // Silently handle 404 or other errors
        if (error.statusCode === 404 || error.status === 404) {
          console.warn('Posts API not available')
          return { docs: [] }
        }
        throw error
      })

      // Filter for priority posts
      const priorityPosts = response?.docs?.filter(post => 
        post.categories && post.categories.includes('priority')
      ) || []

      // Convert to notifications
      const newNotifications: Notification[] = priorityPosts.map(post => ({
        id: post.id,
        post,
        read: readNotificationIds.value.has(post.id),
        createdAt: post.createdAt
      }))

      // Sort by createdAt (newest first)
      newNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      notifications.value = newNotifications
    } catch (error: any) {
      // Only log if it's not a 404
      if (error?.statusCode !== 404 && error?.status !== 404) {
        console.error('Error fetching notifications:', error)
      }
    }
  }

  // Mark notification as read
  const markAsRead = (notificationId: number) => {
    readNotificationIds.value.add(notificationId)
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
    saveReadNotifications()
  }

  // Mark all as read
  const markAllAsRead = () => {
    notifications.value.forEach(notification => {
      readNotificationIds.value.add(notification.id)
      notification.read = true
    })
    saveReadNotifications()
  }

  // Get unread count
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read).length
  })

  // Initialize on client
  if (import.meta.client) {
    loadReadNotifications()
  }

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    loadReadNotifications
  }
}
