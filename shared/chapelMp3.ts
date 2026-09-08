/** Chapel MP3s live on public S3 as `ky/YYYYMMDD.mp3`. */

export const CHAPEL_MP3_BASE = 'https://s3.amazonaws.com/ats-chapel'
export const CHAPEL_MP3_FOLDER = 'ky' as const

export function chapelDateKey(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const iso = value.toISOString()
    return iso.slice(0, 10)
  }
  const raw = String(value).trim()
  if (!raw) return null
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return m?.[1] || null
}

/** Always `ky` — Orlando (fl/) is no longer used for chapel audio. */
export function chapelMp3Folder(_campus?: string | null): 'ky' {
  return CHAPEL_MP3_FOLDER
}

export function chapelMp3Filename(dateKey: string, _campus?: string | null): string {
  const compact = dateKey.replace(/-/g, '')
  return `${CHAPEL_MP3_FOLDER}/${compact}.mp3`
}

export function chapelMp3PublicUrl(date: string | Date | null | undefined, campus?: string | null): string | null {
  const dateKey = chapelDateKey(date)
  if (!dateKey) return null
  return `${CHAPEL_MP3_BASE}/${chapelMp3Filename(dateKey, campus)}`
}

export function chapelMp3Label(date: string | Date | null | undefined, campus?: string | null): string | null {
  const dateKey = chapelDateKey(date)
  if (!dateKey) return null
  return chapelMp3Filename(dateKey, campus)
}
