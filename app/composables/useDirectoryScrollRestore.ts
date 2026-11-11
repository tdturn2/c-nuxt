import { directoryScrollStorageKey } from '@shared/directoryListQuery'
import { isReturningToDirectory } from './useDirectoryReturnState'

type ScrollPlace = {
  windowY: number
  mainY: number
  ancestors: number[]
}

const memory = new Map<string, ScrollPlace>()

function readPlace(key: string): ScrollPlace | null {
  const cached = memory.get(key)
  if (cached) return cached
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    const place = placeFromUnknown(parsed)
    if (!place) return null
    memory.set(key, place)
    return place
  } catch {
    return null
  }
}

function writePlace(key: string, place: ScrollPlace) {
  memory.set(key, place)
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(key, JSON.stringify(place))
  } catch {
    // Ignore private-mode and quota failures. The in-memory copy still covers this tab.
  }
  try {
    const current = history.state
    if (!current || typeof current !== 'object') return
    history.replaceState({ ...current, connectDirectoryScroll: place }, '')
  } catch {
    // Keep the session copy if the history entry cannot be updated.
  }
}

function placeFromUnknown(value: unknown): ScrollPlace | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<ScrollPlace>
  if (typeof parsed.windowY !== 'number' || typeof parsed.mainY !== 'number') return null
  const ancestors = Array.isArray(parsed.ancestors)
    ? parsed.ancestors.filter((n): n is number => typeof n === 'number')
    : []
  return { windowY: parsed.windowY, mainY: parsed.mainY, ancestors }
}

/**
 * Remember where the directory list was scrolled when opening a person, and put
 * that scroll back when the directory is shown again. The window and the page's
 * own overflow `main` are both restored, after the list has rendered, so a short
 * loading state cannot clamp the position to the top.
 */
export function useDirectoryScrollRestore(
  root: Ref<HTMLElement | null>,
  isReady?: () => boolean,
) {
  const route = useRoute()

  function storageKey() {
    return directoryScrollStorageKey(route.path)
  }

  function mainEl(): HTMLElement | null {
    const main = root.value?.querySelector(':scope > main')
    return main instanceof HTMLElement ? main : null
  }

  function ancestorEls(): HTMLElement[] {
    const list: HTMLElement[] = []
    let el = root.value?.parentElement ?? null
    while (el && el !== document.body && el !== document.documentElement) {
      list.push(el)
      el = el.parentElement
    }
    return list
  }

  function hasOffset(place: ScrollPlace) {
    return place.windowY > 0 || place.mainY > 0 || place.ancestors.some((top) => top > 0)
  }

  function readDom(): ScrollPlace {
    return {
      windowY: import.meta.client ? window.scrollY || document.documentElement.scrollTop || 0 : 0,
      mainY: mainEl()?.scrollTop ?? 0,
      ancestors: ancestorEls().map((el) => el.scrollTop),
    }
  }

  function saveNow() {
    if (!import.meta.client) return
    writePlace(storageKey(), readDom())
  }

  function saveUnlessJumpToTop() {
    const place = readDom()
    if (!hasOffset(place)) return
    writePlace(storageKey(), place)
  }

  function isProfileLink(target: EventTarget | null) {
    if (!(target instanceof Element)) return false
    const link = target.closest('a')
    if (!link) return false
    const href = link.getAttribute('href')
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return false
    try {
      return new URL(href, window.location.origin).pathname.startsWith('/user/')
    } catch {
      return href.startsWith('/user/')
    }
  }

  function onPointerDown(event: Event) {
    if (!isProfileLink(event.target)) return
    saveNow()
  }

  let userMoved = false
  let frame = 0

  function applyPlace(place: ScrollPlace) {
    ancestorEls().forEach((el, index) => {
      const top = place.ancestors[index] ?? 0
      if (top > 0) el.scrollTop = top
    })
    const main = mainEl()
    if (main && place.mainY > 0) main.scrollTop = place.mainY
    if (place.windowY > 0) window.scrollTo(0, place.windowY)
  }

  function beginRestore() {
    if (!import.meta.client) return
    const fromHistory = placeFromUnknown(history.state?.connectDirectoryScroll)
    const place = fromHistory ?? readPlace(storageKey())
    if (!place || !hasOffset(place)) return
    if (!fromHistory && !isReturningToDirectory(route.path)) return
    userMoved = false
    let waited = 0
    let framesAfterReady = 0
    const tick = () => {
      if (userMoved) return
      const ready = !isReady || isReady()
      if (!ready) {
        waited += 1
        if (waited < 300) frame = requestAnimationFrame(tick)
        return
      }
      applyPlace(place)
      framesAfterReady += 1
      if (framesAfterReady < 40) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }

  function onUserIntent() {
    userMoved = true
  }

  onMounted(() => {
    root.value?.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('wheel', onUserIntent, { passive: true })
    window.addEventListener('touchmove', onUserIntent, { passive: true })
    beginRestore()
  })

  onBeforeUnmount(() => {
    root.value?.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('wheel', onUserIntent)
    window.removeEventListener('touchmove', onUserIntent)
    if (frame) cancelAnimationFrame(frame)
  })

  onBeforeRouteLeave(() => {
    saveUnlessJumpToTop()
  })
}
