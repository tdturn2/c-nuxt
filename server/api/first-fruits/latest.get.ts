import { createError, getQuery } from 'h3'

type FirstFruitsRecord = {
  id: string
  title: string
  creators: string[]
  date: string | null
  year: string | null
  source: string | null
  url: string | null
  fileUrl: string | null
  thumbnailUrl: string | null
  description: string | null
  sets: string[]
}

type OaiQuery = {
  limit?: string
  sets?: string
}

const OAI_BASE = 'https://place.asburyseminary.edu/do/oai/'
const DEFAULT_SETS = [
  'publication:firstfruitsbooks',
  'publication:firstfruitsjournals',
  'publication:firstfruitspapers',
  'publication:firstfruitsrussian',
  'publication:firstfruitsspanish',
]

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function compact(text: string): string {
  return decodeXml(stripCdata(text)).replace(/\s+/g, ' ').trim()
}

function pickFirstTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return null
  const value = compact(match[1] ?? '')
  return value || null
}

function pickManyTags(block: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const values: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(block)) !== null) {
    const value = compact(m[1] ?? '')
    if (value) values.push(value)
  }
  return values
}

function normalizeRecord(recordXml: string): FirstFruitsRecord | null {
  const header = recordXml.match(/<header[^>]*>([\s\S]*?)<\/header>/i)?.[1] ?? ''
  const metadata = recordXml.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/i)?.[1] ?? ''
  if (!metadata) return null

  const id = pickFirstTag(header, 'identifier') || `firstfruits-${Math.random().toString(36).slice(2)}`
  const title = pickFirstTag(metadata, 'dc:title')
  if (!title) return null

  const creators = pickManyTags(metadata, 'dc:creator')
  const dcDate = pickFirstTag(metadata, 'dc:date')
  const source = pickFirstTag(metadata, 'dc:source')
  const identifiers = pickManyTags(metadata, 'dc:identifier')
  const descriptions = pickManyTags(metadata, 'dc:description')
  const sets = pickManyTags(header, 'setSpec')

  const preferredUrl =
    identifiers.find((v) => /https?:\/\/place\.asburyseminary\.edu\/firstfruits/i.test(v)) ||
    identifiers.find((v) => /https?:\/\//i.test(v)) ||
    null

  const fileUrl = identifiers.find((v) => /\/viewcontent\//i.test(v)) || null
  const thumbnailUrl = descriptions.find((v) => /\/thumbnail\.(jpg|jpeg|png|webp|gif)$/i.test(v)) || null
  const description = descriptions.find((v) => !/^https?:\/\//i.test(v)) || null

  const date = dcDate && !Number.isNaN(Date.parse(dcDate)) ? new Date(dcDate).toISOString() : null
  const year = date ? String(new Date(date).getUTCFullYear()) : null

  return {
    id,
    title,
    creators,
    date,
    year,
    source,
    url: preferredUrl,
    fileUrl,
    thumbnailUrl,
    description,
    sets,
  }
}

async function fetchSet(setSpec: string): Promise<FirstFruitsRecord[]> {
  const url = `${OAI_BASE}?verb=ListRecords&metadataPrefix=oai_dc&set=${encodeURIComponent(setSpec)}`
  const raw = await $fetch<string>(url, {
    timeout: 20000,
    headers: {
      Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'AsburyConnect-FirstFruits/1.0',
    },
  })

  const xmlStart = raw.indexOf('<OAI-PMH')
  const xml = xmlStart >= 0 ? raw.slice(xmlStart) : raw

  const records: FirstFruitsRecord[] = []
  const recordRegex = /<record[^>]*>([\s\S]*?)<\/record>/gi
  let match: RegExpExecArray | null
  while ((match = recordRegex.exec(xml)) !== null) {
    const normalized = normalizeRecord(match[0])
    if (normalized) records.push(normalized)
  }
  return records
}

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event) as OaiQuery
    const limitRaw = Number.parseInt(String(query.limit ?? '24'), 10)
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 24

    const sets = String(query.sets || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)

    const setSpecs = sets.length > 0 ? sets : DEFAULT_SETS

    try {
      const batches = await Promise.all(setSpecs.map((setSpec) => fetchSet(setSpec)))
      const all = batches.flat()

      const unique = new Map<string, FirstFruitsRecord>()
      for (const item of all) {
        const key = item.url || item.fileUrl || item.id
        if (!unique.has(key)) unique.set(key, item)
      }

      const works = Array.from(unique.values())
        .sort((a, b) => {
          const at = a.date ? Date.parse(a.date) : 0
          const bt = b.date ? Date.parse(b.date) : 0
          return bt - at
        })
        .slice(0, limit)

      return {
        source: 'digital-commons-oai',
        repository: 'ePLACE First Fruits',
        fetchedAt: new Date().toISOString(),
        total: works.length,
        sets: setSpecs,
        works,
      }
    } catch (error: any) {
      throw createError({
        statusCode: error?.statusCode || 502,
        statusMessage: error?.statusMessage || 'Failed to fetch First Fruits records',
      })
    }
  },
  {
    maxAge: 60 * 60,
    name: 'first-fruits-latest',
    getKey: (event) => {
      const query = getQuery(event) as OaiQuery
      const limit = String(query.limit || '24')
      const sets = String(query.sets || DEFAULT_SETS.join(','))
      return `v1:${limit}:${sets}`
    },
  },
)
