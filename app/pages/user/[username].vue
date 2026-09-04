<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="loading" class="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-500 shadow-sm">
          Loading profile…
        </div>

        <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          {{ error }}
        </div>

        <div v-else-if="user" class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div class="bg-[rgba(13,94,130,1)] px-5 py-4 text-white sm:px-6">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              {{ profileEyebrow }}
            </p>
            <h1 class="mt-0.5 truncate text-lg font-bold leading-tight sm:text-xl">{{ user.name }}</h1>
          </div>

          <div class="px-5 py-6 sm:px-6">
            <div class="flex items-start gap-4 sm:gap-5">
              <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 ring-4 ring-[rgba(13,94,130,0.12)] sm:h-28 sm:w-28">
                <img
                  v-if="user.avatar?.url"
                  :src="user.avatar.url"
                  :alt="user.name"
                  class="h-full w-full object-cover"
                >
                <span v-else class="text-3xl font-semibold text-gray-500 sm:text-4xl">
                  {{ user.name?.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="min-w-0 pt-1">
                <h2 class="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{{ user.name }}</h2>
                <p v-if="headerAffiliation" class="mt-1 text-sm font-medium text-[rgba(13,94,130,1)]">
                  {{ headerAffiliation }}
                </p>
                <p v-if="user.employeeTitle" class="mt-1 text-sm leading-snug text-gray-600">
                  {{ user.employeeTitle }}
                </p>
                <div v-if="alumniSocialLinks.length" class="mt-3 flex items-center gap-2">
                  <a
                    v-for="link in alumniSocialLinks"
                    :key="link.key"
                    :href="link.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-[rgba(13,94,130,0.12)] hover:text-[rgba(13,94,130,1)]"
                    :aria-label="link.label"
                  >
                    <UIcon :name="link.icon" class="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div v-if="showProfileTabs" class="mt-6 flex flex-wrap gap-x-5 gap-y-1 border-b border-gray-200">
              <button
                type="button"
                class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
                :class="tabClass('overview')"
                @click="activeTab = 'overview'"
              >
                Overview
              </button>
              <button
                v-if="expertiseItems.length"
                type="button"
                class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
                :class="tabClass('expertise')"
                @click="activeTab = 'expertise'"
              >
                Expertise
              </button>
              <button
                v-if="educationItems.length"
                type="button"
                class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
                :class="tabClass('education')"
                @click="activeTab = 'education'"
              >
                Education
              </button>
              <button
                v-if="showPublicationsTab"
                type="button"
                class="-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors"
                :class="tabClass('publications')"
                @click="activeTab = 'publications'"
              >
                Publications
              </button>
            </div>

            <template v-if="!showProfileTabs || activeTab === 'overview'">
              <div v-if="aboutParagraphs.length" class="mt-5 space-y-3 text-[15px] leading-relaxed text-gray-700">
                <p v-for="(paragraph, index) in aboutParagraphs" :key="index" class="whitespace-pre-wrap">
                  {{ paragraph }}
                </p>
              </div>
              <p v-else-if="isFaculty && !hasSecondaryOverview" class="mt-5 text-sm text-gray-500">
                No bio available.
              </p>

              <div v-if="!isFaculty && employeeProfileEntries.length > 0" class="mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Employee</h3>
                <dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div v-for="entry in employeeProfileEntries" :key="entry.key">
                    <dt class="text-xs font-medium text-gray-500">{{ entry.label }}</dt>
                    <dd class="mt-0.5 text-sm text-gray-900">{{ entry.value }}</dd>
                  </div>
                </dl>
              </div>

              <div v-if="alumniDegreeEntries.length > 0 || alumniContactEntries.length > 0" class="mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Alumni</h3>
                <dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div v-for="entry in alumniDegreeEntries" :key="entry.key">
                    <dt class="text-xs font-medium text-gray-500">{{ entry.label }}</dt>
                    <dd class="mt-0.5 text-sm text-gray-900">{{ entry.value }}</dd>
                  </div>
                  <div v-for="entry in alumniContactEntries" :key="entry.key">
                    <dt class="text-xs font-medium text-gray-500">{{ entry.label }}</dt>
                    <dd class="mt-0.5 text-sm text-gray-900">{{ entry.value }}</dd>
                  </div>
                </dl>
              </div>

              <div v-if="studentProfileEntries.length > 0" class="mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Student</h3>
                <dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div v-for="entry in studentProfileEntries" :key="entry.slug">
                    <dt class="text-xs font-medium text-gray-500">{{ entry.label }}</dt>
                    <dd class="mt-0.5 text-sm text-gray-900">{{ entry.value }}</dd>
                  </div>
                </dl>
              </div>
            </template>

            <ul v-else-if="activeTab === 'expertise'" class="mt-5 space-y-2.5">
              <li
                v-for="item in expertiseItems"
                :key="item.id"
                class="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800"
              >
                {{ item.item }}
              </li>
            </ul>

            <ul v-else-if="activeTab === 'education'" class="mt-5 space-y-2.5">
              <li
                v-for="item in educationItems"
                :key="item.id"
                class="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800"
              >
                {{ item.item }}
              </li>
            </ul>

            <div v-else-if="activeTab === 'publications'" class="mt-5 space-y-3">
              <div
                v-for="publication in profilePublications"
                :key="String(publication.id)"
                class="flex gap-4 rounded-lg bg-gray-50 p-4"
              >
                <div v-if="publication.image?.url" class="shrink-0">
                  <img
                    :src="publication.image.url || ''"
                    :alt="publication.title || 'Publication cover'"
                    class="h-32 w-24 rounded object-cover"
                  >
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="text-base font-semibold text-gray-900">{{ publication.title }}</h3>
                  <p class="mt-0.5 text-sm text-gray-500">
                    {{ publicationTypeLabel(publication.type) }}
                    <span v-if="publication.releaseDate"> · {{ formatPublicationDate(String(publication.releaseDate)) }}</span>
                  </p>
                  <p v-if="publicationPlainText(publication.description)" class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {{ publicationPlainText(publication.description) }}
                  </p>
                  <a
                    v-if="publication.link"
                    :href="publication.link || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 inline-block text-sm text-[rgba(13,94,130,1)] hover:underline"
                  >
                    View publication →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const username = computed(() => route.params.username as string)

const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'overview' | 'expertise' | 'education' | 'publications'>('overview')
const user = ref<{
  id: number
  name: string
  email: string
  bio: string | null
  facultyBio?: unknown
  expertise?: Array<{ id?: string; item?: string | null }> | null
  education?: Array<{ id?: string; item?: string | null }> | null
  avatar?: { url: string } | null
  roles?: string[] | null
  employeeTitle?: string | null
  startDate?: string | null
  phone?: string | null
  location?: string | null
  department?: string | null
  section?: string | null
  alumniOptIn?: boolean
  studentOptIn?: boolean
  alumniDegrees?: Array<{ degree?: string | null; graduationYear?: number | string | null }> | null
  alumniContact?: {
    email?: string | null
    phone?: string | null
    facebook?: string | null
    x?: string | null
    instagram?: string | null
  } | null
  publications?: Array<{
    id: number | string
    type?: string | null
    title: string
    image?: { url?: string | null } | null
    description?: unknown
    link?: string | null
    purchaseLink?: string | null
    releaseDate?: string | null
  }>
} | null>(null)

const studentProfile = ref<{ answers: Record<string, unknown>; updatedAt: string } | null>(null)

const DEPARTMENT_LABELS: Record<string, string> = {
  '1': 'Academic Affairs',
  '2': 'EMT',
  '3': 'Finance and Administration',
  '4': 'Office of the President',
  '5': 'Formation',
  '6': 'Advancement'
}

function formatSectionLabel(slug: string): string {
  if (!slug) return ''
  if (slug === 'lits') return 'LITS'
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function yearsEmployed(startDateStr: string): number | null {
  if (!startDateStr || startDateStr.length < 10) return null
  try {
    const start = new Date(startDateStr.slice(0, 10)).getTime()
    const now = Date.now()
    if (start > now) return null
    const years = (now - start) / (365.25 * 24 * 60 * 60 * 1000)
    return Math.round(years * 10) / 10
  } catch {
    return null
  }
}

function toSocialHref(network: 'facebook' | 'x' | 'instagram', raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value

  const stripped = value.replace(/^@+/, '').replace(/^\/+/, '')
  if (/^(www\.)?(facebook\.com|fb\.com|instagram\.com|x\.com|twitter\.com)\//i.test(stripped)) {
    return `https://${stripped}`
  }

  if (network === 'facebook') return `https://www.facebook.com/${stripped}`
  if (network === 'instagram') return `https://www.instagram.com/${stripped}`
  return `https://x.com/${stripped}`
}

const headerAffiliation = computed(() => {
  const u = user.value
  if (!u) return ''
  const parts = [
    u.department ? (DEPARTMENT_LABELS[String(u.department)] ?? String(u.department)) : '',
    u.section ? formatSectionLabel(String(u.section)) : '',
  ].filter(Boolean)
  return parts.join(' · ')
})

const profilePublications = computed(() => {
  const pubs = Array.isArray(user.value?.publications) ? user.value.publications : []
  return [...pubs].sort((a, b) => {
    const aBook = String(a.type || '').toLowerCase() === 'book' ? 0 : 1
    const bBook = String(b.type || '').toLowerCase() === 'book' ? 0 : 1
    return aBook - bBook
  })
})

const isFaculty = computed(() => {
  const roles = Array.isArray(user.value?.roles) ? user.value.roles : []
  return roles.some((role) => String(role).toLowerCase() === 'faculty')
})

const profileEyebrow = computed(() => {
  const roles = Array.isArray(user.value?.roles)
    ? user.value!.roles.map((role) => String(role).toLowerCase())
    : []
  // Priority when someone has multiple roles: faculty > employee > student > alumni
  if (roles.includes('faculty') || isFaculty.value) return 'Faculty profile'
  if (roles.includes('staff') || roles.includes('employee')) return 'Employee profile'
  if (roles.includes('student')) return 'Student profile'
  if (roles.includes('alumni')) return 'Alumni profile'
  return 'Profile'
})

const hasSecondaryOverview = computed(() =>
  (!isFaculty.value && employeeProfileEntries.value.length > 0)
  || alumniDegreeEntries.value.length > 0
  || alumniContactEntries.value.length > 0
  || studentProfileEntries.value.length > 0,
)

function tabClass(tab: typeof activeTab.value) {
  return activeTab.value === tab
    ? 'border-[rgba(13,94,130,1)] text-[rgba(13,94,130,1)]'
    : 'border-transparent text-gray-500 hover:text-gray-800'
}

const expertiseItems = computed(() => {
  if (!isFaculty.value) return []
  const rows = Array.isArray(user.value?.expertise) ? user.value.expertise : []
  return rows
    .map((row, index) => ({
      id: String(row.id || `expertise-${index}`),
      item: String(row.item || '').trim(),
    }))
    .filter((row) => row.item.length > 0)
})

const educationItems = computed(() => {
  if (!isFaculty.value) return []
  const rows = Array.isArray(user.value?.education) ? user.value.education : []
  return rows
    .map((row, index) => ({
      id: String(row.id || `education-${index}`),
      item: String(row.item || '').trim(),
    }))
    .filter((row) => row.item.length > 0)
})

const showPublicationsTab = computed(() =>
  isFaculty.value && profilePublications.value.some((pub) => String(pub.type || '').toLowerCase() === 'book'),
)

const showProfileTabs = computed(() =>
  isFaculty.value && (expertiseItems.value.length > 0 || educationItems.value.length > 0 || showPublicationsTab.value),
)

function lexicalParagraphs(value: unknown): string[] {
  if (value == null) return []
  if (typeof value === 'string') {
    return value
      .split(/\n\s*\n/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  if (typeof value !== 'object' || !('root' in (value as object))) return []
  const root = (value as { root?: { children?: any[] } }).root
  const children = Array.isArray(root?.children) ? root.children : []
  const extractText = (nodes: any[]): string =>
    nodes
      .map((child) => {
        if (child?.type === 'text' && typeof child?.text === 'string') return child.text
        if (Array.isArray(child?.children)) return extractText(child.children)
        return ''
      })
      .join('')
      .trim()
  return children
    .map((node) => extractText(Array.isArray(node?.children) ? node.children : [node]))
    .map((text) => text.trim())
    .filter(Boolean)
}

const aboutParagraphs = computed(() => {
  if (isFaculty.value) {
    const fromFacultyBio = lexicalParagraphs(user.value?.facultyBio)
    if (fromFacultyBio.length) return fromFacultyBio
  }
  const plain = user.value?.bio?.trim()
  return plain ? [plain] : []
})

function formatPublicationDate(dateStr: string): string {
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T12:00:00` : dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

function publicationTypeLabel(type: unknown): string {
  const value = String(type || '').trim()
  if (!value) return 'Publication'
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function publicationPlainText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value !== 'object' || !('root' in (value as object))) return ''
  const extract = (children: any[]): string =>
    children
      .map((child) => {
        if (child?.type === 'text' && typeof child?.text === 'string') return child.text
        if (Array.isArray(child?.children)) return extract(child.children)
        return ''
      })
      .join('')
  const root = (value as { root?: { children?: any[] } }).root
  return extract(Array.isArray(root?.children) ? root.children : []).trim()
}

const EMPLOYEE_FIELDS: { key: keyof NonNullable<typeof user.value>; label: string }[] = [
  { key: 'employeeTitle', label: 'Title' },
  { key: 'department', label: 'Department' },
  { key: 'section', label: 'Section' },
  { key: 'startDate', label: 'Start date' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' }
]

const employeeProfileEntries = computed(() => {
  const u = user.value
  if (!u) return []
  return EMPLOYEE_FIELDS.filter(({ key }) => {
    const v = u[key]
    return v != null && String(v).trim() !== ''
  }).map(({ key, label }) => {
    const raw = u[key]
    let value = String(raw).trim()
    if (key === 'department') value = DEPARTMENT_LABELS[value] ?? value
    if (key === 'section') value = formatSectionLabel(value)
    if (key === 'startDate' && value.length >= 10) {
      try {
        const formatted = new Date(value.slice(0, 10)).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        const years = yearsEmployed(value)
        value = years != null ? `${formatted} (${years} years)` : formatted
      } catch {
        // keep value
      }
    }
    return { key, label, value }
  })
})

const alumniDegreeEntries = computed(() => {
  const entries = user.value?.alumniDegrees
  if (!Array.isArray(entries)) return []
  return entries
    .map((entry, index) => {
      const degree = String(entry.degree || '').trim()
      const year = entry.graduationYear
      if (!degree) return null
      return {
        key: `degree-${index}`,
        label: index === 0 ? 'Degrees' : ' ',
        value: year ? `${degree} (${year})` : degree,
      }
    })
    .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry))
})

const alumniContactEntries = computed(() => {
  if (!user.value?.alumniOptIn || !user.value?.alumniContact) return []
  const contact = user.value.alumniContact
  const entries: { key: string; label: string; value: string }[] = []
  const email = String(contact.email ?? '').trim()
  const phone = String(contact.phone ?? '').trim()
  if (email) entries.push({ key: 'email', label: 'Email', value: email })
  if (phone) entries.push({ key: 'phone', label: 'Phone', value: phone })
  return entries
})

const alumniSocialLinks = computed(() => {
  if (!user.value?.alumniOptIn || !user.value?.alumniContact) return []
  const contact = user.value.alumniContact
  const networks = [
    { key: 'facebook' as const, label: 'Facebook', icon: 'i-simple-icons-facebook' },
    { key: 'x' as const, label: 'X', icon: 'i-simple-icons-x' },
    { key: 'instagram' as const, label: 'Instagram', icon: 'i-simple-icons-instagram' },
  ]
  return networks.flatMap((network) => {
    const value = String(contact[network.key] ?? '').trim()
    if (!value) return []
    return [{ ...network, href: toSocialHref(network.key, value) }]
  })
})

// Control exactly which answers show, in what order, and with what label. Add/remove/reorder as needed.
const STUDENT_PROFILE_FIELDS: { slug: string; label: string }[] = [
  { slug: 'marital-status', label: 'Marital Status' },
  { slug: 'live', label: 'Lives in' },
  { slug: 'from', label: 'From' },
  { slug: 'grad-date', label: 'Expected Graduation Date' },
  { slug: 'asbury-start-date', label: 'Started at Asbury Seminary' },
  { slug: 'current-degree', label: 'Degree program' }
]

const studentProfileEntries = computed(() => {
  if (!user.value?.studentOptIn) return []
  const answers = studentProfile.value?.answers
  if (!answers || typeof answers !== 'object') return []
  return STUDENT_PROFILE_FIELDS.filter(
    ({ slug }) => answers[slug] != null && String(answers[slug]).trim() !== ''
  ).map(({ slug, label }) => ({
    slug,
    label,
    value: formatSurveyValue(answers[slug], slug)
  }))
})

function formatSurveyValue(val: unknown, slug: string): string {
  if (val == null) return ''
  const s = String(val).trim()
  if (!s) return ''
  if (slug.includes('date') && s.length >= 10) {
    try {
      return new Date(s.slice(0, 10)).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    } catch {
      return s
    }
  }
  if (slug === 'marital-status') {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }
  return s
}

// Load user profile
const loadUser = async () => {
  if (!username.value) {
    error.value = 'Username is required'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const [userData, surveyData] = await Promise.all([
      $fetch(`/api/users/by-username`, {
        query: { username: username.value }
      }),
      $fetch(`/api/user-survey-responses/public/${encodeURIComponent(username.value)}`).catch(() => null)
    ])

    user.value = userData
    studentProfile.value = surveyData as { answers: Record<string, unknown>; updatedAt: string } | null
    const allowedTabs = new Set<string>(['overview'])
    if (expertiseItems.value.length) allowedTabs.add('expertise')
    if (educationItems.value.length) allowedTabs.add('education')
    if (showPublicationsTab.value) allowedTabs.add('publications')
    if (!allowedTabs.has(activeTab.value)) {
      activeTab.value = 'overview'
    }
  } catch (err: any) {
    console.error('Error loading user:', err)
    if (err.statusCode === 404) {
      error.value = 'User not found'
    } else {
      error.value = err.data?.message || 'Failed to load profile'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (import.meta.client) loadUser()
})

// Reload if username changes
watch(username, () => {
  activeTab.value = 'overview'
  loadUser()
})
</script>
