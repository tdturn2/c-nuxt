export type SectionCopy = {
  paragraphs: string[]
  note: string
  codes: string[]
}

const COURSE_TOKEN = /[A-Z]{2,5}\d{3}(?:\s*[–-]\s*\d{3})?/g

export function parseSectionCopy(raw: string | null | undefined): SectionCopy | null {
  const text = String(raw ?? '').replace(/\r\n/g, '\n').trim()
  if (!text) return null

  const noteMatch = text.match(/(?:^|\n)\s*Note:\s*|\sNote:\s*/i)
  let body = text
  let noteBlock = ''
  if (noteMatch && noteMatch.index != null) {
    body = text.slice(0, noteMatch.index).trim()
    noteBlock = text.slice(noteMatch.index + noteMatch[0].length).trim()
  }

  const codes: string[] = []
  const noteLines: string[] = []
  for (const line of noteBlock.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (isCodeOnlyLine(trimmed)) {
      codes.push(...(trimmed.match(COURSE_TOKEN) ?? []))
    } else {
      noteLines.push(trimmed)
    }
  }

  return {
    paragraphs: reflow(body),
    note: reflow(noteLines.join('\n')).join(' '),
    codes,
  }
}

function isCodeOnlyLine(line: string) {
  if (!/[A-Z]{2,5}\d{3}/.test(line)) return false
  const stripped = line.replace(COURSE_TOKEN, '').replace(/[,;–\-/\s]/g, '')
  return stripped.length === 0
}

function reflow(text: string) {
  const paragraphs: string[] = []
  let current = ''

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (current) {
        paragraphs.push(current)
        current = ''
      }
      continue
    }

    const continues = Boolean(current) && /^[a-z("'“]/.test(trimmed)
    if (continues) {
      current = `${current} ${trimmed}`
      continue
    }
    if (current) paragraphs.push(current)
    current = trimmed
  }

  if (current) paragraphs.push(current)
  return paragraphs
}
