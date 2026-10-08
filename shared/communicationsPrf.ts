import type { FormFieldV1, FormSchemaV1 } from '../app/types/forms'
import { labeledFormAnswers, type FormAnswerField } from './formNotificationEmail'

export const COMMUNICATIONS_PRF_SLUG = 'communications-prf'

export const COMMUNICATIONS_PRF_CONFIRMATION =
  'Thanks for submitting your request. A Trello card has been created so you can follow its progress. If you do not have access to the Communications board yet, email communications.office@asburyseminary.edu.'

const REQUEST = 'request-type'
const PROMOTIONAL = 'Promotional (social media, press release, etc)'

const DEPARTMENTS = [
  'Admissions',
  'Advanced Research Programs',
  'Alumni',
  'Asbury Inn',
  'Asbury Latino Center',
  'Auxiliary Services (Dining, SPO, Switchboard)',
  'Beeson International Center',
  'Career and Calling',
  'Chapel Office',
  'Center for Church Multiplication',
  'Center for Formational and Missional Training',
  'Communications',
  'Community Formation',
  'Development',
  'Doctor of Ministry',
  'ESJ School of Mission and Ministry',
  'Facilities and Security',
  'Finance & Administration',
  'Financial Aid',
  'First Fruits',
  'Global Formation',
  'Global Partnerships',
  'Human Resources',
  'Institutional Effectiveness and Assessment',
  'LITS',
  'Major Events',
  "President's Office",
  'Provost’s Office',
  'Registrar',
  'School of Biblical Interpretation',
  'School of Counseling',
  'School of Theology and Formation',
  'Student Services',
  'Staff Council',
  'Student Success',
  'VP of Enrollment Management Office',
  'VP of Finance and Administration Office',
  'VP of Formation Office',
  'VP of Advancement Office',
]

const PHOTO_DEPARTMENTS = [
  'Admissions',
  'Advanced Research Programs',
  'Advancement Office',
  'Alumni',
  'Asbury Inn (Guest & Auxiliary Services)',
  'Beeson Center',
  'Business Office',
  'Chapel Office',
  'Community Formation',
  'Distributed Learning',
  'Financial Aid',
  'Fitness',
  'Florida Dunnam Campus',
  'Library',
  'Major Events',
  'Office of Faith, Work & Economics',
  "President's Office",
  'Provost & Academic Affairs',
  'Registrar',
  'Seedbed',
  'Student Leadership Council',
  'Student Services',
  'Other',
]

const choices = (labels: string[]) => labels.map((label) => ({ label, value: label }))

type Condition = { sourceFieldId: string; operator?: string; value: string }

function when(targetFieldId: string, conditions: Condition[], logicType: 'all' | 'any' = 'all') {
  return {
    type: 'gravityConditional',
    targetFieldId,
    actionType: 'show',
    logicType,
    conditions,
  }
}

function isRequest(value: string): Condition {
  return { sourceFieldId: REQUEST, operator: 'is', value }
}

function notRequest(value: string): Condition {
  return { sourceFieldId: REQUEST, operator: 'isnot', value }
}

const massEmail = (id: string, extra: Condition[] = []) =>
  when(id, [isRequest('Mass Email'), ...extra])

const graphic = (id: string, extra: Condition[] = []) =>
  when(id, [isRequest('Graphic Design'), ...extra])

const promo = (id: string) => when(id, [isRequest(PROMOTIONAL)])
const website = (id: string) => when(id, [isRequest('Website')])
const photo = (id: string) => when(id, [isRequest('Photo')])
const cards = (id: string, extra: Condition[] = []) =>
  when(id, [isRequest('Business Cards'), ...extra])
const calendar = (id: string) => when(id, [isRequest('Calendar Update')])

const additional = (id: string) =>
  when(id, [notRequest('Photo'), notRequest('Business Cards'), notRequest('Calendar Update')])

