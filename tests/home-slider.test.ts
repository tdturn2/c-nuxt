import { describe, expect, it } from 'vitest'
import { buildHomeSliderCreateItems, nextHomeSliderSortOrder } from '../shared/homeSlider'

describe('home slider create items', () => {
  it('creates one payload per selected image', () => {
    const items = buildHomeSliderCreateItems({
      images: [10, 11, 12],
      title: '',
      href: '/news',
      existingItems: [{ sortOrder: 4 }],
    })
    expect(items).toHaveLength(3)
    expect(items.map((item) => item.image)).toEqual([10, 11, 12])
    expect(items.map((item) => item.sortOrder)).toEqual([5, 6, 7])
    expect(items.every((item) => item.href === '/news' && item.title === '')).toBe(true)
  })

  it('allows a slide with every field empty', () => {
    const [item] = buildHomeSliderCreateItems({
      images: [],
      title: '  ',
      href: '',
      sortOrder: '',
      startAt: '',
      endAt: '',
    })
    expect(item).toMatchObject({
      title: '',
      href: '',
      image: null,
      sortOrder: 0,
      startAt: null,
      endAt: null,
      active: true,
      openInNewTab: false,
    })
  })

  it('uses an explicit sort order as the start of a batch', () => {
    const items = buildHomeSliderCreateItems({
      images: [1, 2],
      sortOrder: 20,
      existingItems: [{ sortOrder: 99 }],
    })
    expect(items.map((item) => item.sortOrder)).toEqual([20, 21])
  })
})

describe('home slider sort order', () => {
  it('starts after the current max', () => {
    expect(nextHomeSliderSortOrder([])).toBe(0)
    expect(nextHomeSliderSortOrder([{ sortOrder: 2 }, { sortOrder: '8' }])).toBe(9)
  })
})
