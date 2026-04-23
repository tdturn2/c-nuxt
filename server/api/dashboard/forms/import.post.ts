import { createError, defineEventHandler, readBody, readMultipartFormData } from 'h3'
import { buildGravityImportReport } from '../../../utils/gravityImport'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

async function readJsonInput(event: any): Promise<{ json: unknown; mode: 'dryRun' | 'commit' }> {
  const multipart = await readMultipartFormData(event).catch(() => null)
  if (Array.isArray(multipart) && multipart.length) {
    const filePart = multipart.find((part) => part.name === 'file' || part.name === 'json')
    if (!filePart?.data) {
      throw createError({ statusCode: 400, statusMessage: 'Missing JSON upload file (field "file").' })
    }
    const raw = Buffer.from(filePart.data).toString('utf8').trim()
    if (!raw) throw createError({ statusCode: 400, statusMessage: 'Uploaded JSON file is empty.' })
    try {
      const modePart = multipart.find((part) => part.name === 'mode')
      const modeRaw = modePart?.data ? Buffer.from(modePart.data).toString('utf8').trim() : ''
      return {
        json: JSON.parse(raw),
        mode: modeRaw === 'commit' ? 'commit' : 'dryRun',
      }
    } catch (err: any) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid JSON upload: ${err?.message || 'parse failed'}`,
      })
    }
  }

  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const mode = String(body?.mode || body?.action || 'dryRun').trim() === 'commit' ? 'commit' : 'dryRun'
  if (body?.gravityJson && typeof body.gravityJson === 'object') return { json: body.gravityJson, mode }
  if (typeof body?.gravityJson === 'string') {
    try {
      return { json: JSON.parse(body.gravityJson), mode }
    } catch (err: any) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid gravityJson string: ${err?.message || 'parse failed'}`,
      })
    }
  }
  if (body && typeof body === 'object' && Object.keys(body).length) return { json: body, mode }
  throw createError({ statusCode: 400, statusMessage: 'Provide Gravity JSON via upload or request body.' })
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const { json, mode } = await readJsonInput(event)
  const commit = mode === 'commit'
  const report = buildGravityImportReport(json, commit ? 'commit' : 'dryRun')

  if (!commit) return report

  if (report.totals.blockedForms > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Import blocked: one or more forms contain unsupported features.',
      data: report,
    })
  }

  const headers = withServerBearer(
    getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }),
  )

  const created: Array<{ gravityFormId: string; id: string | number; slug: string }> = []
  const failed: Array<{ gravityFormId: string; slug: string; message: string; data?: unknown }> = []
  for (const form of report.forms) {
    const candidate = form.candidate
    if (!candidate) continue
    try {
      const doc: any = await $fetch(`${auth.payloadBaseUrl}/api/connect-forms`, {
        method: 'POST',
        headers,
        body: candidate.payload,
      })
      created.push({
        gravityFormId: form.gravityFormId,
        id: doc?.id ?? '',
        slug: candidate.slug,
      })
    } catch (err: any) {
      const proxied = toProxyError(err, `Failed creating form "${candidate.slug}"`) as any
      failed.push({
        gravityFormId: form.gravityFormId,
        slug: candidate.slug,
        message: proxied?.statusMessage || proxied?.message || `Failed creating form "${candidate.slug}"`,
        data: proxied?.data,
      })
    }
  }

  if (failed.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Import failed for one or more forms.',
      data: {
        ...report,
        created,
        failed,
      },
    })
  }

  return {
    ...report,
    created,
  }
})
