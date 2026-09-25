import { describe, expect, it } from 'vitest'
import { sortDegrees, type DegreeListItem } from '../shared/degreeBuilderList'

const degrees: DegreeListItem[] = [
  { id: 1, name: 'Master of Divinity', code: 'MDIV', catalogYear: 2024 },
  { id: 2, name: 'Master of Arts', code: 'MA', catalogYear: 2026 },
  { id: 3, name: 'Doctor of Ministry', code: 'DMIN', catalogYear: '2026' },
  { id: 4, name: 'Legacy program', code: 'LEG', catalog_year: null },
  { id: 5, name: 'Bachelor of Arts', code: 'BA', catalogYear: 2025 },
]

describe('sortDegrees', () => {
  it('puts the latest catalog year first, then name', () => {
    const sorted = sortDegrees(degrees, 'year-desc')
    expect(sorted.map((d) => d.id)).toEqual([3, 2, 5, 1, 4])
  })

  it('puts the oldest catalog year first and leaves missing years last', () => {
    const sorted = sortDegrees(degrees, 'year-asc')
    expect(sorted.map((d) => d.id)).toEqual([1, 5, 3, 2, 4])
  })

  it('sorts by name and code', () => {
    expect(sortDegrees(degrees, 'name-asc').map((d) => d.name)).toEqual([
      'Bachelor of Arts',
      'Doctor of Ministry',
      'Legacy program',
      'Master of Arts',
      'Master of Divinity',
    ])
    expect(sortDegrees(degrees, 'code-asc').map((d) => d.code)).toEqual(['BA', 'DMIN', 'LEG', 'MA', 'MDIV'])
  })
})
