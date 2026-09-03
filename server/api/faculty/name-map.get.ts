// GET /api/faculty/name-map — lightweight map of normalized instructor names to faculty info.
// Keyed by lowercase "last, first" to match Instructure's instructor format.
import { defineEventHandler, createError, setResponseHeader } from 'h3'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

// Common nickname mappings for first-name matching
const NICKNAMES: Record<string, string[]> = {
  james: ['jim', 'jimmy', 'jamie'],
  jim: ['james'],
  robert: ['bob', 'rob', 'steve'],
  steve: ['steven', 'stephen', 'robert'],
  steven: ['steve', 'stephen'],
  stephen: ['steve', 'steven'],
  david: ['dave'],
  dave: ['david'],
  william: ['will', 'bill', 'billy'],
  bill: ['william'],
  richard: ['rick', 'dick'],
  rick: ['richard'],
  christopher: ['chris'],
  chris: ['christopher', 'christine', 'christina'],
  christine: ['chris'],
  christina: ['chris'],
  elizabeth: ['liz', 'beth', 'betty'],
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
  daniel: ['dan', 'danny'],
  dan: ['daniel'],
  thomas: ['tom', 'tommy'],
  tom: ['thomas'],
  edward: ['ed', 'ted'],
  margaret: ['maggie', 'meg'],
  katherine: ['kate', 'kathy', 'katie'],
  catherine: ['cathy', 'kate', 'katie'],
  patricia: ['pat', 'patty'],
  jennifer: ['jen', 'jenny'],
  rebecca: ['becky'],
  benjamin: ['ben'],
  ben: ['benjamin'],
  timothy: ['tim'],
  tim: ['timothy'],
  samuel: ['sam'],
  sam: ['samuel'],
  kenneth: ['ken'],
  ken: ['kenneth'],
  gregory: ['greg'],
  greg: ['gregory'],
  lawrence: ['larry'],
  larry: ['lawrence'],
  raymond: ['ray'],
  ray: ['raymond'],
  anthony: ['tony'],
  tony: ['anthony'],
  charles: ['charlie', 'chuck'],
  ronald: ['ron'],
  ron: ['ronald'],
  donald: ['don'],
  don: ['donald'],
  gerald: ['jerry'],
  jerry: ['gerald'],
  douglas: ['doug'],
  doug: ['douglas'],
  susan: ['sue'],
  suzanne: ['sue'],
  sue: ['susan', 'suzanne'],
  phillip: ['phil'],
  phil: ['phillip', 'philip'],
  philip: ['phil'],
  matthew: ['matt'],
  matt: ['matthew'],
  andrew: ['andy', 'drew'],
  randy: ['randall', 'randolph'],
  randall: ['randy'],
}

/** Generate all plausible "last, first" keys for matching against Instructure's format. */
function toLastFirstKeys(displayName: string, email?: string | null): string[] {
  const keys = new Set<string>()

  // Strip parenthetical nicknames: "David (Dave) Schreiner" → names = ["David", "Dave"]
  const cleaned = displayName.trim()
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*(.+)$/)

  let firstNames: string[] = []
  let lastName = ''

  if (parenMatch) {
    const beforeParen = parenMatch[1].trim()
    const inParen = parenMatch[2].trim()
    const afterParen = parenMatch[3].trim()
    lastName = afterParen.split(/\s+/).pop()?.toLowerCase() ?? ''
    firstNames = [beforeParen.toLowerCase(), inParen.toLowerCase()]
  } else {
    const parts = cleaned.split(/\s+/)
    if (parts.length >= 2) {
      lastName = parts[parts.length - 1].toLowerCase().replace(/[.'’]/g, '')
      const firstTokens = parts.slice(0, -1).map((part) => part.toLowerCase().replace(/[.'’]/g, ''))
      firstNames = [firstTokens.join(' ')]
      const significant = firstTokens.filter((token) => token.length >= 2)
      firstNames.push(...significant)
    }
  }

  if (lastName) {
    for (const first of firstNames) {
      keys.add(`${lastName}, ${first}`)
      // Add nickname variants
      const nicknames = NICKNAMES[first]
      if (nicknames) {
        for (const nick of nicknames) keys.add(`${lastName}, ${nick}`)
      }
    }
  }

  // Email-based key: first.last@… → "last, first"
  if (email) {
    const local = email.split('@')[0]?.toLowerCase()
    if (local) {
      const emailParts = local.split('.')
      if (emailParts.length >= 2) {
        const emailFirst = emailParts.slice(0, -1).join(' ')
        const emailLast = emailParts[emailParts.length - 1]
        keys.add(`${emailLast}, ${emailFirst}`)
        const nicknames = NICKNAMES[emailFirst]
        if (nicknames) {
          for (const nick of nicknames) keys.add(`${emailLast}, ${nick}`)
        }
      }
    }
  }

  return [...keys]
}

export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl()

  try {
    const response = await $fetch(`${connectApiUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: { limit: 500, depth: 1 },
    }) as { docs?: any[] }

    const allDocs = response?.docs ?? []
    const roles = (r: unknown): string[] => (Array.isArray(r) ? r.map(String) : [])
    const facultyDocs = allDocs.filter((user: any) => roles(user?.roles).includes('faculty'))

    const map: Record<string, { id: number; name: string; username: string | null; employeeTitle: string | null; avatarUrl: string | null }> = {}

    for (const user of facultyDocs) {
      const name = user.name?.trim()
      if (!name) continue
      const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
      const username = email.includes('@') ? email.split('@')[0] : null
      const entry = {
        id: user.id,
        name,
        username,
        employeeTitle: user.employeeTitle ?? null,
        avatarUrl: normalizeUserAvatar(user)?.url ?? null,
      }
      const keys = toLastFirstKeys(name, user.email)
      for (const key of keys) {
        if (!map[key]) map[key] = entry
      }
    }

    // Cache for 1 hour — faculty list rarely changes
    setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600')

    return map
  } catch (err: any) {
    console.error('Faculty name-map error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load faculty name map',
      data: err.data,
    })
  }
})
