import { createError } from 'h3'

type CanvasApiConfig = {
  baseUrl: string
  apiKey: string
}

type CanvasUser = {
  id: number
  name?: string
  short_name?: string
  sortable_name?: string
  login_id?: string
  primary_email?: string
}

type CanvasEnrollment = {
  id: number
  enrollment_state?: string
  course_id?: number
  course?: {
    id: number
    name?: string
    course_code?: string
    html_url?: string | null
    image_download_url?: string | null
    image?: string | null
  }
  grades?: {
    current_score?: number | null
    current_grade?: string | null
    final_score?: number | null
    final_grade?: string | null
  } | null
  computed_current_score?: number | null
  computed_current_grade?: string | null
}

type CanvasEnrollmentWithCourse = CanvasEnrollment & {
  course?: CanvasEnrollment['course']
}

type CanvasTodo = {
  type?: string
  assignment?: {
    id?: number
    name?: string
    due_at?: string | null
    html_url?: string | null
  }
  course_id?: number
  html_url?: string | null
  context_name?: string | null
  ignore?: () => Promise<void>
}

type CanvasPlannerItem = {
  plannable_id?: number
  plannable_type?: string
  plannable?: {
    title?: string
    due_at?: string | null
    html_url?: string | null
    points_possible?: number | null
  } | null
  context_name?: string | null
  course_id?: number | null
}

type CanvasConversation = {
  id: number
  subject?: string | null
  last_message?: string | null
  last_message_at?: string | null
}

type CanvasAnnouncement = {
  id: number
  title?: string | null
  message?: string | null
  posted_at?: string | null
  html_url?: string | null
  context_code?: string | null
}

type CanvasUpcomingEvent = {
  id: number
  title?: string | null
  start_at?: string | null
  end_at?: string | null
  html_url?: string | null
  context_name?: string | null
}

type CanvasSubmission = {
  assignment_id?: number
  assignment?: {
    name?: string | null
    html_url?: string | null
  }
  submission_comments?: Array<{
    id?: number
    created_at?: string | null
    comment?: string | null
    author_name?: string | null
  }>
}

export type StudentDashboardData = {
  student: {
    email: string
    canvasUserId: number
    name: string | null
  }
  summary: {
    currentGpa: number | null
    averageGrade: number | null
  }
  courses: Array<{
    id: number | null
    name: string
    code: string | null
    url: string | null
    imageUrl: string | null
    currentScore: number | null
    currentGrade: string | null
  }>
  assignmentsDueThisWeek: Array<{
    id: number | null
    title: string
    courseName: string | null
    dueAt: string | null
    url: string | null
    pointsPossible: number | null
  }>
  todoMissing: Array<{
    title: string
    courseName: string | null
    dueAt: string | null
    url: string | null
    type: string | null
  }>
  messagesAnnouncements: {
    messages: Array<{
      id: number
      subject: string
      preview: string | null
      at: string | null
    }>
    announcements: Array<{
      id: number
      title: string
      preview: string | null
      postedAt: string | null
      url: string | null
    }>
  }
  recentFeedback: Array<{
    assignmentName: string
    comment: string
    author: string | null
    createdAt: string | null
    assignmentUrl: string | null
  }>
  calendar: Array<{
    id: number
    title: string
    startAt: string | null
    endAt: string | null
    contextName: string | null
    url: string | null
  }>
  meta: {
    generatedAt: string
    links: {
      courses: string
      assignments: string
      todo: string
      messages: string
      announcements: string
      feedback: string
      calendar: string
    }
  }
}

function sanitizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function getCanvasConfig(): CanvasApiConfig {
  const config = useRuntimeConfig() as any
  const baseUrl = config.instructureBaseUrl as string | undefined
  const apiKey = config.instructureApiKey as string | undefined

  if (!baseUrl || !apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Canvas credentials are not configured'
    })
  }

  return {
    baseUrl: sanitizeBaseUrl(baseUrl),
    apiKey
  }
}

