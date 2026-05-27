import { createError, defineEventHandler, readBody } from 'h3'
import { parseDegreeMapCsv, type DegreeMapCsvRow } from '@shared/degreeMapCsv'
import { importDegreeMapRows } from '../../utils/degreeMapImport'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

type ImportBody = {
  degreeId?: number | string
  csv?: string
  rows?: DegreeMapCsvRow[]
  createMissingCourses?: boolean
}

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event).catch(() => ({}))) as ImportBody
  const degreeId = Number(body.degreeId)
  if (!Number.isFinite(degreeId) || degreeId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'degreeId is required' })
  }

  let rows: DegreeMapCsvRow[] = Array.isArray(body.rows) ? body.rows : []
  if (!rows.length && typeof body.csv === 'string' && body.csv.trim()) {
    const parsed = parseDegreeMapCsv(body.csv)
    if (parsed.errors.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'CSV validation failed',
        data: { errors: parsed.errors },
      })
    }
    rows = parsed.rows
  }

  if (!rows.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No import rows provided. Send csv text or parsed rows.',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  const auth = await authenticateWithPayloadCMS(event)

  try {
    const summary = await importDegreeMapRows({
      event,
      payloadBaseUrl,
      auth,
      email,
      degreeId,
      rows,
      createMissingCourses: Boolean(body.createMissingCourses),
    })

    return {
      ok: summary.errors.length === 0 || summary.itemsCreated > 0 || summary.sectionsCreated > 0,
      summary,
    }
  } catch (err: unknown) {
    const e = err as { statusCode?: number; statusMessage?: string; data?: unknown }
    if (e?.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: e?.statusMessage || 'Degree map import failed',
      data: e?.data,
    })
  }
})
