import type { DirectoryListState } from '@shared/directoryListQuery'

const RETURN_PREFIX = 'connect-directory-return:'

export function isReturningToDirectory(path: string) {
  const returning = useState<string>('connect-directory-return', () => '')
  return returning.value === path
}

function storageKey(path: string) {
  return `${RETURN_PREFIX}${path}`
}

export function readDirectoryReturn<T>(path: string, isState: (value: unknown) => value is T): T | null {
  if (!import.meta.client || !isReturningToDirectory(path)) return null
  try {
    const raw = sessionStorage.getItem(storageKey(path))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isState(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Keep the latest list filters so Back from a profile can restore them. */
export function keepDirectoryReturn<T>(path: string, read: () => T) {
  onBeforeRouteLeave(() => {
    if (!import.meta.client) return
    try {
      sessionStorage.setItem(storageKey(path), JSON.stringify(read()))
    } catch {
      // Ignore private-mode and quota failures.
    }
  })
}

export function isDirectoryListState(value: unknown): value is DirectoryListState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<DirectoryListState>
  return typeof state.page === 'number'
    && Number.isFinite(state.page)
    && state.page >= 1
    && typeof state.q === 'string'
    && typeof state.country === 'string'
    && typeof state.region === 'string'
    && typeof state.city === 'string'
}
