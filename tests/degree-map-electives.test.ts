import { describe, expect, it } from 'vitest'
import {
  appliedElectiveHours,
  countTowardLimit,
  courseSearchSeed,
  electiveCourseCode,
  electiveCourseTitle,
  electiveLineView,
  electiveRecords,
  filledElectiveHours,
  isCompletedRecord,
  isElectiveBucket,
} from '../shared/degreeMapElectives'

describe('degree map electives', () => {
  it('treats other_course rows as buckets and keeps named courses single', () => {
    expect(isElectiveBucket({ type: 'other_course' })).toBe(true)
    expect(isElectiveBucket({ type: 'single' })).toBe(false)
    expect(isElectiveBucket({ type: 'single', course: { code: 'MH9__', title: 'Concentration Electives', credits: 9 } })).toBe(true)
    expect(isElectiveBucket({ type: 'single', course: { code: 'MH902', title: 'Biblical Theology of Mission', credits: 3 } })).toBe(false)
    expect(isElectiveBucket({ type: 'other_course', electiveLine: true })).toBe(false)
  })

  it('uses the course code, not the section, as the search seed', () => {
    expect(courseSearchSeed('ms501 W2')).toBe('MS501')
    expect(courseSearchSeed('MS501-W2')).toBe('MS501')
    expect(courseSearchSeed('NT(IBS)510-W1')).toBe('NT(IBS)510')
    expect(courseSearchSeed('MH910')).toBe('MH910')
    expect(courseSearchSeed('')).toBe('')
  })

  it('recognizes a course marked completed', () => {
    expect(isCompletedRecord({ status: 'completed' })).toBe(true)
    expect(isCompletedRecord({ status: 'complete' })).toBe(true)
    expect(isCompletedRecord({ status: 'active' })).toBe(false)
    expect(isCompletedRecord({ status: null })).toBe(false)
  })

  it('sums every course under a bucket', () => {
    const item = {
      type: 'other_course',
      credits: 18,
      records: [{ hoursEarned: 3 }, { hoursEarned: 6 }, { hoursEarned: null }],
    }
    expect(electiveRecords(item)).toHaveLength(3)
    expect(filledElectiveHours(electiveRecords(item))).toBe(9)
  })

  it('stops a bucket and a section at their required hours', () => {
    const records = [{ hoursEarned: 30 }, { hoursEarned: 3, course: { credits: 3 } }]
    expect(filledElectiveHours(records, 9)).toBe(9)
    expect(countTowardLimit([9, 12], 18)).toEqual([9, 9])
  })

  it('does not treat a manual hour entry as the course requirement', () => {
    const line = electiveLineView({ id: 1, type: 'other_course', credits: 9, label: 'Concentration Electives' }, { hoursEarned: 30, enteredCourseCode: 'asd' })
    expect(line.credits).toBeNull()
  })

  it('does not let one class count more hours than that class requires', () => {
    const records = [
      { hoursEarned: 22, course: { code: 'BS710', credits: 1 } },
      { hoursEarned: 3, course: { code: 'NT605', credits: 3 } },
    ]
    expect(appliedElectiveHours(records[0])).toBe(1)
    expect(filledElectiveHours(records)).toBe(4)
  })

  it('keeps the entered hours when the class has no catalog credits', () => {
    expect(appliedElectiveHours({ hoursEarned: 2 })).toBe(2)
    expect(appliedElectiveHours({ hoursEarned: null })).toBeNull()
  })

  it('prefers the course the student typed over the catalog course', () => {
    const record = {
      enteredCourseCode: 'NT605',
      enteredCourseTitle: 'Greek Exegesis',
      offeringFullClassId: 'NT605-W1',
      course: { code: 'NT601', title: 'Something else', credits: 3 },
      hoursEarned: 3,
    }
    expect(electiveCourseCode(record)).toBe('NT605')
    expect(electiveCourseTitle(record)).toBe('Greek Exegesis')
    const line = electiveLineView({ id: 4, type: 'other_course', credits: 18, label: 'BS Electives', description: 'note' }, record)
    expect(line.electiveLine).toBe(true)
    expect(line.code).toBe('NT605')
    expect(line.title).toBe('Greek Exegesis')
    expect(line.credits).toBe(3)
    expect(line.description).toBeUndefined()
  })
})
