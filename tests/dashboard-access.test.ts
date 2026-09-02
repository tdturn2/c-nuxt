import { describe, expect, it } from 'vitest'
import { isConnectAdminUser } from '../shared/connectUserAccess'
import {
  canAccessDashboard,
  canAccessDashboardSection,
  CHAPEL_PODCAST_GROUP_SLUG,
} from '../shared/dashboardAccess'

const admin = {
  roles: ['admin', 'staff'],
  groups: [{ slug: 'admin', name: 'Connect Admin' }],
}

const staff = {
  roles: ['staff'],
  groups: [],
}

const chapelEditor = {
  roles: ['staff'],
  groups: [{ slug: CHAPEL_PODCAST_GROUP_SLUG, name: 'Chapel Podcast' }],
}

describe('dashboard section access', () => {
  it('opens the full dashboard to admins only', () => {
    expect(isConnectAdminUser(admin)).toBe(true)
    expect(canAccessDashboard(admin)).toBe(true)
    expect(canAccessDashboardSection(admin, 'users')).toBe(true)
    expect(canAccessDashboardSection(admin, 'chapel')).toBe(true)

    expect(isConnectAdminUser(staff)).toBe(false)
    expect(canAccessDashboard(staff)).toBe(false)
    expect(canAccessDashboardSection(staff, 'posts')).toBe(false)
    expect(canAccessDashboardSection(staff, 'chapel')).toBe(false)
  })

  it('lets chapel-podcast members use Chapel and Chapel Speakers only', () => {
    expect(canAccessDashboard(chapelEditor)).toBe(true)
    expect(canAccessDashboardSection(chapelEditor, 'home')).toBe(true)
    expect(canAccessDashboardSection(chapelEditor, 'chapel')).toBe(true)
    expect(canAccessDashboardSection(chapelEditor, 'chapel-speakers')).toBe(true)
    expect(canAccessDashboardSection(chapelEditor, 'users')).toBe(false)
    expect(canAccessDashboardSection(chapelEditor, 'jobs')).toBe(false)
    expect(canAccessDashboardSection(chapelEditor, 'campus-hours')).toBe(false)
  })
})
