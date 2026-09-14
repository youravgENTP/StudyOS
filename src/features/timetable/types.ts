import type { AcademicTerm } from '../tasks/types'

export type StudyOsMeeting = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startMinute: number
  endMinute: number
  location: string
}

export type StudyOsTimetableSubject = {
  externalLectureId: number
  courseCode: string
  name: string
  section: string
  professor: string | null
  credits: number | null
  weeklyMinutes: number
  meetings: StudyOsMeeting[]
}

export type StudyOsTimetablePayload = {
  format: 'studyos-timetable'
  version: 1
  exportedAt: string
  source: { app: string; timetableId: string; timetableName: string }
  academicYear: number
  academicTerm: AcademicTerm
  totalWeeklyMinutes: number
  subjects: StudyOsTimetableSubject[]
}

export type ImportedTimetable = StudyOsTimetablePayload & {
  id: string
  importedAt: string
}
