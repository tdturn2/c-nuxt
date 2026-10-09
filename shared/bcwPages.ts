/**
 * Better Christian Workplace (/bcw) page content.
 * Shared template: hero → section header (left copy + right image) → gray intro → cards.
 */

export type BcwCardItem = {
  label: string
  href?: string
  /** Green bar + white bold label, used for the newest updates */
  highlight?: boolean
}

export type BcwCardSection = {
  heading?: string
  body?: string
  items?: BcwCardItem[]
}

export type BcwCard = {
  title: string
  body: string
  image: string
  to?: string
  href?: string
  moreLabel?: string
  sections?: BcwCardSection[]
}

export type BcwDocLink = {
  label: string
  href: string
}

export type BcwArchiveTeam = {
  title: string
  members: string[]
  links: BcwDocLink[]
  note?: string
  email?: { label: string; href: string }
}

export type BcwArchive = {
  updates: BcwDocLink[]
  projectIntro: string
  projectSummary: BcwDocLink
  teams: BcwArchiveTeam[]
  councilIntro: string
  councilDocs: BcwDocLink[]
  councilTeamTitle: string
  councilTeam: string[]
  importantDocs: BcwDocLink[]
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
    /** Shown above the heading when the block leads with a sentence */
    lead?: string
    title?: string
    body?: string
    items?: string[]
    align?: 'center' | 'left'
  }
  archive?: BcwArchive
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
      title: 'Living Our Values',
      body:
        'At Asbury Theological Seminary, our mission is rooted in forming Christlike leaders who serve the Church and the world. This calling is not only reflected in what we teach but in how we work together every day. Our internal values for staff and faculty are the foundation of a thriving, Christ-centered community. They shape our culture, guide our decisions, and ensure that every interaction reflects the heart of our mission.',
      image: '/bcw/working-header.jpg',
      imageAlt: 'Colleagues collaborating around a table',
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
        image: '/bcw/initiatives.jpg',
        to: '/bcw/initiatives',
      },
      {
        title: 'Leadership Advisory',
        body:
          'Your voice matters. This council empowers staff and faculty to share insights with leadership, fostering collaboration and transparency. Together, we shape decisions that reflect our shared mission and values.',
        image: '/bcw/leadership.jpg',
        to: '/bcw/leadership-advisory',
      },
      {
        title: 'Tools and Resources',
        body:
          'Access professional development opportunities, helpful guides, and our confidential reporting page—all designed to support growth, integrity, and accountability. These tools equip you to thrive personally and professionally at Asbury Seminary.',
        image: '/bcw/tools.jpg',
        to: '/bcw/employee-services',
      },
      {
        title: 'Archive',
        body:
          'Earlier updates, notes, and shared materials from the culture work—kept here so the story of how we got here stays easy to find.',
        image: '/bcw/archive.jpg',
        to: '/bcw/archive',
      },
      {
        title: 'Employee Services',
        body:
          'Benefits, policies, and everyday support for staff and faculty as you serve the Seminary’s mission.',
        image: '/bcw/es.jpg',
        to: '/bcw/employee-services',
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
      image: '/bcw/initiatives-header.jpg',
      imageAlt: 'Colleagues walking together on the Seminary campus',
    },
    intro: {
      title: 'Strengthening culture together',
      body:
        'From listening practices to spiritual formation and recognition, these initiatives help Asbury remain a healthy place to serve.',
    },
    cards: [
      {
        title: 'Workplace Culture Action Plan',
        body:
          'Each year, we identify key actions that will move our culture forward. These priorities come from community feedback, BCW survey insights, and recommendations from our cross-functional teams. Our current action plan highlights areas like communication, compensation, transparency, teamwork, and spiritual growth.',
        image: '/bcw/initiatives.jpg',
        sections: [
          {
            heading: 'Latest Updates',
            items: [
              {
                label: '2026 Zoom Recording with Dr. Doug Waldo',
                href: 'https://player.vimeo.com/video/1195660512?badge=0&autopause=0&player_id=0&app_id=58479',
                highlight: true,
              },
              {
                label: '2026 BCW Results Executive Summary',
                href: '/media/Asbury-Seminary_BCW-Executive-Summary-Results-2026.pdf',
                highlight: true,
              },
              {
                label: '2025-26 ATS Workplace Culture Action Plan',
                href: '/media/2025-26-ATS-Workplace-Culture-Action-Plan.pdf',
              },
              {
                label: '2025 Zoom Recording with Dr. Doug Waldo',
                href: 'https://vimeo.com/1090209215/daa01f671b?share=copy',
              },
              {
                label: '2025 BCW Executive Summary',
                href: '/media/ATS_BCW_2025_Executive_Summary_D.Waldo_.pdf',
              },
            ],
          },
        ],
      },
      {
        title: 'Leadership Advisory',
        body:
          'To bring our culture goals to life, cross-functional project teams are formed around specific action items. These teams include staff and faculty from across the Seminary who work together to create practical, actionable improvements. Teams have focused on areas such as:',
        image: '/bcw/tools.jpg',
        sections: [
          {
            items: [
              { label: 'Compensation and Benefits' },
              { label: 'Internal Communication' },
              { label: 'Spiritual Journey' },
              { label: 'Leave Policies (recently completed)' },
              { label: 'Teamwork' },
              { label: 'Transparency' },
              { label: 'Connection Opportunities' },
              { label: 'ELT Functioning' },
            ],
          },
          {
            body: 'Each team develops a plan, tracks progress, and shares updates with the community.',
          },
        ],
      },
      {
        title: 'Leadership Engagement & Communication',
        body:
          'We believe strong communication builds trust. Through initiatives such as the Leadership Advisory Council and all-employee briefings, we’re working to strengthen two-way communication between the Seminary’s leadership and the broader community.',
        image: '/bcw/leadership.jpg',
        sections: [
          {
            heading: 'These efforts help ensure:',
            items: [
              { label: 'Greater transparency' },
              { label: 'Shared understanding of decisions and priorities' },
              { label: 'More opportunities for your voice to be heard' },
            ],
          },
          {
            heading: 'Resources:',
            items: [
              { label: 'All Staff Meeting Recordings' },
              { label: 'Together in Mission: Presidential Newsletter' },
            ],
          },
        ],
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
      image: '/bcw/leadership-header.jpg',
      imageAlt: 'Students and colleagues walking and talking together',
    },
    intro: {
      align: 'left',
      lead:
        'The purpose of the Leadership Advisory Council is to improve the bilateral communication between the Executive Leadership Team (ELT) and the community (faculty and staff).',
      title: 'Leadership Advisory Council Team',
      items: [
        'Rev. Dr. Matt Barnes',
        'Mr. Kevin Bish',
        'Mr. Bryan Blankenship',
        'Rev. Tammy Cessna',
        'Dr. Janet Dean',
        'Ms. Tammy Hogan',
        'Mr. Jay Mansur',
        'Dr. Joseph Okello',
        'Dr. John Ragsdale',
        'Dr. David Watson',
        'Ms. Kahrah Williams',
      ],
    },
    cards: [],
  },
  {
    slug: 'archive',
    title: 'Archive',
    metaDescription: 'Earlier Better Christian Workplace updates and shared materials.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Archive',
      body:
        'Earlier updates, notes, and shared materials from the culture work—kept here so the story of how we got here stays easy to find.',
      image: '/bcw/archive.jpg',
      imageAlt: 'Colleagues talking together in a campus lounge',
    },
    intro: {},
    archive: {
      updates: [
        {
          label: '2025-26 ATS Workplace Culture Action Plan',
          href: '/media/2025-26-ATS-Workplace-Culture-Action-Plan.pdf',
        },
        {
          label: '2025 Zoom Recording with Dr. Doug Waldo',
          href: 'https://vimeo.com/1090209215/daa01f671b?share=copy',
        },
        {
          label: '2025 BCW Executive Summary',
          href: '/media/ATS_BCW_2025_Executive_Summary_D.Waldo_.pdf',
        },
      ],
      projectIntro:
        'Eight action items identified by the Cross-Functional Team were prioritized for attention and are currently being worked on. Project teams began meeting and created action plans for work that will take place through the end of May. View the project plans and the status of each team below.',
      projectSummary: {
        label: 'January 2024 Project Teams Summary',
        href: '/media/Jan_2024_Project_Team_Update_Summary_January_2024-1.pdf',
      },
      teams: [
        {
          title: 'Executive Leadership Team (ELT) Functioning',
          members: ['President', 'Vice-Presidents'],
          links: [{ label: 'View Project Plan', href: '/media/Cabinet-Functioning.pdf' }],
          note: 'This project plan will be put on hold in light of the upcoming presidential transition and will be revisited once the interim president is named.',
        },
        {
          title: 'Cascading Communication',
          members: ['President', 'Vice-Presidents'],
          links: [{ label: 'View Project Plan', href: '/media/Cascading-Communication.pdf' }],
          note: 'This project plan will be put on hold in light of the upcoming presidential transition and will be revisited once the interim president is named.',
        },
        {
          title: 'Compensation and Benefits',
          members: ['Barbara Antrobus', 'Bryan Blankenship', 'Kelly Bixler', 'Susan Hees', 'Tammy Cessna'],
          links: [
            { label: 'View Project Plan', href: '/media/Compensation-Benefits.pdf' },
            {
              label: 'All-Employee Briefing Slides (December 2024)',
              href: '/media/ATS-Compensation-Benefits-Project-Team-All-Employee-Meeting-Slides-December-2024.pdf',
            },
            { label: 'Compensation Philosophy', href: '/media/ATS-Compensation-Philosophy-November-2024.pdf' },
            { label: 'Compensation Strategy', href: '/media/ATS-Compensation-Strategy-November-2024.pdf' },
          ],
          email: { label: 'compquestions@asburyseminary.edu', href: 'mailto:compquestions@asburyseminary.edu' },
        },
        {
          title: 'Connection Opportunities',
          members: ['Chris Johnson', 'Ellen Marmon', 'Greg McElyea', 'Mary Katherine Graetz', 'Meredith Fulda', 'Robert Danielson'],
          links: [{ label: 'View Project Plan', href: '/media/Connection-Opportunities.pdf' }],
        },
        {
          title: 'Leave Policies',
          members: ['Barbara Antrobus', 'Bryan Blankenship', 'Jeremy Fulda', 'Jonathan Powers', 'Paula Hisel', 'Tracey Farrell'],
          links: [{ label: 'View Project Plan', href: '/media/Leave-Policies.pdf' }],
          note: 'This project plan has been completed.',
        },
        {
          title: 'Spiritual Journey',
          members: ['Abi Sipe', 'Fred Long', 'Jessica LaGrone', 'Kylie McCormick', 'Matt Barnes', 'Russell Hall'],
          links: [{ label: 'View Project Plan', href: '/media/Spiritual-Journey.pdf' }],
        },
        {
          title: 'Teamwork',
          members: ['Jim Hampton', 'Kevin Watson', 'Wes Custer'],
          links: [{ label: 'View Project Plan', href: '/media/Teamwork.pdf' }],
        },
        {
          title: 'Transparency',
          members: ['ELT', 'Chris Kiesling', 'Ruthanne Reese', 'Barbara Antrobus', 'Robin Ferraro'],
          links: [{ label: 'View Project Plan', href: '/media/Transparency.pdf' }],
        },
      ],
      councilIntro:
        'The purpose of the Leadership Advisory Council is to improve the bilateral communication between the Executive Leadership Team and the community (faculty and staff).',
      councilDocs: [
        {
          label: 'Leadership Advisory Council Agenda 10/17/23',
          href: '/media/Asbury-Theological-Seminary-Presidents-Council-Meeting-October-2023.pdf',
        },
        {
          label: 'Asbury Theological Seminary Leadership Advisory Council (Oct 23) Powerpoint by Colby Burke',
          href: '/media/Asbury-Theological-Seminary-Presidents-Council-October-2023.pdf',
        },
        {
          label: 'Faculty Committee Items for Discussion',
          href: '/media/Faculty-Committee-Items-for-Discussion.pdf',
        },
        {
          label: 'Staff Council Year in Review',
          href: '/media/Staff-Council-Year-in-Review-2023.pdf',
        },
        {
          label: '2023 10 17 Leadership Advisory Council Meeting Minutes',
          href: '/media/2023-10-17-Presidents-Council-Meeting-Minutes.pdf',
        },
      ],
      councilTeamTitle: "President's Council Team",
      councilTeam: [
        'Mrs. Barbara Antrobus',
        'Rev. Dr. Matt Barnes',
        'Mr. Kevin Bish',
        'Mr. Bryan Blankenship',
        'Mr. Colby Burke, The Turos Group (via zoom)',
        'Mrs. Robin Ferraro',
        'Ms. Tammy Hogan',
        'Dr. Chris Kiesling',
        'Mr. Jay Mansur',
        'Dr. Ruth Anne Reese',
        'Dr. Gregg Okesson',
      ],
      importantDocs: [
        {
          label: 'Engagement Survey Action Plan',
          href: '/media/Engagement-Survey-Action-Plan-September-6-2023.pdf',
        },
        { label: 'Frequently Asked Questions', href: '/media/bcwi-faq-sep2023.pdf' },
        {
          label: 'Engagement Survey Next Steps (Sept Meeting Slides)',
          href: '/media/Engagement-Survey-Next-Steps-September-2023.pdf',
        },
      ],
    },
    cards: [],
  },
  {
    slug: 'employee-services',
    title: 'Employee Services',
    metaDescription: 'Benefits, policies, and everyday support for Asbury Seminary staff and faculty.',
    hero: {
      backgroundImage: '/bcw/hero-bg.png',
      lockupImage: '/bcw/logo-lockup-white.png',
    },
    section: {
      eyebrow: 'INTERNAL CULTURE AT ATS',
      title: 'Employee Services',
      body:
        'Benefits, policies, and everyday support for staff and faculty as you serve the Seminary’s mission.',
      image: '/bcw/es.jpg',
      imageAlt: 'Two colleagues walking across campus',
    },
    intro: {
      title: 'Support for the people who serve here',
      body:
        'A home for the practical side of working at Asbury—benefits, policies, and the offices that help you get what you need.',
    },
    cards: [],
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
  return BCW_PAGES.filter((page) => page.slug !== 'employee-services').map((page) => ({
    label: page.slug ? page.title : 'Overview',
    to: page.slug ? `/bcw/${page.slug}` : '/bcw',
  }))
}
