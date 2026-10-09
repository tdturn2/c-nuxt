<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
          <p class="mt-1 max-w-3xl text-sm text-gray-600">
            Totals Connect can report from records it already stores. Sign-ins are one row per person per UTC day, written when someone opens an authenticated session.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canView"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          You do not have access to this dashboard section.
        </div>

        <template v-else>
          <div v-if="pending" class="py-8 text-gray-500">Loading analytics...</div>
          <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {{ error }}
          </div>

          <template v-else-if="summary">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="inline-flex rounded-md border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  class="rounded px-3 py-1.5 text-sm"
                  :class="windowDays === 7 ? 'bg-[rgba(13,94,130,1)] text-white' : 'text-gray-700'"
                  @click="windowDays = 7"
                >
                  Last 7 days
                </button>
                <button
                  type="button"
                  class="rounded px-3 py-1.5 text-sm"
                  :class="windowDays === 30 ? 'bg-[rgba(13,94,130,1)] text-white' : 'text-gray-700'"
                  @click="windowDays = 30"
                >
                  Last 30 days
                </button>
              </div>
              <p class="text-xs text-gray-500">Updated {{ generatedLabel }}</p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article v-for="card in headlineCards" :key="card.label" class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <p class="text-sm text-gray-500">{{ card.label }}</p>
                <p class="mt-2 text-3xl font-semibold text-gray-900">{{ formatCount(card.value) }}</p>
                <p class="mt-2 text-sm text-gray-600">{{ card.detail }}</p>
              </article>
            </div>

            <section class="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-semibold text-gray-900">Last 8 weeks</h2>
              <p class="mt-1 text-sm text-gray-600">
                New accounts are people whose Connect profile was created. Sign-ins are unique people who opened Connect. Interactions are posts, comments, and reactions.
              </p>
              <div class="mt-5 space-y-3">
                <div v-for="week in summary.weeks" :key="week.week" class="grid grid-cols-[5.5rem_1fr] items-center gap-3">
                  <span class="text-xs text-gray-500">{{ weekLabel(week.week) }}</span>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <div class="h-2 rounded bg-[rgba(13,94,130,1)]" :style="{ width: barWidth(week.accounts, maxAccounts) }" />
                      <span class="text-xs text-gray-600">{{ formatCount(week.accounts) }} accounts</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="h-2 rounded bg-emerald-600" :style="{ width: barWidth(week.signIns || 0, maxSignIns) }" />
                      <span class="text-xs text-gray-600">{{ formatCount(week.signIns || 0) }} sign-ins</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="h-2 rounded bg-amber-500" :style="{ width: barWidth(week.posts + week.comments + week.reactions, maxInteractions) }" />
                      <span class="text-xs text-gray-600">
                        {{ formatCount(week.posts + week.comments + week.reactions) }} interactions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section v-if="summary.signIns" class="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-semibold text-gray-900">Sign-ins</h2>
              <p class="mt-1 text-sm text-gray-600">{{ summary.signIns.note }}</p>
              <dl class="mt-4 divide-y divide-gray-100">
                <div class="flex items-center justify-between py-2 text-sm">
                  <dt class="text-gray-700">Unique sign-ins, last {{ windowDays }} days</dt>
                  <dd class="font-medium text-gray-900">{{ formatCount(pick(summary.signIns.people7, summary.signIns.people30)) }}</dd>
                </div>
                <div class="flex items-center justify-between py-2 text-sm">
                  <dt class="text-gray-700">Never signed in</dt>
                  <dd class="font-medium text-gray-900">{{ formatCount(summary.signIns.never) }}</dd>
                </div>
                <div
                  v-for="role in signInRoleRows"
                  :key="role.label"
                  class="flex items-center justify-between py-2 text-sm"
                >
                  <dt class="text-gray-700">{{ role.label }}</dt>
                  <dd class="font-medium text-gray-900">{{ formatCount(role.value) }}</dd>
                </div>
              </dl>
            </section>

            <div class="mt-6 grid gap-4 lg:grid-cols-2">
              <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900">Accounts by role</h2>
                <p class="mt-1 text-sm text-gray-600">A person can hold more than one role, so these counts can overlap.</p>
                <dl class="mt-4 divide-y divide-gray-100">
                  <div v-for="role in roleRows" :key="role.label" class="flex items-center justify-between py-2 text-sm">
                    <dt class="text-gray-700">{{ role.label }}</dt>
                    <dd class="font-medium text-gray-900">{{ formatCount(role.value) }}</dd>
                  </div>
                </dl>
              </section>

              <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900">Other activity, last 30 days</h2>
                <dl class="mt-4 divide-y divide-gray-100">
                  <div v-for="row in otherRows" :key="row.label" class="flex items-center justify-between gap-4 py-2 text-sm">
                    <dt class="text-gray-700">{{ row.label }}</dt>
                    <dd class="font-medium text-gray-900">{{ row.value }}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section class="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-semibold text-gray-900">Forms, last 30 days</h2>
              <p v-if="summary.forms.topForms.length === 0" class="mt-3 text-sm text-gray-600">No form submissions in this window.</p>
              <ul v-else class="mt-3 divide-y divide-gray-100">
                <li
                  v-for="form in summary.forms.topForms"
                  :key="form.slug"
                  class="flex items-center justify-between gap-4 py-2 text-sm"
                >
                  <span class="truncate text-gray-800">{{ form.title || form.slug }}</span>
                  <span class="shrink-0 font-medium text-gray-900">{{ formatCount(form.submissions) }}</span>
                </li>
              </ul>
            </section>
          </template>

          <section class="mt-8">
            <h2 class="text-lg font-semibold text-gray-900">What to track next</h2>
            <p class="mt-1 max-w-3xl text-sm text-gray-600">
              These are the reports this page cannot produce yet, in the order they are most useful.
            </p>
            <ol class="mt-4 space-y-3">
              <li
                v-for="(item, index) in recommendations"
                :key="item.title"
                class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <p class="text-sm font-semibold text-gray-900">{{ index + 1 }}. {{ item.title }}</p>
                <p class="mt-2 text-sm text-gray-700">{{ item.body }}</p>
              </li>
            </ol>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type WeekRow = {
  week: string
  accounts: number
  posts: number
  comments: number
  reactions: number
  signIns: number
}

