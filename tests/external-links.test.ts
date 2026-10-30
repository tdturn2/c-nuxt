import { describe, expect, it } from 'vitest'
import { decorateExternalAnchors, externalHttpHref } from '../app/utils/externalLinks'

describe('externalHttpHref', () => {
  it('accepts off-site http(s) links and plain domains', () => {
    expect(externalHttpHref('https://example.com/jobs')).toBe('https://example.com/jobs')
    expect(externalHttpHref('http://www.mvccnh.org/apply')).toBe('http://www.mvccnh.org/apply')
    expect(externalHttpHref('indeed.com/viewjob')).toBe('https://indeed.com/viewjob')
  })

  it('rejects emails, on-site links, and scheme-stuffed addresses', () => {
    expect(externalHttpHref('office@brookletcc.com')).toBeNull()
    expect(externalHttpHref('mailto:office@brookletcc.com')).toBeNull()
    expect(externalHttpHref('https://connect.asburyseminary.edu/jobs/1')).toBeNull()
    expect(externalHttpHref('/jobs/12')).toBeNull()
    expect(externalHttpHref('http://gccoffice@metrocast.net')).toBeNull()
  })
})

describe('decorateExternalAnchors', () => {
  it('opens external links in a new tab and marks them', () => {
    const html = decorateExternalAnchors('<p>See <a href="https://wvillage.org/employment/">https://wvillage.org/employment/</a>.</p>')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('data-external-link="true"')
    expect(html).toContain('<span class="connect-external-link-text">https://wvillage.org/employment/</span>')
  })

  it('leaves email and Connect links alone', () => {
    const html = '<a href="mailto:office@example.com">email</a> <a href="https://connect.asburyseminary.edu/jobs">jobs</a>'
    expect(decorateExternalAnchors(html)).toBe(html)
  })

  it('keeps existing rel tokens and does not double-wrap', () => {
    const once = decorateExternalAnchors(
      '<a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/apply">Apply</a>',
    )
    expect(once).toContain('rel="noopener noreferrer nofollow"')
    expect(once.match(/connect-external-link-text/g)).toHaveLength(1)
    const twice = decorateExternalAnchors(once)
    expect(twice.match(/data-external-link="true"/g)).toHaveLength(1)
    expect(twice.match(/connect-external-link-text/g)).toHaveLength(1)
  })
})
