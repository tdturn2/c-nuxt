import { describe, expect, it } from 'vitest'
import {
  directoryListSearchParams,
  directoryScrollStorageKey,
  parseDirectoryListQuery,
  sameDirectoryListQuery,
} from '../shared/directoryListQuery'

describe('directory list query', () => {
  it('reads page, search, and location from the query', () => {
    expect(parseDirectoryListQuery({
      page: '4',
      q: '  ada ',
      country: 'us',
      region: 'ky',
      city: 'Wilmore',
    })).toEqual({
      page: 4,
      q: 'ada',
      country: 'US',
      region: 'KY',
      city: 'Wilmore',
    })
  })

  it('drops state and city unless the country is the US', () => {
    expect(parseDirectoryListQuery({
      country: 'ke',
      region: 'KY',
      city: 'Wilmore',
      page: '1',
    })).toEqual({
      page: 1,
      q: '',
      country: 'KE',
      region: '',
      city: '',
    })
  })

  it('omits empty filters and the first page when writing the query', () => {
    expect(directoryListSearchParams({
      page: 1,
      q: '',
      country: 'us',
      region: 'ky',
      city: 'Wilmore',
    })).toEqual({
      country: 'US',
      region: 'KY',
      city: 'Wilmore',
    })
    expect(directoryListSearchParams({
      page: 3,
      q: 'lee',
      country: 'KE',
      region: 'KY',
      city: 'Wilmore',
    })).toEqual({
      country: 'KE',
      q: 'lee',
      page: '3',
    })
  })

  it('treats equivalent query records as the same', () => {
    expect(sameDirectoryListQuery({ country: 'US', page: '2' }, { page: '2', country: 'US' })).toBe(true)
    expect(sameDirectoryListQuery({ country: 'US' }, { country: 'KE' })).toBe(false)
  })

  it('keys scroll position by directory path', () => {
    expect(directoryScrollStorageKey('/student-directory')).toBe('connect-directory-scroll:/student-directory')
    expect(directoryScrollStorageKey('/faculty-directory')).toBe('connect-directory-scroll:/faculty-directory')
  })
})