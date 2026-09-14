import assert from 'node:assert/strict'
import test from 'node:test'
import type { StudyOsTimetablePayload } from '../timetable/types.ts'
import { availableMinutesForDate, buildDailyStats } from './model.ts'

const timetable: StudyOsTimetablePayload = {
  format: 'studyos-timetable', version: 1, exportedAt: '2026-09-14T00:00:00Z',
  source: { app: 'inyak-planner', timetableId: 't1', timetableName: '기본 + 물약2' }, academicYear: 2026, academicTerm: '2', totalWeeklyMinutes: 1380,
  subjects: [
    { externalLectureId: 1, courseCode: 'A', name: 'A', section: '1', professor: null, credits: 3, weeklyMinutes: 420, meetings: [{ weekday: 1, startMinute: 540, endMinute: 660, location: '' }, { weekday: 1, startMinute: 660, endMinute: 780, location: '' }, { weekday: 1, startMinute: 780, endMinute: 840, location: '' }, { weekday: 1, startMinute: 900, endMinute: 1020, location: '' }] },
    { externalLectureId: 2, courseCode: 'B', name: 'B', section: '1', professor: null, credits: 3, weeklyMinutes: 960, meetings: [{ weekday: 2, startMinute: 660, endMinute: 1020, location: '' }, { weekday: 3, startMinute: 540, endMinute: 960, location: '' }, { weekday: 4, startMinute: 660, endMinute: 720, location: '' }, { weekday: 5, startMinute: 660, endMinute: 780, location: '' }] },
  ],
}

test('07:00–24:00 capacity subtracts merged timetable meetings', () => {
  const monday = new Date('2026-09-14T12:00:00')
  assert.equal(availableMinutesForDate(timetable, monday), 600)
  const week = Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(date.getDate() + index); return date })
  assert.equal(week.reduce((sum, date) => sum + availableMinutesForDate(timetable, date), 0), 5760)
})

test('daily comparison keeps recorded study time independent from capacity', () => {
  const monday = new Date('2026-09-14T12:00:00')
  const stats = buildDailyStats([monday], timetable, { sessions: [{ id: 's1', durationSeconds: 7200, endedAt: '2026-09-14T10:00:00+09:00', source: 'timer' }], caffeine: [{ id: 'c1', source: 'coffee', caffeineMg: 75, startedAt: '2026-09-14T08:00:00+09:00', durationMinutes: 60, note: null }] })
  assert.equal(stats[0].availableMinutes, 600)
  assert.equal(stats[0].studySeconds, 7200)
  assert.equal(stats[0].caffeineMg, 75)
})
