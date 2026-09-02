import { audienceList, isGeneralAudience } from './timelineFeed'

export const POST_AUDIENCE_OPTIONS = [
  { value: 'students', label: 'Students' },
  { value: 'employees', label: 'Employees' },
  { value: 'staff', label: 'Staff' },
  { value: 'faculty', label: 'Faculty' },
] as const

export type PostAudienceValue = (typeof POST_AUDIENCE_OPTIONS)[number]['value']

const SPECIFIC_AUDIENCES = new Set<string>(POST_AUDIENCE_OPTIONS.map((option) => option.value))

function optionLabel(value: string): string {
  return POST_AUDIENCE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function asAudienceValue(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim().toLowerCase()
  if (raw && typeof raw === 'object' && 'value' in raw) {
    return String((raw as { value?: unknown }).value || '').trim().toLowerCase()
  }
  return ''
}

function normalizeSpecificValue(value: string): PostAudienceValue | null {
  if (value === 'student') return 'students'
  if (SPECIFIC_AUDIENCES.has(value)) return value as PostAudienceValue
  return null
}

/** Specific groups selected for the editor. Empty means everyone. */
export function selectedAudiencesFromPost(raw: unknown): PostAudienceValue[] {
  if (isGeneralAudience(raw)) return []
  const seen = new Set<PostAudienceValue>()
  for (const value of audienceList(raw)) {
    const normalized = normalizeSpecificValue(value)
    if (normalized) seen.add(normalized)
  }
  return POST_AUDIENCE_OPTIONS
    .map((option) => option.value)
    .filter((value) => seen.has(value))
}

/** Persist selected groups. Empty array means everyone (API treats missing/`all` the same). */
export function serializePostAudience(selected: unknown): string[] {
  const list = Array.isArray(selected) ? selected : selected == null ? [] : [selected]
  const seen = new Set<PostAudienceValue>()
  for (const item of list) {
    const normalized = normalizeSpecificValue(asAudienceValue(item))
    if (normalized) seen.add(normalized)
  }
  return POST_AUDIENCE_OPTIONS
    .map((option) => option.value)
    .filter((value) => seen.has(value))
}

export function postAudienceLabel(raw: unknown): string {
  const selected = selectedAudiencesFromPost(raw)
  if (!selected.length) return 'Everyone'
  return selected.map(optionLabel).join(', ')
}