const fields: FormFieldV1[] = [
  { id: 'submitter-name', type: 'hidden', label: 'Name', defaultValue: '{user:display_name}' },
  { id: 'submitter-email', type: 'hidden', label: 'Email', defaultValue: '{user:user_email}' },
  {
    id: 'project-title',
    type: 'text',
    label: 'Project Title',
    required: true,
    description: 'Provide a short, unique title for the project you are requesting.',
  },
  { id: 'department', type: 'select', label: 'Department', required: true, options: choices(DEPARTMENTS) },
  {
    id: REQUEST,
    type: 'radio',
    label: 'Request Type',
    required: true,
    description:
      'For video project requests, please reach out to the LITS team at helpdesk@asburyseminary.edu. They will respond with an estimated timeline depending on their current workload.',
    options: choices([
      'Graphic Design',
      'Mass Email',
      'Photo',
      'Website',
      PROMOTIONAL,
      'Calendar Update',
      'Business Cards',
      'Other',
    ]),
  },
  { id: 'billing-account', type: 'text', label: 'Billing Account Code', description: 'Optional.' },

  { id: 'mass-email-section', type: 'section', label: 'Mass Email' },
  {
    id: 'email-from',
    type: 'text',
    label: 'From (Sender)',
    required: true,
    description: 'Example: Communications Office (communications.office@asburyseminary.edu)',
  },
  {
    id: 'email-recipients',
    type: 'checkbox',
    label: 'Recipients',
    required: true,
    description:
      'If you are sending to a custom recipient list, attach the .csv below. A custom list is any group that is not one of these lists.',
    options: choices([
      'All Community (all locations students, faculty, staff)',
      'All Kentucky Students',
      'All Kentucky Faculty',
      'All Kentucky Staff',
      'All Global Students',
      'All Global Faculty',
      'All Global Staff',
      'Custom List (attach the .csv email list below)',
    ]),
  },
  { id: 'email-subject', type: 'text', label: 'Email Subject Line', required: true },
  {
    id: 'email-content',
    type: 'textarea',
    label: 'Email Content',
    required: true,
    description: 'Add the content of the email here or attach it below.',
  },
  {
    id: 'email-files',
    type: 'file',
    label: 'Files',
    description: 'Attach any related documents, PDFs, CSVs, or images for this email request.',
    accept: ['.pdf', '.doc', '.docx', '.csv', '.jpg', '.jpeg', '.png', '.gif'],
  },
  {
    id: 'email-send-when',
    type: 'select',
    label: 'Sending Day and Time',
    required: true,
    options: choices(['Specific Day and Time']),
  },
  { id: 'email-send-date', type: 'date', label: 'Date to send email' },
  { id: 'email-send-time', type: 'text', label: 'Preferred Sending Time', description: 'Example: 9:00 AM' },
  {
    id: 'email-approvers',
    type: 'text',
    label: 'Approvers',
    description: 'List the emails of anyone else who needs to approve the email before it is sent.',
  },

  { id: 'graphic-section', type: 'section', label: 'Graphic Design' },
  {
    id: 'graphic-options',
    type: 'checkbox',
    label: 'Graphic Design Options',
    required: true,
    options: choices([
      'Poster (11x17)',
      'Flyer (8.5x11)',
      'Postcard',
      'Brochure',
      'Digital Signage Announcement',
      'Community News Announcement',
      'Envelope needed',
      'Other',
    ]),
  },
  {
    id: 'print-quantity',
    type: 'number',
    label: 'Quantity to print',
    required: true,
    description: 'Quantities higher than 10 will be outsourced for printing.',
  },
  {
    id: 'print-account',
    type: 'text',
    label: 'Account number to charge',
    required: true,
    description: 'Format: xxx-xxxxx-xxxxx-xxxxxx',
  },

  { id: 'promo-section', type: 'section', label: 'Promotion Request Details' },
  {
    id: 'promo-options',
    type: 'checkbox',
    label: 'Promotion Options',
    required: true,
    options: choices([
      'Press Release',
      'Social Media Plug',
      'Community News Weekly Email Plug',
      'Connect Announcement',
      'Email Blast (stand-alone)',
    ]),
  },

  { id: 'website-section', type: 'section', label: 'Website Request Details' },
  {
    id: 'website-options',
    type: 'checkbox',
    label: 'Website Options',
    required: true,
    options: choices([
      'asburyseminary.edu update',
      'Connect update',
      'New event page',
      'New website request',
      'Other',
    ]),
  },
  { id: 'website-url', type: 'text', label: 'URL to update', required: true },

  { id: 'photo-section', type: 'section', label: 'Photo Request Details' },
  {
    id: 'photo-department',
    type: 'select',
    label: 'Department',
    required: true,
    options: choices(PHOTO_DEPARTMENTS),
  },
  {
    id: 'photo-event-date',
    type: 'date',
    label: 'Event Date',
    description: 'Please provide at least 2 weeks notice prior to the event, if possible.',
  },
  {
    id: 'photo-description',
    type: 'textarea',
    label: 'Description',
    required: true,
    description: 'Include the time of the event, how long it lasts, and anything else needed to complete this request.',
  },
  {
    id: 'photo-group',
    type: 'select',
    label: 'Are you wanting a group photo?',
    required: true,
    options: choices([
      'No',
      'Yes (If group photos are needed, please have someone at the event to organize the people)',
    ]),
  },

  { id: 'cards-section', type: 'section', label: 'Business Card Request Details' },
  { id: 'card-first', type: 'text', label: 'First name', required: true, description: 'Who are these business cards for?' },
  { id: 'card-last', type: 'text', label: 'Last name', required: true },
  { id: 'card-printed-name', type: 'text', label: 'Name as it is to be printed on the business card', required: true },
  { id: 'card-email', type: 'text', label: 'Email to be printed on the business card', required: true },
  { id: 'card-titles', type: 'textarea', label: 'Titles as they are to appear on the business card', required: true },
  {
    id: 'card-toll-free',
    type: 'select',
    label: 'Which toll free number',
    required: true,
    options: choices(['800.2.ASBURY', '888.5.BEESON', '844.GO.TO.ATS']),
  },
  {
    id: 'card-general-number',
    type: 'radio',
    label: 'Which general number?',
    options: choices(['859.858.3581', '407.482.7500', 'None', 'Other']),
  },
  { id: 'card-general-number-other', type: 'text', label: 'Other general number' },
  { id: 'card-direct', type: 'text', label: 'Direct-dial number, if you want it listed' },
  { id: 'card-mobile', type: 'text', label: 'Mobile number, if you want that listed' },
  {
    id: 'card-quantity',
    type: 'radio',
    label: 'Order Quantity',
    required: true,
    options: choices(['500', '1000', '2000', 'Other']),
  },
  { id: 'card-quantity-other', type: 'text', label: 'Other order quantity' },
  {
    id: 'card-account',
    type: 'text',
    label: 'Account Number to Charge',
    required: true,
    description: 'Format: xxx-xxxxx-xxxxx-xxxxxx',
  },

  { id: 'calendar-section', type: 'section', label: 'Calendar Update Details' },
  { id: 'event-title', type: 'text', label: 'Event Title', required: true },
  {
    id: 'event-description',
    type: 'textarea',
    label: 'Description',
    required: true,
    description:
      'Briefly describe the event and include the target audience (staff, faculty, students in a particular school, by-invitation only, and so on).',
  },
  { id: 'event-participants', type: 'text', label: 'Number of participants anticipated' },
  {
    id: 'event-date',
    type: 'date',
    label: 'Event Date',
    required: true,
    description: 'If it is a multi-day event, provide the beginning date.',
  },
  { id: 'event-end-date', type: 'date', label: 'Event End Date' },
  {
    id: 'event-times',
    type: 'text',
    label: 'Beginning and Ending Times',
    required: true,
    description: 'If no time is given, the event will show on the calendar as an all-day event.',
  },
  { id: 'event-url', type: 'text', label: 'Event URL' },
  {
    id: 'event-location',
    type: 'text',
    label: 'Location of Event',
    required: true,
    description: 'Provide a room or building location for the event.',
  },
  {
    id: 'event-calendars',
    type: 'checkbox',
    label: 'Calendars Requested',
    required: true,
    defaultValue: 'Master Calendar',
    options: choices([
      'Master Calendar',
      'Academic Calendar',
      'ATS Fitness',
      'ATS Meeting',
      'Faculty Calendar',
      'Florida Campus Events',
      'Florida Chapel',
      'Kentucky Campus Events',
      'Kentucky Chapel',
      'OFWE Events',
    ]),
  },
  {
    id: 'event-category',
    type: 'select',
    label: 'Event Categories',
    options: choices([
      'Alumni',
      'Career Services',
      'Conference/ Video Conference',
      'Information Session/ Talk back',
      'Lecture',
      'Meal Function',
      'Meeting',
      'Orientation',
      'Overflow Room',
      'Performance',
      'Private (Do Not Display)',
      'Program/ Workshop',
      'Rain Location',
      'Reception',
      'Retreat Room Hold',
      'Social Event',
      'Speaker/ Panel',
    ]),
  },
  { id: 'event-schedule', type: 'file', label: 'Attach a schedule', description: 'If one is available.' },

  {
    id: 'details-section',
    type: 'section',
    label: 'Additional Project Details',
    description: 'Optional information for this request. Skip this if everything has already been provided.',
  },
  {
    id: 'project-description',
    type: 'textarea',
    label: 'Project Description',
    description: 'Include any further details needed for this project.',
  },
  {
    id: 'completion-date',
    type: 'date',
    label: 'When does this project need completed?',
    required: true,
    description:
      'Share your desired completion date. Once all required content is received, Communications will confirm the production timeline with you.',
  },
  {
    id: 'project-files',
    type: 'file',
    label: 'Files',
    description: 'Include file attachments with content for the request.',
  },
]