async function canvasFetch<T>(path: string, query?: Record<string, any>): Promise<T> {
  const cfg = getCanvasConfig()
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey}`
  }

  try {
    return await $fetch<T>(`${cfg.baseUrl}${path}`, { headers, query })
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status || 500
    if (statusCode === 401 || statusCode === 403) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Canvas authentication failed. Verify INSTRUCTURE_API_KEY token permissions.'
      })
    }

    throw createError({
      statusCode: statusCode >= 400 && statusCode < 500 ? statusCode : 502,
      statusMessage:
        error?.data?.errors?.[0]?.message ||
        error?.data?.error ||
        error?.statusMessage ||
        error?.message ||
        `Canvas request failed at ${path}`
    })
  }
}

async function canvasFetchCourse(courseId: number): Promise<CanvasEnrollment['course'] | null> {
  try {
    const course = await canvasFetch<CanvasEnrollment['course']>(`/api/v1/courses/${courseId}`, {
      include: ['course_image']
    })
    return course || null
  } catch {
    return null
  }
}

async function hydrateMissingCourses(
  enrollments: CanvasEnrollmentWithCourse[]
): Promise<CanvasEnrollmentWithCourse[]> {
  const missingCourseIds = Array.from(
    new Set(
      enrollments
        .filter((e) => !e.course?.name && e.course_id)
        .map((e) => Number(e.course_id))
        .filter((id) => Number.isFinite(id))
    )
  )

  if (!missingCourseIds.length) return enrollments

  const fetchedById = new Map<number, CanvasEnrollment['course'] | null>()
  await Promise.all(
    missingCourseIds.map(async (courseId) => {
      fetchedById.set(courseId, await canvasFetchCourse(courseId))
    })
  )

  return enrollments.map((enrollment) => {
    if (enrollment.course?.name || !enrollment.course_id) return enrollment
    const fetched = fetchedById.get(Number(enrollment.course_id))
    return fetched ? { ...enrollment, course: fetched } : enrollment
  })
}

async function findCanvasUserByEmail(email: string): Promise<CanvasUser> {
  try {
    const users = await canvasFetch<CanvasUser[]>('/api/v1/accounts/self/users', {
      search_term: email
    })

    const wanted = email.toLowerCase()
    const exactMatches = (users || []).filter((u) => {
      const login = (u.login_id || '').toLowerCase()
      const primaryEmail = (u.primary_email || '').toLowerCase()
      return login === wanted || primaryEmail === wanted
    })

    if (exactMatches.length === 1) return exactMatches[0]
    if (exactMatches.length > 1) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Multiple Canvas users found for this email'
      })
    }
    if (!users?.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No Canvas user found for this email'
      })
    }
    if (users.length === 1) return users[0]
  } catch (error: any) {
    if (![401, 403].includes(error?.statusCode)) throw error
  }

  const self = await canvasFetch<CanvasUser>('/api/v1/users/self/profile')
  const wanted = email.toLowerCase()
  const selfEmail = (self.primary_email || self.login_id || '').toLowerCase()

  if (!selfEmail) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Canvas self profile did not include an email for verification'
    })
  }

  if (selfEmail !== wanted) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Canvas token user does not match authenticated SSO email'
    })
  }

  return self
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function computeAverageGrade(courses: StudentDashboardData['courses']): number | null {
  const numeric = courses
    .map((c) => c.currentScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (!numeric.length) return null
  const avg = numeric.reduce((sum, current) => sum + current, 0) / numeric.length
  return Number(avg.toFixed(2))
}

function estimateCurrentGpa(courses: StudentDashboardData['courses']): number | null {
  const graded = courses
    .map((c) => c.currentGrade?.toUpperCase().trim() || null)
    .filter((g): g is string => Boolean(g))

  if (!graded.length) return null

  const letterToPoints: Record<string, number> = {
    'A+': 4.0, A: 4.0, 'A-': 3.7,
    'B+': 3.3, B: 3.0, 'B-': 2.7,
    'C+': 2.3, C: 2.0, 'C-': 1.7,
    'D+': 1.3, D: 1.0, 'D-': 0.7,
    F: 0.0
  }

  let total = 0
  let count = 0

  for (const grade of graded) {
    if (grade in letterToPoints) {
      total += letterToPoints[grade]
      count += 1
    }
  }

  if (!count) return null
  return Number((total / count).toFixed(2))
}

export async function getStudentDashboardData(email: string): Promise<StudentDashboardData> {
  const canvasBaseUrl = getCanvasConfig().baseUrl
  const user = await findCanvasUserByEmail(email)

  let enrollments: CanvasEnrollmentWithCourse[] = []
  try {
    enrollments = await canvasFetch<CanvasEnrollmentWithCourse[]>(
      `/api/v1/users/${user.id}/enrollments`,
      {
        include: ['course'],
        state: ['active', 'invited'],
        per_page: 100
      }
    )
  } catch (error: any) {
    // Some tenants reject array query serialization. Retry with minimal query.
    if (![400, 422, 500, 502].includes(error?.statusCode)) throw error
    enrollments = await canvasFetch<CanvasEnrollmentWithCourse[]>(
      `/api/v1/users/${user.id}/enrollments`,
      {
        include: ['course'],
        per_page: 100
      }
    )
  }
  enrollments = await hydrateMissingCourses(enrollments || [])

  const courses: StudentDashboardData['courses'] = (enrollments || []).map((enrollment) => ({
    id: enrollment.course?.id ?? enrollment.course_id ?? null,
    name: enrollment.course?.name || 'Unknown course',
    code: enrollment.course?.course_code || null,
    url: enrollment.course?.html_url || null,
    imageUrl: enrollment.course?.image_download_url || enrollment.course?.image || null,
    currentScore: parseNumber(
      enrollment.grades?.current_score ?? enrollment.computed_current_score ?? null
    ),
    currentGrade:
      enrollment.grades?.current_grade ??
      enrollment.computed_current_grade ??
      null
  }))

  const averageGrade = computeAverageGrade(courses)
  const currentGpa = estimateCurrentGpa(courses)
  const courseIds = courses.map((c) => c.id).filter((id): id is number => Number.isFinite(id))

  const startOfWeek = new Date()
  const day = startOfWeek.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  startOfWeek.setDate(startOfWeek.getDate() + mondayOffset)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const [plannerItemsResult, todoResult, messagesResult, calendarResult] = await Promise.allSettled([
    canvasFetch<CanvasPlannerItem[]>(`/api/v1/users/${user.id}/planner/items`, {
      start_date: startOfWeek.toISOString(),
      end_date: endOfWeek.toISOString(),
      per_page: 100
    }),
    canvasFetch<CanvasTodo[]>(`/api/v1/users/${user.id}/todo`, { per_page: 50 }),
    canvasFetch<CanvasConversation[]>(`/api/v1/conversations`, { scope: 'unread', per_page: 10 }),
    canvasFetch<CanvasUpcomingEvent[]>(`/api/v1/users/${user.id}/upcoming_events`, { per_page: 10 })
  ])

  const plannerItems = plannerItemsResult.status === 'fulfilled' ? plannerItemsResult.value : []
  const todoItems = todoResult.status === 'fulfilled' ? todoResult.value : []
  const messages = messagesResult.status === 'fulfilled' ? messagesResult.value : []
  const upcomingEvents = calendarResult.status === 'fulfilled' ? calendarResult.value : []

  const assignmentsDueThisWeek: StudentDashboardData['assignmentsDueThisWeek'] = plannerItems
    .filter((item) => (item.plannable_type || '').toLowerCase() === 'assignment')
    .map((item) => ({
      id: item.plannable_id ?? null,
      title: item.plannable?.title || 'Untitled assignment',
      courseName: item.context_name || null,
      dueAt: item.plannable?.due_at || null,
      url: item.plannable?.html_url || null,
      pointsPossible: parseNumber(item.plannable?.points_possible ?? null)
    }))
    .sort((a, b) => {
      const aDate = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER
      const bDate = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER
      return aDate - bDate
    })

  const todoMissing: StudentDashboardData['todoMissing'] = todoItems.map((item) => ({
    title: item.assignment?.name || 'Untitled task',
    courseName: item.context_name || null,
    dueAt: item.assignment?.due_at || null,
    url: item.assignment?.html_url || item.html_url || null,
    type: item.type || null
  }))

  const announcements = courseIds.length
    ? await canvasFetch<CanvasAnnouncement[]>(`/api/v1/announcements`, {
      context_codes: courseIds.slice(0, 10).map((id) => `course_${id}`),
      per_page: 10
    }).catch(() => [])
    : []

  const messagesAnnouncements: StudentDashboardData['messagesAnnouncements'] = {
    messages: messages.map((message) => ({
      id: message.id,
      subject: message.subject || 'No subject',
      preview: message.last_message || null,
      at: message.last_message_at || null
    })),
    announcements: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title || 'Untitled announcement',
      preview: announcement.message || null,
      postedAt: announcement.posted_at || null,
      url: announcement.html_url || null
    }))
  }

  const feedbackBuckets = await Promise.all(
    courseIds.slice(0, 5).map(async (courseId) => {
      try {
        const submissions = await canvasFetch<CanvasSubmission[]>(
          `/api/v1/courses/${courseId}/students/submissions`,
          {
            student_ids: [String(user.id)],
            include: ['submission_comments', 'assignment'],
            per_page: 20
          }
        )

        return (submissions || []).flatMap((submission) =>
          (submission.submission_comments || []).map((comment) => ({
            assignmentName: submission.assignment?.name || 'Assignment',
            assignmentUrl: submission.assignment?.html_url || null,
            comment: comment.comment || '',
            author: comment.author_name || null,
            createdAt: comment.created_at || null
          }))
        )
      } catch {
        return []
      }
    })
  )

  const recentFeedback = feedbackBuckets
    .flat()
    .filter((item) => item.comment.trim().length > 0)
    .sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTs - aTs
    })
    .slice(0, 8)

  const calendar: StudentDashboardData['calendar'] = upcomingEvents.map((event) => ({
    id: event.id,
    title: event.title || 'Calendar event',
    startAt: event.start_at || null,
    endAt: event.end_at || null,
    contextName: event.context_name || null,
    url: event.html_url || null
  }))

  return {
    student: {
      email,
      canvasUserId: user.id,
      name: user.name || user.short_name || user.sortable_name || null
    },
    summary: {
      currentGpa,
      averageGrade
    },
    courses,
    assignmentsDueThisWeek,
    todoMissing,
    messagesAnnouncements,
    recentFeedback,
    calendar,
    meta: {
      generatedAt: new Date().toISOString(),
      links: {
        courses: `${canvasBaseUrl}/courses`,
        assignments: `${canvasBaseUrl}/calendar`,
        todo: `${canvasBaseUrl}/`,
        messages: `${canvasBaseUrl}/conversations`,
        announcements: `${canvasBaseUrl}/`,
        feedback: `${canvasBaseUrl}/grades`,
        calendar: `${canvasBaseUrl}/calendar`
      }
    }
  }
}
