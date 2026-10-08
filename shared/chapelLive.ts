import { DEFAULT_TOAST_TIMEZONE, zonedDateParts } from './connectToasts'

/** Resi web player for the Estes Chapel live stream. */
export const CHAPEL_LIVE_EMBED_URL =
  'https://control.resi.io/webplayer/video.html?id=b0ca676a-beff-4ed5-9e67-4b14787a67fc'

export const CHAPEL_LIVE_TITLE = 'Chapel Live'

/** JS weekday: Tue, Wed, Thu. */
const CHAPEL_LIVE_DAYS = [2, 3, 4]

/** 10:55 a.m. inclusive through 12:00 p.m. exclusive, America/New_York. */
const CHAPEL_LIVE_START_MINUTES = 10 * 60 + 55
const CHAPEL_LIVE_END_MINUTES = 12 * 60

export function isChapelLiveWindow(now = new Date(), timeZone = DEFAULT_TOAST_TIMEZONE): boolean {
  const parts = zonedDateParts(now, timeZone)
  if (!CHAPEL_LIVE_DAYS.includes(parts.weekday)) return false
  const minutes = parts.hour * 60 + parts.minute
  return minutes >= CHAPEL_LIVE_START_MINUTES && minutes < CHAPEL_LIVE_END_MINUTES
}
