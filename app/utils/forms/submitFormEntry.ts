export async function submitFormEntry(input: {
  formSlug: string
  answers: Record<string, unknown>
  files?: Record<string, File | null>
  rootSubmissionId?: number
  onUploadProgress?: (fieldKey: string, percent: number) => void
}) {
  const fileEntries = Object.entries(input.files || {}).filter((entry): entry is [string, File] => entry[1] instanceof File)
  const submitted: any = await $fetch('/api/form-submissions/submit', {
    method: 'POST',
    body: {
      formSlug: input.formSlug,
      answers: input.answers,
      rootSubmissionId: input.rootSubmissionId,
      deferNotification: fileEntries.length > 0,
    },
  })

  const id = submitted?.submissionId ?? submitted?.doc?.id ?? submitted?.id ?? null
  let uploadError: unknown = null
  for (const [fieldKey, file] of fileEntries) {
    if (id == null || id === '') break
    input.onUploadProgress?.(fieldKey, 10)
    const fd = new FormData()
    fd.set('formSlug', input.formSlug)
    fd.set('submissionId', String(id))
    fd.set('fieldKey', fieldKey)
    if (submitted?.trelloCardId) fd.set('trelloCardId', String(submitted.trelloCardId))
    fd.set('file', file)
    try {
      await $fetch('/api/form-uploads/upload', { method: 'POST', body: fd })
      input.onUploadProgress?.(fieldKey, 100)
    } catch (err) {
      uploadError = err
      break
    }
  }

  let notifyError: unknown = null
  if (fileEntries.length && id != null && id !== '') {
    try {
      await $fetch('/api/form-submissions/notify', {
        method: 'POST',
        body: { formSlug: input.formSlug, submissionId: id },
      })
    } catch (err) {
      notifyError = err
    }
  }

  if (uploadError) throw uploadError
  if (notifyError) throw notifyError
  return submitted
}
