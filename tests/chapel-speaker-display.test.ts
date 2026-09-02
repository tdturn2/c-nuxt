import { describe, expect, it } from 'vitest'
import {
  chapelSpeakerName,
  chapelSpeakerPhoto,
  chapelSpeakerTitle,
} from '../shared/chapelSpeakerDisplay'

describe('chapel speaker profile fallbacks', () => {
  const linked = {
    name: 'Dr. David Watson',
    speakerDescription: '',
    photo: null,
    connectUser: {
      id: 12,
      name: 'David Watson',
      employeeTitle: 'Academic Dean',
      avatar: { url: '/api/connect-user-media/file/watson.jpg' },
    },
  }

  it('uses the speaker photo and description when they are set', () => {
    const speaker = {
      name: 'Guest Preacher',
      speakerDescription: 'Visiting scholar',
      photo: { url: '/api/speaker-photos/file/guest.jpg' },
      connectUser: linked.connectUser,
    }
    expect(chapelSpeakerName(speaker)).toBe('Guest Preacher')
    expect(chapelSpeakerTitle(speaker)).toBe('Visiting scholar')
    expect(chapelSpeakerPhoto(speaker)).toEqual({ url: '/api/speaker-photos/file/guest.jpg' })
  })

  it('falls back to the linked user photo and title', () => {
    expect(chapelSpeakerName(linked)).toBe('Dr. David Watson')
    expect(chapelSpeakerTitle(linked)).toBe('Academic Dean')
    expect(chapelSpeakerPhoto(linked)).toEqual({ url: '/api/connect-user-media/file/watson.jpg' })
  })

  it('ignores numeric photo ids that are not populated', () => {
    expect(chapelSpeakerPhoto({ photo: 44, connectUser: linked.connectUser })).toEqual({
      url: '/api/connect-user-media/file/watson.jpg',
    })
  })
})
