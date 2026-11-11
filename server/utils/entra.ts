export type EntraDirectoryIdentity = {
  mailNickname: string | null
  onPremisesSamAccountName: string | null
  canvasLoginId: string | null
}

function trimToNull(value: unknown): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}

/**
 * Canvas SAML is keyed to Entra on-premises SAM / mail nickname, not email/UPN.
 * Prefer SAM when present (AD-synced users); otherwise mail nickname.
 */
export function canvasLoginIdFromEntra(input: {
  onPremisesSamAccountName?: string | null
  sAMAccountName?: string | null
  mailNickname?: string | null
}): string | null {
  return (
    trimToNull(input.onPremisesSamAccountName) ||
    trimToNull(input.sAMAccountName) ||
    trimToNull(input.mailNickname)
  )
}

export function canvasLoginIdFromProfile(profile: Record<string, unknown> | null | undefined): string | null {
  if (!profile) return null

  return canvasLoginIdFromEntra({
    onPremisesSamAccountName:
      trimToNull(profile.onPremisesSamAccountName) ||
      trimToNull(profile.onprem_sam_account_name) ||
      trimToNull(profile.onpremisesamaccountname),
    sAMAccountName: trimToNull(profile.sAMAccountName),
    mailNickname:
      trimToNull(profile.mailNickname) ||
      trimToNull(profile.mailnickname)
  })
}

const DIRECTORY_GROUP_OBJECT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type GraphDirectoryGroup = {
  '@odata.type'?: string
  id?: string
  displayName?: string | null
  onPremisesSamAccountName?: string | null
  onPremisesSyncEnabled?: boolean | null
}

type GraphGroupPage = {
  value?: GraphDirectoryGroup[]
  '@odata.nextLink'?: string
}

type GraphMe = {
  mailNickname?: string | null
  onPremisesSamAccountName?: string | null
}

export function isDirectoryGroupObjectId(value: string): boolean {
  return DIRECTORY_GROUP_OBJECT_ID.test(value.trim())
}

/** Turn an AD distinguished name into the CN people can filter on. */
export function directoryGroupLabel(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || isDirectoryGroupObjectId(trimmed)) return null
  if (/^CN=/i.test(trimmed)) {
    const match = trimmed.match(/^CN=([^,]+)/i)
    return trimToNull(match?.[1])
  }
  return trimmed
}

export function groupNamesFromLoginClaims(profile: Record<string, unknown> | null | undefined): string[] {
  if (!profile) return []
  const rawValues = [
    profile.groups,
    profile.memberOf,
    profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'],
  ]
  const names: string[] = []
  for (const value of rawValues) {
    const list = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
    for (const item of list) {
      const label = directoryGroupLabel(String(item ?? ''))
      if (label) names.push(label)
    }
  }
  return names
}

function isGraphGroup(group: GraphDirectoryGroup): boolean {
  const type = group['@odata.type']?.toLowerCase() || ''
  return !type || type.endsWith('group')
}

function isOnPremisesGroup(group: GraphDirectoryGroup): boolean {
  return group.onPremisesSyncEnabled === true || Boolean(trimToNull(group.onPremisesSamAccountName))
}

/**
 * Names a signed-in user can filter on.
 * On-premises groups win when Graph marks any. Otherwise every group display name is kept.
 * Login claims are included either way, with object IDs dropped.
 */
export function filterableDirectoryGroupNames(input: {
  graphGroups?: GraphDirectoryGroup[] | null
  claimGroups?: Array<string | null | undefined> | null
}): string[] {
  const graphGroups = (input.graphGroups ?? []).filter(isGraphGroup)
  const onPremises = graphGroups.filter(isOnPremisesGroup)
  const selected = onPremises.length ? onPremises : graphGroups
  const names = new Set<string>()

  for (const group of selected) {
    const label = directoryGroupLabel(
      trimToNull(group.onPremisesSamAccountName) || trimToNull(group.displayName) || ''
    )
    if (label) names.add(label)
  }

  for (const claim of input.claimGroups ?? []) {
    const label = directoryGroupLabel(String(claim ?? ''))
    if (label) names.add(label)
  }

  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function graphNextLink(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.hostname === 'graph.microsoft.com') return url.toString()
  } catch {
    return null
  }
  return null
}

async function fetchDirectoryGroupPages(accessToken: string, startUrl: string): Promise<GraphDirectoryGroup[]> {
  const groups: GraphDirectoryGroup[] = []
  let url: string | null = startUrl

  for (let page = 0; url && page < 20; page += 1) {
    const body = await $fetch<GraphGroupPage>(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (Array.isArray(body?.value)) groups.push(...body.value)
    url = graphNextLink(body?.['@odata.nextLink'])
  }

  return groups
}

export async function fetchEntraDirectoryGroups(accessToken: string): Promise<GraphDirectoryGroup[]> {
  const directorySelect = 'id,displayName,onPremisesSamAccountName,onPremisesSyncEnabled'
  const attempts = [
    `https://graph.microsoft.com/v1.0/me/transitiveMemberOf/microsoft.graph.group?$select=${directorySelect}&$top=999`,
    `https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=${directorySelect}&$top=999`,
    'https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id,displayName&$top=999',
  ]
  let lastError: unknown
  for (const startUrl of attempts) {
    try {
      return await fetchDirectoryGroupPages(accessToken, startUrl)
    } catch (error: any) {
      lastError = error
      const status = error?.statusCode || error?.status || error?.response?.status
      if (status !== 400 && status !== 403) throw error
    }
  }
  throw lastError
}

export async function fetchEntraDirectoryIdentity(accessToken: string): Promise<EntraDirectoryIdentity> {
  const me = await $fetch<GraphMe>(
    'https://graph.microsoft.com/v1.0/me?$select=mailNickname,onPremisesSamAccountName',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  const mailNickname = trimToNull(me?.mailNickname)
  const onPremisesSamAccountName = trimToNull(me?.onPremisesSamAccountName)

  return {
    mailNickname,
    onPremisesSamAccountName,
    canvasLoginId: canvasLoginIdFromEntra({
      mailNickname,
      onPremisesSamAccountName
    })
  }
}
