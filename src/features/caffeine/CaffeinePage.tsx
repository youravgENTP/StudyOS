import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Coffee, Edit3, Plus, Pill, RotateCcw, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createCaffeineIntake, deleteCaffeineIntake, deleteCaffeinePreset, hideBuiltInCaffeinePreset, restoreBuiltInCaffeinePresets, saveCaffeinePreset } from './api/caffeine'
import { CaffeineChart } from './components/CaffeineChart'
import { DEFAULT_CAFFEINE_PRESETS } from './defaultPresets'
import { calculateLatestAllowableIntakeTime, GENERIC_SHOT_MG, nextBedtimeAt, totalLoadAt } from './model'
import type { CaffeinePreset, CaffeinePresetInput } from './types'
import { useCaffeine } from './useCaffeine'
import { useBedtime, useBedtimeResidualTargetMg, useCaffeineAxisFontSize, useCaffeineHalfLifeHours } from '../settings/preferences'
import './caffeine.css'
import './presets.css'
import './caffeine-header.css'
import './caffeine-layout-enhancements.css'

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const clock = (date: Date) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const datedClock = (date: Date) => new Intl.DateTimeFormat('en', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const dateKey = (date: Date) => date.toLocaleDateString('en-CA')
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
const shiftDateKey = (key: string, days: number) => { const date = dateFromKey(key); date.setDate(date.getDate() + days); return dateKey(date) }
const readableDate = (key: string) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(dateFromKey(key))
const LOWER_SPLIT_KEY = 'studyos:caffeine-lower-split'

export function CaffeinePage() {
  const { intakes, presets, loading, error } = useCaffeine()
  const axisFontSize = useCaffeineAxisFontSize()
  const bedtimeSetting = useBedtime()
  const halfLifeHours = useCaffeineHalfLifeHours()
  const bedtimeResidualTargetMg = useBedtimeResidualTargetMg()
  const [now, setNow] = useState(new Date())
  const [intakeTime, setIntakeTime] = useState(() => localInput(new Date()))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [editor, setEditor] = useState<CaffeinePreset | null | undefined>(undefined)
  const [logDate, setLogDate] = useState(() => dateKey(new Date()))
  const [lowerSplit, setLowerSplit] = useState(() => { const stored = Number(localStorage.getItem(LOWER_SPLIT_KEY)); return Number.isFinite(stored) && stored >= 55 && stored <= 75 ? stored : 67 })
  const lowerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const bedtime = useMemo(() => bedtimeSetting ? nextBedtimeAt(now, bedtimeSetting) : null, [bedtimeSetting, now])
  const current = totalLoadAt(intakes, now, halfLifeHours)
  const defaultOverrides = new Map(presets.filter(preset => preset.builtInKey).map(preset => [preset.builtInKey, preset]))
  const allPresets = [
    ...DEFAULT_CAFFEINE_PRESETS.flatMap(defaultPreset => {
      const override = defaultOverrides.get(defaultPreset.id)
      if (override?.hidden) return []
      return [{ ...(override ?? defaultPreset), id: defaultPreset.id, recordId: override?.id, builtIn: true }]
    }),
    ...presets.filter(preset => !preset.builtInKey && !preset.hidden),
  ]
  const referencePreset = DEFAULT_CAFFEINE_PRESETS.find(preset => preset.id === 'double-shot') ?? DEFAULT_CAFFEINE_PRESETS[0]
  const bedtimeLoad = bedtime ? totalLoadAt(intakes, bedtime, halfLifeHours) : null
  const latestAllowable = useMemo(() => bedtime ? calculateLatestAllowableIntakeTime({
    existingIntakes: intakes,
    hypotheticalDoseMg: referencePreset.caffeineMg,
    hypotheticalDurationMinutes: referencePreset.durationMinutes,
    bedtime,
    targetResidualMg: bedtimeResidualTargetMg,
    halfLifeHours,
  }) : null, [bedtime, bedtimeResidualTargetMg, halfLifeHours, intakes, referencePreset.caffeineMg, referencePreset.durationMinutes])

  async function take(preset: CaffeinePreset) {
    const startedAt = new Date(intakeTime)
    if (!intakeTime || Number.isNaN(startedAt.getTime())) {
      setFormError('Choose an intake time first.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await createCaffeineIntake({ source: preset.name, caffeineMg: preset.caffeineMg, startedAt: startedAt.toISOString(), durationMinutes: preset.durationMinutes, note: preset.kind })
      setIntakeTime(localInput(new Date()))
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Could not save the intake record.')
    } finally {
      setSaving(false)
    }
  }

  const todayKey = dateKey(now)
  const selectedIntakes = intakes.filter(intake => dateKey(new Date(intake.startedAt)) === logDate)
  const selectedTotal = selectedIntakes.reduce((sum, intake) => sum + intake.caffeineMg, 0)
  const overrideIds = presets.filter(preset => preset.builtInKey).map(preset => preset.id)

  function resizeLower(event: PointerEvent<HTMLButtonElement>) {
    if (!lowerRef.current) return
    const bounds = lowerRef.current.getBoundingClientRect()
    const next = Math.min(75, Math.max(55, (event.clientX - bounds.left) / bounds.width * 100))
    setLowerSplit(next)
    localStorage.setItem(LOWER_SPLIT_KEY, String(next))
  }

  function resizeLowerWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = Math.min(75, Math.max(55, lowerSplit + (event.key === 'ArrowLeft' ? -2 : 2)))
    setLowerSplit(next)
    localStorage.setItem(LOWER_SPLIT_KEY, String(next))
  }

  async function removePreset(preset: CaffeinePreset) {
    if (!confirm(`Delete “${preset.name}”?`)) return
    if (preset.builtIn) await hideBuiltInCaffeinePreset(preset)
    else await deleteCaffeinePreset(preset.id)
  }

  return <div className="page caffeine-page">
    <header className="caffeine-heading">
      <div><div className="eyebrow">Intake and decay estimate</div><h1 className="page-title">Caffeine intake</h1></div>
      <div className="caffeine-header-summary">
        <div className="summary-metric current"><strong className="tabular">{Math.round(current)}</strong><span>mg</span><small>Now</small></div>
        {bedtime && bedtimeLoad !== null
          ? <div className="summary-metric bedtime"><strong className="tabular">{Math.round(bedtimeLoad)}</strong><span>mg</span><small>At bedtime · {clock(bedtime)}</small></div>
          : <Link className="bedtime-prompt" to="/settings">Set a regular bedtime</Link>}
        {bedtime && <div className="latest-caffeine">{latestAllowable
          ? <>Latest {referencePreset.caffeineMg} mg · <strong className="tabular">{datedClock(latestAllowable)}</strong></>
          : <>No additional caffeine fits the bedtime target</>}</div>}
      </div>
    </header>

    <section className="caffeine-graph card">
      <div className="card-head"><h2>Caffeine curve</h2></div>
      {loading ? <p className="empty-copy">Loading…</p> : <CaffeineChart intakes={intakes} now={now} bedtime={bedtime} axisFontSize={axisFontSize} halfLifeHours={halfLifeHours} bedtimeResidualTargetMg={bedtimeResidualTargetMg} />}
      {error && <p className="feature-error">{error}</p>}
    </section>

    <div className="caffeine-lower" ref={lowerRef} style={{ gridTemplateColumns: `minmax(0, ${lowerSplit}fr) 10px minmax(0, ${100 - lowerSplit}fr)` } as CSSProperties}>
      <section className="card preset-panel">
        <div className="card-head">
          <div><h2>Add Intake Record</h2><span className="meta">Tap a preset to record it immediately</span></div>
          <label className="intake-time-control"><span>Intake time</span><input type="datetime-local" value={intakeTime} onChange={event => setIntakeTime(event.target.value)} /></label>
        </div>
        <div className="preset-grid">
          {allPresets.map(preset => <div className="preset-card-wrap" key={preset.id}>
            <button className="preset-card" disabled={saving} onClick={() => void take(preset)}>
              {preset.kind === 'drink' ? <Coffee /> : <Pill />}
              <strong>{preset.name}</strong>
              <span>{preset.id === 'double-shot' ? '2 × 75 mg · ' : ''}{preset.caffeineMg} mg · {preset.durationMinutes} min {preset.kind === 'drink' ? 'intake' : 'absorption'}</span>
            </button>
            <span className="preset-actions"><button onClick={() => setEditor(preset)} aria-label={`Edit ${preset.name}`}><Edit3 size={14} /></button><button onClick={() => void removePreset(preset)} aria-label={`Delete ${preset.name}`}><Trash2 size={14} /></button></span>
          </div>)}
          <button className="preset-card add-preset" onClick={() => setEditor(null)}><Plus /><strong>New preset</strong><span>Create a custom intake</span></button>
        </div>
        {formError && <p className="form-error">{formError}</p>}
      </section>
      <button className="caffeine-resizer" role="separator" aria-label="Resize preset and intake log panels" aria-orientation="vertical" aria-valuemin={55} aria-valuemax={75} aria-valuenow={Math.round(lowerSplit)} onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeLower(event) }} onKeyDown={resizeLowerWithKeyboard}><i /></button>
      <section className="card">
        <div className="card-head intake-log-head"><div><h2>Intake Log</h2><span className="meta">{logDate === todayKey ? 'Today' : readableDate(logDate)} · {selectedTotal.toFixed(1)} mg</span></div><div className="log-date-nav"><button onClick={() => setLogDate(shiftDateKey(logDate, -1))} aria-label="Previous day"><ChevronLeft /></button><span>{readableDate(logDate)}</span><label aria-label="Choose log date"><CalendarDays /><input type="date" value={logDate} max={todayKey} onChange={event => setLogDate(event.target.value)} /></label><button disabled={logDate >= todayKey} onClick={() => setLogDate(shiftDateKey(logDate, 1))} aria-label="Next day"><ChevronRight /></button></div></div>
        <div className="intake-list">
          {selectedIntakes.length ? selectedIntakes.map(intake => <div className="intake-row" key={intake.id}>
            <span className="intake-time tabular">{new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit' }).format(new Date(intake.startedAt))}</span>
            <div><strong>{intake.source}</strong><small>{intake.caffeineMg} mg · {intake.durationMinutes} min</small></div>
            <button onClick={() => void deleteCaffeineIntake(intake.id)} aria-label="Delete intake"><Trash2 size={16} /></button>
          </div>) : <p className="empty-copy">No intake records on this date.</p>}
        </div>
      </section>
    </div>

    <p className="caffeine-disclaimer">This is an estimated remaining body load based on intake and an average half-life, not a blood measurement or medical assessment.</p>
    {overrideIds.length > 0 && <button className="restore-presets" onClick={() => void restoreBuiltInCaffeinePresets(overrideIds)}><RotateCcw /> Restore default presets</button>}
    {editor !== undefined && <PresetEditor preset={editor} onClose={() => setEditor(undefined)} />}
  </div>
}

