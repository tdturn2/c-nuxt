import {
  TOAST_GRACE_MINUTES,
  isToastDueNow,
  toastScheduleKey,
  type ConnectToast,
} from '@shared/connectToasts'

const SHOWN_KEY = 'connect-toasts-shown-v1'
const POLL_MS = 15_000

function readShown(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SHOWN_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function markShown(key: string) {
  const shown = readShown()
  shown.add(key)
  const trimmed = [...shown].slice(-40)
  sessionStorage.setItem(SHOWN_KEY, JSON.stringify(trimmed))
}

function normalizeToast(doc: any): ConnectToast {
  return {
    id: Number(doc.id),
    title: doc.title ?? null,
    message: String(doc.message || ''),
    href: doc.href ?? null,
    hrefLabel: doc.hrefLabel ?? null,
    daysOfWeek: Array.isArray(doc.daysOfWeek) ? doc.daysOfWeek.map(Number) : [],
    sendTime: String(doc.sendTime || ''),
    timezone: String(doc.timezone || 'America/New_York'),
    enabled: doc.enabled !== false,
    sortOrder: doc.sortOrder == null ? null : Number(doc.sortOrder),
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const route = useRoute()
  const toast = useToast()
  let toasts: ConnectToast[] = []
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let ticking = false

  async function loadActive() {
    try {
      const res: any = await $fetch('/api/toasts/active')
      toasts = (Array.isArray(res?.docs) ? res.docs : []).map(normalizeToast)
    } catch {
      // Silent — toasts are non-critical.
    }
  }

  function showToast(item: ConnectToast) {
    toast.add({
      id: `scheduled-${item.id}-${item.sendTime}`,
      title: item.title || 'Announcement',
      description: item.message,
      icon: 'i-lucide-church',
      color: 'primary',
      duration: 15000,
      actions: item.href
        ? [{
            label: item.hrefLabel || 'Open',
            color: 'neutral',
            variant: 'outline',
            onClick: () => {
              window.open(item.href!, '_blank', 'noopener,noreferrer')
            },
          }]
        : undefined,
    })
  }

  async function tick(opts: { reload?: boolean } = {}) {
    if (ticking) return
    if (route.path === '/signin') return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

    ticking = true
    try {
      // Always refresh schedules so dashboard edits (e.g. "send in 1 minute") apply
      // without a hard page refresh.
      if (opts.reload !== false) await loadActive()

      const shown = readShown()
      const now = new Date()
      for (const item of toasts) {
        const { due, dateKey } = isToastDueNow(item, now, TOAST_GRACE_MINUTES)
        if (!due || !dateKey) continue
        const key = toastScheduleKey(item, dateKey)
        if (shown.has(key)) continue
        markShown(key)
        showToast(item)
      }
    } finally {
      ticking = false
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') void tick()
  }

  void tick()
  pollTimer = setInterval(() => {
    void tick()
  }, POLL_MS)

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', () => {
    void tick()
  })

  nuxtApp.hook('page:finish', () => {
    void tick({ reload: false })
  })

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (pollTimer) clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', onVisible)
    })
  }
})
