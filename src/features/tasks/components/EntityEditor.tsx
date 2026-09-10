import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { createProject, createTask, createWorkstream, deleteProject, deleteTask, deleteWorkstream, updateProject, updateTask, updateWorkstream } from '../api/tasks'
import { taskCategoryLabels, taskStatusLabels, type PlanningEntity, type Project, type Subject, type Task, type TaskCategory, type TaskStatus, type Workstream } from '../types'

type Kind = 'project' | 'workstream' | 'task'
type Props = { kind: Kind; projects: Project[]; workstreams: Workstream[]; subjects: Subject[]; project?: Project; workstream?: Workstream | null; editing?: PlanningEntity | null; onClose: () => void }

export function EntityEditor({ kind, projects, workstreams, subjects, project, workstream, editing, onClose }: Props) {
  const existing = editing as Project | Workstream | Task | null | undefined
  const initialProjectId = kind === 'project' ? '' : (existing && 'projectId' in existing ? existing.projectId : project?.id ?? '')
  const initialWorkstreamId = kind === 'task' ? (existing && 'workstreamId' in existing ? existing.workstreamId ?? '' : workstream?.id ?? '') : ''
  const inheritedCategory = workstream?.category ?? project?.category ?? 'study'
  const inheritedDue = workstream?.dueDate ?? project?.dueDate ?? ''
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [category, setCategory] = useState<TaskCategory>(existing?.category ?? inheritedCategory)
  const [startDate, setStartDate] = useState(existing?.startDate ?? '')
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? inheritedDue)
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? 'not_started')
  const [isDday, setIsDday] = useState(existing?.isDday ?? false)
  const [projectId, setProjectId] = useState(initialProjectId)
  const [workstreamId, setWorkstreamId] = useState(initialWorkstreamId)
  const [subjectId, setSubjectId] = useState(existing && 'subjectId' in existing ? existing.subjectId ?? '' : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const availableWorkstreams = workstreams.filter(item => item.projectId === projectId)

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const common = { title, description: description || null, category, startDate: startDate || null, dueDate, status, isDday }
    try {
      if (kind === 'project') {
        if (editing) await updateProject(editing.id, common)
        else await createProject(common)
      }
      if (kind === 'workstream') {
        const input = { ...common, projectId, subjectId: subjectId || null }
        if (editing) await updateWorkstream(editing.id, input)
        else await createWorkstream(input)
      }
      if (kind === 'task') {
        const input = { ...common, projectId, workstreamId: workstreamId || null }
        if (editing) await updateTask(editing.id, input)
        else await createTask(input)
      }
      onClose()
    } catch (caught) { setError(caught instanceof Error ? caught.message : `Could not save ${kind}.`) } finally { setSaving(false) }
  }

  async function remove() {
    if (!editing || !confirm(`Delete “${editing.title}” and any children?`)) return
    try {
      if (kind === 'project') await deleteProject(editing.id)
      if (kind === 'workstream') await deleteWorkstream(editing.id)
      if (kind === 'task') await deleteTask(editing.id)
      onClose()
    } catch (caught) { setError(caught instanceof Error ? caught.message : `Could not delete ${kind}.`) }
  }

  return <div className="entity-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form className="entity-editor" onSubmit={submit}>
      <button type="button" className="entity-editor-close" onClick={onClose} aria-label="Close"><X /></button>
      <div><span className="eyebrow">{editing ? 'Edit' : 'New'} {kind}</span><h2>{editing?.title ?? `Create ${kind}`}</h2></div>
      {kind !== 'project' && <label>Project<select value={projectId} required onChange={event => { setProjectId(event.target.value); setWorkstreamId('') }}><option value="">Select project</option>{projects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      {kind === 'task' && <label>Workstream <small>Optional</small><select value={workstreamId} onChange={event => setWorkstreamId(event.target.value)}><option value="">Directly under project</option>{availableWorkstreams.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      {kind === 'workstream' && <label>Subject <small>Optional</small><select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">No subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label>Title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={240} required /></label>
      <label>Description <small>Optional</small><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} /></label>
      <div className="entity-editor-pair"><label>Start <small>Optional</small><input type="date" value={startDate} max={dueDate || undefined} onChange={event => setStartDate(event.target.value)} /></label><label>Due<input type="date" value={dueDate} min={startDate || undefined} onChange={event => setDueDate(event.target.value)} required /></label></div>
      <div className="entity-editor-pair"><label>Category<select value={category} onChange={event => setCategory(event.target.value as TaskCategory)}>{Object.entries(taskCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Status<select value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>{Object.entries(taskStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label className="entity-editor-check"><input type="checkbox" checked={isDday} onChange={event => setIsDday(event.target.checked)} /> Pin as D-Day</label>
      {error && <p className="form-error">{error}</p>}
      <div className="entity-editor-actions">{editing && <button type="button" className="danger" onClick={() => void remove()}>Delete</button>}<span /><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
    </form>
  </div>
}
