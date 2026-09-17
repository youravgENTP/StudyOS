import { dataApi } from '../../../lib/neon/data'
import { completionPatch, validateProjectInput, validateSectionInput, validateTaskInput, validateWorkstreamInput } from '../model'
import type { AcademicTerm, PlanningEntity, Project, ProjectInput, Section, SectionInput, Subject, Task, TaskInput, TaskStatus, Workstream, WorkstreamInput } from '../types'

const CHANGED = 'studyos:tasks-changed'
export const notifyTasksChanged = () => window.dispatchEvent(new Event(CHANGED))
export function onTasksChanged(listener: () => void) { window.addEventListener(CHANGED, listener); return () => window.removeEventListener(CHANGED, listener) }

function failure(operation: string, error: unknown) {
  if (import.meta.env.DEV) console.error(`[tasks] ${operation}`, error)
  return new Error('Could not save or load project data. Please try again.')
}

function mapSubject(row: Record<string, unknown>): Subject {
  return { id: String(row.id), name: String(row.name), color: String(row.color), academicYear: Number(row.academic_year ?? 2026), academicTerm: (row.academic_term ?? '2') as AcademicTerm, archivedAt: row.archived_at ? String(row.archived_at) : null }
}

function mapBase(row: Record<string, unknown>): PlanningEntity {
  return {
    id: String(row.id), title: String(row.title), description: row.description ? String(row.description) : null,
    category: row.category as PlanningEntity['category'], startDate: row.start_date ? String(row.start_date) : null,
    dueDate: String(row.due_date), status: row.status as TaskStatus, isDday: Boolean(row.is_dday),
    position: Number(row.position), completedAt: row.completed_at ? String(row.completed_at) : null, createdAt: String(row.created_at),
  }
}

function values(input: ProjectInput | WorkstreamInput | TaskInput) {
  const done = completionPatch(input.status)
  return {
    title: input.title.trim(), description: input.description?.trim() || null, category: input.category,
    start_date: input.startDate, due_date: input.dueDate, status: input.status, is_dday: input.isDday,
    completed_at: done.completedAt,
  }
}

async function nextPosition(table: 'projects' | 'workstreams' | 'sections' | 'tasks', filters: { column: 'project_id' | 'workstream_id' | 'section_id'; value: string | null }[] = []) {
  let query = dataApi.from(table).select('id', { count: 'exact', head: true })
  for (const filter of filters) query = filter.value === null ? query.is(filter.column, null) : query.eq(filter.column, filter.value)
  const { count, error } = await query
  if (error) throw failure(`count ${table}`, error)
  return count ?? 0
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await dataApi.from('projects').select('id,title,description,category,start_date,due_date,status,is_dday,position,completed_at,created_at').order('position')
  if (error) throw failure('load projects', error)
  return (data ?? []).map(row => mapBase(row as Record<string, unknown>))
}

export async function listWorkstreams(): Promise<Workstream[]> {
  const { data, error } = await dataApi.from('workstreams').select('id,project_id,subject_id,title,description,category,start_date,due_date,status,is_dday,show_on_calendar,position,completed_at,created_at,subjects(id,name,color,academic_year,academic_term,archived_at)').order('position')
  if (error) throw failure('load workstreams', error)
  return (data ?? []).map(row => {
    const record = row as Record<string, unknown>
    const relation = Array.isArray(record.subjects) ? record.subjects[0] : record.subjects
    return { ...mapBase(record), projectId: String(record.project_id), subjectId: record.subject_id ? String(record.subject_id) : null, subject: relation ? mapSubject(relation as Record<string, unknown>) : null, showOnCalendar: record.show_on_calendar !== false }
  })
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await dataApi.from('tasks').select('id,project_id,workstream_id,section_id,title,description,category,start_date,due_date,status,is_dday,show_on_calendar,is_deadline,position,completed_at,created_at').order('position')
  if (error) throw failure('load tasks', error)
  return (data ?? []).map(row => { const record = row as Record<string, unknown>; return { ...mapBase(record), projectId: String(record.project_id), workstreamId: record.workstream_id ? String(record.workstream_id) : null, sectionId: record.section_id ? String(record.section_id) : null, showOnCalendar: record.show_on_calendar !== false, isDeadline: Boolean(record.is_deadline) } })
}

