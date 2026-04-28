import type { UnifiedCalendarEvent } from '../../types/calendar'

export type GoogleEmbedAdapterResult = {
  embedUrl: string
  events: UnifiedCalendarEvent[]
}

export function googleEmbedAdapter(embedUrl: string): GoogleEmbedAdapterResult {
  return {
    embedUrl,
    events: [],
  }
}
