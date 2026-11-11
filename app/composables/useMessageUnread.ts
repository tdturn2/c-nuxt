export function useMessageUnread() {
  const count = useState('connect-message-unread-count', () => 0)
  const timer = useState<number | null>('connect-message-unread-timer', () => null)

  async function refresh() {
    if (!import.meta.client || document.visibilityState === 'hidden') return
    try {
      const data = await $fetch<{ count?: number }>('/api/messages/unread-count')
      count.value = Number(data?.count) || 0
    } catch {
      // Signed-out and transient failures keep the last count.
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') void refresh()
  }

  function start() {
    if (!import.meta.client || timer.value != null) return
    void refresh()
    timer.value = window.setInterval(() => {
      void refresh()
    }, 60_000)
    document.addEventListener('visibilitychange', onVisible)
  }

  function stop() {
    if (!import.meta.client) return
    if (timer.value != null) {
      window.clearInterval(timer.value)
      timer.value = null
    }
    document.removeEventListener('visibilitychange', onVisible)
  }

  return { count, refresh, start, stop }
}
