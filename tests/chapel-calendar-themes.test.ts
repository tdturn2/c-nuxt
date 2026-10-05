import { describe, expect, it } from 'vitest'
import {
  formatThemeRange,
  primaryThemeForDate,
  themeBarsForWeek,
  themesOnDate,
  type ChapelCalendarTheme,
} from '../shared/chapelCalendarThemes'

const kingdom: ChapelCalendarTheme = {
  id: 1,
  label: 'Kingdom Conference',
  startDate: '2026-10-13',
  endDate: '2026-10-15',
  color: 'gold',
  note: null,
  active: true,
}

const advent: ChapelCalendarTheme = {
  id: 2,
  label: 'Advent',
  startDate: '2026-11-29',
  endDate: '2026-12-24',
  color: 'burgundy',
  note: 'Evening services',
  active: true,
}

describe('chapel calendar themes', () => {
  it('formats a same-month range like Kingdom Conference', () => {
    expect(formatThemeRange('2026-10-13', '2026-10-15')).toBe('Oct 13–15, 2026')
    expect(formatThemeRange('2026-10-13', '2026-10-13')).toBe('Oct 13, 2026')
    expect(formatThemeRange('2026-10-30', '2026-11-02')).toBe('Oct 30 – Nov 2, 2026')
  })

  it('prefers the shorter theme when ranges overlap a day', () => {
    const semester: ChapelCalendarTheme = {
      ...advent,
      id: 3,
      label: 'Fall term',
      startDate: '2026-10-01',
      endDate: '2026-12-18',
      color: 'slate',
    }
    expect(primaryThemeForDate([semester, kingdom], '2026-10-14')?.label).toBe('Kingdom Conference')
    expect(themesOnDate([semester, kingdom], '2026-10-14').map((theme) => theme.label)).toEqual([
      'Kingdom Conference',
      'Fall term',
    ])
    expect(themesOnDate([kingdom], '2026-10-16')).toEqual([])
  })

  it('hides inactive themes from the calendar', () => {
    expect(themesOnDate([{ ...kingdom, active: false }], '2026-10-14')).toEqual([])
  })

  it('draws one bar across a mid-week run and splits at the week boundary', () => {
    const octoberWeek = [null, null, '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']
    const bars = themeBarsForWeek(octoberWeek, [kingdom])
    expect(bars).toEqual([
      expect.objectContaining({ col: 2, span: 3, label: 'Kingdom Conference', color: 'gold', row: 0 }),
    ])

    const crossing = themeBarsForWeek(
      ['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05'],
      [advent],
    )
    expect(crossing).toHaveLength(1)
    expect(crossing[0]).toMatchObject({ col: 0, span: 7, color: 'burgundy' })
  })

  it('stacks overlapping bars on separate rows', () => {
    const week = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']
    const bars = themeBarsForWeek(week, [
      kingdom,
      { ...kingdom, id: 9, label: 'Missions week', startDate: '2026-10-12', endDate: '2026-10-16', color: 'teal' },
    ])
    const rows = new Set(bars.map((bar) => bar.row))
    expect(bars).toHaveLength(2)
    expect(rows.size).toBe(2)
  })
})