export async function listSections(): Promise<Section[]> {
  const { data, error } = await dataApi.from('sections').select('id,workstream_id,title,description,start_date,due_date,status,position,archived_at,created_at').is('archived_at', null).order('position')
  if (error) throw failure('load sections', error)
  return (data ?? []).map(row => { const record = row as Record<string, unknown>; return { id: String(record.id), workstreamId: String(record.workstream_id), title: String(record.title), description: record.description ? String(record.description) : null, category: 'other', startDate: record.start_date ? String(record.start_date) : null, dueDate: record.due_date ? String(record.due_date) : null, status: record.status as TaskStatus, position: Number(record.position), archivedAt: record.archived_at ? String(record.archived_at) : null, createdAt: String(record.created_at) } })
}

export async function listSubjects(includeArchived = false) {
  let query = dataApi.from('subjects').select('id,name,color,academic_year,academic_term,archived_at').order('academic_year', { ascending: false }).order('academic_term', { ascending: false }).order('name')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw failure('load subjects', error)
  return (data ?? []).map(row => mapSubject(row as Record<string, unknown>))
}

export async function createSubject(name: string, color: string, academicYear: number, academicTerm: AcademicTerm) { const { error } = await dataApi.from('subjects').insert({ name: name.trim(), color, academic_year: academicYear, academic_term: academicTerm }); if (error) throw failure('create subject', error); notifyTasksChanged() }
export async function updateSubject(id: string, name: string, color: string, academicYear: number, academicTerm: AcademicTerm) { const { error } = await dataApi.from('subjects').update({ name: name.trim(), color, academic_year: academicYear, academic_term: academicTerm }).eq('id', id); if (error) throw failure('update subject', error); notifyTasksChanged() }
export async function archiveSubject(id: string) { const { error } = await dataApi.from('subjects').update({ archived_at: new Date().toISOString() }).eq('id', id); if (error) throw failure('archive subject', error); notifyTasksChanged() }

export async function createProject(input: ProjectInput) {
  const invalid = validateProjectInput(input); if (invalid) throw new Error(invalid)
  const { error } = await dataApi.from('projects').insert({ ...values(input), position: await nextPosition('projects') })
  if (error) throw failure('create project', error); notifyTasksChanged()
}
export async function updateProject(id: string, input: ProjectInput) { const invalid = validateProjectInput(input); if (invalid) throw new Error(invalid); const { error } = await dataApi.from('projects').update(values(input)).eq('id', id); if (error) throw failure('update project', error); notifyTasksChanged() }
export async function deleteProject(id: string) { const { error } = await dataApi.from('projects').delete().eq('id', id); if (error) throw failure('delete project', error); notifyTasksChanged() }

export async function createWorkstream(input: WorkstreamInput) {
  const invalid = validateWorkstreamInput(input); if (invalid) throw new Error(invalid)
  const { error } = await dataApi.from('workstreams').insert({ ...values(input), project_id: input.projectId, subject_id: input.subjectId, show_on_calendar: input.showOnCalendar, position: await nextPosition('workstreams', [{ column: 'project_id', value: input.projectId }]) })
  if (error) throw failure('create workstream', error); notifyTasksChanged()
}
export async function updateWorkstream(id: string, input: WorkstreamInput) { const invalid = validateWorkstreamInput(input); if (invalid) throw new Error(invalid); const { error } = await dataApi.from('workstreams').update({ ...values(input), project_id: input.projectId, subject_id: input.subjectId, show_on_calendar: input.showOnCalendar }).eq('id', id); if (error) throw failure('update workstream', error); notifyTasksChanged() }
export async function deleteWorkstream(id: string) { const { error } = await dataApi.from('workstreams').delete().eq('id', id); if (error) throw failure('delete workstream', error); notifyTasksChanged() }

