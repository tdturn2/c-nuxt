import {
  emptyProfileNudgeRecord,
  optOutProfileNudge,
  parseProfileNudgeRecord,
  profileNudgeNeedsStudentAnswers,
  profileNudgeStorageKey,
  PROFILE_NUDGE_SESSION_KEY,
  recordProfileNudgeVisit,
  shouldShowProfileNudge,
  snoozeProfileNudge,
  type ProfileNudgeRecord,
  type ProfileNudgeStudentAnswers,
  type ProfileNudgeUser,
} from '@shared/profileNudge'

function readRecord(userId: number | string): ProfileNudgeRecord {
  try {
    const raw = localStorage.getItem(profileNudgeStorageKey(userId))
    return parseProfileNudgeRecord(raw ? JSON.parse(raw) : null)
  } catch {
    return emptyProfileNudgeRecord()
  }
}

function writeRecord(userId: number | string, record: ProfileNudgeRecord) {
  localStorage.setItem(profileNudgeStorageKey(userId), JSON.stringify(record))
}

function noteVisit(userId: number | string) {
  const seen = sessionStorage.getItem(PROFILE_NUDGE_SESSION_KEY)
  if (seen === String(userId)) return
  sessionStorage.setItem(PROFILE_NUDGE_SESSION_KEY, String(userId))
  writeRecord(userId, recordProfileNudgeVisit(readRecord(userId)))
}

export function useProfileNudge() {
  const { user } = useMe()
  const visible = ref(false)
  let requestId = 0

  async function loadStudentAnswers(current: ProfileNudgeUser): Promise<ProfileNudgeStudentAnswers> {
    if (!profileNudgeNeedsStudentAnswers(current)) return undefined
    try {
      const res = await $fetch<{ answers?: Record<string, unknown> }>('/api/user-survey-responses/me', {
        credentials: 'include',
      })
      return res?.answers ?? {}
    } catch {
      return undefined
    }
  }

  async function evaluate() {
    if (!import.meta.client) return
    const current = user.value as ProfileNudgeUser | null
    const id = ++requestId
    if (!current?.id || current.impersonation?.active) {
      visible.value = false
      return
    }

    noteVisit(current.id)
    const answers = await loadStudentAnswers(current)
    if (id !== requestId || user.value?.id !== current.id) return
    visible.value = shouldShowProfileNudge(current, readRecord(current.id), Date.now(), answers)
  }

  function remindLater() {
    const current = user.value
    if (!current?.id) return
    writeRecord(current.id, snoozeProfileNudge(readRecord(current.id), Date.now()))
    visible.value = false
  }

  function dismissForever() {
    const current = user.value
    if (!current?.id) return
    writeRecord(current.id, optOutProfileNudge(readRecord(current.id)))
    visible.value = false
  }

  watch(user, () => {
    void evaluate()
  }, { immediate: true })

  return {
    visible: readonly(visible),
    remindLater,
    dismissForever,
  }
}
