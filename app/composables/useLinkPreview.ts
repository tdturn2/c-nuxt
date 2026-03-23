type LinkPreviewData = {
  url: string
  title: string
  description: string
  image: string | null
  siteName: string
}

export const useLinkPreview = () => {
  const cache = useState<Record<string, LinkPreviewData | null>>('link-preview-cache', () => ({}))

  const fetchPreview = async (url: string): Promise<LinkPreviewData | null> => {
    if (!url) return null
    if (Object.prototype.hasOwnProperty.call(cache.value, url)) {
      return cache.value[url] || null
    }
    try {
      const data = await $fetch<LinkPreviewData>('/api/link-preview', {
        query: { url },
        credentials: 'include'
      })
      cache.value[url] = data
      return data
    } catch {
      cache.value[url] = null
      return null
    }
  }

  return { fetchPreview }
}
