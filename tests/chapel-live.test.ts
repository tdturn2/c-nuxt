import { describe, expect, it } from 'vitest'
import { isChapelLiveWindow } from '../shared/chapelLive'

describe('chapel live window', () => {
  it('is open Tue–Thu from 10:55 a.m. until noon Eastern', () => {
    // 2026-10-06 Tue, 10-07 Wed, 10-08 Thu, 10-09 Fri. October is EDT (UTC-4).
    expect(isChapelLiveWindow(new Date('2026-10-06T14:55:00Z'))).toBe(true)
    expect(isChapelLiveWindow(new Date('2026-10-07T15:30:00Z'))).toBe(true)
    expect(isChapelLiveWindow(new Date('2026-10-08T15:59:00Z'))).toBe(true)
  })

  it('is closed outside that hour and on other weekdays', () => {
    expect(isChapelLiveWindow(new Date('2026-10-08T14:54:00Z'))).toBe(false)
    expect(isChapelLiveWindow(new Date('2026-10-08T16:00:00Z'))).toBe(false)
    expect(isChapelLiveWindow(new Date('2026-10-09T15:30:00Z'))).toBe(false)
    expect(isChapelLiveWindow(new Date('2026-10-05T15:30:00Z'))).toBe(false)
  })
})
