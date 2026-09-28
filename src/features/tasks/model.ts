import type { DdayEntity, PlanningEntity, Project, ProjectInput, Section, SectionInput, Task, TaskInput, TaskStatus, Workstream, WorkstreamInput } from './types'

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

const byPosition = <T extends { position: number }>(first: T, second: T) => first.position - second.position
const headingText = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()
const dateRange = (start: string | null, end: string | null) => start ? `${start} → ${end ?? '미정'}` : end ? `마감 ${end}` : '날짜 미정'
const exportStatusLabels: Record<TaskStatus, string> = { not_started: 'Not started', in_progress: 'In progress', done: 'Done', dropped: 'Dropped' }

export function buildTasksMarkdown(projects: Project[], workstreams: Workstream[], sections: Section[], tasks: Task[], exportedOn: string) {
  const lines = ['# StudyOS 공부 계획', '', `내보낸 날짜: ${exportedOn}`, '']
  const addDescription = (description: string | null) => {
    if (!description) return
    lines.push(...description.trim().split(/\r?\n/).map(line => `> ${line}`), '')
  }
  const addTask = (task: Task) => {
    const checked = task.status === 'done' ? 'x' : ' '
    lines.push(`- [${checked}] ${headingText(task.title)} — ${dateRange(task.startDate, task.dueDate)} · ${exportStatusLabels[task.status]}${task.isDeadline ? ' · Deadline' : ''}`)
    if (task.description) lines.push(...task.description.trim().split(/\r?\n/).map(line => `  - 메모: ${line}`))
  }

  for (const project of [...projects].sort(byPosition)) {
    lines.push(`## ${headingText(project.title)}`, '', `- 상태: ${exportStatusLabels[project.status]}`, `- 기간: ${dateRange(project.startDate, project.dueDate)}`, '')
    addDescription(project.description)
    const projectWorkstreams = workstreams.filter(item => item.projectId === project.id).sort(byPosition)
    for (const workstream of projectWorkstreams) {
      lines.push(`### ${headingText(workstream.title)}${workstream.subject ? ` (${headingText(workstream.subject.name)})` : ''}`, '', `- 상태: ${exportStatusLabels[workstream.status]}`, `- 기간: ${dateRange(workstream.startDate, workstream.dueDate)}`, '')
      addDescription(workstream.description)
      const workstreamSections = sections.filter(item => item.workstreamId === workstream.id).sort(byPosition)
      for (const section of workstreamSections) {
        lines.push(`#### ${headingText(section.title)}`, '')
        const sectionTasks = tasks.filter(item => item.sectionId === section.id).sort(byPosition)
        if (sectionTasks.length) sectionTasks.forEach(addTask)
        else lines.push('- 등록된 Task 없음')
        lines.push('')
      }
      const ungrouped = tasks.filter(item => item.workstreamId === workstream.id && !item.sectionId).sort(byPosition)
      if (ungrouped.length) { lines.push('#### Ungrouped', ''); ungrouped.forEach(addTask); lines.push('') }
    }
    const directTasks = tasks.filter(item => item.projectId === project.id && !item.workstreamId).sort(byPosition)
    if (directTasks.length) { lines.push('### Project Tasks', ''); directTasks.forEach(addTask); lines.push('') }
  }
  return `${lines.join('\n').trim()}\n`
}
