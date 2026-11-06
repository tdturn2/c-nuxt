export const FACULTY_TYPES = [
  { label: 'Regular', value: 'regular' },
  { label: 'Distinguished', value: 'distinguished' },
  { label: 'Emeritus', value: 'emeritus' },
  { label: 'Adjunct', value: 'adjunct' },
  { label: 'Affiliate', value: 'affiliate' },
] as const

export type FacultyType = (typeof FACULTY_TYPES)[number]['value']

const FACULTY_TYPE_MARKERS: Array<{ type: FacultyType; pattern: RegExp }> = [
  { type: 'emeritus', pattern: /\bemeritus\b/i },
  { type: 'adjunct', pattern: /\badjunct\b/i },
  { type: 'affiliate', pattern: /\baffiliate\b/i },
  { type: 'distinguished', pattern: /distinguished/i },
]

/** Appointment category from job title. Unmarked titles (professor, dean, instructor, …) are regular. */
export function facultyTypeFromTitle(title: string | null | undefined): FacultyType {
  const normalized = (title ?? '').trim()
  for (const marker of FACULTY_TYPE_MARKERS) {
    if (marker.pattern.test(normalized)) return marker.type
  }
  return 'regular'
}

export function isHiddenFromFacultyDirectory(user: { hideFromFacultyDirectory?: boolean | null } | null | undefined): boolean {
  return user?.hideFromFacultyDirectory === true
}

/** Public faculty listing and faculty profile layout. The faculty role can remain for permissions. */
export function isPublicFaculty(user: {
  roles?: unknown
  hideFromFacultyDirectory?: boolean | null
} | null | undefined): boolean {
  if (isHiddenFromFacultyDirectory(user)) return false
  const roles = Array.isArray(user?.roles) ? user.roles : []
  return roles.some((role) => String(role).trim().toLowerCase() === 'faculty')
}
