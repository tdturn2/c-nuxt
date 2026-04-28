import { createError, defineEventHandler } from 'h3'

type SliderItem = {
  id: number | string
  title?: string
  href?: string
  openInNewTab?: boolean
  startAt?: string | null
  endAt?: string | null
  active?: boolean
  sortOrder?: number
  image?: any
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const configuredBaseUrl = config.public.payloadBaseUrl || ''
  const params = new URLSearchParams()
  params.set('sort', 'sortOrder,-updatedAt')
  params.set('limit', '50')
  params.set('depth', '1')

  try {
    const candidateBaseUrls = [configuredBaseUrl, 'http://localhost:3002'].filter(Boolean)
    for (const baseUrl of candidateBaseUrls) {
      const res: any = await $fetch(`${baseUrl}/api/connect-home-slider-items?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      })
      const docs: SliderItem[] = Array.isArray(res?.docs) ? res.docs : []
      const filtered = docs.filter((item) => item?.active !== false)
      if (filtered.length > 0) return { docs: filtered }
      if (baseUrl === candidateBaseUrls[candidateBaseUrls.length - 1]) return { docs: filtered }
    }
    return { docs: [] }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch home slider items',
      data: error?.data,
    })
  }
})
