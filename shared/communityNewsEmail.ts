export type CommunityNewsSpeaker = {
  dateLabel: string
  name: string
  title?: string
  photoUrl?: string
}

export type CommunityNewsEucharist = {
  dateLabel: string
  detail: string
  extra?: string
}

export type CommunityNewsSlide = {
  imageUrl: string
  alt: string
  href?: string
}

export type CommunityNewsEmailInput = {
  origin: string
  intro: string
  speakers: CommunityNewsSpeaker[]
  eucharist: CommunityNewsEucharist[]
  slides: CommunityNewsSlide[]
}

const HEADER_PATH = '/community-news-header.jpg'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function absolutePublicUrl(origin: string, url: string): string {
  const raw = url.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const base = origin.replace(/\/$/, '')
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`
}

function speakerRow(speaker: CommunityNewsSpeaker, origin: string): string {
  const photo = speaker.photoUrl ? absolutePublicUrl(origin, speaker.photoUrl) : ''
  const image = photo
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(speaker.name)}" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:8px;object-fit:cover;border:0;" />`
    : `<div style="width:72px;height:72px;background:#f3f4f6;border-radius:8px;"></div>`
  const title = speaker.title
    ? `<div style="margin-top:2px;font-size:14px;line-height:20px;font-style:italic;color:#4b5563;">${escapeHtml(speaker.title)}</div>`
    : ''
  return `
    <tr>
      <td style="padding:16px 20px;border-top:1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="72" valign="top" style="width:72px;">${image}</td>
            <td valign="middle" style="padding-left:16px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:15px;line-height:22px;color:#111827;">${escapeHtml(speaker.dateLabel)}</div>
              <div style="margin-top:2px;font-size:16px;line-height:22px;font-weight:bold;color:#111827;">${escapeHtml(speaker.name)}</div>
              ${title}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function eucharistRow(item: CommunityNewsEucharist): string {
  const extra = item.extra
    ? `<div style="margin-top:2px;font-size:14px;line-height:20px;color:#4b5563;">${escapeHtml(item.extra)}</div>`
    : ''
  return `
    <tr>
      <td style="padding:14px 20px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:15px;line-height:22px;color:#111827;">${escapeHtml(item.dateLabel)}</div>
        <div style="margin-top:2px;font-size:16px;line-height:22px;font-weight:bold;color:#111827;">${escapeHtml(item.detail)}</div>
        ${extra}
      </td>
    </tr>`
}

function slideRow(slide: CommunityNewsSlide, origin: string): string {
  const src = absolutePublicUrl(origin, slide.imageUrl)
  const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(slide.alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />`
  const href = slide.href ? absolutePublicUrl(origin, slide.href) : ''
  const inner = href
    ? `<a href="${escapeHtml(href)}" target="_blank" style="text-decoration:none;">${img}</a>`
    : img
  return `<tr><td style="padding:0;line-height:0;font-size:0;">${inner}</td></tr>`
}

export function buildCommunityNewsEmailHtml(input: CommunityNewsEmailInput): string {
  const origin = input.origin.replace(/\/$/, '')
  const header = absolutePublicUrl(origin, HEADER_PATH)
  const speakers = input.speakers.length
    ? input.speakers.map((speaker) => speakerRow(speaker, origin)).join('')
    : `<tr><td style="padding:16px 20px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4b5563;">No chapel speakers are scheduled for this week.</td></tr>`
  const eucharist = input.eucharist.length
    ? input.eucharist.map((item) => eucharistRow(item)).join('')
    : `<tr><td style="padding:16px 20px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#4b5563;">No Eucharist schedule for this week.</td></tr>`
  const slides = input.slides.map((slide) => slideRow(slide, origin)).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Community News</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${escapeHtml(header)}" alt="Community News" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:22px 20px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:bold;color:#111827;">
              ${escapeHtml(input.intro)}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:bold;color:#111827;">
              Chapel Speakers this Week
            </td>
          </tr>
          ${speakers}
          <tr>
            <td style="padding:28px 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:bold;color:#111827;">
              Eucharist Schedule
            </td>
          </tr>
          ${eucharist}
          ${slides}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
