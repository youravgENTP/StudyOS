import { useState, type FormEvent } from 'react'
import type { RoutineItem, RoutineItemInput } from '../types'

export function RoutineItemForm({ editing, onSave, onCancel }: {
  editing: RoutineItem | null
  onSave: (input: RoutineItemInput, id?: string) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [time, setTime] = useState(editing?.scheduledTime ?? '')
  const [details, setDetails] = useState(editing?.details ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ title, scheduledTime: time || null, details: details || null }, editing?.id)
      onCancel()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save routine item.')
    } finally {
      setSaving(false)
    }
  }

  return <form className="routine-inline-form" onSubmit={submit}>
    <div className="routine-form-top">
      <input className="routine-time-input" type="time" value={time} onChange={event => setTime(event.target.value)} aria-label="Scheduled time" />
      <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Routine action" maxLength={160} required autoFocus />
    </div>
    <textarea value={details} onChange={event => setDetails(event.target.value)} placeholder="Details: location, items to bring, instructions, fallback…" maxLength={1000} />
    {error && <p className="form-error">{error}</p>}
    <div className="routine-inline-actions">
      <button type="button" className="button" onClick={onCancel}>Cancel</button>
      <button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  </form>
}
