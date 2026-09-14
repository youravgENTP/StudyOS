import { ExternalLink, Pill, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createDosageIntake, deleteDosageIntake, listDosageCatalog, listDosageIntakes, onDosageChanged } from './api'
import type { DosageCatalogItem, DosageIntake } from './types'
import './dosage.css'

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const dayRange = (date = new Date()) => { const from = new Date(date); from.setHours(0, 0, 0, 0); const to = new Date(from); to.setDate(to.getDate() + 1); return { from, to } }
const hours = (minutes: number) => Number.isInteger(minutes / 60) ? String(minutes / 60) : (minutes / 60).toFixed(1)
const duration = (min: number | null, max: number | null) => min === null ? '자료 없음' : min === max || max === null ? `${hours(min)}시간` : `${hours(min)}–${hours(max)}시간`
const peak = (min: number | null, max: number | null) => min === null ? '자료 없음' : `${min}–${max ?? min}분`

export function MedicationPanel() {
  const [catalog, setCatalog] = useState<DosageCatalogItem[]>([])
  const [intakes, setIntakes] = useState<DosageIntake[]>([])
  const [takenAt, setTakenAt] = useState(() => localInput(new Date()))
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { from, to } = dayRange()
    try {
      const [items, records] = await Promise.all([listDosageCatalog(), listDosageIntakes(from, to)])
      setCatalog(items); setIntakes(records); setError('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : '복용 기록을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    const off = onDosageChanged(() => void load())
    return () => { window.clearTimeout(timer); off() }
  }, [load])

  async function take(item: DosageCatalogItem) {
    const time = new Date(takenAt)
    if (Number.isNaN(time.getTime())) { setError('복용 시각을 선택해 주세요.'); return }
    setSavingKey(item.key); setError('')
    try { await createDosageIntake(item, time); setTakenAt(localInput(new Date())) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '복용 기록을 저장하지 못했습니다.') }
    finally { setSavingKey('') }
  }

  return <section className="dosage-medication-section">
    <div className="dosage-section-heading"><div><span className="eyebrow">Medication records</span><h2>Medications</h2><p>복용 사실을 기록합니다. 아래 약동학 값은 일반적인 참고 범위이며 개인별 효과나 혈중농도 측정값이 아닙니다.</p></div><label><span>복용 시각</span><input type="datetime-local" value={takenAt} onChange={event => setTakenAt(event.target.value)} /></label></div>
    {loading ? <p className="empty-copy">Loading medications…</p> : <div className="medication-layout">
      <div className="medication-catalog">
        {catalog.map(item => <article className="card medication-card" key={item.key}>
          <header><span><Pill /></span><div><strong>{item.displayName}</strong><small>{item.ingredientName} · {item.strengthValue} {item.strengthUnit}</small></div></header>
          <button className="button primary" disabled={Boolean(savingKey)} onClick={() => void take(item)}>{savingKey === item.key ? '기록 중…' : `1 ${item.doseForm.toLowerCase().includes('capsule') ? '캡슐' : '정'} 복용 기록`}</button>
          <div className="pk-summary">
            {item.pkProfiles.map(profile => <div key={`${profile.analyte}-${profile.sourceUrl}`}><strong>{profile.analyte}</strong><span>흡수 최고점 {peak(profile.tmaxMinMinutes, profile.tmaxMaxMinutes)}</span><span>반감기 {duration(profile.halfLifeMinMinutes, profile.halfLifeMaxMinutes)}</span>{profile.bioavailabilityMinPercent !== null && <span>경구 생체이용률 약 {profile.bioavailabilityMinPercent}%</span>}<a href={profile.sourceUrl} target="_blank" rel="noreferrer">근거 자료 <ExternalLink /></a></div>)}
          </div>
        </article>)}
      </div>
      <section className="card medication-log"><div className="card-head"><h2>오늘의 약물 기록</h2><span className="meta">{intakes.length}회</span></div>{intakes.length ? <div>{intakes.map(item => <div className="medication-log-row" key={item.id}><time>{new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.takenAt))}</time><span><strong>{item.productName}</strong><small>{item.doseQuantity} {item.doseUnit} · {item.ingredientAmount} {item.ingredientUnit}</small></span><button onClick={() => void deleteDosageIntake(item.id)} aria-label={`${item.productName} 기록 삭제`}><Trash2 /></button></div>)}</div> : <p className="empty-copy">오늘 기록된 약물이 없습니다.</p>}</section>
    </div>}
    {error && <p className="feature-error">{error}</p>}
  </section>
}
