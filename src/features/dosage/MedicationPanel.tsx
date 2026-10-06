import { ExternalLink, Pill, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCaffeineAxisFontSize } from '../settings/preferences'
import { createDosageIntake, deleteDosageIntake, listDosageCatalog, listDosageIntakes, onDosageChanged } from './api'
import { MedicationExposureChart } from './MedicationExposureChart'
import { medicationExposureTimeWindow } from './model'
import type { DosageCatalogItem, DosageIntake } from './types'
import './dosage.css'

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const dayRange = (date = new Date()) => { const from = new Date(date); from.setHours(0, 0, 0, 0); const to = new Date(from); to.setDate(to.getDate() + 1); return { from, to } }
const dateKey = (date: Date) => date.toLocaleDateString('en-CA')
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
const readableDate = (key: string) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(dateFromKey(key))
const hours = (minutes: number) => Number.isInteger(minutes / 60) ? String(minutes / 60) : (minutes / 60).toFixed(1)
const duration = (min: number | null, max: number | null) => min === null ? '자료 없음' : min === max || max === null ? `${hours(min)}시간` : `${hours(min)}–${hours(max)}시간`
const peak = (min: number | null, max: number | null) => min === null ? '자료 없음' : `${min}–${max ?? min}분`
const categoryLabels = { all: '전체', medication: '의약품', supplement: '영양제', other: '기타' } as const
type CategoryFilter = keyof typeof categoryLabels

