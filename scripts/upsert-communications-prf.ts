/**
 * Insert or replace the Communications Project Request form in connect-api.
 * Run from connect-api so Neon and dotenv resolve:
 *   NODE_PATH=./node_modules npx tsx ../connect/scripts/upsert-communications-prf.ts
 */
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { communicationsPrfForm } from '../shared/communicationsPrf'

const require = createRequire(resolve(import.meta.dirname, '../../connect-api/package.json'))
const { config } = require('dotenv') as { config: (options: { path: string }) => void }
const { neon } = require('@neondatabase/serverless') as {
  neon: (url: string) => (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, unknown>>>
}

config({ path: resolve(import.meta.dirname, '../../connect-api/.env') })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing from connect-api/.env')
}

const sql = neon(databaseUrl)
const form = communicationsPrfForm
const now = new Date().toISOString()

const existing = await sql`select id from connect_forms where slug = ${form.slug} limit 1`
let formId = existing[0]?.id as number | undefined

if (formId) {
  await sql`
    update connect_forms
    set title = ${form.title},
        status = ${form.status},
        component_key = ${form.componentKey},
        editable_mode = ${form.editableMode},
        schema = ${JSON.stringify(form.schema)}::jsonb,
        updated_at = ${now}
    where id = ${formId}
  `
  await sql`delete from connect_forms_indexed_fields where _parent_id = ${formId}`
} else {
  const inserted = await sql`
    insert into connect_forms (title, slug, status, component_key, editable_mode, schema, created_at, updated_at)
    values (
      ${form.title},
      ${form.slug},
      ${form.status},
      ${form.componentKey},
      ${form.editableMode},
      ${JSON.stringify(form.schema)}::jsonb,
      ${now},
      ${now}
    )
    returning id
  `
  formId = inserted[0]?.id as number
}

if (!formId) throw new Error('Form id missing after upsert')

for (const [order, field] of form.indexedFields.entries()) {
  const id = randomBytes(6).toString('hex')
  await sql`
    insert into connect_forms_indexed_fields (id, _order, _parent_id, key)
    values (${id}, ${order}, ${formId}, ${field.key})
  `
}

console.log(`communications-prf ready (id ${formId})`)
