/** Shared shape for class planner rows (Connect API + client composable). */
export type ClassPlannerItem = {
  id: number
  sectionKey: string
  termCode: string | null
  termLabel: string
  courseCode: string
  courseTitle: string
  section: string
  credits: number | null
  instructor: string
  deliveryMethod: string
  location: string
  statusAtSave: string
  studentNote: string
  updatedAt: string | null
}

export type PlannerOfferingSlice = {
  id?: number
  fullClassId?: string | null
  term?: string | null
  shortName?: string
  shortDescription?: string
  section?: string
  credits?: number | null
  instructor?: string | null
  deliveryMethod?: string | null
  location?: string | null
  classStatus?: string | null
}

export function termLabelFromCode(code: string | null | undefined): string {
  if (!code) return 'Unknown term'
  const upper = code.toUpperCase()
  const prefix = upper.slice(0, 2)
  const yearToken = upper.slice(2)
  const yearNum = Number(yearToken)
  const year = Number.isFinite(yearNum) ? 2000 + yearNum : null
  const season = prefix === 'SP' ? 'Spring' : prefix === 'SU' ? 'Summer' : prefix === 'FA' ? 'Fall' : upper
  return year ? `${season} ${year}` : season
}

type PlannerDocCore = {
  id: number
  term?: string | null
  substitutionNotes?: string | null
  updatedAt?: string | null
}

/** Build one planner row from a Payload student-course-record + resolved course-offering fields. */
export function plannerItemFromDocAndOffering(
  doc: PlannerDocCore,
  offering: PlannerOfferingSlice | null | undefined,
): ClassPlannerItem | null {
  if (!offering?.fullClassId) return null
  const termCode = offering.term ?? doc.term ?? null
  return {
    id: doc.id,
    sectionKey: String(offering.fullClassId || '').trim().toUpperCase(),
    termCode,
    termLabel: termLabelFromCode(termCode),
    courseCode: offering.shortName || '',
    courseTitle: offering.shortDescription || '',
    section: offering.section || '',
    credits: offering.credits ?? null,
    instructor: offering.instructor || '',
    deliveryMethod: offering.deliveryMethod || '',
    location: offering.location || '',
    statusAtSave: offering.classStatus || '',
    studentNote: doc.substitutionNotes || '',
    updatedAt: doc.updatedAt || null,
  }
}