export function MedicationPanel() {
  const axisFontSize = useCaffeineAxisFontSize()
  const [catalog, setCatalog] = useState<DosageCatalogItem[]>([])
  const [dailyIntakes, setDailyIntakes] = useState<DosageIntake[]>([])
  const [exposureIntakes, setExposureIntakes] = useState<DosageIntake[]>([])
  const [now, setNow] = useState(new Date())
  const [takenAt, setTakenAt] = useState(() => localInput(new Date()))
  const [logDate, setLogDate] = useState(() => dateKey(new Date()))
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [exposureLoading, setExposureLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [selectedKey, setSelectedKey] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [query, setQuery] = useState('')
  const [doseQuantity, setDoseQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const loadCatalog = useCallback(async () => {
    try { const items = await listDosageCatalog(); setCatalog(items); setSelectedKey(items[0]?.key ?? ''); setDoseQuantity(items[0]?.defaultDoseQuantity ?? 1) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '약물 정보를 불러오지 못했습니다.') }
    finally { setCatalogLoading(false) }
  }, [])

  const loadExposure = useCallback(async () => {
    const { fetchStart, fetchEnd } = medicationExposureTimeWindow(new Date())
    setExposureLoading(true)
    try { setExposureIntakes(await listDosageIntakes(fetchStart, fetchEnd)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '약물 노출 기록을 불러오지 못했습니다.') }
    finally { setExposureLoading(false) }
  }, [])

  const loadHistory = useCallback(async () => {
    const { from, to } = dayRange(dateFromKey(logDate))
    setHistoryLoading(true)
    try { setDailyIntakes(await listDosageIntakes(from, to)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '복용 기록을 불러오지 못했습니다.') }
    finally { setHistoryLoading(false) }
  }, [logDate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCatalog()
      void loadExposure()
    }, 0)
    const off = onDosageChanged(() => void loadExposure())
    return () => { window.clearTimeout(timer); off() }
  }, [loadCatalog, loadExposure])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0)
    return () => window.clearTimeout(timer)
  }, [loadHistory])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  function select(item: DosageCatalogItem) { setSelectedKey(item.key); setDoseQuantity(item.defaultDoseQuantity); setNote('') }

  async function take(item: DosageCatalogItem) {
    const time = new Date(takenAt)
    if (Number.isNaN(time.getTime())) { setError('복용 시각을 선택해 주세요.'); return }
    if (!Number.isFinite(doseQuantity) || doseQuantity <= 0 || doseQuantity > 1000) { setError('복용 수량은 0보다 크고 1000 이하여야 합니다.'); return }
    setSavingKey(item.key); setError('')
    try {
      const created = await createDosageIntake(item, time, doseQuantity, note)
      const createdDate = dateKey(time)
      setExposureIntakes(current => [created, ...current.filter(record => record.id !== created.id)])
      if (createdDate === logDate) setDailyIntakes(current => [created, ...current.filter(record => record.id !== created.id)])
      setLogDate(createdDate)
      setTakenAt(localInput(new Date()))
      setNote('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '복용 기록을 저장하지 못했습니다.')
    } finally {
      setSavingKey('')
    }
  }

  const selected = catalog.find(item => item.key === selectedKey) ?? null
  const filtered = useMemo(() => { const needle = query.trim().toLocaleLowerCase(); return catalog.filter(item => (categoryFilter === 'all' || item.category === categoryFilter) && (!needle || `${item.displayName} ${item.ingredientName} ${item.aliases.join(' ')}`.toLocaleLowerCase().includes(needle))) }, [catalog, categoryFilter, query])
  const recent = useMemo(() => { const keys = exposureIntakes.map(item => item.catalogKey); return [...new Set(keys)].map(key => catalog.find(item => item.key === key)).filter((item): item is DosageCatalogItem => Boolean(item)).slice(0, 5) }, [catalog, exposureIntakes])

  async function remove(id: string) {
    try {
      await deleteDosageIntake(id)
      setDailyIntakes(current => current.filter(record => record.id !== id))
      setExposureIntakes(current => current.filter(record => record.id !== id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '복용 기록을 삭제하지 못했습니다.')
    }
  }

  return <section className="dosage-medication-section">
    <div className="dosage-section-heading"><div><span className="eyebrow">Medication records</span><h2>Medications</h2><p>복용 사실을 기록합니다. 아래 약동학 값은 일반적인 참고 범위이며 개인별 효과나 혈중농도 측정값이 아닙니다.</p></div></div>
    <MedicationExposureChart catalog={catalog} intakes={exposureIntakes} now={now} axisFontSize={axisFontSize} loading={catalogLoading || exposureLoading} />
    {catalogLoading ? <p className="empty-copy">Loading medications…</p> : <div className="medication-layout">
      <div className="medication-picker-column">
        <section className="card medication-picker"><div className="medication-category-tabs">{(Object.keys(categoryLabels) as CategoryFilter[]).map(key => <button className={categoryFilter === key ? 'active' : ''} type="button" onClick={() => setCategoryFilter(key)} key={key}>{categoryLabels[key]}</button>)}</div><label className="medication-search"><Search /><input type="search" placeholder="약물명, 별칭, 성분명 검색" value={query} onChange={event => setQuery(event.target.value)} /></label>{recent.length > 0 && <div className="medication-recent"><small>최근 복용</small><div>{recent.map(item => <button type="button" onClick={() => select(item)} key={item.key}>{item.displayName}</button>)}</div></div>}<div className="medication-options">{filtered.map(item => <button className={selectedKey === item.key ? 'selected' : ''} type="button" onClick={() => select(item)} key={item.key}><span><Pill /><strong>{item.displayName}</strong></span><small>{item.ingredientName} · {item.strengthValue} {item.strengthUnit}</small></button>)}</div>{!filtered.length && <p className="empty-copy">조건에 맞는 약물이 없습니다.</p>}</section>
        {selected && <article className="card medication-card medication-selected"><header><span><Pill /></span><div><strong>{selected.displayName}</strong><small>{selected.ingredientName} · {selected.strengthValue} {selected.strengthUnit} · {categoryLabels[selected.category]}</small></div></header><div className="medication-dose-form"><label><span>복용 수량</span><input type="number" min="0.01" max="1000" step="0.25" value={doseQuantity} onChange={event => setDoseQuantity(Number(event.target.value))} /><small>{selected.doseForm.toLowerCase().includes('capsule') ? '캡슐' : '정'}</small></label><label><span>복용 시각</span><input type="datetime-local" value={takenAt} onChange={event => setTakenAt(event.target.value)} /></label><label className="medication-note"><span>메모</span><input value={note} maxLength={500} placeholder="선택 사항" onChange={event => setNote(event.target.value)} /></label></div><button className="button primary" disabled={Boolean(savingKey)} onClick={() => void take(selected)}>{savingKey === selected.key ? '기록 중…' : `${doseQuantity || selected.defaultDoseQuantity} ${selected.doseForm.toLowerCase().includes('capsule') ? '캡슐' : '정'} 복용 기록`}</button><div className="pk-summary">{selected.pkProfiles.map(profile => <div key={`${profile.analyte}-${profile.sourceUrl}`}><strong>{profile.analyte}</strong><span>흡수 최고점 {peak(profile.tmaxMinMinutes, profile.tmaxMaxMinutes)}</span><span>반감기 {duration(profile.halfLifeMinMinutes, profile.halfLifeMaxMinutes)}</span>{profile.bioavailabilityMinPercent !== null && <span>경구 생체이용률 약 {profile.bioavailabilityMinPercent}%</span>}<a href={profile.sourceUrl} target="_blank" rel="noreferrer">근거 자료 <ExternalLink /></a></div>)}</div></article>}
      </div>
      <section className="card medication-log"><div className="card-head medication-log-head"><div><h2>약물 기록</h2><span className="meta">{readableDate(logDate)} · {dailyIntakes.length}회</span></div><label><span>기록 날짜</span><input type="date" value={logDate} onChange={event => setLogDate(event.target.value)} /></label></div>{historyLoading ? <p className="empty-copy">Loading history…</p> : dailyIntakes.length ? <div>{dailyIntakes.map(item => <div className="medication-log-row" key={item.id}><time>{new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.takenAt))}</time><span><strong>{item.productName}</strong><small>{item.doseQuantity} {item.doseUnit} · {item.ingredientAmount} {item.ingredientUnit}</small></span><button onClick={() => void remove(item.id)} aria-label={`${item.productName} 기록 삭제`}><Trash2 /></button></div>)}</div> : <p className="empty-copy">이 날짜에 기록된 약물이 없습니다.</p>}</section>
    </div>}
    {error && <p className="feature-error" role="alert">{error}</p>}
  </section>
}
