import { ExternalLink, Pill, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
  const [error, setError] = useState('')

  const loadCatalog = useCallback(async () => {
    try { setCatalog(await listDosageCatalog()) }
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

  async function take(item: DosageCatalogItem) {
    const time = new Date(takenAt)
    if (Number.isNaN(time.getTime())) { setError('복용 시각을 선택해 주세요.'); return }
    setSavingKey(item.key); setError('')
    try {
      const created = await createDosageIntake(item, time)
      const createdDate = dateKey(time)
      setExposureIntakes(current => [created, ...current.filter(record => record.id !== created.id)])
      if (createdDate === logDate) setDailyIntakes(current => [created, ...current.filter(record => record.id !== created.id)])
      setLogDate(createdDate)
      setTakenAt(localInput(new Date()))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '복용 기록을 저장하지 못했습니다.')
    } finally {
      setSavingKey('')
    }
  }

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
    <div className="dosage-section-heading"><div><span className="eyebrow">Medication records</span><h2>Medications</h2><p>복용 사실을 기록합니다. 아래 약동학 값은 일반적인 참고 범위이며 개인별 효과나 혈중농도 측정값이 아닙니다.</p></div><label><span>복용 시각</span><input type="datetime-local" value={takenAt} onChange={event => setTakenAt(event.target.value)} /></label></div>
    <MedicationExposureChart catalog={catalog} intakes={exposureIntakes} now={now} axisFontSize={axisFontSize} loading={catalogLoading || exposureLoading} />
    {catalogLoading ? <p className="empty-copy">Loading medications…</p> : <div className="medication-layout">
      <div className="medication-catalog">
        {catalog.map(item => <article className="card medication-card" key={item.key}>
          <header><span><Pill /></span><div><strong>{item.displayName}</strong><small>{item.ingredientName} · {item.strengthValue} {item.strengthUnit}</small></div></header>
          <button className="button primary" disabled={Boolean(savingKey)} onClick={() => void take(item)}>{savingKey === item.key ? '기록 중…' : `1 ${item.doseForm.toLowerCase().includes('capsule') ? '캡슐' : '정'} 복용 기록`}</button>
          <div className="pk-summary">
            {item.pkProfiles.map(profile => <div key={`${profile.analyte}-${profile.sourceUrl}`}><strong>{profile.analyte}</strong><span>흡수 최고점 {peak(profile.tmaxMinMinutes, profile.tmaxMaxMinutes)}</span><span>반감기 {duration(profile.halfLifeMinMinutes, profile.halfLifeMaxMinutes)}</span>{profile.bioavailabilityMinPercent !== null && <span>경구 생체이용률 약 {profile.bioavailabilityMinPercent}%</span>}<a href={profile.sourceUrl} target="_blank" rel="noreferrer">근거 자료 <ExternalLink /></a></div>)}
          </div>
        </article>)}
      </div>
      <section className="card medication-log"><div className="card-head medication-log-head"><div><h2>약물 기록</h2><span className="meta">{readableDate(logDate)} · {dailyIntakes.length}회</span></div><label><span>기록 날짜</span><input type="date" value={logDate} onChange={event => setLogDate(event.target.value)} /></label></div>{historyLoading ? <p className="empty-copy">Loading history…</p> : dailyIntakes.length ? <div>{dailyIntakes.map(item => <div className="medication-log-row" key={item.id}><time>{new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.takenAt))}</time><span><strong>{item.productName}</strong><small>{item.doseQuantity} {item.doseUnit} · {item.ingredientAmount} {item.ingredientUnit}</small></span><button onClick={() => void remove(item.id)} aria-label={`${item.productName} 기록 삭제`}><Trash2 /></button></div>)}</div> : <p className="empty-copy">이 날짜에 기록된 약물이 없습니다.</p>}</section>
    </div>}
    {error && <p className="feature-error" role="alert">{error}</p>}
  </section>
}
