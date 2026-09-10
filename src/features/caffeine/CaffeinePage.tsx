import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Coffee, Edit3, Plus, Pill, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createCaffeineIntake, deleteCaffeineIntake, deleteCaffeinePreset, saveCaffeinePreset } from './api/caffeine'
import { CaffeineChart } from './components/CaffeineChart'
import { calculateRecommendedCutoff, DEFAULT_CUTOFF_BUFFER_HOURS, GENERIC_AMERICANO_MG, GENERIC_ESPRESSO_SHOT_MG, nextBedtimeAt, totalLoadAt } from './model'
import type { CaffeinePreset, CaffeinePresetInput } from './types'
import { useCaffeine } from './useCaffeine'
import { useBedtime, useCaffeineAxisFontSize, useCaffeineHalfLifeHours } from '../settings/preferences'
import './caffeine.css'
import './presets.css'

const builtIns: CaffeinePreset[] = [
  { id: 'espresso', name: '에스프레소 1샷', caffeineMg: GENERIC_ESPRESSO_SHOT_MG, kind: 'drink', durationMinutes: 15, color: '#8a8f98', builtIn: true },
  { id: 'americano', name: '아메리카노 1잔', caffeineMg: GENERIC_AMERICANO_MG, kind: 'drink', durationMinutes: 60, color: '#8a8f98', builtIn: true },
  { id: 'tablet-50', name: '카페인 50 mg', caffeineMg: 50, kind: 'tablet', durationMinutes: 45, color: '#7fa7d8', builtIn: true },
  { id: 'tablet-100', name: '카페인 100 mg', caffeineMg: 100, kind: 'tablet', durationMinutes: 45, color: '#9b83cf', builtIn: true },
]

const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const clock = (date: Date) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const datedClock = (date: Date) => new Intl.DateTimeFormat('en', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)

export function CaffeinePage() {
  const { intakes, presets, loading, error } = useCaffeine()
  const axisFontSize = useCaffeineAxisFontSize()
  const bedtimeSetting = useBedtime()
  const halfLifeHours = useCaffeineHalfLifeHours()
  const [now, setNow] = useState(new Date())
  const [intakeTime, setIntakeTime] = useState(() => localInput(new Date()))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [editor, setEditor] = useState<CaffeinePreset | null | undefined>(undefined)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const bedtime = useMemo(() => bedtimeSetting ? nextBedtimeAt(now, bedtimeSetting) : null, [bedtimeSetting, now])
  const cutoff = useMemo(() => bedtime ? calculateRecommendedCutoff({ bedtime, bufferHours: DEFAULT_CUTOFF_BUFFER_HOURS }) : null, [bedtime])
  const current = totalLoadAt(intakes, now, halfLifeHours)
  const allPresets = [...builtIns, ...presets]

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

  const todayKey = now.toLocaleDateString('en-CA')
  const todayIntakes = intakes.filter(intake => new Date(intake.startedAt).toLocaleDateString('en-CA') === todayKey)

  return <div className="page caffeine-page">
    <header className="caffeine-heading">
      <div><div className="eyebrow">Intake and decay estimate</div><h1 className="page-title">Caffeine intake</h1></div>
      <div className="current-caffeine"><strong className="tabular">{Math.round(current)}</strong><span>mg now</span></div>
    </header>

    <div className="caffeine-cutoff">
      {bedtime && cutoff ? <><span>Recommended caffeine cutoff</span><strong className="tabular">{datedClock(cutoff)}</strong><small>Bedtime {clock(bedtime)} · {DEFAULT_CUTOFF_BUFFER_HOURS} h buffer</small></> : <><span>Recommended caffeine cutoff</span><Link to="/settings">Set a regular bedtime in Settings to enable guidance.</Link></>}
    </div>

    <section className="caffeine-graph card">
      <div className="card-head"><h2>Caffeine curve</h2></div>
      {loading ? <p className="empty-copy">Loading…</p> : <CaffeineChart intakes={intakes} now={now} bedtime={bedtime} axisFontSize={axisFontSize} halfLifeHours={halfLifeHours} />}
      {error && <p className="feature-error">{error}</p>}
    </section>

    <div className="caffeine-lower">
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
              <span>{preset.id === 'americano' ? '2 shots · ' : ''}{preset.caffeineMg} mg · {preset.durationMinutes} min {preset.kind === 'drink' ? 'intake' : 'absorption'}</span>
            </button>
            {!preset.builtIn && <button className="preset-edit" onClick={() => setEditor(preset)} aria-label={`Edit ${preset.name}`}><Edit3 size={14} /></button>}
          </div>)}
          <button className="preset-card add-preset" onClick={() => setEditor(null)}><Plus /><strong>New preset</strong><span>Create a custom intake</span></button>
        </div>
        {formError && <p className="form-error">{formError}</p>}
      </section>

      <section className="card">
        <div className="card-head"><div><h2>Intake Log</h2><span className="meta">Today · {todayIntakes.reduce((sum, intake) => sum + intake.caffeineMg, 0).toFixed(1)} mg</span></div></div>
        <div className="intake-list">
          {todayIntakes.length ? todayIntakes.map(intake => <div className="intake-row" key={intake.id}>
            <span className="intake-time tabular">{new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit' }).format(new Date(intake.startedAt))}</span>
            <div><strong>{intake.source}</strong><small>{intake.caffeineMg} mg · {intake.durationMinutes} min</small></div>
            <button onClick={() => void deleteCaffeineIntake(intake.id)} aria-label="Delete intake"><Trash2 size={16} /></button>
          </div>) : <p className="empty-copy">No intake records today.</p>}
        </div>
      </section>
    </div>

    <p className="caffeine-disclaimer">This is an estimated remaining body load based on intake and an average half-life, not a blood measurement or medical assessment.</p>
    {editor !== undefined && <PresetEditor preset={editor} onClose={() => setEditor(undefined)} />}
  </div>
}

function PresetEditor({ preset, onClose }: { preset: CaffeinePreset | null; onClose: () => void }) {
  const [name, setName] = useState(preset?.name ?? '')
  const [mg, setMg] = useState(String(preset?.caffeineMg ?? GENERIC_ESPRESSO_SHOT_MG))
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
      await saveCaffeinePreset(input, preset?.id)
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
      await deleteCaffeinePreset(preset.id)
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
