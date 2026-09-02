import { describe, expect, it } from 'vitest'
import { hasFacultyHubAccess } from '../shared/facultyHubAccess'
import { hasStaffHubAccess } from '../shared/staffHubAccess'
import { isConnectAdminUser } from '../shared/connectUserAccess'
import { applyRolePreview, isRolePreviewRole } from '../shared/impersonation'
import { signViewAsCookie, verifyViewAsCookie } from '../server/utils/viewAsCookie'

const adminUser = {
  id: 1,
  email: 'terry.turner@asburyseminary.edu',
  name: 'Terry Turner',
  roles: ['admin', 'staff'],
  fields: { roles: ['admin'] },
  groups: [{ id: 9, slug: 'admin', name: 'Connect Admin' }],
}

describe('role preview overlay', () => {
  it('keeps identity and strips admin for student preview', () => {
    const next = applyRolePreview(adminUser, 'student', adminUser.email)
    expect(next.id).toBe(1)
    expect(next.email).toBe(adminUser.email)
    expect(next.name).toBe(adminUser.name)
    expect(next.roles).toEqual(['student'])
    expect(next.fields.roles).toEqual(['student'])
    expect(next.groups).toEqual([])
    expect(next.impersonation).toEqual({
      active: true,
      mode: 'role',
      role: 'student',
      actorEmail: adminUser.email,
    })
    expect(isConnectAdminUser(next)).toBe(false)
    expect(hasFacultyHubAccess(next)).toBe(false)
    expect(hasStaffHubAccess(next)).toBe(false)
  })

  it('grants faculty hub access without admin groups', () => {
    const next = applyRolePreview(adminUser, 'faculty', adminUser.email)
    expect(next.roles).toEqual(['faculty'])
    expect(isConnectAdminUser(next)).toBe(false)
    expect(hasFacultyHubAccess(next)).toBe(true)
    expect(hasStaffHubAccess(next)).toBe(false)
    expect(next.groups).toEqual([
      { id: 'preview-faculty-access', slug: 'faculty-access', name: 'Faculty Access' },
    ])
  })

  it('grants staff hub access without dashboard admin', () => {
    const next = applyRolePreview(adminUser, 'staff', adminUser.email)
    expect(next.roles).toEqual(['staff'])
    expect(isConnectAdminUser(next)).toBe(false)
    expect(hasStaffHubAccess(next)).toBe(true)
    expect(hasFacultyHubAccess(next)).toBe(false)
    expect(next.groups).toEqual([])
  })

  it('detects real admins by role or group', () => {
    expect(isConnectAdminUser(adminUser)).toBe(true)
    expect(isConnectAdminUser({ roles: ['staff'], groups: [] })).toBe(false)
    expect(isConnectAdminUser({ roles: [], groups: [{ slug: 'connect-admin', name: 'Connect Admin' }] })).toBe(true)
  })

  it('validates preview roles', () => {
    expect(isRolePreviewRole('student')).toBe(true)
    expect(isRolePreviewRole('admin')).toBe(false)
  })
})

describe('view-as cookie', () => {
  const secret = 'test-auth-secret'
  const payload = {
    v: 1 as const,
    mode: 'role' as const,
    role: 'faculty' as const,
    actorEmail: 'terry.turner@asburyseminary.edu',
    exp: Math.floor(Date.now() / 1000) + 3600,
  }

  it('round-trips a signed payload', () => {
    const token = signViewAsCookie(payload, secret)
    expect(verifyViewAsCookie(token, secret)).toEqual({
      ...payload,
      actorEmail: payload.actorEmail,
    })
  })

  it('rejects a tampered body', () => {
    const token = signViewAsCookie(payload, secret)
    const [body, mac] = token.split('.')
    const tampered = Buffer.from(JSON.stringify({ ...payload, role: 'staff' })).toString('base64url')
    expect(verifyViewAsCookie(`${tampered}.${mac}`, secret)).toBeNull()
    expect(verifyViewAsCookie(`${body}.aaaa`, secret)).toBeNull()
  })

  it('rejects an expired payload', () => {
    const token = signViewAsCookie({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 }, secret)
    expect(verifyViewAsCookie(token, secret)).toBeNull()
  })
})
