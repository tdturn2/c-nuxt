import { describe, expect, it } from 'vitest'
import { buildCommunityNewsEmailHtml } from '../shared/communityNewsEmail'

describe('community news email', () => {
  it('builds sendgrid html with speakers, eucharist, and slides', () => {
    const html = buildCommunityNewsEmailHtml({
      origin: 'https://connect.asburyseminary.edu',
      intro: 'Learn, serve, and connect.',
      speakers: [
        {
          dateLabel: 'Tuesday, October 06 at 11:00am',
          name: 'Dr. Maria Kenney',
          title: 'Associate Professor of Christian Ethics',
          photoUrl: '/api/connect-user-media/file/maria.jpg',
        },
      ],
      eucharist: [{ dateLabel: 'Wednesday, October 07', detail: '12:10pm', extra: 'Estes Chapel' }],
      slides: [{ imageUrl: '/api/connect-pages-media/file/slide.jpg', alt: 'Fall retreat', href: 'https://asburyseminary.edu/news' }],
    })

    expect(html).toContain('Chapel Speakers this Week')
    expect(html).toContain('Eucharist Schedule')
    expect(html).toContain('Dr. Maria Kenney')
    expect(html).toContain('https://connect.asburyseminary.edu/community-news-header.jpg')
    expect(html).toContain('https://connect.asburyseminary.edu/api/connect-user-media/file/maria.jpg')
    expect(html).toContain('https://asburyseminary.edu/news')
    expect(html).not.toContain('<script')
  })
})
