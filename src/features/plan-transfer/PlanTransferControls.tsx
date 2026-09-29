import { Check, Download, Upload, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { importStudyOsPlan, loadStudyOsPlan } from './api'
import { countStudyOsPlan, parseStudyOsPlan } from './model'
import type { ImportMode, ImportResult, StudyOsPlan, TransferCounts } from './types'
import './plan-transfer.css'

const labels: Array<[keyof TransferCounts, string]> = [['subjects', 'Subjects'], ['subcategories', 'Subcategories'], ['projects', 'Projects'], ['workstreams', 'Workstreams'], ['sections', 'Sections'], ['tasks', 'Tasks'], ['events', 'Schedules']]

export function PlanTransferControls() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<StudyOsPlan | null>(null)
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [result, setResult] = useState<ImportResult | null>(null)

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
    const file = event.target.files?.[0]; event.target.value = ''; setResult(null); setError(''); setImportMode('merge')
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('5MB 이하의 StudyOS JSON 파일만 가져올 수 있습니다.')
      setPreview(parseStudyOsPlan(JSON.parse(await file.text()) as unknown)); setFilename(file.name)
    } catch (caught) { setPreview(null); setFilename(''); setError(caught instanceof Error ? caught.message : 'JSON 파일을 읽지 못했습니다.') }
  }

  async function save() {
    if (!preview) return
    setBusy(true); setError('')
    try { setResult(await importStudyOsPlan(preview, importMode)); setPreview(null); setFilename('') }
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
        {counts && <><div className="plan-transfer-counts">{labels.map(([key, label]) => <span key={key}><strong>{counts[key]}</strong><small>{label}</small></span>)}</div><fieldset className="plan-transfer-modes" disabled={busy}><legend>Import mode</legend><label className={importMode === 'merge' ? 'selected' : ''}><input type="radio" name="plan-import-mode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /><span><strong>Merge only (safe)</strong><small>Adds missing items. Existing StudyOS data will not be changed.</small></span></label><label className={importMode === 'update' ? 'selected' : ''}><input type="radio" name="plan-import-mode" value="update" checked={importMode === 'update'} onChange={() => setImportMode('update')} /><span><strong>Update existing</strong><small>Updates matching items and adds missing ones. Items absent from this file will not be deleted.</small></span></label></fieldset><p className="plan-transfer-note">ID를 우선 사용하고, ID가 없거나 현재 사용자 데이터와 일치하지 않으면 이름과 상위 경로로 항목을 찾습니다.</p></>}
        {result && <><div className="plan-transfer-success"><Check /> 가져오기 완료</div><div className="plan-transfer-result"><div className="result-head"><span /><strong>New</strong><strong>Updated</strong><strong>Unchanged</strong></div>{labels.map(([key, label]) => <div key={key}><span>{label}</span><strong>{result.inserted[key] ?? 0}</strong><strong>{result.updated[key] ?? 0}</strong><strong>{result.unchanged[key] ?? 0}</strong></div>)}</div><p className="plan-transfer-note">파일에 없는 기존 항목은 변경하거나 삭제하지 않았습니다.</p></>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="plan-transfer-actions"><button className="button" type="button" disabled={busy} onClick={() => { setPreview(null); setError(''); setResult(null) }}>{preview ? '취소' : '닫기'}</button>{preview && <button className="button primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? '반영 중…' : '가져오기'}</button>}</div>
      </section>
    </div>}
  </>
}