const specificSend: Condition = { sourceFieldId: 'email-send-when', operator: 'is', value: 'Specific Day and Time' }

export const communicationsPrfSchema: FormSchemaV1 = {
  version: 1,
  title: 'Communications Project Request',
  description: 'Request graphic design, email, photo, website, promotion, calendar, or business card work from Communications.',
  layout: { columns: 1 },
  confirmationMessage: COMMUNICATIONS_PRF_CONFIRMATION,
  emailNotification: {
    enabled: true,
    to: 'communications.office@asburyseminary.edu',
    from: 'webdeveloper@asburyseminary.edu',
    subject: 'New project request',
  },
  fields,
  rules: [
    ...['mass-email-section', 'email-from', 'email-recipients', 'email-subject', 'email-content', 'email-files', 'email-send-when', 'email-approvers'].map((id) => massEmail(id)),
    massEmail('email-send-date', [specificSend]),
    massEmail('email-send-time', [specificSend]),
    ...['graphic-section', 'graphic-options', 'print-quantity'].map((id) => graphic(id)),
    graphic('print-account', [{ sourceFieldId: 'print-quantity', operator: '>', value: '10' }]),
    ...['promo-section', 'promo-options'].map((id) => promo(id)),
    ...['website-section', 'website-options'].map((id) => website(id)),
    {
      type: 'gravityConditional',
      targetFieldId: 'website-url',
      actionType: 'show',
      logicType: 'all',
      groups: [
        { logicType: 'all', conditions: [isRequest('Website')] },
        {
          logicType: 'any',
          conditions: [
            { sourceFieldId: 'website-options', operator: 'is', value: 'asburyseminary.edu update' },
            { sourceFieldId: 'website-options', operator: 'is', value: 'Connect update' },
          ],
        },
      ],
    },
    ...['photo-section', 'photo-department', 'photo-event-date', 'photo-description', 'photo-group'].map((id) => photo(id)),
    ...[
      'cards-section',
      'card-first',
      'card-last',
      'card-printed-name',
      'card-email',
      'card-titles',
      'card-toll-free',
      'card-general-number',
      'card-direct',
      'card-mobile',
      'card-quantity',
      'card-account',
    ].map((id) => cards(id)),
    cards('card-general-number-other', [{ sourceFieldId: 'card-general-number', operator: 'is', value: 'Other' }]),
    cards('card-quantity-other', [{ sourceFieldId: 'card-quantity', operator: 'is', value: 'Other' }]),
    ...[
      'calendar-section',
      'event-title',
      'event-description',
      'event-participants',
      'event-date',
      'event-end-date',
      'event-times',
      'event-url',
      'event-location',
      'event-calendars',
      'event-category',
      'event-schedule',
    ].map((id) => calendar(id)),
    ...['details-section', 'project-description', 'completion-date', 'project-files'].map((id) => additional(id)),
  ],
}

