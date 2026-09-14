import { CalendarClock, Check, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { academicTermLabels } from '../tasks/types'
import { getLatestTimetable, importTimetable } from './api'
import { formatMinutes, parseStudyOsTimetable, weekdayMinutes } from './model'
import type { ImportedTimetable, StudyOsTimetablePayload } from './types'

const weekdays = ['', '월', '화', '수', '목', '금', '토', '일']

export function TimetableImportCard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [current, setCurrent] = useState<ImportedTimetable | null>(null)
  const [preview, setPreview] = useState<StudyOsTimetablePayload | null>(null)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void getLatestTimetable().then(value => { if (!cancelled) setCurrent(value) }).catch(caught => { if (!cancelled) setError(caught instanceof Error ? caught.message : '시간표를 불러오지 못했습니다.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setMessage('')
    setError('')
    setPreview(null)
    if (!file) return
    try {
      if (file.size > 1_000_000) throw new Error('1MB 이하의 시간표 JSON 파일만 가져올 수 있습니다.')
      const parsed = parseStudyOsTimetable(JSON.parse(await file.text()) as unknown)
      setFilename(file.name)
      setPreview(parsed)
    } catch (caught) {
      setFilename('')
      setError(caught instanceof Error ? caught.message : 'JSON 파일을 읽지 못했습니다.')
    } finally {
      event.target.value = ''
    }
  }

  async function save() {
    if (!preview) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await importTimetable(preview)
      const imported = await getLatestTimetable()
      setCurrent(imported)
      setPreview(null)
      setFilename('')
      setMessage('시간표와 과목을 StudyOS에 반영했습니다.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '시간표를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const shown = preview ?? current
  const daily = shown ? weekdayMinutes(shown) : {}

  return <section className="card timetable-import-card">
    <header className="timetable-import-heading">
      <span><CalendarClock /></span>
      <div><h2>수업 시간표</h2><p>inyak-planner JSON을 가져오면 과목과 주간 수업시간을 동기화합니다.</p></div>
    </header>

    <input ref={inputRef} className="timetable-file-input" type="file" accept="application/json,.json" onChange={event => void selectFile(event)} />
    <button className="timetable-file-button" type="button" onClick={() => inputRef.current?.click()} disabled={saving}>
      <Upload /> {current ? '다른 JSON 선택' : '시간표 JSON 선택'}
    </button>

    {loading && <p className="settings-status">가져온 시간표를 확인하는 중…</p>}
    {!loading && !shown && !error && <p className="settings-status">아직 가져온 시간표가 없습니다.</p>}

    {shown && <div className={`timetable-preview${preview ? ' pending' : ''}`}>
      <div className="timetable-preview-title">
        <div><small>{preview ? `${filename} · 가져오기 전 확인` : '현재 반영된 시간표'}</small><strong>{shown.academicYear}년 {academicTermLabels[shown.academicTerm]} · {shown.source.timetableName}</strong></div>
        {!preview && <Check aria-label="반영됨" />}
      </div>
      <div className="timetable-metrics">
        <span><strong>{shown.subjects.length}</strong><small>과목</small></span>
        <span><strong>{formatMinutes(shown.totalWeeklyMinutes)}</strong><small>주간 수업</small></span>
        <span><strong>{formatMinutes(7 * 24 * 60 - shown.totalWeeklyMinutes)}</strong><small>수업 외 시간 · 168h 기준</small></span>
      </div>
      <div className="timetable-daily" aria-label="요일별 수업시간">
        {Array.from({ length: 7 }, (_, index) => index + 1).map(day => <span key={day} className={daily[day] ? 'has-class' : ''}><small>{weekdays[day]}</small><strong>{daily[day] ? formatMinutes(daily[day]) : '—'}</strong></span>)}
      </div>
      {preview && <div className="timetable-import-actions"><button className="text-button" type="button" onClick={() => { setPreview(null); setFilename('') }} disabled={saving}>취소</button><button className="button primary" type="button" onClick={() => void save()} disabled={saving}>{saving ? '반영 중…' : '이 시간표 반영'}</button></div>}
    </div>}

    {message && <p className="settings-message success" role="status">{message}</p>}
    {error && <p className="settings-message error" role="alert">{error}</p>}
    <p className="settings-footnote">같은 학기의 기존 가져오기 데이터는 새 파일로 교체됩니다. 직접 만든 과목과 학습 데이터는 삭제하지 않습니다.</p>
  </section>
}
