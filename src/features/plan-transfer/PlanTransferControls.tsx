import { Check, Download, Upload, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { importStudyOsPlan, loadStudyOsPlan } from './api'
import { countStudyOsPlan, parseStudyOsPlan } from './model'
import type { StudyOsPlan, TransferCounts } from './types'
import './plan-transfer.css'

const labels: Array<[keyof TransferCounts, string]> = [['subjects', 'Subjects'], ['subcategories', 'Subcategories'], ['projects', 'Projects'], ['workstreams', 'Workstreams'], ['sections', 'Sections'], ['tasks', 'Tasks'], ['events', 'Schedules']]

export function PlanTransferControls() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<StudyOsPlan | null>(null)
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TransferCounts | null>(null)

  async function download() {
    setBusy(true); setError('')
    try {
      const plan = await loadStudyOsPlan()
      const day = plan.exportedAt.slice(0, 10)
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(plan, null, 2)}\n`], { type: 'application/json;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `studyos-plan-${day}.json`; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'JSON을 내보내지 못했습니다.') }
    finally { setBusy(false) }
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; setResult(null); setError('')
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('5MB 이하의 StudyOS JSON 파일만 가져올 수 있습니다.')
      setPreview(parseStudyOsPlan(JSON.parse(await file.text()) as unknown)); setFilename(file.name)
    } catch (caught) { setPreview(null); setFilename(''); setError(caught instanceof Error ? caught.message : 'JSON 파일을 읽지 못했습니다.') }
  }

  async function save() {
    if (!preview) return
    setBusy(true); setError('')
    try { setResult(await importStudyOsPlan(preview)); setPreview(null); setFilename('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : '계획을 가져오지 못했습니다.') }
    finally { setBusy(false) }
  }

  const counts = preview ? countStudyOsPlan(preview) : null
  return <>
    <input ref={inputRef} className="plan-transfer-input" type="file" accept="application/json,.json" onChange={event => void selectFile(event)} />
    <button className="button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={15} /> Import</button>
    <button className="button" type="button" onClick={() => void download()} disabled={busy}><Download size={15} /> Export</button>
    {(preview || error || result) && <div className="plan-transfer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setPreview(null); setError(''); setResult(null) } }}>
      <section className="plan-transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-transfer-title">
        <button className="plan-transfer-close" type="button" aria-label="Close" disabled={busy} onClick={() => { setPreview(null); setError(''); setResult(null) }}><X /></button>
        <div><span className="eyebrow">StudyOS JSON</span><h2 id="plan-transfer-title">{preview ? '가져오기 전 확인' : result ? '가져오기 완료' : '가져오기 오류'}</h2>{filename && <p>{filename}</p>}</div>
        {counts && <><div className="plan-transfer-counts">{labels.map(([key, label]) => <span key={key}><strong>{counts[key]}</strong><small>{label}</small></span>)}</div><p className="plan-transfer-note">기존 항목은 이름과 상위 경로를 기준으로 재사용하고, 없는 항목만 추가합니다. 기존 데이터는 수정하거나 삭제하지 않습니다.</p></>}
        {result && <><div className="plan-transfer-success"><Check /> 새로 추가된 항목</div><div className="plan-transfer-counts">{labels.map(([key, label]) => <span key={key}><strong>{result[key] ?? 0}</strong><small>{label}</small></span>)}</div></>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="plan-transfer-actions"><button className="button" type="button" disabled={busy} onClick={() => { setPreview(null); setError(''); setResult(null) }}>{preview ? '취소' : '닫기'}</button>{preview && <button className="button primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? '반영 중…' : '가져오기'}</button>}</div>
      </section>
    </div>}
  </>
}
