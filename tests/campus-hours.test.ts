import { describe, expect, it } from 'vitest'
import {
  mondayOfWeek,
  pickSeasonForDate,
  resolveDay,
  resolveDisplayedWeek,
  weekdayFromYmd,
} from '../shared/campusHours'

describe('campus hours week math', () => {
  it('treats Monday as the start of the displayed week', () => {
    expect(mondayOfWeek('2026-09-02')).toBe('2026-08-31')
    expect(weekdayFromYmd('2026-08-31')).toBe(1)
    expect(weekdayFromYmd('2026-09-06')).toBe(0)
  })

  it('keeps calendar today when the requested date is another week’s Monday', () => {
    const week = resolveDisplayedWeek('2026-08-24', '2026-09-02')
    expect(week.today).toBe('2026-09-02')
    expect(week.weekStart).toBe('2026-08-24')
    expect(week.today === week.weekStart).toBe(false)
  })
})

describe('campus hours season pick', () => {
  it('uses the latest start date when seasons overlap', () => {
    const seasons = [
      { id: 1, startDate: '2026-08-24', endDate: '2026-12-18' },
      { id: 2, startDate: '2026-11-23', endDate: '2026-11-27' },
    ]
    expect(pickSeasonForDate('2026-09-02', seasons)?.id).toBe(1)
    expect(pickSeasonForDate('2026-11-25', seasons)?.id).toBe(2)
    expect(pickSeasonForDate('2026-12-20', seasons)).toBeNull()
  })
})

describe('campus hours resolveDay', () => {
  const weekly = [
    { weekday: 1, facility: 'student_center', hours: '6am-9pm' },
    { weekday: 1, facility: 'dining_hall', hours: '11:30am-1pm' },
    { weekday: 1, facility: 'spo', hours: '8am-5pm' },
    { weekday: 1, facility: 'library', hours: '7:45am-9pm' },
    { weekday: 1, facility: 'chapel', hours: '11am-12pm' },
    { weekday: 1, facility: 'eucharist', hours: '12pm' },
    { weekday: 0, facility: 'student_center', hours: 'closed' },
    { weekday: 0, facility: 'dining_hall', hours: 'closed' },
    { weekday: 0, facility: 'spo', hours: 'closed' },
    { weekday: 0, facility: 'library', hours: 'closed' },
    { weekday: 0, facility: 'chapel', hours: 'closed' },
    { weekday: 0, facility: 'eucharist', hours: 'closed' },
  ]

  it('marks Sunday as closed across every facility', () => {
    const day = resolveDay({ ymd: '2026-09-06', weekly, exceptions: [] })
    expect(day.closedAll).toBe(true)
    expect(day.cells.library).toBe('closed')
  })

  it('lets a closed-all exception win, then a facility override', () => {
    const closed = resolveDay({
      ymd: '2026-09-07',
      weekly,
      exceptions: [{ date: '2026-09-07', facility: null, hours: null, closedAll: true, note: 'Labor Day' }],
    })
    expect(closed.closedAll).toBe(true)
    expect(closed.notes).toEqual(['Labor Day'])

    const libraryOnly = resolveDay({
      ymd: '2026-09-07',
      weekly,
      exceptions: [
        { date: '2026-09-07', facility: null, hours: null, closedAll: true, note: 'Labor Day' },
        { date: '2026-09-07', facility: 'library', hours: '10am-2pm', closedAll: false, note: null },
      ],
    })
    expect(libraryOnly.closedAll).toBe(false)
    expect(libraryOnly.cells.library).toBe('10am-2pm')
    expect(libraryOnly.cells.spo).toBe('closed')
  })
})
