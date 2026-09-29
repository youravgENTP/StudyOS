import type { CalendarEvent, ScheduleSubcategory } from '../calendar/types'
import type { Project, Section, Subject, Task, TaskCategory, TaskStatus, Workstream } from '../tasks/types'
import { taskCategoryLabels } from '../tasks/types.ts'
import type { StudyOsPlan, TransferBase, TransferCounts, TransferEvent, TransferProject, TransferSection, TransferTask, TransferWorkstream } from './types'

const categories: TaskCategory[] = ['study', 'personal', 'errands', 'development', 'other']
const statuses: TaskStatus[] = ['not_started', 'in_progress', 'done', 'dropped']
const terms = ['1', 'summer', '2', 'winter'] as const
const record = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
const array = (value: unknown, label: string, max = 10_000) => { if (!Array.isArray(value) || value.length > max) throw new Error(`${label} 목록이 올바르지 않습니다.`); return value }
const text = (value: unknown, label: string, max = 240) => { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label}이(가) 올바르지 않습니다.`); return value.trim() }
const optionalText = (value: unknown, label: string, max = 4000) => value == null || value === '' ? null : text(value, label, max)
const boolean = (value: unknown, fallback = false) => typeof value === 'boolean' ? value : fallback
const position = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0
function date(value: unknown, label: string): string
function date(value: unknown, label: string, optional: true): string | null
function date(value: unknown, label: string, optional = false): string | null {
  if (optional && (value == null || value === '')) return null
  const parsed = text(value, label, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed) || Number.isNaN(new Date(`${parsed}T00:00:00Z`).getTime())) throw new Error(`${label} 형식은 YYYY-MM-DD여야 합니다.`)
  return parsed
}
const category = (value: unknown): TaskCategory => { if (!categories.includes(value as TaskCategory)) throw new Error(`지원하지 않는 카테고리입니다: ${String(value)}`); return value as TaskCategory }
const status = (value: unknown): TaskStatus => value == null ? 'not_started' : statuses.includes(value as TaskStatus) ? value as TaskStatus : (() => { throw new Error(`지원하지 않는 상태입니다: ${String(value)}`) })()
const id = (value: unknown, label = 'ID') => {
  if (value == null || value === '') return undefined
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error(`${label}가 올바른 UUID가 아닙니다.`)
  return value
}

function parseBase(value: unknown, label: string): TransferBase {
  const item = record(value); if (!item) throw new Error(`${label} 정보가 올바르지 않습니다.`)
  const startDate = date(item.startDate, `${label} 시작일`, true)
  const dueDate = date(item.dueDate, `${label} 마감일`)
  if (startDate && startDate > dueDate) throw new Error(`${label}의 시작일이 마감일보다 늦습니다.`)
  return { id: id(item.id, `${label} ID`), title: text(item.title, `${label} 제목`), description: optionalText(item.description, `${label} 설명`), category: category(item.category), startDate, dueDate, status: status(item.status), isDday: boolean(item.isDday), position: position(item.position) }
}

function parseTask(value: unknown): TransferTask { const item = record(value); return { ...parseBase(value, 'Task'), showOnCalendar: boolean(item?.showOnCalendar, true), isDeadline: boolean(item?.isDeadline) } }
function parseSection(value: unknown): TransferSection {
  const item = record(value); if (!item) throw new Error('Section 정보가 올바르지 않습니다.')
  const startDate = date(item.startDate, 'Section 시작일', true), dueDate = date(item.dueDate, 'Section 마감일', true)
  if (startDate && dueDate && startDate > dueDate) throw new Error('Section의 시작일이 마감일보다 늦습니다.')
  return { id: id(item.id, 'Section ID'), title: text(item.title, 'Section 제목'), description: optionalText(item.description, 'Section 설명'), startDate, dueDate, status: status(item.status), position: position(item.position), tasks: array(item.tasks ?? [], 'Section Task').map(parseTask) }
}
function parseWorkstream(value: unknown): TransferWorkstream { const item = record(value); if (!item) throw new Error('Workstream 정보가 올바르지 않습니다.'); return { ...parseBase(value, 'Workstream'), subject: optionalText(item.subject, 'Subject 이름', 80), showOnCalendar: boolean(item.showOnCalendar, true), sections: array(item.sections ?? [], 'Section').map(parseSection), tasks: array(item.tasks ?? [], 'Workstream Task').map(parseTask) } }
function parseProject(value: unknown): TransferProject { const item = record(value); if (!item) throw new Error('Project 정보가 올바르지 않습니다.'); return { ...parseBase(value, 'Project'), workstreams: array(item.workstreams ?? [], 'Workstream').map(parseWorkstream), tasks: array(item.tasks ?? [], 'Project Task').map(parseTask) } }

function parseEvent(value: unknown): TransferEvent {
  const item = record(value); if (!item) throw new Error('Schedule 정보가 올바르지 않습니다.')
  const allDay = boolean(item.allDay), startDate = date(item.startDate, 'Schedule 시작일'), endDate = date(item.endDate, 'Schedule 종료일')
  const time = (input: unknown, label: string) => input == null || input === '' ? null : /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(input)) ? String(input).slice(0, 5) : (() => { throw new Error(`${label}이 올바르지 않습니다.`) })()
  const startTime = allDay ? null : time(item.startTime, 'Schedule 시작 시간'), endTime = allDay ? null : time(item.endTime, 'Schedule 종료 시간')
  if (endDate < startDate || (!allDay && endDate === startDate && (!startTime || !endTime || endTime <= startTime))) throw new Error('Schedule 종료 시점이 시작 시점보다 늦어야 합니다.')
  if (item.displayStyle !== undefined && !['compact', 'bar'].includes(String(item.displayStyle))) throw new Error('지원하지 않는 Schedule 표시 방식입니다.')
  return { id: id(item.id, 'Schedule ID'), title: text(item.title, 'Schedule 제목'), category: category(item.category), subject: optionalText(item.subject, 'Subject 이름', 80), subcategory: optionalText(item.subcategory, 'Subcategory 이름', 80), allDay, startDate, startTime, endDate, endTime, isMajor: boolean(item.isMajor), displayStyle: item.displayStyle === 'bar' ? 'bar' : 'compact' }
}

export function parseStudyOsPlan(value: unknown): StudyOsPlan {
  const payload = record(value), catalog = record(payload?.catalog), taskRoot = record(payload?.tasks), scheduleRoot = record(payload?.schedules)
  if (!payload || payload.format !== 'studyos-plan' || payload.version !== 1 || !catalog || !taskRoot || !scheduleRoot) throw new Error('지원하지 않는 StudyOS 계획 파일입니다.')
  const subjects = array(catalog.subjects ?? [], 'Subject', 500).map(raw => { const item = record(raw); if (!item) throw new Error('Subject 정보가 올바르지 않습니다.'); const academicTerm = String(item.academicTerm); if (!terms.includes(academicTerm as typeof terms[number])) throw new Error('Subject 학기 정보가 올바르지 않습니다.'); const academicYear = Number(item.academicYear); if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 2100) throw new Error('Subject 학년도 정보가 올바르지 않습니다.'); const color = text(item.color, 'Subject 색상', 7); if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Subject 색상이 올바르지 않습니다.'); return { id: id(item.id, 'Subject ID'), name: text(item.name, 'Subject 이름', 80), color, academicYear, academicTerm: academicTerm as typeof terms[number] } })
  const scheduleSubcategories = array(catalog.scheduleSubcategories ?? [], 'Schedule Subcategory', 500).map(raw => { const item = record(raw); if (!item) throw new Error('Schedule Subcategory 정보가 올바르지 않습니다.'); const color = text(item.color, 'Subcategory 색상', 7); if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Subcategory 색상이 올바르지 않습니다.'); return { id: id(item.id, 'Schedule Subcategory ID'), category: category(item.category), name: text(item.name, 'Subcategory 이름', 80), color, position: position(item.position) } })
  return { format: 'studyos-plan', version: 1, exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(), catalog: { categories: categories.map(key => ({ key, label: taskCategoryLabels[key] })), subjects, scheduleSubcategories }, tasks: { projects: array(taskRoot.projects ?? [], 'Project', 2000).map(parseProject) }, schedules: { events: array(scheduleRoot.events ?? [], 'Schedule').map(parseEvent) } }
}

const base = (item: Project | Workstream | Task) => ({ id: item.id, title: item.title, description: item.description, category: item.category, startDate: item.startDate, dueDate: item.dueDate, status: item.status, isDday: item.isDday, position: item.position })
const transferTask = (item: Task): TransferTask => ({ ...base(item), showOnCalendar: item.showOnCalendar, isDeadline: item.isDeadline })
export function buildStudyOsPlan(projects: Project[], workstreams: Workstream[], sections: Section[], tasks: Task[], subjects: Subject[], subcategories: ScheduleSubcategory[], events: CalendarEvent[], now = new Date()): StudyOsPlan {
  const projectsTree = [...projects].sort((a, b) => a.position - b.position).map(project => ({ ...base(project), workstreams: workstreams.filter(item => item.projectId === project.id).sort((a, b) => a.position - b.position).map(workstream => ({ ...base(workstream), subject: workstream.subject?.id ?? null, showOnCalendar: workstream.showOnCalendar, sections: sections.filter(item => item.workstreamId === workstream.id).sort((a, b) => a.position - b.position).map(section => ({ id: section.id, title: section.title, description: section.description, startDate: section.startDate, dueDate: section.dueDate, status: section.status, position: section.position, tasks: tasks.filter(item => item.sectionId === section.id).sort((a, b) => a.position - b.position).map(transferTask) })), tasks: tasks.filter(item => item.workstreamId === workstream.id && !item.sectionId).sort((a, b) => a.position - b.position).map(transferTask) })), tasks: tasks.filter(item => item.projectId === project.id && !item.workstreamId).sort((a, b) => a.position - b.position).map(transferTask) }))
  return { format: 'studyos-plan', version: 1, exportedAt: now.toISOString(), catalog: { categories: categories.map(key => ({ key, label: taskCategoryLabels[key] })), subjects: subjects.map(item => ({ id: item.id, name: item.name, color: item.color, academicYear: item.academicYear, academicTerm: item.academicTerm })), scheduleSubcategories: subcategories.map(item => ({ id: item.id, category: item.category, name: item.name, color: item.color, position: item.position })) }, tasks: { projects: projectsTree }, schedules: { events: events.map(event => ({ id: event.id, title: event.title, category: event.category, subject: event.subject?.id ?? null, subcategory: event.subcategory?.id ?? null, allDay: event.allDay, startDate: event.startDate, startTime: event.startTime?.slice(0, 5) ?? null, endDate: event.endDate, endTime: event.endTime?.slice(0, 5) ?? null, isMajor: event.isMajor, displayStyle: event.displayStyle })) } }
}

export function countStudyOsPlan(plan: StudyOsPlan): TransferCounts {
  let workstreams = 0, sections = 0, tasks = 0
  for (const project of plan.tasks.projects) { tasks += project.tasks.length; workstreams += project.workstreams.length; for (const stream of project.workstreams) { tasks += stream.tasks.length; sections += stream.sections.length; for (const section of stream.sections) tasks += section.tasks.length } }
  return { subjects: plan.catalog.subjects.length, subcategories: plan.catalog.scheduleSubcategories.length, projects: plan.tasks.projects.length, workstreams, sections, tasks, events: plan.schedules.events.length }
}
