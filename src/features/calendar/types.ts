import type {
  Subject,
  TaskCategory,
} from '../tasks/types'

export type CalendarEvent = {
  id: string
  title: string
  category: TaskCategory
  subjectId: string | null
  subject: Subject | null
  allDay: boolean
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isMajor: boolean
  createdAt: string
}

export type CalendarEventInput = {
  title: string
  category: TaskCategory
  subjectId: string | null
  allDay: boolean
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isMajor: boolean
}