// GET /api/users/:id/teaching-schedule — current + opened future terms for a faculty member.
// Sources sections from the public class-list gateway (same data as Class Search).
import { createError, getRouterParam, setResponseHeader } from 'h3'
import { TEACHING_SCHEDULE_TERMS } from '@shared/academicTerms'
import { resolveConnectApiUrl } from '../../../utils/connectApi'

const CLASS_LIST_BASE =
  'https://my.asburyseminary.edu/ClassListDataGateway/ClassList/Where/Term'

const NICKNAMES: Record<string, string[]> = {
  james: ['jim', 'jimmy', 'jamie'],
  jim: ['james'],
  robert: ['bob', 'rob'],
  steve: ['steven', 'stephen'],
  steven: ['steve', 'stephen'],
  stephen: ['steve', 'steven'],
  david: ['dave'],
  dave: ['david'],
  william: ['will', 'bill', 'billy'],
  bill: ['william'],
  richard: ['rick'],
  rick: ['richard'],
  christopher: ['chris'],
  chris: ['christopher', 'christine', 'christina'],
  christine: ['chris'],
  christina: ['chris'],
  elizabeth: ['liz', 'beth'],
  michael: ['mike'],
  mike: ['michael'],
  jonathan: ['jon', 'john'],
  jon: ['jonathan', 'john'],
  john: ['jon', 'jonathan'],
  joseph: ['joe'],
  joe: ['joseph'],
  frederick: ['fred', 'fredrick'],
  fredrick: ['fred', 'frederick'],
  fred: ['frederick', 'fredrick'],
  daniel: ['dan'],
  dan: ['daniel'],
  thomas: ['tom'],
  tom: ['thomas'],
  timothy: ['tim'],
  tim: ['timothy'],
  samuel: ['sam'],
  sam: ['samuel'],
  matthew: ['matt'],
  matt: ['matthew'],
  philip: ['phil'],
  phillip: ['phil'],
  phil: ['phillip', 'philip'],
}

function toLastFirstKeys(displayName: string, email?: string | null): string[] {
  const keys = new Set<string>()
  const cleaned = displayName.trim()
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*(.+)$/)

  let firstNames: string[] = []
  let lastName = ''

  if (parenMatch) {
    lastName = parenMatch[3].trim().split(/\s+/).pop()?.toLowerCase() ?? ''
    firstNames = [parenMatch[1].trim().toLowerCase(), parenMatch[2].trim().toLowerCase()]
  } else {
    const parts = cleaned.split(/\s+/)
    if (parts.length >= 2) {
      lastName = parts[parts.length - 1].toLowerCase().replace(/[.'’]/g, '')
      const firstTokens = parts.slice(0, -1).map((part) => part.toLowerCase().replace(/[.'’]/g, ''))
      firstNames = [firstTokens.join(' ')]
      firstNames.push(...firstTokens.filter((token) => token.length >= 2))
    }
  }

  if (lastName) {
    for (const first of firstNames) {
      keys.add(`${lastName}, ${first}`)
      for (const nick of NICKNAMES[first] ?? []) keys.add(`${lastName}, ${nick}`)
    }
  }

  if (email) {
    const local = email.split('@')[0]?.toLowerCase()
    if (local) {
      const emailParts = local.split('.')
      if (emailParts.length >= 2) {
        const emailFirst = emailParts.slice(0, -1).join(' ')
        const emailLast = emailParts[emailParts.length - 1]
        keys.add(`${emailLast}, ${emailFirst}`)
        for (const nick of NICKNAMES[emailFirst] ?? []) keys.add(`${emailLast}, ${nick}`)
      }
    }
  }

  return [...keys]
}

function instructorMatchesFaculty(rawInstructor: string, facultyKeys: Set<string>): boolean {
  const key = rawInstructor.trim().toLowerCase()
  if (!key) return false
  if (facultyKeys.has(key)) return true

  const [last, first] = key.split(',').map((s) => s.trim())
  if (!last || !first) return false

  for (const facultyKey of facultyKeys) {
    const [mLast, mFirst] = facultyKey.split(',').map((s) => s.trim())
    if (mLast === last && (first.startsWith(mFirst) || mFirst.startsWith(first))) return true
  }
  return false
}

async function fetchClassList(term: string): Promise<any[]> {
  const data = await $fetch<any>(`${CLASS_LIST_BASE}/${term}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; AsburyConnect/1.0)',
    },
  })
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data
  if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items
  if (typeof data === 'string' && data.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(data) as any[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const connectApiUrl = resolveConnectApiUrl()

  try {
    const user = await $fetch<any>(`${connectApiUrl}/api/connect-users/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      query: { depth: 0 },
    })

    const name = typeof user?.name === 'string' ? user.name.trim() : ''
    if (!name) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : null
    const facultyKeys = new Set(toLastFirstKeys(name, email))

    const terms = await Promise.all(
      TEACHING_SCHEDULE_TERMS.map(async (term) => {
        let classes: any[] = []
        try {
          const all = await fetchClassList(term.value)
          classes = all
            .filter((row) => instructorMatchesFaculty(String(row?.instructor ?? ''), facultyKeys))
            .map((row) => ({
              fullClassId: row.full_class_id ?? null,
              shortName: row.short_name ?? null,
              section: row.section ?? null,
              title: row.short_description ?? null,
              dayTime: row.day_time ?? null,
              location: row.location ?? null,
              building: row.building ?? null,
              deliveryMethod: row.delivery_method ?? null,
              credits: row.class_credits ?? null,
              classStatus: row.class_status ?? null,
              seats: row.seats ?? null,
            }))
            .sort((a, b) =>
              String(a.shortName || a.fullClassId || '').localeCompare(
                String(b.shortName || b.fullClassId || ''),
              ),
            )
        } catch (err) {
          console.error(`Teaching schedule class-list error for ${term.value}:`, err)
        }
        return {
          code: term.value,
          label: term.label,
          count: classes.length,
          classes,
        }
      }),
    )

    setResponseHeader(event, 'Cache-Control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=300')

    return { terms }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Teaching schedule error:', err)
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to load teaching schedule',
      data: err?.data,
    })
  }
})
