import { describe, expect, it } from 'vitest'
import { isRichMessage, messagePlainText, sanitizeMessageHtml } from '../shared/messageHtml'

describe('sanitizeMessageHtml', () => {
  it('drops scripts and event handlers and keeps inline styles', () => {
    const clean = sanitizeMessageHtml(
      '<p style="color: red" onclick="alert(1)">Hi</p><script>alert(1)</script>',
    )
    expect(clean).toContain('<p style="color: red">Hi</p>')
    expect(clean).not.toContain('script')
    expect(clean).not.toContain('onclick')
  })

  it('keeps https links and drops javascript urls', () => {
    const clean = sanitizeMessageHtml(
      '<a href="javascript:alert(1)">bad</a><a href="https://asburyseminary.edu">good</a>',
    )
    expect(clean).not.toContain('javascript:')
    expect(clean).toContain('href="https://asburyseminary.edu"')
    expect(clean).toContain('target="_blank"')
  })

  it('keeps page image size and float', () => {
    const clean = sanitizeMessageHtml('<img src="https://cdn.example/a.png" data-size="medium" data-align="left" onload="x">')
    expect(clean).toContain('data-size="medium"')
    expect(clean).toContain('data-align="left"')
    expect(clean).not.toContain('onload')
  })

  it('reads plain text from formatted html', () => {
    expect(messagePlainText('<h2>Hello</h2><p>there</p>')).toBe('Hello there')
    expect(isRichMessage('<p>Hello</p>')).toBe(true)
    expect(isRichMessage('Hello')).toBe(false)
  })
})
