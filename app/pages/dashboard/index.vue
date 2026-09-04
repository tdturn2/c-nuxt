<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />

    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p class="mt-1 text-sm text-gray-600">
            Admin panel for Connect dashboard sections.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">
          Checking access...
        </div>

        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard. Access is limited to Connect admins and assigned groups.
        </div>

        <template v-else>
          <div
            v-if="isAdmin && !me?.impersonation?.active"
            class="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 class="text-lg font-semibold text-gray-900">Preview as</h2>
            <p class="mt-1 text-sm text-gray-600">
              Stay signed in as yourself and temporarily view Connect with a student, faculty, or staff role.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <UButton
                color="neutral"
                variant="outline"
                :loading="impersonationPending"
                @click="startRolePreview('student')"
              >
                Student
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                :loading="impersonationPending"
                @click="startRolePreview('faculty')"
              >
                Faculty
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                :loading="impersonationPending"
                @click="startRolePreview('staff')"
              >
                Staff
              </UButton>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <NuxtLink
              v-for="section in visibleSections"
              :key="section.to"
              :to="section.to"
              class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">
                    {{ section.title }}
                  </h2>
                  <p class="mt-1 text-sm text-gray-600">
                    {{ section.description }}
                  </p>
                </div>
                <UIcon
                  :name="section.icon"
                  class="h-5 w-5 text-[rgba(13,94,130,1)] shrink-0"
                />
              </div>
              <p class="mt-4 text-sm font-medium text-[rgba(13,94,130,1)]">
                Open section
              </p>
            </NuxtLink>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { DashboardSection } from '@shared/dashboardAccess'

const { startRolePreview, pending: impersonationPending } = useImpersonation()
const { me, mePending, isAdmin, canAccessDashboard, canAccessSection } = useDashboardAccess()
const canManageDashboard = canAccessDashboard

const sections: Array<{
  title: string
  description: string
  to: string
  icon: string
  section: DashboardSection
}> = [
  {
    title: 'Posts',
    description: 'Create and manage homepage timeline posts.',
    to: '/dashboard/posts',
    icon: 'i-lucide-newspaper',
    section: 'posts',
  },
  {
    title: 'Users & Groups',
    description: 'Manage user accounts, roles, and permission groups.',
    to: '/dashboard/users',
    icon: 'i-lucide-users-round',
    section: 'users',
  },
  {
    title: 'Docs / Pages',
    description: 'Manage Connect pages, content, contacts, and media links.',
    to: '/dashboard/docs',
    icon: 'i-lucide-file-text',
    section: 'docs',
  },
  {
    title: 'Media',
    description: 'Browse, upload, and delete files stored in Connect S3.',
    to: '/dashboard/media',
    icon: 'i-lucide-folder-open',
    section: 'media',
  },
  {
    title: 'Degree Builder',
    description: 'Manage degree templates, sections, and required courses.',
    to: '/dashboard/degrees',
    icon: 'i-lucide-graduation-cap',
    section: 'degrees',
  },
  {
    title: 'Forms Builder',
    description: 'Create and manage schema-driven Connect forms.',
    to: '/dashboard/forms',
    icon: 'i-lucide-square-pen',
    section: 'forms',
  },
  {
    title: 'Home Slider',
    description: 'Manage homepage slider images, links, and display order.',
    to: '/dashboard/home-slider',
    icon: 'i-lucide-images',
    section: 'home-slider',
  },
  {
    title: 'Daily Eucharist',
    description: 'Manage weekly Eucharist toggle, summary, and schedule entries.',
    to: '/dashboard/daily-eucharist',
    icon: 'i-lucide-calendar-heart',
    section: 'daily-eucharist',
  },
  {
    title: 'Campus Hours',
    description: 'Kentucky campus week template and holiday exceptions.',
    to: '/dashboard/campus-hours',
    icon: 'i-lucide-clock',
    section: 'campus-hours',
  },
  {
    title: 'Chapel',
    description: 'Create and manage chapel episode entries.',
    to: '/dashboard/chapel',
    icon: 'i-lucide-mic-vocal',
    section: 'chapel',
  },
  {
    title: 'Chapel Speakers',
    description: 'Manage speaker profiles, titles, and photos.',
    to: '/dashboard/chapel-speakers',
    icon: 'i-lucide-user-round-pen',
    section: 'chapel-speakers',
  },
  {
    title: 'Toast Manager',
    description: 'Schedule in-app toast announcements (e.g. chapel Tue–Thu).',
    to: '/dashboard/toasts',
    icon: 'i-lucide-bell-ring',
    section: 'toasts',
  },
  {
    title: 'Jobs Manager',
    description: 'Review, publish, edit, and remove job board listings.',
    to: '/dashboard/jobs',
    icon: 'i-lucide-briefcase',
    section: 'jobs',
  },
  {
    title: 'Faculty Publications',
    description: 'Manage publication records for faculty members.',
    to: '/dashboard/faculty-publications',
    icon: 'i-lucide-book-open',
    section: 'faculty-publications',
  },
  {
    title: 'Featured Publications',
    description: 'Choose homepage featured book covers in connect-settings.',
    to: '/dashboard/featured-publications',
    icon: 'i-lucide-star',
    section: 'featured-publications',
  },
  {
    title: 'Form Results',
    description: 'Review incoming form submissions and exported responses.',
    to: '/dashboard/form-results',
    icon: 'i-lucide-clipboard-list',
    section: 'form-results',
  },
]

const visibleSections = computed(() =>
  sections.filter((section) => canAccessSection(section.section)),
)
</script>
