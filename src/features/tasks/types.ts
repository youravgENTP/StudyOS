export type TaskCategory = 'study' | 'personal' | 'errands' | 'development' | 'other'
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'dropped'

export type AcademicTerm = '1' | 'summer' | '2' | 'winter'
export type Subject = { id: string; name: string; color: string; academicYear: number; academicTerm: AcademicTerm; archivedAt: string | null }

export const academicTermLabels: Record<AcademicTerm, string> = {
  '1': '1학기', summer: '여름학기', '2': '2학기', winter: '겨울학기',
}

export type PlanningEntity = {
  id: string
  title: string
  description: string | null
  category: TaskCategory
  startDate: string | null
  dueDate: string
  status: TaskStatus
  isDday: boolean
  position: number
  completedAt: string | null
  createdAt: string
}

export type Project = PlanningEntity
export type Workstream = PlanningEntity & { projectId: string; subjectId: string | null; subject: Subject | null; showOnCalendar: boolean }
export type Task = PlanningEntity & { projectId: string; workstreamId: string | null; showOnCalendar: boolean; isDeadline: boolean }

export type ProjectInput = Pick<Project, 'title' | 'description' | 'category' | 'startDate' | 'dueDate' | 'status' | 'isDday'>
export type WorkstreamInput = Pick<Workstream, 'projectId' | 'subjectId' | 'title' | 'description' | 'category' | 'startDate' | 'dueDate' | 'status' | 'isDday' | 'showOnCalendar'>
export type TaskInput = Pick<Task, 'projectId' | 'workstreamId' | 'title' | 'description' | 'category' | 'startDate' | 'dueDate' | 'status' | 'isDday' | 'showOnCalendar' | 'isDeadline'>
export type DdayEntity = { kind: 'project' | 'workstream' | 'task'; id: string; title: string; dueDate: string; status: TaskStatus }

export const taskCategoryLabels: Record<TaskCategory, string> = {
  study: 'Study', personal: 'Personal', errands: 'Errands', development: 'Development', other: 'Other',
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  not_started: 'Not started', in_progress: 'In progress', done: 'Done', dropped: 'Dropped',
}
