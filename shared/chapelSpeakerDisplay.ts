export type ChapelLinkedUserLike = {
  id?: number | string
  name?: string | null
  employeeTitle?: string | null
  avatar?: { url?: string | null } | string | null
}

export type ChapelSpeakerLike = {
  name?: string | null
  speakerDescription?: string | null
  photo?: { url?: string | null } | string | number | null
  connectUser?: ChapelLinkedUserLike | string | number | null
}

export function chapelLinkedUser(speaker?: ChapelSpeakerLike | null): ChapelLinkedUserLike | null {
  const raw = speaker?.connectUser
  return raw && typeof raw === 'object' ? raw : null
}

export function chapelSpeakerName(speaker?: ChapelSpeakerLike | null): string {
  const direct = typeof speaker?.name === 'string' ? speaker.name.trim() : ''
  if (direct) return direct
  const user = chapelLinkedUser(speaker)
  return typeof user?.name === 'string' ? user.name.trim() : ''
}

export function chapelSpeakerTitle(speaker?: ChapelSpeakerLike | null): string {
  const direct = typeof speaker?.speakerDescription === 'string' ? speaker.speakerDescription.trim() : ''
  if (direct) return direct
  const user = chapelLinkedUser(speaker)
  return typeof user?.employeeTitle === 'string' ? user.employeeTitle.trim() : ''
}

function hasMediaUrl(value: unknown): boolean {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 && !/^\d+$/.test(trimmed)
  }
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: unknown }).url
    return typeof url === 'string' && url.trim().length > 0
  }
  return false
}

export function chapelSpeakerPhoto(
  speaker?: ChapelSpeakerLike | null,
): { url?: string | null } | string | null {
  if (hasMediaUrl(speaker?.photo)) return speaker?.photo as { url?: string | null } | string
  const user = chapelLinkedUser(speaker)
  if (hasMediaUrl(user?.avatar)) return user?.avatar ?? null
  return null
}
