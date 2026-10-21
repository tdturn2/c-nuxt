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

type GraphMe = {
  mailNickname?: string | null
  onPremisesSamAccountName?: string | null
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
