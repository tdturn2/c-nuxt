export type FacultyInfo = {
  id: number
  name: string
  username: string | null
  employeeTitle: string | null
  avatarUrl: string | null
}

export function formatInstructorName(raw: string): string {
  if (!raw?.trim()) return raw ?? ''
  const parts = raw.split(',').map((part) => part.trim())
  if (parts.length >= 2) return `${parts[1]} ${parts[0]}`
  return raw
}

export function useFacultyNameMap() {
  const { data: facultyNameMap } = useFetch<Record<string, FacultyInfo>>('/api/faculty/name-map', {
    key: 'faculty-name-map',
    lazy: true,
  })

  function lookupFaculty(rawInstructor: string): FacultyInfo | null {
    const map = facultyNameMap.value
    if (!map || !rawInstructor?.trim()) return null
    const key = rawInstructor.trim().toLowerCase()
    if (map[key]) return map[key]
    const [last, first] = key.split(',').map((part) => part.trim())
    if (last && first) {
      for (const [candidate, faculty] of Object.entries(map)) {
        const [candidateLast, candidateFirst] = candidate.split(',').map((part) => part.trim())
        if (candidateLast === last && (first.startsWith(candidateFirst) || candidateFirst.startsWith(first))) {
          return faculty
        }
      }
    }
    return null
  }

  return { lookupFaculty, formatInstructor: formatInstructorName }
}
