import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { createTask, deleteTask, updateTask } from '../../tasks/api/tasks'
import { taskCategoryLabels, taskStatusLabels, type Project, type Subject, type Task, type TaskCategory, type TaskStatus, type Workstream } from '../../tasks/types'
import { createEvent, deleteEvent, updateEvent } from '../api/events'
import type { CalendarEvent } from '../types'

type Selection = { kind: 'task'; value: Task } | { kind: 'event'; value: CalendarEvent }

export function CalendarComposer({ date, projects, workstreams, subjects, editing, onClose }: { date: string; projects: Project[]; workstreams: Workstream[]; subjects: Subject[]; editing: Selection | null; onClose: () => void }) {
  const taskEditing = editing?.kind === 'task' ? editing.value : null
  const eventEditing = editing?.kind === 'event' ? editing.value : null
  const [kind, setKind] = useState<'event' | 'task'>(editing?.kind ?? 'event')
  const [title, setTitle] = useState(editing?.value.title ?? '')
  const [description, setDescription] = useState(taskEditing?.description ?? '')
  const [category, setCategory] = useState<TaskCategory>(editing?.value.category ?? 'personal')
  const [subjectId, setSubjectId] = useState(eventEditing?.subjectId ?? '')
  const [projectId, setProjectId] = useState(taskEditing?.projectId ?? projects[0]?.id ?? '')
  const [workstreamId, setWorkstreamId] = useState(taskEditing?.workstreamId ?? '')
  const [startDate, setStartDate] = useState(taskEditing?.startDate ?? '')
  const [dueDate, setDueDate] = useState(taskEditing?.dueDate ?? date)
  const [status, setStatus] = useState<TaskStatus>(taskEditing?.status ?? 'not_started')
  const [allDay, setAllDay] = useState(eventEditing?.allDay ?? true)
  const [startTime, setStartTime] = useState(eventEditing?.startTime?.slice(0, 5) ?? '09:00')
  const [endTime, setEndTime] = useState(eventEditing?.endTime?.slice(0, 5) ?? '10:00')
  const [isMajor, setIsMajor] = useState(eventEditing?.isMajor ?? taskEditing?.isDday ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const availableWorkstreams = workstreams.filter(item => item.projectId === projectId)

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      if (kind === 'task') {
        const input = { title, description: description || null, category, projectId, workstreamId: workstreamId || null, startDate: startDate || null, dueDate, status, isDday: isMajor }
        if (taskEditing) await updateTask(taskEditing.id, input)
        else await createTask(input)
      } else {
        const input = { title, category, subjectId: category === 'study' && subjectId ? subjectId : null, allDay, startDate: date, startTime: allDay ? null : startTime, endDate: date, endTime: allDay ? null : endTime, isMajor }
        if (eventEditing) await updateEvent(eventEditing.id, input)
        else await createEvent(input)
      }
      onClose()
    } catch (caught) { setError(caught instanceof Error ? caught.message : '저장하지 못했습니다.') } finally { setSaving(false) }
  }

  async function remove() {
    if (!editing || !confirm(`“${editing.value.title}”을 삭제할까요?`)) return
    if (editing.kind === 'task') await deleteTask(editing.value.id)
    else await deleteEvent(editing.value.id)
    onClose()
  }

  return <div className="calendar-popover-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="calendar-popover" onSubmit={submit}>
    <button type="button" className="popover-close" onClick={onClose} aria-label="닫기"><X size={18} /></button>
    <div className="popover-kind"><button type="button" className={kind === 'event' ? 'active' : ''} disabled={Boolean(editing)} onClick={() => setKind('event')}>일정</button><button type="button" className={kind === 'task' ? 'active' : ''} disabled={Boolean(editing)} onClick={() => setKind('task')}>Task</button></div>
    <input className="popover-title" autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder={kind === 'event' ? '새로운 이벤트' : '새로운 Task'} required maxLength={240} />
    {kind === 'task' ? <>
      <div className="popover-row"><label>Project</label><select value={projectId} required onChange={event => { const next = event.target.value; setProjectId(next); setWorkstreamId(''); const parent = projects.find(item => item.id === next); if (parent) setCategory(parent.category) }}><option value="">Project 선택</option>{projects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
      <div className="popover-row"><label>Workstream</label><select value={workstreamId} onChange={event => { setWorkstreamId(event.target.value); const parent = workstreams.find(item => item.id === event.target.value); if (parent) setCategory(parent.category) }}><option value="">Project 바로 아래</option>{availableWorkstreams.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
      <div className="popover-times"><input type="date" value={startDate} max={dueDate} onChange={event => setStartDate(event.target.value)} aria-label="Start date optional" /><span>–</span><input type="date" value={dueDate} min={startDate || undefined} onChange={event => setDueDate(event.target.value)} required aria-label="Due date" /></div>
      <div className="popover-row"><label>Status</label><select value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>{Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <textarea className="popover-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Details (optional)" maxLength={4000} />
    </> : <>
      <div className="popover-row"><span>날짜</span><strong>{date}</strong></div>
      {category === 'study' && <div className="popover-row"><label>과목</label><select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">과목 없음</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
      <div className="popover-check"><label><input type="checkbox" checked={allDay} onChange={event => setAllDay(event.target.checked)} /> 하루 종일</label></div>
      {!allDay && <div className="popover-times"><input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /><span>–</span><input type="time" value={endTime} onChange={event => setEndTime(event.target.value)} /></div>}
    </>}
    <div className="popover-row"><label>분류</label><select value={category} onChange={event => setCategory(event.target.value as TaskCategory)}>{Object.entries(taskCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="popover-check"><label><input type="checkbox" checked={isMajor} onChange={event => setIsMajor(event.target.checked)} /> {kind === 'event' ? '중요 일정' : 'D-Day'}</label></div>
    {kind === 'task' && !projects.length && <p className="form-error">Create a Project in Tasks before adding a Task.</p>}
    {error && <p className="form-error">{error}</p>}
    <div className="popover-actions">{editing && <button type="button" className="delete" onClick={() => void remove()}>삭제</button>}<span /><button type="button" onClick={onClose}>취소</button><button className="save" disabled={saving || (kind === 'task' && !projects.length)}>{saving ? '저장 중…' : '저장'}</button></div>
  </form></div>
}
