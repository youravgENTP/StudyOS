import { Archive, Check, Download, FileJson, RotateCcw, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { importDosageCatalog, listDosageCatalog, onDosageChanged, setDosageCatalogArchived } from '../dosage/api'
import { buildDosageCatalogFile, exampleDosageCatalogFile, parseDosageCatalogFile } from '../dosage/catalogTransfer'
import type { DosageCatalogFile, DosageCatalogImportMode, DosageCatalogImportResult, DosageCatalogItem } from '../dosage/types'

const categoryLabels = { medication: '의약품', supplement: '영양제', other: '기타' }

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function MedicationCatalogCard() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<DosageCatalogItem[]>([])
  const [preview, setPreview] = useState<DosageCatalogFile | null>(null)
  const [filename, setFilename] = useState('')
  const [mode, setMode] = useState<DosageCatalogImportMode>('merge')
  const [result, setResult] = useState<DosageCatalogImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => { try { setItems(await listDosageCatalog({ includeArchived: true })); setError('') } catch (caught) { setError(caught instanceof Error ? caught.message : '약물 카탈로그를 불러오지 못했습니다.') } }, [])
  useEffect(() => { void load(); return onDosageChanged(() => void load()) }, [load])

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; setPreview(null); setResult(null); setError(''); setMode('merge')
    if (!file) return
    try {
      if (file.size > 2_000_000) throw new Error('2MB 이하의 약물 JSON 파일만 가져올 수 있습니다.')
      setPreview(parseDosageCatalogFile(JSON.parse(await file.text()) as unknown)); setFilename(file.name)
    } catch (caught) { setFilename(''); setError(caught instanceof Error ? caught.message : 'JSON 파일을 읽지 못했습니다.') }
  }

  async function save() {
    if (!preview) return
    setBusy(true); setError('')
    try { setResult(await importDosageCatalog(preview, mode)); setPreview(null); setFilename(''); await load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : '약물 카탈로그를 가져오지 못했습니다.') }
    finally { setBusy(false) }
  }

  async function toggle(item: DosageCatalogItem) {
    setBusy(true); setError('')
    try { await setDosageCatalogArchived(item.key, !item.archivedAt); await load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : '약물 표시 상타를 변경하지 못했습니다.') }
    finally { setBusy(false) }
  }

  const active = items.filter(item => !item.archivedAt)
  const profiles = preview?.medications.reduce((sum, item) => sum + item.pkProfiles.length, 0) ?? 0
  return <section className="card medication-catalog-settings">
    <header className="medication-settings-heading"><span><FileJson /></span><div><h2>Medication catalog</h2><p>GPT로 작성한 StudyOS JSON을 검증한 뒤 약물과 약동학 정보를 한 번에 관리합니다.</p></div><strong>{active.length} active</strong></header>
    <input ref={inputRef} className="timetable-file-input" type="file" accept="application/json,.json" onChange={event => void selectFile(event)} />
    <div className="medication-settings-actions"><button className="button primary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload /> JSON 가져오기</button><button className="button" type="button" onClick={() => downloadJson(buildDosageCatalogFile(items), `studyos-medications-${new Date().toISOString().slice(0, 10)}.json`)} disabled={busy || !active.length}><Download /> 현재 카탈로그</button><button className="button" type="button" onClick={() => downloadJson(exampleDosageCatalogFile, 'studyos-medication-example.json')} disabled={busy}><Download /> 예시 JSON</button></div>
    {preview && <div className="medication-import-preview"><div><small>{filename} · 가져오기 전 확인</small><strong>{preview.medications.length}개 약물 · {profiles}개 약동학 프로필</strong></div><div className="medication-preview-names">{preview.medications.slice(0, 6).map(item => <span key={item.key}>{item.displayName}</span>)}{preview.medications.length > 6 && <span>+{preview.medications.length - 6}</span>}</div><fieldset><label><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> <span><strong>새 항목만 추가</strong><small>기존 key는 변경하지 않음</small></span></label><label><input type="radio" checked={mode === 'update'} onChange={() => setMode('update')} /> <span><strong>기존 항목도 업데이트</strong><small>파일에 없는 약물은 유지</small></span></label></fieldset><div className="timetable-import-actions"><button className="text-button" type="button" onClick={() => { setPreview(null); setFilename('') }} disabled={busy}>취소</button><button className="button primary" type="button" onClick={() => void save()} disabled={busy}>{busy ? '반영 중…' : '카탈로그에 반영'}</button></div></div>}
    {result && <p className="settings-message success"><Check /> 새 항목 {result.inserted}개 · 업데이트 {result.updated}개 · 변경 없음 {result.unchanged}개</p>}
    <div className="medication-settings-list">{items.map(item => <div className={item.archivedAt ? 'archived' : ''} key={item.key}><span><strong>{item.displayName}</strong><small>{categoryLabels[item.category]} · {item.ingredientName}</small></span><button className="text-button" type="button" onClick={() => void toggle(item)} disabled={busy}>{item.archivedAt ? <><RotateCcw /> 복원</> : <><Archive /> 숨기기</>}</button></div>)}</div>
    {!items.length && !error && <p className="settings-status">등록된 약물이 없습니다.</p>}
    {error && <p className="settings-message error" role="alert">{error}</p>}
    <p className="settings-footnote">파일에서 빠진 기존 약물과 복용 기록은 삭제되지 않습니다. 더 이상 사용하지 않는 약물은 숨길 수 있습니다.</p>
  </section>
}
