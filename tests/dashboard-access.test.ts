import { describe, expect, it } from 'vitest'
import { isConnectAdminUser } from '../shared/connectUserAccess'
import {
  canAccessDashboard,
  canAccessDashboardSection,
  CHAPEL_PODCAST_GROUP_SLUG,
  JOBS_MANAGER_GROUP_SLUG,
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

const jobsManager = {
  roles: ['staff'],
  groups: [{ slug: JOBS_MANAGER_GROUP_SLUG, name: 'Jobs Manager' }],
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
    expect(canAccessDashboardSection(chapelEditor, 'analytics')).toBe(false)
    expect(canAccessDashboardSection(admin, 'analytics')).toBe(true)
  })

  it('lets jobs-manager members open the dashboard and Jobs Manager only', () => {
    expect(canAccessDashboard(jobsManager)).toBe(true)
    expect(canAccessDashboardSection(jobsManager, 'home')).toBe(true)
    expect(canAccessDashboardSection(jobsManager, 'jobs')).toBe(true)
    expect(canAccessDashboardSection(jobsManager, 'users')).toBe(false)
    expect(canAccessDashboardSection(jobsManager, 'chapel')).toBe(false)
    expect(canAccessDashboardSection(jobsManager, 'analytics')).toBe(false)
  })
})
