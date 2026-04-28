import { defineEventHandler } from 'h3'
import type { UnifiedCalendarEvent } from '../../types/calendar'
import { connectEventAdapter } from '../../utils/calendar/connectEventAdapter'
import { googleEmbedAdapter } from '../../utils/calendar/googleEmbedAdapter'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const googleEmbedUrl =
    String(config.public.googleCalendarEmbedUrl || '').trim() ||
    'https://calendar.google.com/calendar/embed?src=asburyseminary.edu'

  const googleResult = googleEmbedAdapter(googleEmbedUrl)
  const connectEvents = await connectEventAdapter()
  const events: UnifiedCalendarEvent[] = [...googleResult.events, ...connectEvents]

  return {
    sources: ['google', 'connect'],
    embedUrl: googleResult.embedUrl,
    events,
  }
})
