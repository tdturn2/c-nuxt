const DIRECTORY_PATHS = new Set([
  '/student-directory',
  '/faculty-directory',
  '/employee-directory',
  '/alumni-directory',
  '/location-directory',
])

/** Marks a directory opened from a profile so the page can restore list place and scroll. */
export default defineNuxtRouteMiddleware((to, from) => {
  if (!DIRECTORY_PATHS.has(to.path)) return
  const returning = useState<string>('connect-directory-return', () => '')
  returning.value = from.path.startsWith('/user/') ? to.path : ''
})