export const communicationsPrfForm = {
  slug: COMMUNICATIONS_PRF_SLUG,
  title: 'Communications Project Request',
  componentKey: 'default',
  editableMode: 'immutable' as const,
  status: 'active' as const,
  indexedFields: fields.map((field) => ({ key: field.id })),
  viewerGroups: [] as unknown[],
  schema: communicationsPrfSchema,
}

export function communicationsPrfNotifyEmails(
  answers: Record<string, unknown>,
  submitterEmail: string,
): string[] {
  const recipients = ['communications.office@asburyseminary.edu', submitterEmail]
  const requestType = String(answers[REQUEST] || '')
  if (requestType === 'Website' || requestType === 'Mass Email') {
    recipients.push('helpdesk@asburyseminary.edu', 'terry.turner@asburyseminary.edu')
  }
  return recipients
}

export function parseTrelloMemberIds(memberIds: string, byRequestTypeJson: string, requestType: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (raw: string) => {
    for (const part of String(raw || '').split(/[,\s]+/)) {
      const id = part.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
  }
  add(memberIds)
  if (byRequestTypeJson.trim()) {
    try {
      const map = JSON.parse(byRequestTypeJson) as Record<string, unknown>
      const extra = map[requestType]
      if (typeof extra === 'string') add(extra)
      else if (Array.isArray(extra)) add(extra.map((value) => String(value)).join(','))
    } catch {
      // Ignore a bad map and still tag the default members.
    }
  }
  return out
}

export function communicationsPrfTrelloCard(
  answers: Record<string, unknown>,
  fieldsForLabels: FormAnswerField[],
  submitterEmail: string,
) {
  const rows = labeledFormAnswers(answers, fieldsForLabels)
  const desc = [
    `Submitted by ${submitterEmail || 'unknown'}`,
    '',
    ...rows.flatMap((row) => [`**${row.label}**`, row.value, '']),
  ].join('\n').trim()
  const title = String(answers['project-title'] || '').trim() || 'Communications project request'
  const dueRaw = String(answers['completion-date'] || '').trim()
  return {
    name: title.slice(0, 200),
    desc: desc.slice(0, 16000),
    due: /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : undefined,
    requestType: String(answers[REQUEST] || ''),
  }
}