function PresetEditor({ preset, onClose }: { preset: CaffeinePreset | null; onClose: () => void }) {
  const [name, setName] = useState(preset?.name ?? '')
  const [mg, setMg] = useState(String(preset?.caffeineMg ?? GENERIC_SHOT_MG))
  const [kind, setKind] = useState<'drink' | 'tablet'>(preset?.kind ?? 'drink')
  const [duration, setDuration] = useState(String(preset?.durationMinutes ?? 60))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const input: CaffeinePresetInput = { name, caffeineMg: Number(mg), kind, durationMinutes: Number(duration), color: preset?.color ?? '#8a8f98' }
      await saveCaffeinePreset(input, preset?.builtIn ? preset.recordId : preset?.id, preset?.builtIn ? preset.id : undefined)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this preset.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!preset || !confirm(`Delete “${preset.name}”?`)) return
    try {
      if (preset.builtIn) await hideBuiltInCaffeinePreset(preset)
      else await deleteCaffeinePreset(preset.id)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete this preset.')
    }
  }

  return <div className="preset-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form className="preset-modal" onSubmit={submit}>
      <button type="button" className="preset-close" onClick={onClose} aria-label="Close"><X /></button>
      <h2>{preset ? 'Edit preset' : 'New preset'}</h2>
      <label>Name<input value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></label>
      <label>Caffeine<input type="number" min="1" max="1000" step="0.1" value={mg} onChange={event => setMg(event.target.value)} required /><span>mg</span></label>
      <label>Type<select value={kind} onChange={event => { const next = event.target.value as 'drink' | 'tablet'; setKind(next); setDuration(next === 'drink' ? '60' : '45') }}><option value="drink">Drink</option><option value="tablet">Tablet</option></select></label>
      <label>{kind === 'drink' ? 'Intake time' : 'Absorption'}<input type="number" min="1" max="240" value={duration} onChange={event => setDuration(event.target.value)} required /><span>min</span></label>
      {error && <p className="form-error">{error}</p>}
      <div className="preset-modal-actions">{preset && <button type="button" className="danger" onClick={() => void remove()}>Delete</button>}<span /><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
    </form>
  </div>
}