type AnalyticsSummary = {
  generatedAt: string
  signInsTracked: boolean
  signIns: {
    people7: number
    people30: number
    never: number
    byRole7: Record<string, number>
    byRole30: Record<string, number>
    note: string
  }
  accounts: {
    total: number
    created7: number
    created30: number
    withoutRole: number
    byRole: Record<string, number>
    studentOptIn: number
    alumniOptIn: number
    withAvatar: number
  }
  engagement: { people7: number; people30: number; note: string }
  posts: { total: number; days7: number; days30: number; authors7: number; authors30: number }
  comments: { total: number; days7: number; days30: number; authors7: number; authors30: number }
  reactions: { total: number; days7: number; days30: number; people7: number; people30: number }
  forms: {
    submissions: number
    days7: number
    days30: number
    submitters7: number
    submitters30: number
    topForms: Array<{ title: string; slug: string; submissions: number }>
  }
  other: {
    jobsPublished: number
    jobsCreated30: number
    marketplaceActive: number
    marketplaceCreated30: number
    chapelEpisodes30: number
    degreePlans30: number
    notifications30: number
    notificationsRead30: number
  }
  weeks: WeekRow[]
}

const { mePending, canAccessSection } = useDashboardAccess()
const canView = computed(() => canAccessSection('analytics'))
const windowDays = ref<7 | 30>(30)

const { data: summary, pending, error: fetchError, execute } = useFetch<AnalyticsSummary>('/api/dashboard/analytics', {
  immediate: false,
})

watch(canView, (allowed) => {
  if (allowed && !summary.value) execute()
}, { immediate: true })

const error = computed(() => {
  const e = fetchError.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || e.message || 'Failed to load analytics'
})

const generatedLabel = computed(() => {
  const value = summary.value?.generatedAt
  if (!value) return ''
  return new Date(value).toLocaleString()
})

function pick(short: number, long: number) {
  return windowDays.value === 7 ? short : long
}

const headlineCards = computed(() => {
  const data = summary.value
  if (!data) return []
  const days = windowDays.value
  return [
    {
      label: 'New accounts',
      value: pick(data.accounts.created7, data.accounts.created30),
      detail: `${formatCount(data.accounts.total)} accounts in Connect`,
    },
    {
      label: 'People who interacted',
      value: pick(data.engagement.people7, data.engagement.people30),
      detail: `Posted, commented, or reacted in ${days} days`,
    },
    {
      label: 'Posts',
      value: pick(data.posts.days7, data.posts.days30),
      detail: `${formatCount(pick(data.posts.authors7, data.posts.authors30))} authors`,
    },
    {
      label: 'Comments and reactions',
      value: pick(data.comments.days7, data.comments.days30) + pick(data.reactions.days7, data.reactions.days30),
      detail: `${formatCount(pick(data.comments.days7, data.comments.days30))} comments, ${formatCount(pick(data.reactions.days7, data.reactions.days30))} reactions`,
    },
  ]
})

