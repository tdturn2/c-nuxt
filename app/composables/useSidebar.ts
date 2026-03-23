const STORAGE_KEY_WIDTH = 'connect-sidebar-width'
const STORAGE_KEY_COLLAPSED = 'connect-sidebar-collapsed'
const DEFAULT_WIDTH = 320
const MIN_WIDTH = 200
const MAX_WIDTH = 480
const COLLAPSED_WIDTH = 48

export function useSidebar() {
  const width = useState('sidebar-width', () => DEFAULT_WIDTH)
  const collapsed = useState('sidebar-collapsed', () => false)

  if (import.meta.client) {
    try {
      const storedW = localStorage.getItem(STORAGE_KEY_WIDTH)
      if (storedW != null) {
        const n = Number(storedW)
        if (!Number.isNaN(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) width.value = n
      }
      const storedC = localStorage.getItem(STORAGE_KEY_COLLAPSED)
      if (storedC === 'true') collapsed.value = true
    } catch (_) {}
  }

  watch(width, (w) => {
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY_WIDTH, String(w))
      } catch (_) {}
    }
  }, { flush: 'post' })

  watch(collapsed, (c) => {
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, c ? 'true' : 'false')
      } catch (_) {}
    }
  }, { flush: 'post' })

  const asideWidthPx = computed(() =>
    collapsed.value ? COLLAPSED_WIDTH : width.value
  )

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function startResize(e: MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = width.value

    function onMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX
      let next = startW + delta
      next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, next))
      width.value = next
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return {
    width,
    collapsed,
    asideWidthPx,
    toggleCollapsed,
    startResize,
    MIN_WIDTH,
    MAX_WIDTH,
    COLLAPSED_WIDTH,
  }
}
