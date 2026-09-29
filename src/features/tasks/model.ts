import type { DdayEntity, PlanningEntity, Project, ProjectInput, SectionInput, Task, TaskInput, TaskStatus, Workstream, WorkstreamInput } from './types'

const required = (value: string) => Boolean(value.trim())
const dateOrderValid = (startDate: string | null, dueDate: string) => !startDate || startDate <= dueDate

export function validateProjectInput(input: ProjectInput) {
  if (!required(input.title)) return 'Project title is required.'
  if (!input.dueDate) return 'Project due date is required.'
  if (!dateOrderValid(input.startDate, input.dueDate)) return 'Start date cannot be after due date.'
  return null
}

export function validateWorkstreamInput(input: WorkstreamInput) {
  if (!input.projectId) return 'Project is required.'
  if (!required(input.title)) return 'Workstream title is required.'
  if (!input.dueDate) return 'Workstream due date is required.'
  if (!dateOrderValid(input.startDate, input.dueDate)) return 'Start date cannot be after due date.'
  return null
}

export function validateTaskInput(input: TaskInput) {
  if (!input.projectId) return 'Project is required.'
  if (!required(input.title)) return 'Task title is required.'
  if (!input.dueDate) return 'Task due date is required.'
  if (!dateOrderValid(input.startDate, input.dueDate)) return 'Start date cannot be after due date.'
  return null
}

export function validateSectionInput(input: SectionInput) {
  if (!input.workstreamId) return 'Workstream is required.'
  if (!required(input.title)) return 'Section title is required.'
  if (input.startDate && input.dueDate && input.startDate > input.dueDate) return 'Start date cannot be after due date.'
  return null
}

export function progressForTasks(tasks: Task[]) {
  const counted = tasks.filter(task => task.status !== 'dropped')
  const done = counted.filter(task => task.status === 'done').length
  return { done, total: counted.length, percent: counted.length ? done / counted.length * 100 : 0 }
}

export function workstreamProgress(workstreamId: string, tasks: Task[]) {
  return progressForTasks(tasks.filter(task => task.workstreamId === workstreamId))
}

export function sectionProgress(sectionId: string, tasks: Task[]) {
  return progressForTasks(tasks.filter(task => task.sectionId === sectionId))
}

export function sortTasksByDate(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.position - b.position || a.title.localeCompare(b.title))
}

export function projectProgress(projectId: string, tasks: Task[]) {
  return progressForTasks(tasks.filter(task => task.projectId === projectId))
}

export function completionPatch(status: TaskStatus, now = new Date()) {
  return { status, completedAt: status === 'done' ? now.toISOString() : null }
}

export function dateWarnings(entity: { startDate: string | null; dueDate: string | null }, project: Pick<Project, 'startDate' | 'dueDate'>, workstream?: Pick<Workstream, 'startDate' | 'dueDate'> | null, section?: { startDate: string | null; dueDate: string | null } | null) {
  const warnings: string[] = []
  if (project.startDate && entity.startDate && entity.startDate < project.startDate) warnings.push('Starts before Project start date.')
  if (entity.dueDate && entity.dueDate > project.dueDate) warnings.push('Extends beyond Project dates.')
  if (workstream?.startDate && entity.startDate && entity.startDate < workstream.startDate) warnings.push('Starts before Workstream start date.')
  if (workstream && entity.dueDate && entity.dueDate > workstream.dueDate) {
    const days = Math.round((new Date(`${entity.dueDate}T00:00:00`).getTime() - new Date(`${workstream.dueDate}T00:00:00`).getTime()) / 86_400_000)
    warnings.push(`Ends ${days} day${days === 1 ? '' : 's'} after Workstream deadline.`)
  }
  if (section?.startDate && entity.startDate && entity.startDate < section.startDate) warnings.push('Starts before Section start date.')
  if (section?.dueDate && entity.dueDate && entity.dueDate > section.dueDate) warnings.push('Extends beyond Section dates.')
  return warnings
}

export function timelinePlacement(entity: Pick<PlanningEntity, 'startDate' | 'dueDate'>, rangeStart: string, rangeEnd: string) {
  const start = new Date(`${rangeStart}T00:00:00`).getTime()
  const end = new Date(`${rangeEnd}T00:00:00`).getTime()
  const span = Math.max(1, end - start)
  const due = new Date(`${entity.dueDate}T00:00:00`).getTime()
  const entityStart = entity.startDate ? new Date(`${entity.startDate}T00:00:00`).getTime() : due
  const left = Math.max(0, Math.min(100, (entityStart - start) / span * 100))
  const right = Math.max(left, Math.min(100, (due - start) / span * 100))
  return { deadlineOnly: entity.startDate === null, left, width: entity.startDate ? Math.max(.8, right - left) : 0 }
}

export function isEntityVisibleOnDate(entity: Pick<PlanningEntity, 'startDate' | 'dueDate'>, date: string) {
  return entity.startDate ? entity.startDate <= date && entity.dueDate >= date : entity.dueDate === date
}

export function collectDdayEntities(projects: Project[], workstreams: Workstream[], tasks: Task[]): DdayEntity[] {
  return [
    ...projects.filter(item => item.isDday).map(item => ({ kind: 'project' as const, id: item.id, title: item.title, dueDate: item.dueDate, status: item.status })),
    ...workstreams.filter(item => item.isDday).map(item => ({ kind: 'workstream' as const, id: item.id, title: item.title, dueDate: item.dueDate, status: item.status })),
    ...tasks.filter(item => item.isDday).map(item => ({ kind: 'task' as const, id: item.id, title: item.title, dueDate: item.dueDate, status: item.status })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function parseExpandedIds(raw: string | null) {
  if (!raw) return new Set<string>()
  try {
    const parsed = JSON.parse(raw)
    return new Set<string>(Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : [])
  } catch {
    return new Set<string>()
  }
}
