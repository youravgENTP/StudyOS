import { dataApi } from '../../lib/neon/data'
import type { ImportedTimetable, StudyOsMeeting, StudyOsTimetablePayload, StudyOsTimetableSubject } from './types'

function failure(operation: string, error: unknown) {
  if (import.meta.env.DEV) console.error(`[timetable] ${operation}`, error)
  return new Error('시간표를 저장하거나 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
}

export async function importTimetable(payload: StudyOsTimetablePayload) {
  const { error } = await dataApi.rpc('import_studyos_timetable', { payload })
  if (error) throw failure('import timetable', error)
}

export async function getLatestTimetable(): Promise<ImportedTimetable | null> {
  const { data: timetableRows, error: timetableError } = await dataApi.from('study_timetables')
    .select('id,source_app,source_timetable_id,name,academic_year,academic_term,exported_at,total_weekly_minutes,imported_at')
    .order('imported_at', { ascending: false }).limit(1)
  if (timetableError) throw failure('load timetable', timetableError)
  const timetable = timetableRows?.[0] as Record<string, unknown> | undefined
  if (!timetable) return null

  const { data: courseRows, error: courseError } = await dataApi.from('study_timetable_courses')
    .select('id,external_lecture_id,course_code,section,professor,credits,weekly_minutes,subjects(name)')
    .eq('timetable_id', String(timetable.id))
  if (courseError) throw failure('load courses', courseError)
  const courseIds = (courseRows ?? []).map(row => String((row as Record<string, unknown>).id))
  const meetingRows = courseIds.length ? await dataApi.from('study_class_meetings')
    .select('course_id,weekday,start_minute,end_minute,location').in('course_id', courseIds)
    : { data: [], error: null }
  if (meetingRows.error) throw failure('load class meetings', meetingRows.error)

  const meetingsByCourse = new Map<string, StudyOsMeeting[]>()
  for (const raw of meetingRows.data ?? []) {
    const row = raw as Record<string, unknown>
    const courseId = String(row.course_id)
    const meetings = meetingsByCourse.get(courseId) ?? []
    meetings.push({ weekday: Number(row.weekday) as StudyOsMeeting['weekday'], startMinute: Number(row.start_minute), endMinute: Number(row.end_minute), location: String(row.location ?? '') })
    meetingsByCourse.set(courseId, meetings)
  }

  const subjects: StudyOsTimetableSubject[] = (courseRows ?? []).map(raw => {
    const row = raw as Record<string, unknown>
    const relation = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
    return {
      externalLectureId: Number(row.external_lecture_id), courseCode: String(row.course_code),
      name: String((relation as Record<string, unknown> | null)?.name ?? ''), section: String(row.section),
      professor: row.professor === null ? null : String(row.professor), credits: row.credits === null ? null : Number(row.credits),
      weeklyMinutes: Number(row.weekly_minutes), meetings: (meetingsByCourse.get(String(row.id)) ?? []).sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute),
    }
  })

  return {
    id: String(timetable.id), format: 'studyos-timetable', version: 1,
    exportedAt: String(timetable.exported_at), importedAt: String(timetable.imported_at),
    source: { app: String(timetable.source_app), timetableId: String(timetable.source_timetable_id), timetableName: String(timetable.name) },
    academicYear: Number(timetable.academic_year), academicTerm: String(timetable.academic_term) as ImportedTimetable['academicTerm'],
    totalWeeklyMinutes: Number(timetable.total_weekly_minutes), subjects,
  }
}
