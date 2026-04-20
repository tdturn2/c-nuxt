const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase()
}

export function normalizeVimeoVideoId(input: unknown): string | null {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) return raw

  try {
    const url = new URL(raw)
    const host = normalizeHost(url.hostname)
    if (!VIMEO_HOSTS.has(host)) return null
    const segments = url.pathname.split('/').filter(Boolean)
    const id = [...segments].reverse().find((seg) => /^\d+$/.test(seg))
    return id || null
  } catch {
    return null
  }
}

function normalizeCollectionPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length) return null

  if (parts[0] === 'showcase' && /^\d+$/.test(parts[1] || '') && parts[2] === 'embed') {
    return `/showcase/${parts[1]}`
  }
  if (parts[0] === 'showcase' && /^\d+$/.test(parts[1] || '')) {
    return `/showcase/${parts[1]}`
  }
  if (parts[0] === 'album' && /^\d+$/.test(parts[1] || '') && parts[2] === 'embed') {
    return `/album/${parts[1]}`
  }
  if (parts[0] === 'album' && /^\d+$/.test(parts[1] || '')) {
    return `/album/${parts[1]}`
  }
  if (parts[0] === 'ondemand' && parts[1]) {
    return `/ondemand/${parts[1]}`
  }

  return null
}

export function normalizeVimeoCollectionIframeUrl(input: unknown): string | null {
  const raw = String(input ?? '').trim()
  if (!raw) return null

  try {
    const url = new URL(raw)
    const host = normalizeHost(url.hostname)
    if (!VIMEO_HOSTS.has(host)) return null

    if (host === 'player.vimeo.com') {
      if (url.pathname.startsWith('/video/')) {
        return null
      }
      const collectionPath = normalizeCollectionPath(url.pathname)
      if (!collectionPath) return null
      if (collectionPath.startsWith('/showcase/')) return `https://vimeo.com${collectionPath}/embed`
      if (collectionPath.startsWith('/album/')) return `https://vimeo.com${collectionPath}/embed`
      if (collectionPath.startsWith('/ondemand/')) return `https://vimeo.com${collectionPath}/embed`
      return null
    }

    const collectionPath = normalizeCollectionPath(url.pathname)
    if (!collectionPath) return null
    if (collectionPath.startsWith('/showcase/')) return `https://vimeo.com${collectionPath}/embed`
    if (collectionPath.startsWith('/album/')) return `https://vimeo.com${collectionPath}/embed`
    if (collectionPath.startsWith('/ondemand/')) return `https://vimeo.com${collectionPath}/embed`
    return null
  } catch {
    return null
  }
}
