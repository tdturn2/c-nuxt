<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Student Dashboard</h1>
            <p class="text-sm text-gray-600">Your Canvas snapshot for courses, deadlines, and updates.</p>
          </div>
          <p class="text-xs text-gray-500">
            Updated: {{ generatedAtLabel }}
          </p>
        </header>

        <UProgress
          v-if="pending && hasAnyData"
          animation="carousel"
          color="primary"
          size="xs"
        />

        <div
          v-if="error && !hasAnyData"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <template v-else>
          <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div class="sm:col-span-2 xl:col-span-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Courses</h2>
              <a class="text-sm text-blue-700 hover:text-blue-900" :href="sectionLinks.courses" target="_blank" rel="noopener noreferrer">Open in Canvas</a>
            </div>
            <article
              v-if="showInitialSkeleton"
              v-for="n in courseSkeletonCount"
              :key="`course-skeleton-${n}`"
              class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
            >
              <USkeleton class="h-28 w-full" />
              <div class="p-4 space-y-3">
                <USkeleton class="h-3 w-20" />
                <USkeleton class="h-5 w-3/4" />
                <div class="flex items-center justify-between">
                  <USkeleton class="h-3 w-24" />
                  <USkeleton class="h-4 w-14" />
                </div>
              </div>
            </article>
            <a
              v-for="course in courses"
              :key="`course-${course.id ?? course.name}`"
              :href="course.url || undefined"
              :target="course.url ? '_blank' : undefined"
              :rel="course.url ? 'noopener noreferrer' : undefined"
              class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              :class="course.url ? 'transition hover:shadow-md hover:border-gray-300 cursor-pointer' : ''"
            >
              <div
                class="h-28 w-full bg-gray-100 bg-cover bg-center"
                :style="course.imageUrl ? { backgroundImage: `url('${course.imageUrl}')` } : undefined"
              >
                <div v-if="!course.imageUrl" class="flex h-full items-center justify-center text-xs uppercase tracking-wide text-gray-500">
                  No course image
                </div>
              </div>
              <div class="p-4">
                <p class="text-xs uppercase tracking-wide text-gray-500">
                  {{ course.code || 'Course' }}
                </p>
                <h2 class="mt-1 text-base font-semibold text-gray-900">{{ course.name }}</h2>
                <div class="mt-3 flex items-center justify-between text-sm">
                  <span class="text-gray-600">Current grade</span>
                  <span class="font-semibold text-gray-900">{{ formatCourseGrade(course.currentScore, course.currentGrade) }}</span>
                </div>
              </div>
            </a>
          </section>

          <section class="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-xs uppercase tracking-wide text-blue-700">Main Focus</p>
                <h2 class="text-lg font-semibold text-blue-900">Assignments Due This Week</h2>
              </div>
              <div class="flex items-center gap-3">
                <p class="text-sm text-blue-700">{{ assignmentsDueThisWeek.length }} due</p>
                <a class="text-sm text-blue-700 hover:text-blue-900" :href="sectionLinks.assignments" target="_blank" rel="noopener noreferrer">Open in Canvas</a>
              </div>
            </div>

            <ul v-if="showInitialSkeleton" class="mt-4 space-y-3">
              <li
                v-for="n in 4"
                :key="`assignment-skeleton-${n}`"
                class="rounded-md border border-blue-200 bg-white px-4 py-3 space-y-2"
              >
                <USkeleton class="h-4 w-2/3" />
                <USkeleton class="h-3 w-1/3" />
              </li>
            </ul>

            <div v-else-if="!assignmentsDueThisWeek.length" class="mt-4 text-sm text-blue-800">
              No assignments due this week.
            </div>

            <ul v-else class="mt-4 space-y-3">
              <li
                v-for="assignment in assignmentsDueThisWeek"
                :key="`due-${assignment.id ?? assignment.title}`"
                class="rounded-md border border-blue-200 bg-white px-4 py-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <a
                      class="font-medium text-gray-900 hover:text-blue-700"
                      :href="assignment.url || undefined"
                      :target="assignment.url ? '_blank' : undefined"
                      :rel="assignment.url ? 'noopener noreferrer' : undefined"
                    >
                      {{ assignment.title }}
                    </a>
                    <p class="text-xs text-gray-600">{{ assignment.courseName || 'Course unavailable' }}</p>
                  </div>
                  <p class="text-sm font-semibold text-blue-800">{{ formatDateTime(assignment.dueAt) }}</p>
                </div>
              </li>
            </ul>
          </section>

          <section class="grid gap-4 xl:grid-cols-2">
            <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">To-Do / Missing</h3>
                <a class="text-sm text-blue-700 hover:text-blue-900" :href="sectionLinks.todo" target="_blank" rel="noopener noreferrer">Open in Canvas</a>
              </div>
              <div v-if="showInitialSkeleton" class="mt-3 space-y-2">
                <USkeleton v-for="n in 4" :key="`todo-skeleton-${n}`" class="h-8 w-full" />
              </div>
              <ul v-else-if="todoMissing.length" class="mt-3 space-y-2 text-sm">
                <li v-for="item in todoMissing.slice(0, 6)" :key="`todo-${item.title}-${item.dueAt}`" class="border-b border-gray-100 pb-2 last:border-b-0">
                  <a
                    class="font-medium text-gray-900 hover:text-blue-700"
                    :href="item.url || undefined"
                    :target="item.url ? '_blank' : undefined"
                    :rel="item.url ? 'noopener noreferrer' : undefined"
                  >
                    {{ item.title }}
                  </a>
                  <p class="text-xs text-gray-600">
                    {{ item.courseName || 'Course unavailable' }} · {{ formatDateTime(item.dueAt) }}
                  </p>
                </li>
              </ul>
              <p v-else class="mt-3 text-sm text-gray-600">No to-do items right now.</p>
            </article>

            <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Calendar / Schedule</h3>
                <a class="text-sm text-blue-700 hover:text-blue-900" :href="sectionLinks.calendar" target="_blank" rel="noopener noreferrer">Open in Canvas</a>
              </div>
              <div v-if="showInitialSkeleton" class="mt-3 space-y-2">
                <USkeleton v-for="n in 4" :key="`calendar-skeleton-${n}`" class="h-8 w-full" />
              </div>
              <ul v-else-if="calendar.length" class="mt-3 space-y-2 text-sm">
                <li v-for="event in calendar.slice(0, 6)" :key="`event-${event.id}`" class="border-b border-gray-100 pb-2 last:border-b-0">
                  <a
                    class="font-medium text-gray-900 hover:text-blue-700"
                    :href="event.url || undefined"
                    :target="event.url ? '_blank' : undefined"
                    :rel="event.url ? 'noopener noreferrer' : undefined"
                  >
                    {{ event.title }}
                  </a>
                  <p class="text-xs text-gray-600">
                    {{ formatDateTime(event.startAt) }}<span v-if="event.contextName"> · {{ event.contextName }}</span>
                  </p>
                </li>
              </ul>
              <p v-else class="mt-3 text-sm text-gray-600">No upcoming calendar items.</p>
            </article>
          </section>

          <section class="grid gap-4 xl:grid-cols-2">
            <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Messages / Announcements</h3>
                <a class="text-sm text-blue-700 hover:text-blue-900" :href="sectionLinks.messages" target="_blank" rel="noopener noreferrer">Open in Canvas</a>
              </div>
              <div v-if="showInitialSkeleton" class="mt-3 space-y-2">
                <USkeleton v-for="n in 5" :key="`messages-skeleton-${n}`" class="h-7 w-full" />
              </div>
              <div v-else class="mt-3 space-y-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Messages</p>
                  <ul v-if="messagesAnnouncements.messages.length" class="mt-2 space-y-2 text-sm">
                    <li v-for="message in messagesAnnouncements.messages.slice(0, 5)" :key="`msg-${message.id}`">
                      <p class="font-medium text-gray-900">{{ message.subject }}</p>
                      <p class="text-xs text-gray-600">{{ formatDateTime(message.at) }}</p>
                    </li>
                  </ul>
                  <p v-else class="mt-2 text-sm text-gray-600">No recent messages.</p>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Announcements</p>
                  <ul v-if="messagesAnnouncements.announcements.length" class="mt-2 space-y-2 text-sm">
                    <li v-for="announcement in messagesAnnouncements.announcements.slice(0, 5)" :key="`ann-${announcement.id}`">
                      <a
                        class="font-medium text-gray-900 hover:text-blue-700"
                        :href="announcement.url || undefined"
                        :target="announcement.url ? '_blank' : undefined"
                        :rel="announcement.url ? 'noopener noreferrer' : undefined"
                      >
                        {{ announcement.title }}
                      </a>
                      <p class="text-xs text-gray-600">{{ formatDateTime(announcement.postedAt) }}</p>
                    </li>
                  </ul>
                  <p v-else class="mt-2 text-sm text-gray-600">No recent announcements.</p>
                </div>
              </div>
            </article>

            <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">Recent Feedback</h3>
                <a class="text-sm text-blue-700 hover:text-blue-900" :href="sectionLinks.feedback" target="_blank" rel="noopener noreferrer">Open in Canvas</a>
              </div>
              <div v-if="showInitialSkeleton" class="mt-3 space-y-3">
                <USkeleton v-for="n in 3" :key="`feedback-skeleton-${n}`" class="h-20 w-full rounded-md" />
              </div>
              <ul v-else-if="recentFeedback.length" class="mt-3 space-y-3 text-sm">
                <li
                  v-for="item in recentFeedback.slice(0, 6)"
                  :key="`feedback-${item.assignmentName}-${item.createdAt}`"
                  class="rounded-md border border-gray-100 bg-gray-50 p-3"
                >
                  <a
                    class="font-medium text-gray-900 hover:text-blue-700"
                    :href="item.assignmentUrl || undefined"
                    :target="item.assignmentUrl ? '_blank' : undefined"
                    :rel="item.assignmentUrl ? 'noopener noreferrer' : undefined"
                  >
                    {{ item.assignmentName }}
                  </a>
                  <p class="mt-1 text-gray-700 line-clamp-3">{{ item.comment }}</p>
                  <p class="mt-1 text-xs text-gray-500">
                    {{ item.author || 'Instructor' }} · {{ formatDateTime(item.createdAt) }}
                  </p>
                </li>
              </ul>
              <p v-else class="mt-3 text-sm text-gray-600">No feedback has been posted yet.</p>
            </article>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type StudentDashboardResponse = {
  summary?: {
    currentGpa?: number | null
    averageGrade?: number | null
  }
  courses?: Array<{
    id: number | null
    name: string
    code: string | null
    url: string | null
    imageUrl: string | null
    currentScore: number | null
    currentGrade: string | null
  }>
  assignmentsDueThisWeek?: Array<{
    id: number | null
    title: string
    courseName: string | null
    dueAt: string | null
    url: string | null
    pointsPossible: number | null
  }>
  todoMissing?: Array<{
    title: string
    courseName: string | null
    dueAt: string | null
    url: string | null
    type: string | null
  }>
  messagesAnnouncements?: {
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
  recentFeedback?: Array<{
    assignmentName: string
    comment: string
    author: string | null
    createdAt: string | null
    assignmentUrl: string | null
  }>
  calendar?: Array<{
    id: number
    title: string
    startAt: string | null
    endAt: string | null
    contextName: string | null
    url: string | null
  }>
  meta?: {
    generatedAt?: string
    links?: {
      courses?: string
      assignments?: string
      todo?: string
      messages?: string
      announcements?: string
      feedback?: string
      calendar?: string
    }
  }
}

const { data, pending, error } = useFetch<StudentDashboardResponse>('/api/student-dashboard', {
  key: 'student-dashboard',
  server: false,
  lazy: true,
  default: () => ({})
})

const dashboard = computed<StudentDashboardResponse>(() => data.value || {})
const courses = computed(() => dashboard.value.courses || [])
const assignmentsDueThisWeek = computed(() => dashboard.value.assignmentsDueThisWeek || [])
const todoMissing = computed(() => dashboard.value.todoMissing || [])
const messagesAnnouncements = computed(() => dashboard.value.messagesAnnouncements || { messages: [], announcements: [] })
const recentFeedback = computed(() => dashboard.value.recentFeedback || [])
const calendar = computed(() => dashboard.value.calendar || [])
const hasAnyData = computed(() => {
  return (
    courses.value.length > 0 ||
    assignmentsDueThisWeek.value.length > 0 ||
    todoMissing.value.length > 0 ||
    messagesAnnouncements.value.messages.length > 0 ||
    messagesAnnouncements.value.announcements.length > 0 ||
    recentFeedback.value.length > 0 ||
    calendar.value.length > 0
  )
})
const showInitialSkeleton = computed(() => pending.value && !hasAnyData.value && !error.value)
const courseSkeletonCount = 6
const sectionLinks = computed(() => {
  const links = dashboard.value.meta?.links
  return {
    courses: links?.courses || '#',
    assignments: links?.assignments || '#',
    todo: links?.todo || '#',
    messages: links?.messages || '#',
    feedback: links?.feedback || '#',
    calendar: links?.calendar || '#'
  }
})

const generatedAtLabel = computed(() => formatDateTime(dashboard.value.meta?.generatedAt || null))
const errorMessage = computed(() => {
  const e = error.value as any
  return e?.statusMessage || e?.message || 'Unable to load student dashboard.'
})

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Date unavailable'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(d)
}

function formatCourseGrade(score: number | null | undefined, letter: string | null | undefined) {
  const hasLetter = Boolean(letter && letter.trim().length)
  const hasNumericScore = score != null && Number.isFinite(score) && Number(score) > 0
  const scoreText = hasNumericScore ? `${Number(score).toFixed(2)}%` : null
  if (!scoreText && !hasLetter) return 'N/A'
  if (scoreText && letter) return `${scoreText} (${letter})`
  return scoreText || letter || 'N/A'
}
</script>
