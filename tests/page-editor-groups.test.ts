import { describe, expect, it } from 'vitest'
import {
  canEditPageByGroups,
  childPagePath,
  editorPrefixesForGroups,
  joinConnectPageSlugs,
  pathMatchesEditorPrefixes,
} from '../shared/pageEditorGroups'

describe('pathMatchesEditorPrefixes', () => {
  const prefixes = ['/arp']

  it('matches the prefix itself and children', () => {
    expect(pathMatchesEditorPrefixes('/arp', prefixes)).toBe(true)
    expect(pathMatchesEditorPrefixes('/arp/', prefixes)).toBe(true)
    expect(pathMatchesEditorPrefixes('/arp/child', prefixes)).toBe(true)
    expect(pathMatchesEditorPrefixes('/arp/child/nested', prefixes)).toBe(true)
  })

  it('does not match sibling or root paths', () => {
    expect(pathMatchesEditorPrefixes('/arp-extra', prefixes)).toBe(false)
    expect(pathMatchesEditorPrefixes('/ar', prefixes)).toBe(false)
    expect(pathMatchesEditorPrefixes('/', prefixes)).toBe(false)
    expect(pathMatchesEditorPrefixes('/chapel', prefixes)).toBe(false)
  })
})

describe('canEditPageByGroups', () => {
  it('allows admins on any path', () => {
    expect(canEditPageByGroups({ isAdmin: true, groupSlugs: [], pagePath: '/anything' })).toBe(true)
  })

  it('allows mapped groups only under their prefixes', () => {
    const arp = { isAdmin: false, groupSlugs: ['arp'] }
    expect(canEditPageByGroups({ ...arp, pagePath: '/arp' })).toBe(true)
    expect(canEditPageByGroups({ ...arp, pagePath: '/arp/issue' })).toBe(true)
    expect(canEditPageByGroups({ ...arp, pagePath: '/chapel' })).toBe(false)
    expect(canEditPageByGroups({ ...arp, pagePath: '/' })).toBe(false)

    expect(canEditPageByGroups({ isAdmin: false, groupSlugs: ['hr'], pagePath: '/hr/benefits' })).toBe(true)
    expect(canEditPageByGroups({ isAdmin: false, groupSlugs: ['hr'], pagePath: '/registrar' })).toBe(false)
    expect(canEditPageByGroups({ isAdmin: false, groupSlugs: ['registrar'], pagePath: '/registrar/forms' })).toBe(true)
    expect(canEditPageByGroups({ isAdmin: false, groupSlugs: ['registrar'], pagePath: '/hr' })).toBe(false)
  })

  it('denies staff without a mapped group', () => {
    expect(canEditPageByGroups({
      isAdmin: false,
      groupSlugs: ['staff'],
      pagePath: '/arp',
    })).toBe(false)
  })
})

describe('path helpers', () => {
  it('joins slugs and child paths', () => {
    expect(joinConnectPageSlugs(['arp', 'issue-1'])).toBe('/arp/issue-1')
    expect(childPagePath('/arp', 'contributors')).toBe('/arp/contributors')
    expect(childPagePath(null, 'arp')).toBe('/arp')
  })

  it('maps group slugs to prefixes', () => {
    expect(editorPrefixesForGroups(['arp', 'hr', 'registrar', 'unknown'])).toEqual([
      '/arp',
      '/hr',
      '/registrar',
    ])
  })
})
