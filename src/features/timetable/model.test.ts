import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMinutes, parseStudyOsTimetable, weekdayMinutes } from './model.ts'

const payload = {
  format: 'studyos-timetable', version: 1, exportedAt: '2026-09-14T04:37:07.369Z',
  source: { app: 'inyak-planner', timetableId: 't1', timetableName: '기본 + 물약2' },
  academicYear: 2026, academicTerm: '2', totalWeeklyMinutes: 999,
  subjects: [{ externalLectureId: 4, courseCode: 'ADA198', name: '의약품합성학', section: '1', professor: '허준성', credits: 3, weeklyMinutes: 999, meetings: [{ weekday: 1, startMinute: 660, endMinute: 780, location: 'H동101' }, { weekday: 3, startMinute: 720, endMinute: 780, location: 'H동101' }] }],
}

test('parses export and recalculates untrusted minute totals', () => {
  const parsed = parseStudyOsTimetable(payload)
  assert.equal(parsed.totalWeeklyMinutes, 180)
  assert.equal(parsed.subjects[0].weeklyMinutes, 180)
  assert.deepEqual(weekdayMinutes(parsed), { 1: 120, 3: 60 })
})

test('rejects unsupported and invalid meeting data', () => {
  assert.throws(() => parseStudyOsTimetable({ ...payload, version: 2 }), /지원하지 않는/)
  assert.throws(() => parseStudyOsTimetable({ ...payload, subjects: [{ ...payload.subjects[0], meetings: [{ weekday: 1, startMinute: 700, endMinute: 600, location: '' }] }] }), /범위/)
})

test('formats weekly duration without decimal hours', () => {
  assert.equal(formatMinutes(1380), '23시간')
  assert.equal(formatMinutes(125), '2시간 5분')
})
