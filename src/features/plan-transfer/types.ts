import type { AcademicTerm, TaskCategory, TaskStatus } from '../tasks/types'

export type TransferSubject = { id?: string; name: string; color: string; academicYear: number; academicTerm: AcademicTerm }
export type TransferSubcategory = { id?: string; category: TaskCategory; name: string; color: string; position: number }

export type TransferBase = {
  id?: string
  title: string
  description: string | null
  category: TaskCategory
  startDate: string | null
  dueDate: string
  status: TaskStatus
  isDday: boolean
  position: number
}

export type TransferTask = TransferBase & { showOnCalendar: boolean; isDeadline: boolean }
export type TransferSection = Omit<TransferBase, 'category' | 'dueDate' | 'isDday'> & {
  dueDate: string | null
  tasks: TransferTask[]
}
export type TransferWorkstream = TransferBase & {
  subject: string | null
  showOnCalendar: boolean
  sections: TransferSection[]
  tasks: TransferTask[]
}
export type TransferProject = TransferBase & {
  workstreams: TransferWorkstream[]
  tasks: TransferTask[]
}

export type TransferEvent = {
  id?: string
  title: string
  category: TaskCategory
  subject: string | null
  subcategory: string | null
  allDay: boolean
  startDate: string
  startTime: string | null
  endDate: string
  endTime: string | null
  isMajor: boolean
  displayStyle: 'compact' | 'bar'
}

export type StudyOsPlan = {
  format: 'studyos-plan'
  version: 1
  exportedAt: string
  catalog: {
    categories: Array<{ key: TaskCategory; label: string }>
    subjects: TransferSubject[]
    scheduleSubcategories: TransferSubcategory[]
  }
  tasks: { projects: TransferProject[] }
  schedules: { events: TransferEvent[] }
}

export type TransferCounts = { subjects: number; subcategories: number; projects: number; workstreams: number; sections: number; tasks: number; events: number }
export type ImportMode = 'merge' | 'update'
export type ImportResult = { inserted: TransferCounts; updated: TransferCounts; unchanged: TransferCounts }
