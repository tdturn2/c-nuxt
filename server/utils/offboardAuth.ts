import { createHash, timingSafeEqual } from 'node:crypto'
import { createError, getHeader, type H3Event } from 'h3'

function keysMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const left = createHash('sha256').update(provided).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}

export function readOffboardKey(event: H3Event): string {
  const authorization = getHeader(event, 'authorization') || ''
  if (/^bearer\s+/i.test(authorization)) return authorization.replace(/^bearer\s+/i, '').trim()
  return (getHeader(event, 'x-connect-offboard-key') || '').trim()
}

export function assertOffboardKey(event: H3Event, expected: string) {
  const configured = expected.trim()
  if (!configured) {
    throw createError({ statusCode: 503, statusMessage: 'Offboard API is not configured' })
  }
  if (!keysMatch(readOffboardKey(event), configured)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return configured
}
