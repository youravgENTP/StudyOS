import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Archive, Edit3, X } from 'lucide-react'
import { archiveSubject, createSubject, updateSubject } from '../api/tasks'
import { academicTermLabels, type AcademicTerm, type Subject } from '../types'

const DEFAULT_YEAR = 2026
const DEFAULT_TERM: AcademicTerm = '2'
const DEFAULT_COLOR = '#7185a6'
const terms = Object.entries(academicTermLabels) as [AcademicTerm, string][]

export function SubjectManager({ subjects, onClose }: { subjects: Subject[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR)
  const [academicTerm, setAcademicTerm] = useState<AcademicTerm>(DEFAULT_TERM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const yearOptions = useMemo(() => {
    const existing = subjects.map(subject => subject.academicYear)
    const start = Math.min(DEFAULT_YEAR - 2, ...existing)
    const end = Math.max(DEFAULT_YEAR + 3, ...existing)
    return Array.from({ length: end - start + 1 }, (_, index) => end - index)
  }, [subjects])
  const visibleSubjects = subjects.filter(subject => subject.academicYear === academicYear && subject.academicTerm === academicTerm)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function edit(subject: Subject) {
    setEditingId(subject.id)
    setName(subject.name)
    setColor(subject.color)
    setAcademicYear(subject.academicYear)
    setAcademicTerm(subject.academicTerm)
  }

  function clear() {
    setEditingId(null)
    setName('')
    setColor(DEFAULT_COLOR)
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId) await updateSubject(editingId, name, color, academicYear, academicTerm)
      else await createSubject(name, color, academicYear, academicTerm)
      clear()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this subject.')
    } finally { setSaving(false) }
  }

  async function archive(subject: Subject) {
    if (!window.confirm(`Archive ${subject.name}? Existing Workstreams will keep their subject.`)) return
    try {
      await archiveSubject(subject.id)
      if (editingId === subject.id) clear()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not archive this subject.') }
  }

  return <div className="subject-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="subject-modal" role="dialog" aria-modal="true" aria-labelledby="subject-manager-title">
      <header className="subject-modal-head"><div><div className="eyebrow">Academic master data</div><h2 id="subject-manager-title">Subjects</h2></div><button className="subject-modal-close" onClick={onClose} aria-label="Close subjects"><X /></button></header>
      <div className="subject-term-picker">
        <label>학년도<select value={academicYear} disabled={Boolean(editingId)} onChange={event => { setAcademicYear(Number(event.target.value)); clear() }}>{yearOptions.map(year => <option key={year} value={year}>{year}학년도</option>)}</select></label>
        <label>학기<select value={academicTerm} disabled={Boolean(editingId)} onChange={event => { setAcademicTerm(event.target.value as AcademicTerm); clear() }}>{terms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <form className="subject-form" onSubmit={submit}>
        <label>과목명<input value={name} onChange={event => setName(event.target.value)} placeholder="Subject name" maxLength={80} required /></label>
        <label>색상<div className="subject-color-field"><input type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Subject color" /><input value={color.toUpperCase()} onChange={event => { if (/^#[0-9a-fA-F]{0,6}$/.test(event.target.value)) setColor(event.target.value) }} pattern="#[0-9a-fA-F]{6}" maxLength={7} aria-label="Subject color hex value" /></div></label>
        <div className="subject-form-actions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add subject'}</button>{editingId && <button type="button" className="button" onClick={clear}>Cancel</button>}</div>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="subject-list-head"><strong>{academicYear}-{academicTerm}</strong><span>{visibleSubjects.length} subjects</span></div>
      <div className="subject-list">{visibleSubjects.length ? visibleSubjects.map(subject => <div className="subject-row" key={subject.id}><span className="subject-swatch" style={{ background: subject.color }} /><span>{subject.name}</span><code>{subject.color.toUpperCase()}</code><div className="subject-actions"><button onClick={() => edit(subject)} aria-label={`Edit ${subject.name}`}><Edit3 /></button><button className="danger" onClick={() => void archive(subject)} aria-label={`Archive ${subject.name}`}><Archive /></button></div></div>) : <p className="empty-copy">이 학기에 등록된 과목이 없습니다.</p>}</div>
    </section>
  </div>
}
