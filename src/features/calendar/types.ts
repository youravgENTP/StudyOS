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
  subcategoryId: string | null
  subcategory: ScheduleSubcategory | null
  allDay: boolean
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isMajor: boolean
  displayStyle: 'compact' | 'bar'
  createdAt: string
}

export type CalendarEventInput = {
  title: string
  category: TaskCategory
  subjectId: string | null
  subcategoryId: string | null
  allDay: boolean
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isMajor: boolean
  displayStyle: 'compact' | 'bar'
}

export type ScheduleSubcategory = {
  id: string
  category: TaskCategory
  name: string
  color: string
  position: number
  archivedAt: string | null
}

export type ScheduleSubcategoryInput = Pick<ScheduleSubcategory, 'category' | 'name' | 'color'>