export async function createSection(input: SectionInput) { const invalid = validateSectionInput(input); if (invalid) throw new Error(invalid); const { error } = await dataApi.from('sections').insert({ workstream_id: input.workstreamId, title: input.title.trim(), description: input.description?.trim() || null, start_date: input.startDate, due_date: input.dueDate, status: input.status, position: await nextPosition('sections', [{ column: 'workstream_id', value: input.workstreamId }]) }); if (error) throw failure('create section', error); notifyTasksChanged() }
export async function updateSection(id: string, input: SectionInput) { const invalid = validateSectionInput(input); if (invalid) throw new Error(invalid); const { error } = await dataApi.from('sections').update({ workstream_id: input.workstreamId, title: input.title.trim(), description: input.description?.trim() || null, start_date: input.startDate, due_date: input.dueDate, status: input.status }).eq('id', id); if (error) throw failure('update section', error); notifyTasksChanged() }
export async function archiveSection(id: string) { const ungrouped = await dataApi.from('tasks').update({ section_id: null }).eq('section_id', id); if (ungrouped.error) throw failure('ungroup section tasks', ungrouped.error); const { error } = await dataApi.from('sections').update({ archived_at: new Date().toISOString() }).eq('id', id); if (error) throw failure('archive section', error); notifyTasksChanged() }

export async function createTask(input: TaskInput) {
  const invalid = validateTaskInput(input); if (invalid) throw new Error(invalid)
  const filters = input.sectionId
    ? [{ column: 'section_id' as const, value: input.sectionId }]
    : input.workstreamId
    ? [{ column: 'workstream_id' as const, value: input.workstreamId }, { column: 'section_id' as const, value: null }]
    : [{ column: 'project_id' as const, value: input.projectId }, { column: 'workstream_id' as const, value: null }]
  const { error } = await dataApi.from('tasks').insert({ ...values(input), project_id: input.projectId, workstream_id: input.workstreamId, section_id: input.sectionId, show_on_calendar: input.showOnCalendar, is_deadline: input.isDeadline, position: await nextPosition('tasks', filters) })
  if (error) throw failure('create task', error); notifyTasksChanged()
}
export async function updateTask(id: string, input: TaskInput) { const invalid = validateTaskInput(input); if (invalid) throw new Error(invalid); const { error } = await dataApi.from('tasks').update({ ...values(input), project_id: input.projectId, workstream_id: input.workstreamId, section_id: input.sectionId, show_on_calendar: input.showOnCalendar, is_deadline: input.isDeadline }).eq('id', id); if (error) throw failure('update task', error); notifyTasksChanged() }
export async function deleteTask(id: string) { const { error } = await dataApi.from('tasks').delete().eq('id', id); if (error) throw failure('delete task', error); notifyTasksChanged() }

export async function setEntityStatus(table: 'projects' | 'workstreams' | 'tasks', id: string, status: TaskStatus) { const patch = completionPatch(status); const { error } = await dataApi.from(table).update({ status: patch.status, completed_at: patch.completedAt }).eq('id', id); if (error) throw failure('update status', error); notifyTasksChanged() }
export async function setEntityDday(table: 'projects' | 'workstreams' | 'tasks', id: string, isDday: boolean) { const { error } = await dataApi.from(table).update({ is_dday: isDday }).eq('id', id); if (error) throw failure('update D-Day', error); notifyTasksChanged() }
export async function setTaskCompleted(id: string, completed: boolean) { await setEntityStatus('tasks', id, completed ? 'done' : 'not_started') }
export async function setTaskDday(id: string, isDday: boolean) { await setEntityDday('tasks', id, isDday) }

export async function reorderEntities(table: 'projects' | 'workstreams' | 'sections' | 'tasks', items: Array<{ id: string; position: number }>, id: string, targetIndex: number) {
  const from = items.findIndex(item => item.id === id); if (from < 0 || targetIndex < 0 || targetIndex >= items.length || from === targetIndex) return
  const reordered = [...items]; const [moved] = reordered.splice(from, 1); reordered.splice(targetIndex, 0, moved)
  const results = await Promise.all(reordered.map((item, position) => item.position === position ? Promise.resolve({ error: null }) : dataApi.from(table).update({ position }).eq('id', item.id)))
  const failed = results.find(result => result.error); if (failed?.error) throw failure(`reorder ${table}`, failed.error)
  notifyTasksChanged()
}
