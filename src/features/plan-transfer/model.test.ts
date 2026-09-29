import assert from 'node:assert/strict'
import test from 'node:test'
import { countStudyOsPlan, parseStudyOsPlan } from './model.ts'

const base = { description: null, category: 'study', startDate: null, dueDate: '2026-10-10', status: 'not_started', isDday: false, position: 0 }
const payload = {
  format: 'studyos-plan', version: 1, exportedAt: '2026-09-29T00:00:00Z',
  catalog: {
    categories: [{ key: 'study', label: 'Study' }],
    subjects: [{ name: 'Physics', color: '#719ce3', academicYear: 2026, academicTerm: '2' }],
    scheduleSubcategories: [{ category: 'study', name: 'Exam', color: '#a88bd8', position: 0 }],
  },
  tasks: { projects: [{ ...base, title: 'Semester', tasks: [], workstreams: [{ ...base, title: 'Physics', subject: 'Physics', showOnCalendar: true, tasks: [], sections: [{ title: 'Midterm', description: null, startDate: null, dueDate: null, status: 'not_started', position: 0, tasks: [{ ...base, title: 'Practice', showOnCalendar: true, isDeadline: false }] }] }] }] },
  schedules: { events: [{ title: 'Physics exam', category: 'study', subject: 'Physics', subcategory: 'Exam', allDay: false, startDate: '2026-10-10', startTime: '10:00', endDate: '2026-10-10', endTime: '11:00', isMajor: true, displayStyle: 'bar' }] },
}

test('parses a GPT-friendly nested StudyOS plan and counts every level', () => {
  const parsed = parseStudyOsPlan(payload)
  assert.equal(parsed.tasks.projects[0].workstreams[0].sections[0].tasks[0].title, 'Practice')
  assert.deepEqual(countStudyOsPlan(parsed), { subjects: 1, subcategories: 1, projects: 1, workstreams: 1, sections: 1, tasks: 1, events: 1 })
})

test('rejects unknown categories and invalid schedule ranges', () => {
  assert.throws(() => parseStudyOsPlan({ ...payload, tasks: { projects: [{ ...payload.tasks.projects[0], category: 'invented' }] } }), /지원하지 않는 카테고리/)
  assert.throws(() => parseStudyOsPlan({ ...payload, schedules: { events: [{ ...payload.schedules.events[0], endTime: '09:00' }] } }), /종료 시점/)
})

test('rejects malformed entity IDs and display styles before import', () => {
  assert.throws(() => parseStudyOsPlan({ ...payload, tasks: { projects: [{ ...payload.tasks.projects[0], id: 'not-a-uuid' }] } }), /UUID/)
  assert.throws(() => parseStudyOsPlan({ ...payload, schedules: { events: [{ ...payload.schedules.events[0], displayStyle: 'giant' }] } }), /표시 방식/)
})
