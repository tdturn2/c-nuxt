/**
 * Better Christian Workplace (/bcw) page content.
 * Shared template: hero → section header (left copy + right image) → gray intro → cards.
 */

export type BcwCard = {
  title: string
  body: string
  image: string
  to?: string
  href?: string
  moreLabel?: string
}

export type BcwPage = {
  slug: string
  title: string
  /** Browser tab / SEO */
  metaDescription?: string
  hero?: {
    /** Ginkgo / banner background */
    backgroundImage?: string
    /** White “A Thriving CULTURE” + Asbury lockup PNG (black plate dropped via blend) */
    lockupImage?: string
  }
  section: {
    eyebrow: string
    title: string
    body: string
    image: string
    imageAlt?: string
  }
  intro: {
    title: string
    body: string
  }
  cards: BcwCard[]
}

const ACCENT = '#c5d46c'

export const BCW_ACCENT = ACCENT

export const BCW_PAGES: BcwPage[] = [
  {
    slug: '',
    title: 'Better Christian Workplace',
    metaDescription:
      'Experience a workplace defined by purpose, respect, and community at Asbury Theological Seminary.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Working at ATS',
      body:
        'Experience a workplace defined by purpose, respect, and community. Learn what makes Asbury a great place to work—where every role contributes to forming Christlike leaders for the Church and the world.',
      image: '/bcw/BCW-header-1-sm.jpg',
      imageAlt: 'Colleagues collaborating around a conference table',
    },
    intro: {
      title: 'Roadmap For a Thriving Culture',
      body:
        'Building a thriving workplace culture is an ongoing journey. Explore the initiatives, leadership pathways, and practical tools that help staff and faculty flourish together in Christ-centered community.',
    },
    cards: [
      {
        title: 'Initiatives',
        body:
          'Explore initiatives that strengthen trust, engagement, and spiritual vitality—creating a workplace where faith and flourishing go hand in hand.',
        image: '/bcw/section-living-values.png',
        to: '/bcw/initiatives',
      },
      {
        title: 'Leadership Advisory',
        body:
          'Your voice matters. This council empowers staff and faculty to share insights with leadership, fostering collaboration and transparency. Together, we shape decisions that reflect our shared mission and values.',
        image: '/bcw/BCW-header-1-sm.jpg',
        to: '/bcw/leadership-advisory',
      },
      {
        title: 'Tools and Resources',
        body:
          'Access professional development opportunities, helpful guides, and our confidential reporting page—all designed to support growth, integrity, and accountability. These tools equip you to thrive personally and professionally at Asbury Seminary.',
        image: '/bcw/section-living-values.png',
        to: '/bcw/tools-and-resources',
      },
    ],
  },
  {
    slug: 'values',
    title: 'Living Our Values',
    metaDescription: 'Internal values for staff and faculty at Asbury Theological Seminary.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Living Our Values',
      body:
        'At Asbury Theological Seminary, our mission is rooted in forming Christlike leaders who serve the Church and the world. This calling is not only reflected in what we teach but in how we work together every day. Our internal values for staff and faculty are the foundation of a thriving, Christ-centered community. They shape our culture, guide our decisions, and ensure that every interaction reflects the heart of our mission.',
      image: '/bcw/BCW-header-1-sm.jpg',
      imageAlt: 'Staff and faculty in a collaborative meeting',
    },
    intro: {
      title: 'Values that shape how we work',
      body:
        'These commitments guide daily decisions, conversations, and collaboration across campus—so our internal culture matches the mission we proclaim.',
    },
    cards: [
      {
        title: 'What Makes Our Workplace Unique',
        body:
          'Mission-driven environment. Shared spiritual rhythms. A community that values people as much as outcomes.',
        image: '/bcw/BCW-header-1-sm.jpg',
      },
      {
        title: 'Opportunities to Thrive',
        body:
          'Professional development, tuition waiver opportunities for employees and qualifying dependents, and pathways to grow in calling and craft.',
        image: '/bcw/section-living-values.png',
      },
    ],
  },
  {
    slug: 'initiatives',
    title: 'Initiatives',
    metaDescription: 'Workplace initiatives that strengthen trust, engagement, and spiritual vitality.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Initiatives',
      body:
        'Explore initiatives that strengthen trust, engagement, and spiritual vitality—creating a workplace where faith and flourishing go hand in hand.',
      image: '/bcw/BCW-header-1-sm.jpg',
    },
    intro: {
      title: 'Strengthening culture together',
      body:
        'From listening practices to spiritual formation and recognition, these initiatives help Asbury remain a healthy place to serve.',
    },
    cards: [
      {
        title: 'Engagement & Listening',
        body: 'Structured ways for staff and faculty to share feedback and shape a healthier workplace.',
        image: '/bcw/section-living-values.png',
      },
      {
        title: 'Spiritual Vitality',
        body: 'Practices and gatherings that keep Christ at the center of our work life.',
        image: '/bcw/BCW-header-1-sm.jpg',
      },
      {
        title: 'Recognition & Care',
        body: 'Ways we celebrate contribution and support colleagues through seasons of work and life.',
        image: '/bcw/section-living-values.png',
      },
    ],
  },
  {
    slug: 'leadership-advisory',
    title: 'Leadership Advisory',
    metaDescription: 'Staff and faculty advisory council for collaboration and transparency.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Leadership Advisory',
      body:
        'Your voice matters. This council empowers staff and faculty to share insights with leadership, fostering collaboration and transparency. Together, we shape decisions that reflect our shared mission and values.',
      image: '/bcw/BCW-header-1-sm.jpg',
    },
    intro: {
      title: 'A channel for shared leadership',
      body:
        'The advisory council connects frontline wisdom with institutional decision-making so culture work stays grounded and mutual.',
    },
    cards: [
      {
        title: 'Purpose',
        body: 'Advise leadership on workplace culture, communication, and employee experience.',
        image: '/bcw/BCW-header-1-sm.jpg',
      },
      {
        title: 'How to engage',
        body: 'Learn how representatives are selected and how you can bring ideas or concerns forward.',
        image: '/bcw/section-living-values.png',
      },
    ],
  },
  {
    slug: 'tools-and-resources',
    title: 'Tools and Resources',
    metaDescription: 'Professional development, guides, and confidential reporting resources.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Tools and Resources',
      body:
        'Access professional development opportunities, helpful guides, and our confidential reporting page—all designed to support growth, integrity, and accountability.',
      image: '/bcw/BCW-header-1-sm.jpg',
    },
    intro: {
      title: 'Support for growth and integrity',
      body:
        'Practical resources for everyday work—learning, policies, and safe channels when something needs attention.',
    },
    cards: [
      {
        title: 'Professional Development',
        body: 'Tuition benefits, training pathways, and opportunities to grow in your role.',
        image: '/bcw/section-living-values.png',
      },
      {
        title: 'Guides & Policies',
        body: 'Helpful references for managers and teammates navigating workplace expectations.',
        image: '/bcw/BCW-header-1-sm.jpg',
      },
      {
        title: 'Confidential Reporting',
        body: 'A safe path to raise concerns when integrity or wellbeing is at stake.',
        image: '/bcw/section-living-values.png',
      },
    ],
  },
]

export function getBcwPage(slug: string | undefined | null): BcwPage | undefined {
  const key = String(slug || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
  return BCW_PAGES.find((page) => page.slug === key)
}

export function bcwNavItems() {
  return BCW_PAGES.map((page) => ({
    label: page.slug ? page.title : 'Overview',
    to: page.slug ? `/bcw/${page.slug}` : '/bcw',
  }))
}
