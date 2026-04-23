type AlumniDegreeLike = {
  degree?: unknown
  graduationYear?: unknown
}

export const normalizeAlumniDegrees = (value: unknown): Array<{ degree: string; graduationYear: number | null }> => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      const source = (entry || {}) as AlumniDegreeLike
      const degree = String(source.degree ?? '').trim()
      const year = Number.parseInt(String(source.graduationYear ?? ''), 10)
      return {
        degree,
        graduationYear: Number.isFinite(year) ? year : null,
      }
    })
    .filter((entry) => entry.degree.length > 0)
}

export const formatAlumniDegree = (degree: { degree: string; graduationYear: number | null }): string => {
  if (!degree.graduationYear) return degree.degree
  return `${degree.degree} (${degree.graduationYear})`
}

export const sanitizeAlumniContact = (value: unknown) => {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    email: String(source.email ?? '').trim() || null,
    phone: String(source.phone ?? '').trim() || null,
    facebook: String(source.facebook ?? '').trim() || null,
    x: String(source.x ?? '').trim() || null,
    instagram: String(source.instagram ?? '').trim() || null,
  }
}
