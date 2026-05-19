import { createError, defineEventHandler, getQuery } from 'h3'
import { fetchDcOutboundParentLink, resolveDigitalCommonsApiToken, resolveDigitalCommonsSiteHost } from '../../utils/digitalCommonsOutbound'
import {
  dedupeFirstFruitsWorks,
  digitalCommonsFetchError,
  FIRST_FRUITS_BOOKS_PARENT_LINK,
  normalizeOutboundDoc,
} from '../../utils/firstFruitsWorks'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
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
  const limitRaw = Number.parseInt(String(query.limit ?? '60'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 60

  try {
    const docs = await fetchDcOutboundParentLink({
      siteHost,
      token,
      parentLink: FIRST_FRUITS_BOOKS_PARENT_LINK,
      limit: Math.min(1000, Math.max(limit, 100)),
    })

    const works = dedupeFirstFruitsWorks(
      docs
        .map((doc) => normalizeOutboundDoc(doc, siteHost))
        .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
        .map((doc) => ({ ...doc, shelf: 'books' as const })),
    )
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
      .slice(0, limit)

    return {
      source: 'digital-commons-api-v2',
      collection: 'firstfruitsbooks',
      collectionUrl: 'https://place.asburyseminary.edu/firstfruitsbooks/',
      parentLink: FIRST_FRUITS_BOOKS_PARENT_LINK,
      fetchedAt: new Date().toISOString(),
      total: works.length,
      works,
    }
  } catch (error: unknown) {
    throw digitalCommonsFetchError(error)
  }
})
