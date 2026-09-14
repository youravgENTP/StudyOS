import type { StudyOsMeeting, StudyOsTimetablePayload, StudyOsTimetableSubject } from './types'

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function text(value: unknown, label: string, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) throw new Error(`${label} 정보가 올바르지 않습니다.`)
  return value
}

function number(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} 정보가 올바르지 않습니다.`)
  return value
}

function parseMeeting(value: unknown): StudyOsMeeting {
  const item = record(value)
  if (!item) throw new Error('수업시간 정보가 올바르지 않습니다.')
  const weekday = number(item.weekday, '요일', 1, 7)
  const startMinute = number(item.startMinute, '시작 시간', 0, 1439)
  const endMinute = number(item.endMinute, '종료 시간', 1, 1440)
  if (!Number.isInteger(weekday) || !Number.isInteger(startMinute) || !Number.isInteger(endMinute) || endMinute <= startMinute) throw new Error('수업시간 범위가 올바르지 않습니다.')
  return { weekday: weekday as StudyOsMeeting['weekday'], startMinute, endMinute, location: text(item.location, '강의실', true) }
}

function parseSubject(value: unknown): StudyOsTimetableSubject {
  const item = record(value)
  if (!item || !Array.isArray(item.meetings)) throw new Error('과목 정보가 올바르지 않습니다.')
  const meetings = item.meetings.map(parseMeeting)
  const weeklyMinutes = meetings.reduce((sum, meeting) => sum + meeting.endMinute - meeting.startMinute, 0)
  return {
    externalLectureId: number(item.externalLectureId, '강의 ID', 0, Number.MAX_SAFE_INTEGER),
    courseCode: text(item.courseCode, '과목 코드'),
    name: text(item.name, '과목명'),
    section: text(item.section, '분반', true),
    professor: item.professor === null ? null : text(item.professor, '교수명'),
    credits: item.credits === null ? null : number(item.credits, '학점', 0, 100),
    weeklyMinutes,
    meetings,
  }
}

export function parseStudyOsTimetable(value: unknown): StudyOsTimetablePayload {
  const payload = record(value)
  const source = record(payload?.source)
  if (!payload || payload.format !== 'studyos-timetable' || payload.version !== 1 || !source) throw new Error('지원하지 않는 시간표 파일입니다.')
  if (!Array.isArray(payload.subjects) || payload.subjects.length === 0 || payload.subjects.length > 100) throw new Error('시간표에 가져올 과목이 없습니다.')
  const academicYear = number(payload.academicYear, '학년도', 2000, 2100)
  if (!Number.isInteger(academicYear) || !['1', 'summer', '2', 'winter'].includes(String(payload.academicTerm))) throw new Error('학기 정보가 올바르지 않습니다.')
  const subjects = payload.subjects.map(parseSubject)
  const ids = new Set(subjects.map(subject => subject.externalLectureId))
  if (ids.size !== subjects.length) throw new Error('중복된 강의가 포함되어 있습니다.')
  return {
    format: 'studyos-timetable', version: 1,
    exportedAt: text(payload.exportedAt, '내보낸 시간'),
    source: { app: text(source.app, '출처'), timetableId: text(source.timetableId, '시간표 ID'), timetableName: text(source.timetableName, '시간표 이름') },
    academicYear, academicTerm: String(payload.academicTerm) as StudyOsTimetablePayload['academicTerm'],
    totalWeeklyMinutes: subjects.reduce((sum, subject) => sum + subject.weeklyMinutes, 0), subjects,
  }
}

export function weekdayMinutes(timetable: StudyOsTimetablePayload) {
  return timetable.subjects.flatMap(subject => subject.meetings).reduce<Record<number, number>>((totals, meeting) => {
    totals[meeting.weekday] = (totals[meeting.weekday] ?? 0) + meeting.endMinute - meeting.startMinute
    return totals
  }, {})
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`
}
