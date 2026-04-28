export type UnifiedCalendarSource = 'google' | 'connect'

export type UnifiedCalendarEvent = {
  id: string
  source: UnifiedCalendarSource
  title: string
  start: string
  end?: string | null
  location?: string | null
  description?: string | null
  url?: string | null
  audienceTags?: string[]
}
