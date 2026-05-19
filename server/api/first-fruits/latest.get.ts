import { createError, defineEventHandler, getQuery } from 'h3'
import { fetchDcOutboundParentLink, resolveDigitalCommonsApiToken, resolveDigitalCommonsSiteHost } from '../../utils/digitalCommonsOutbound'
import {
  dedupeFirstFruitsWorks,
  digitalCommonsFetchError,
  FIRST_FRUITS_BOOKS_PARENT_LINK,
  FIRST_FRUITS_OTHER_PARENT_LINKS,
  normalizeOutboundDoc,
  specToParentLink,
} from '../../utils/firstFruitsWorks'

type LatestQuery = {
  limit?: string
  sets?: string
}

const DEFAULT_PARENT_LINKS = [
  FIRST_FRUITS_BOOKS_PARENT_LINK,
  ...FIRST_FRUITS_OTHER_PARENT_LINKS,
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as LatestQuery
  const config = useRuntimeConfig(event)

  const token = resolveDigitalCommonsApiToken(config.digitalCommonsApiToken)
  if (!token) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'Digital Commons API token is not configured. Set NUXT_DIGITAL_COMMONS_API_TOKEN or DIGITAL_COMMONS_API_TOKEN.',
    })
  }

  const siteHost = resolveDigitalCommonsSiteHost(config.digitalCommonsSiteHost)

  const limitRaw = Number.parseInt(String(query.limit ?? '24'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 24

  const sets = String(query.sets || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  const parentSpecs = sets.length > 0 ? sets : DEFAULT_PARENT_LINKS
  const parentLinks = parentSpecs.map((s) => specToParentLink(s, siteHost)).filter(Boolean)

  try {
    const perParent = Math.min(1000, Math.max(12, Math.ceil((limit * 2) / Math.max(1, parentLinks.length))))

    const batches = await Promise.all(
      parentLinks.map((parentLink) =>
        fetchDcOutboundParentLink({
          siteHost,
          token,
          parentLink,
          limit: perParent,
        }),
      ),
    )

    const works = dedupeFirstFruitsWorks(
      batches
        .flat()
        .map((doc) => normalizeOutboundDoc(doc, siteHost))
        .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc)),
    )
      .sort((a, b) => {
        const at = a.date ? Date.parse(a.date) : 0
        const bt = b.date ? Date.parse(b.date) : 0
        return bt - at
      })
      .slice(0, limit)

    return {
      source: 'digital-commons-api-v2',
      repository: 'ePLACE First Fruits',
      fetchedAt: new Date().toISOString(),
      total: works.length,
      parentLinks,
      works,
    }
  } catch (error: unknown) {
    throw digitalCommonsFetchError(error)
  }
})
