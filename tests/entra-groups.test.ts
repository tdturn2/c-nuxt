import { describe, expect, it } from 'vitest'
import {
  directoryGroupLabel,
  filterableDirectoryGroupNames,
  groupNamesFromLoginClaims,
  isDirectoryGroupObjectId,
} from '../server/utils/entra'

describe('directory group labels', () => {
  it('keeps display names and drops object ids', () => {
    expect(directoryGroupLabel('CX Faculty')).toBe('CX Faculty')
    expect(directoryGroupLabel('  CX Staff  ')).toBe('CX Staff')
    expect(isDirectoryGroupObjectId('0c7e6f1a-1b2c-4d3e-8f90-aabbccddeeff')).toBe(true)
    expect(directoryGroupLabel('0c7e6f1a-1b2c-4d3e-8f90-aabbccddeeff')).toBeNull()
  })

  it('uses the CN from an Active Directory distinguished name', () => {
    expect(directoryGroupLabel('CN=FacultySec,OU=Staff,DC=asburyseminary,DC=edu')).toBe('FacultySec')
  })
})

describe('filterable directory groups', () => {
  it('lists on-premises group names and login claims, skipping cloud groups and object ids', () => {
    const names = filterableDirectoryGroupNames({
      graphGroups: [
        {
          '@odata.type': '#microsoft.graph.group',
          displayName: 'CX Faculty',
          onPremisesSamAccountName: 'CX Faculty',
          onPremisesSyncEnabled: true,
        },
        {
          '@odata.type': '#microsoft.graph.group',
          displayName: 'All Company',
          onPremisesSyncEnabled: false,
        },
        {
          '@odata.type': '#microsoft.graph.directoryRole',
          displayName: 'Global Administrator',
        },
        {
          displayName: 'CX Students',
          onPremisesSyncEnabled: true,
        },
      ],
      claimGroups: [
        '0c7e6f1a-1b2c-4d3e-8f90-aabbccddeeff',
        'CN=CX Alumni,OU=Groups,DC=asburyseminary,DC=edu',
        'CX Faculty',
      ],
    })

    expect(names).toEqual(['CX Alumni', 'CX Faculty', 'CX Students'])
  })

  it('falls back to every group name when none are marked on-premises', () => {
    expect(
      filterableDirectoryGroupNames({
        graphGroups: [
          { '@odata.type': '#microsoft.graph.group', displayName: 'Library Staff' },
          { '@odata.type': '#microsoft.graph.group', displayName: 'Chapel Team' },
        ],
      })
    ).toEqual(['Chapel Team', 'Library Staff'])
  })

  it('reads groups, memberOf, and the groups claim', () => {
    expect(
      groupNamesFromLoginClaims({
        groups: 'CX Staff',
        memberOf: ['CN=FacultySec,OU=Staff,DC=example,DC=edu'],
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': ['CX Students'],
      })
    ).toEqual(['CX Staff', 'FacultySec', 'CX Students'])
  })
})
