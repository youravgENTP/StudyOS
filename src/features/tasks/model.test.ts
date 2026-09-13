import assert from 'node:assert/strict'
import test from 'node:test'
import { collectDdayEntities, dateWarnings, isEntityVisibleOnDate, parseExpandedIds, projectProgress, timelinePlacement, validateProjectInput, validateTaskInput, validateWorkstreamInput, workstreamProgress } from './model.ts'
import type { Project, ProjectInput, Task, TaskInput, Workstream, WorkstreamInput } from './types.ts'

const base = { title: 'Item', description: null, category: 'study' as const, startDate: null, dueDate: '2026-10-10', status: 'not_started' as const, isDday: false }
const projectInput: ProjectInput = { ...base }
const workstreamInput: WorkstreamInput = { ...base, projectId: 'p1', subjectId: null, showOnCalendar: true }
const taskInput: TaskInput = { ...base, projectId: 'p1', workstreamId: null, showOnCalendar: true, isDeadline: false }
const project: Project = { ...base, id: 'p1', position: 0, completedAt: null, createdAt: '2026-09-10', status: 'in_progress' }
const workstream: Workstream = { ...base, id: 'w1', projectId: 'p1', subjectId: null, subject: null, showOnCalendar: true, position: 0, completedAt: null, createdAt: '2026-09-10' }
const makeTask = (id: string, status: Task['status'], workstreamId: string | null): Task => ({ ...base, id, projectId: 'p1', workstreamId, showOnCalendar: true, isDeadline: false, status, completedAt: status === 'done' ? '2026-09-10' : null, position: 0, createdAt: '2026-09-10' })

test('Task requires Project while Workstream remains optional', () => {
  assert.equal(validateTaskInput({ ...taskInput, projectId: '' }), 'Project is required.')
  assert.equal(validateTaskInput({ ...taskInput, workstreamId: null }), null)
})

test('due dates are required at all three levels', () => {
  assert.match(validateProjectInput({ ...projectInput, dueDate: '' }) ?? '', /required/)
  assert.match(validateWorkstreamInput({ ...workstreamInput, dueDate: '' }) ?? '', /required/)
  assert.match(validateTaskInput({ ...taskInput, dueDate: '' }) ?? '', /required/)
})

test('start date may be null but cannot be after due date', () => {
  assert.equal(validateProjectInput({ ...projectInput, startDate: null }), null)
  assert.match(validateTaskInput({ ...taskInput, startDate: '2026-10-11' }) ?? '', /cannot be after/)
})

test('outside-parent dates are allowed and produce warnings', () => {
  const input = { ...taskInput, startDate: '2026-09-01', dueDate: '2026-10-12' }
  assert.equal(validateTaskInput(input), null)
  const warnings = dateWarnings(input, { startDate: '2026-09-10', dueDate: '2026-10-10' }, { startDate: '2026-09-12', dueDate: '2026-10-09' })
  assert.ok(warnings.some(value => value.includes('before Project')))
  assert.ok(warnings.some(value => value.includes('after Workstream')))
})

test('progress counts done tasks and excludes dropped tasks', () => {
  const tasks = [makeTask('1', 'done', 'w1'), makeTask('2', 'in_progress', 'w1'), makeTask('3', 'dropped', 'w1'), makeTask('4', 'done', null)]
  assert.deepEqual(workstreamProgress('w1', tasks), { done: 1, total: 2, percent: 50 })
  assert.deepEqual(projectProgress('p1', tasks), { done: 2, total: 3, percent: 2 / 3 * 100 })
})

test('100 percent progress does not mutate explicit parent status', () => {
  assert.equal(projectProgress('p1', [makeTask('1', 'done', null)]).percent, 100)
  assert.equal(project.status, 'in_progress')
})

test('Workstream subject is optional', () => assert.equal(validateWorkstreamInput({ ...workstreamInput, subjectId: null }), null))

test('deadline-only timeline uses a due-date marker', () => {
  const placement = timelinePlacement({ startDate: null, dueDate: '2026-10-10' }, '2026-10-01', '2026-10-20')
  assert.equal(placement.deadlineOnly, true); assert.equal(placement.width, 0)
})

test('D-Day collection includes Project, Workstream, and Task', () => {
  const pinned = collectDdayEntities([{ ...project, isDday: true }], [{ ...workstream, isDday: true }], [{ ...makeTask('t1', 'not_started', null), isDday: true }])
  assert.deepEqual(new Set(pinned.map(item => item.kind)), new Set(['project', 'workstream', 'task']))
})

test('expanded hierarchy IDs parse safely for persistent UI state', () => {
  assert.deepEqual([...parseExpandedIds('["p1","w1"]')], ['p1', 'w1'])
  assert.equal(parseExpandedIds('invalid').size, 0)
})

test('Calendar treats a Workstream date range as a multi-day span', () => {
  const span = { startDate: '2026-09-10', dueDate: '2026-09-12' }
  assert.equal(isEntityVisibleOnDate(span, '2026-09-09'), false)
  assert.equal(isEntityVisibleOnDate(span, '2026-09-11'), true)
  assert.equal(isEntityVisibleOnDate(span, '2026-09-13'), false)
})