const roleRows = computed(() => {
  const roles = summary.value?.accounts.byRole
  if (!roles) return []
  return [
    { label: 'Students', value: roles.student ?? 0 },
    { label: 'Faculty', value: roles.faculty ?? 0 },
    { label: 'Staff', value: roles.staff ?? 0 },
    { label: 'Alumni', value: roles.alumni ?? 0 },
    { label: 'Admins', value: roles.admin ?? 0 },
    { label: 'No role', value: summary.value?.accounts.withoutRole ?? 0 },
    { label: 'Student directory opt-in', value: summary.value?.accounts.studentOptIn ?? 0 },
    { label: 'Alumni directory opt-in', value: summary.value?.accounts.alumniOptIn ?? 0 },
    { label: 'Profile photo', value: summary.value?.accounts.withAvatar ?? 0 },
  ]
})

const otherRows = computed(() => {
  const other = summary.value?.other
  const forms = summary.value?.forms
  if (!other || !forms) return []
  const readRate = other.notifications30
    ? `${Math.round((other.notificationsRead30 / other.notifications30) * 100)}% read`
    : 'none sent'
  return [
    { label: 'Form submissions', value: formatCount(forms.days30) },
    { label: 'People who submitted a form', value: formatCount(forms.submitters30) },
    { label: 'Notifications', value: `${formatCount(other.notifications30)} (${readRate})` },
    { label: 'Degree plans started', value: formatCount(other.degreePlans30) },
    { label: 'Chapel episodes added', value: formatCount(other.chapelEpisodes30) },
    { label: 'Published jobs', value: `${formatCount(other.jobsPublished)} live, ${formatCount(other.jobsCreated30)} new` },
    { label: 'Marketplace listings', value: `${formatCount(other.marketplaceActive)} active, ${formatCount(other.marketplaceCreated30)} new` },
  ]
})

const signInRoleRows = computed(() => {
  const roles = windowDays.value === 7 ? summary.value?.signIns.byRole7 : summary.value?.signIns.byRole30
  if (!roles) return []
  return [
    { label: 'Students who signed in', value: roles.student ?? 0 },
    { label: 'Faculty who signed in', value: roles.faculty ?? 0 },
    { label: 'Staff who signed in', value: roles.staff ?? 0 },
    { label: 'Alumni who signed in', value: roles.alumni ?? 0 },
    { label: 'Admins who signed in', value: roles.admin ?? 0 },
  ]
})

const maxAccounts = computed(() => Math.max(1, ...(summary.value?.weeks ?? []).map((week) => week.accounts)))
const maxSignIns = computed(() => Math.max(1, ...(summary.value?.weeks ?? []).map((week) => week.signIns || 0)))
const maxInteractions = computed(() =>
  Math.max(1, ...(summary.value?.weeks ?? []).map((week) => week.posts + week.comments + week.reactions)),
)

const recommendations = [
  {
    title: 'Separate opening Connect from contributing',
    body: 'The people-who-interacted number only includes posts, comments, and reactions. A daily sign-in row lets a report say who opened Connect even when they did not post.',
  },
  {
    title: 'Count the pages people use',
    body: 'Directories, chapel, docs, and degree plans have no view log. If those reports matter, record user, path, and day on the server for that short list of pages. Leave off query strings.',
  },
  {
    title: 'Count chapel plays',
    body: 'Episode records show what was published. They do not show plays or MP3 downloads. Add a play event only if listening numbers are part of the report.',
  },
  {
    title: 'Keep notification read rate, add the click',
    body: 'Read time is already stored, and this page shows the 30-day read rate. A click from the notification to the post is not stored.',
  },
  {
    title: 'Record form opens, not only submissions',
    body: 'Submissions are stored, so this page can rank forms. Starts and abandons are not, so a completion rate is not available until the form page records an open.',
  },
  {
    title: 'Store search terms without names',
    body: 'Site search is not logged. A daily count of normalized queries, without a user id, is enough to report what people look for.',
  },
]

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

function weekLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function barWidth(value: number, max: number) {
  const pct = Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100))
  return `${pct}%`
}
</script>
