/** Static Connect routes surfaced under Resources in site search. */
export type SiteSearchResourceLink = {
  label: string
  to: string
  icon: string
  description?: string
  children?: SiteSearchResourceLink[]
}

export const SITE_SEARCH_RESOURCE_LINKS: SiteSearchResourceLink[] = [
  { label: 'Home', to: '/', icon: 'i-lucide-house', description: 'Connect home feed' },
  {
    label: 'Departments and Offices',
    to: '/internal',
    icon: 'i-heroicons-building-office-2',
    description: 'Department and office pages',
  },
  {
    label: 'Chapel',
    to: '/chapel',
    icon: 'i-heroicons-building-library',
    description: 'Chapel schedule and media',
    children: [
      { label: 'Daily Eucharist', to: '/chapel/daily-eucharist', icon: 'i-heroicons-calendar-days' },
      { label: 'Chapel Media Archive', to: '/media/chapel', icon: 'i-lucide-podcast' },
    ],
  },
  { label: 'Calendar', to: '/calendar', icon: 'i-heroicons-calendar-days', description: 'Campus calendar' },
  {
    label: 'Students',
    to: '/students',
    icon: 'i-lucide-graduation-cap',
    description: 'Student resources',
    children: [
      { label: 'My Dashboard', to: '/student-dashboard', icon: 'i-lucide-layout-dashboard' },
      { label: 'Class Search', to: '/class-search', icon: 'i-lucide-search' },
      { label: 'Degree Map', to: '/user/degree-map', icon: 'i-lucide-map' },
    ],
  },
  {
    label: 'Media',
    to: '/media/wesworld',
    icon: 'i-lucide-podcast',
    description: 'Podcasts and media',
    children: [
      { label: 'WesWorld', to: '/media/wesworld', icon: 'i-lucide-podcast' },
      { label: "It's Elementary", to: '/media/elementary', icon: 'i-lucide-podcast' },
    ],
  },
  {
    label: 'Directories',
    to: '/student-directory',
    icon: 'i-lucide-users',
    description: 'People directories',
    children: [
      { label: 'Student Directory', to: '/student-directory', icon: 'i-lucide-users' },
      { label: 'Faculty Directory', to: '/faculty-directory', icon: 'i-lucide-users' },
      { label: 'Employee Directory', to: '/employee-directory', icon: 'i-lucide-users' },
      { label: 'Alumni Directory', to: '/alumni-directory', icon: 'i-lucide-users' },
      { label: 'Alumni Wall', to: '/alumni-wall', icon: 'i-lucide-users' },
    ],
  },
  { label: 'Jobs Board', to: '/jobs', icon: 'i-heroicons-briefcase', description: 'Campus jobs' },
  { label: 'Marketplace', to: '/marketplace', icon: 'i-heroicons-shopping-bag', description: 'Buy and sell' },
  { label: 'Faculty', to: '/faculty', icon: 'i-heroicons-academic-cap', description: 'Faculty hub' },
  { label: 'Staff', to: '/staff', icon: 'i-heroicons-briefcase', description: 'Staff hub' },
]
