export type TaskCategory = 'study' | 'personal' | 'errands' | 'development' | 'other'
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'dropped'

export type Subject = { id: string; name: string; color: string; archivedAt: string | null }

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
export type Workstream = PlanningEntity & { projectId: string; subjectId: string | null; subject: Subject | null }
export type Task = PlanningEntity & { projectId: string; workstreamId: string | null }

export type ProjectInput = Pick<Project, 'title' | 'description' | 'category' | 'startDate' | 'dueDate' | 'status' | 'isDday'>
export type WorkstreamInput = Pick<Workstream, 'projectId' | 'subjectId' | 'title' | 'description' | 'category' | 'startDate' | 'dueDate' | 'status' | 'isDday'>
export type TaskInput = Pick<Task, 'projectId' | 'workstreamId' | 'title' | 'description' | 'category' | 'startDate' | 'dueDate' | 'status' | 'isDday'>
export type DdayEntity = { kind: 'project' | 'workstream' | 'task'; id: string; title: string; dueDate: string; status: TaskStatus }

export const taskCategoryLabels: Record<TaskCategory, string> = {
  study: 'Study', personal: 'Personal', errands: 'Errands', development: 'Development', other: 'Other',
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  not_started: 'Not started', in_progress: 'In progress', done: 'Done', dropped: 'Dropped',
}
