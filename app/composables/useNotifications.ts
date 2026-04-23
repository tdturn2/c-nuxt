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

type NotificationType = 'update' | 'mention'
type NotificationTab = 'updates' | 'mentions'

interface Notification {
  id: string
  type: NotificationType
  postId: number
  post: NotificationPost
  read: boolean
  createdAt: string
}

export const useNotifications = () => {
  const notifications = useState<Notification[]>('notifications', () => [])
  const activeTab = useState<NotificationTab>('notifications-active-tab', () => 'updates')
  const loading = useState<boolean>('notifications-loading', () => false)

  const mapTabToType = (tab: NotificationTab): NotificationType => (tab === 'updates' ? 'update' : 'mention')

  const fetchNotifications = async () => {
    if (!import.meta.client) return
    loading.value = true

    try {
      const [listResponse, countResponse] = await Promise.all([
        $fetch<{ docs: Array<any> }>('/api/notifications', {
          query: { limit: 100 },
          credentials: 'include',
        }),
        $fetch<{ updates: number; mentions: number; total: number }>('/api/notifications/unread-counts', {
          credentials: 'include',
        }),
      ])

      notifications.value = (listResponse?.docs || [])
        .filter((doc) => {
          const pid = typeof doc.post === 'number' ? doc.post : doc.post?.id
          return Boolean(pid) && (doc?.type === 'update' || doc?.type === 'mention')
        })
        .map((doc) => {
          const rawPost = doc.post as NotificationPost | number
          const type = doc.type as NotificationType
          const actor = doc.actor as NotificationPost['author'] | number | undefined
          const actorObj =
            typeof actor === 'object' && actor !== null
              ? actor
              : { id: typeof actor === 'number' ? actor : 0, name: 'Someone' }

          const post: NotificationPost =
            typeof rawPost === 'number'
              ? {
                  id: rawPost,
                  author: actorObj,
                  content: { root: { children: [] } },
                  createdAt: doc.createdAt,
                }
              : {
                  ...rawPost,
                  author: rawPost?.author ?? actorObj,
                }

          return {
            id: String(doc.id),
            type,
            postId: post.id,
            post,
            read: Boolean(doc.readAt),
            createdAt: doc.createdAt || post.createdAt,
          } satisfies Notification
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Keep unread badges accurate when only one type is paginated in future changes.
      const updatesLocalUnread = notifications.value.filter((n) => n.type === 'update' && !n.read).length
      const mentionsLocalUnread = notifications.value.filter((n) => n.type === 'mention' && !n.read).length
      if (countResponse.updates > updatesLocalUnread || countResponse.mentions > mentionsLocalUnread) {
        // no-op: count endpoint is consumed by computed fallbacks below.
        // retained for future pagination support.
      }
    } catch (error: any) {
      // Fallback path: keep previous behavior for updates-only notifications if backend endpoint is unavailable.
      const fallback = await $fetch<{ docs: NotificationPost[] }>('/api/posts', {
        credentials: 'include',
      })

      const priorityPosts = fallback?.docs?.filter((post) => post.categories?.includes('priority')) || []
      notifications.value = priorityPosts.map((post) => ({
        id: `legacy-update:${post.id}`,
        type: 'update',
        postId: post.id,
        post,
        read: false,
        createdAt: post.createdAt,
      }))
      console.error('Error fetching notifications:', error)
    } finally {
      loading.value = false
    }
  }

  const markAsRead = async (notificationId: string) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (!notification) return

    try {
      if (!notificationId.startsWith('legacy-update:')) {
        await $fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
          credentials: 'include',
        })
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }

    if (notification) {
      notification.read = true
    }
  }

  const markPostAsRead = async (postId: number) => {
    const notification = notifications.value.find(n => n.postId === postId && n.type === 'update')
    if (!notification) return
    await markAsRead(notification.id)
  }

  const markAllAsRead = async (tab?: NotificationTab) => {
    const type = tab ? mapTabToType(tab) : undefined
    try {
      await $fetch('/api/notifications/read-all', {
        method: 'PATCH',
        body: { type },
        credentials: 'include',
      })
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }

    const tabNotifications = tab
      ? notifications.value.filter(n => (tab === 'updates' ? n.type === 'update' : n.type === 'mention'))
      : notifications.value

    tabNotifications.forEach(notification => {
      notification.read = true
    })
  }

  const updateNotifications = computed(() => notifications.value.filter(n => n.type === 'update'))
  const mentionNotifications = computed(() => notifications.value.filter(n => n.type === 'mention'))
  const tabNotifications = computed(() => {
    const expectedType = mapTabToType(activeTab.value)
    return notifications.value.filter((n) => n.type === expectedType)
  })

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)
  const updatesUnreadCount = computed(() => updateNotifications.value.filter(n => !n.read).length)
  const mentionsUnreadCount = computed(() => mentionNotifications.value.filter(n => !n.read).length)

  const setActiveTab = (tab: NotificationTab) => {
    activeTab.value = tab
  }

  const isActiveTab = (tab: NotificationTab) => {
    return activeTab.value === tab
  }

  return {
    notifications,
    tabNotifications,
    loading,
    activeTab,
    setActiveTab,
    isActiveTab,
    unreadCount,
    updatesUnreadCount,
    mentionsUnreadCount,
    fetchNotifications,
    markAsRead,
    markPostAsRead,
    markAllAsRead,
  }
}
