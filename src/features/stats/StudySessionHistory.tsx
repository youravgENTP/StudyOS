import { Edit3, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { updateStudySession } from './api'
import type { StudySessionStat } from './types'

type Props = {
  sessions: StudySessionStat[]
  onUpdated: (session: StudySessionStat) => void
}

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toLocalDateTimeValue(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder}분`
  return remainder === 0 ? `${hours}시간` : `${hours}시간 ${remainder}분`
}

function StudySessionEditor({ session, onClose, onUpdated }: {
  session: StudySessionStat
  onClose: () => void
  onUpdated: (session: StudySessionStat) => void
}) {
  const initialMinutes = Math.max(1, Math.round(session.durationSeconds / 60))
  const [hours, setHours] = useState(String(Math.floor(initialMinutes / 60)))
  const [minutes, setMinutes] = useState(String(initialMinutes % 60))
  const [endedAt, setEndedAt] = useState(toLocalDateTimeValue(session.endedAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const durationSeconds = (Number(hours) * 60 + Number(minutes)) * 60
    if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
      setError('공부시간은 1분 이상이어야 합니다.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const updated = await updateStudySession(session, { durationSeconds, endedAt })
      onUpdated(updated)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '공부 기록을 수정하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="study-session-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form className="study-session-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="study-session-editor-title">
      <button className="study-session-editor-close" type="button" onClick={onClose} aria-label="닫기"><X /></button>
      <div><div className="eyebrow">Correct recorded time</div><h2 id="study-session-editor-title">공부 기록 수정</h2></div>
      <label><span>기록 날짜·시각</span><input type="datetime-local" value={endedAt} onChange={event => setEndedAt(event.target.value)} required /></label>
      <fieldset>
        <legend>공부시간</legend>
        <label><input type="number" min="0" max="99" step="1" value={hours} onChange={event => setHours(event.target.value)} required /><span>시간</span></label>
        <label><input type="number" min="0" max="59" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} required /><span>분</span></label>
      </fieldset>
      <p className="study-session-editor-help">타이머 기록은 수정한 종료 시각과 공부시간에 맞춰 시작 시각도 함께 보정됩니다.</p>
      {error && <p className="form-error">{error}</p>}
      <div className="study-session-editor-actions"><button type="button" className="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving}>{saving ? '저장 중…' : '수정 저장'}</button></div>
    </form>
  </div>
}

export function StudySessionHistory({ sessions, onUpdated }: Props) {
  const [editing, setEditing] = useState<StudySessionStat | null>(null)
  const ordered = [...sessions].sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())

  return <section className="card study-session-history">
    <div className="card-head"><div><h2>공부 기록</h2><p>잘못 입력된 공부시간과 기록 시각을 사후 수정할 수 있습니다.</p></div><span className="meta">{sessions.length}개 기록</span></div>
    {ordered.length === 0 ? <p className="empty-copy">선택한 기간에 수정할 공부 기록이 없습니다.</p> : <div className="study-session-list">{ordered.map(session => <article key={session.id}>
      <div><strong>{formatDuration(session.durationSeconds)}</strong><span>{dateTimeFormatter.format(new Date(session.endedAt))} · {session.source === 'timer' ? '타이머' : '직접 추가'}</span></div>
      <button type="button" onClick={() => setEditing(session)} aria-label={`${dateTimeFormatter.format(new Date(session.endedAt))} 공부 기록 수정`}><Edit3 /></button>
    </article>)}</div>}
    {editing && <StudySessionEditor session={editing} onClose={() => setEditing(null)} onUpdated={onUpdated} />}
  </section>
}
