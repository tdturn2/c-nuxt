import { createError, defineEventHandler, getQuery } from 'h3'
import usCitiesByState from '../../data/us-cities-by-state.json'
import { US_STATE_OPTIONS } from '../../../shared/geo'

const citiesByState = usCitiesByState as Record<string, string[]>
const validStates = new Set(US_STATE_OPTIONS.map((s) => s.value))

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const state = typeof query.state === 'string' ? query.state.trim().toUpperCase() : ''
  if (!state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query param `state` is required (US state code)',
    })
  }
  if (!validStates.has(state)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid US state code',
    })
  }

  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
  const all = citiesByState[state] ?? []
  const cities = q
    ? all.filter((name) => name.toLowerCase().includes(q)).slice(0, 50)
    : all

  return { state, cities }
})
