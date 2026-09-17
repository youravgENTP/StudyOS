import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { archiveSection, createSection, updateSection } from '../api/tasks'
import type { Section, TaskStatus, Workstream } from '../types'

export function SectionEditor({ workstream, section, onClose }: { workstream: Workstream; section?: Section | null; onClose: () => void }) {
  const [title, setTitle] = useState(section?.title ?? '')
  const [description, setDescription] = useState(section?.description ?? '')
  const [startDate, setStartDate] = useState(section?.startDate ?? '')
  const [dueDate, setDueDate] = useState(section?.dueDate ?? '')
  const [status, setStatus] = useState<TaskStatus>(section?.status ?? 'not_started')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); try { const input = { workstreamId: workstream.id, title, description: description || null, startDate: startDate || null, dueDate: dueDate || null, status }; if (section) await updateSection(section.id, input); else await createSection(input); onClose() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save Section.') } finally { setSaving(false) } }
  async function remove() { if (!section || !confirm(`Archive “${section.title}”? Tasks will move to Ungrouped.`)) return; try { await archiveSection(section.id); onClose() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not archive Section.') } }
  return <div className="entity-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="entity-editor section-editor" onSubmit={submit}>
    <button type="button" className="entity-editor-close" onClick={onClose} aria-label="Close"><X /></button><div><span className="eyebrow">{section ? 'Edit' : 'New'} Section</span><h2>{section?.title ?? workstream.title}</h2></div>
    <label>Title<input autoFocus required maxLength={240} value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label>Description <small>Optional</small><textarea maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} /></label>
    <div className="entity-editor-pair"><label>Start <small>Optional</small><input type="date" value={startDate} max={dueDate || undefined} onChange={event => setStartDate(event.target.value)} /></label><label>Due <small>Optional</small><input type="date" value={dueDate} min={startDate || undefined} onChange={event => setDueDate(event.target.value)} /></label></div>
    <label>Status<select value={status} onChange={event => setStatus(event.target.value as TaskStatus)}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="done">Done</option><option value="dropped">Dropped</option></select></label>
    {error && <p className="form-error">{error}</p>}<div className="entity-editor-actions">{section && <button type="button" className="danger" onClick={() => void remove()}>Archive</button>}<span /><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
  </form></div>
}
