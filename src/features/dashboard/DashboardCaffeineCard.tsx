import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_CAFFEINE_PRESETS } from '../caffeine/defaultPresets'
import { calculateLatestAllowableIntakeTime, nextBedtimeAt, totalLoadAt } from '../caffeine/model'
import { useCaffeine } from '../caffeine/useCaffeine'
import { useBedtime, useBedtimeResidualTargetMg, useCaffeineHalfLifeHours } from '../settings/preferences'

const clock = (date: Date) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const datedClock = (date: Date) => new Intl.DateTimeFormat('en', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)

export function DashboardCaffeineCard() {
  const { intakes } = useCaffeine()
  const bedtimeSetting = useBedtime()
  const halfLifeHours = useCaffeineHalfLifeHours()
  const bedtimeResidualTargetMg = useBedtimeResidualTargetMg()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const bedtime = useMemo(() => bedtimeSetting ? nextBedtimeAt(now, bedtimeSetting) : null, [bedtimeSetting, now])
  const referencePreset = DEFAULT_CAFFEINE_PRESETS.find(preset => preset.id === 'double-shot') ?? DEFAULT_CAFFEINE_PRESETS[0]
  const cutoff = bedtime ? calculateLatestAllowableIntakeTime({ existingIntakes: intakes, hypotheticalDoseMg: referencePreset.caffeineMg, hypotheticalDurationMinutes: referencePreset.durationMinutes, bedtime, targetResidualMg: bedtimeResidualTargetMg, halfLifeHours }) : null
  const current = totalLoadAt(intakes, now, halfLifeHours)
  const bedtimeLoad = bedtime ? totalLoadAt(intakes, bedtime, halfLifeHours) : null

  return <section className="card caffeine-card">
    <div className="card-head"><h2>Caffeine intake</h2><Link className="meta" to="/caffeine">Details</Link></div>
    <div className="metric tabular">{Math.round(current)} <small>mg now</small></div>
    {bedtime && bedtimeLoad !== null
      ? <><div className="metric-note"><strong>{Math.round(bedtimeLoad)} mg</strong> at bedtime {clock(bedtime)}</div><div className="metric-note">{cutoff ? <>Latest {referencePreset.caffeineMg} mg <strong className="tabular">{datedClock(cutoff)}</strong></> : 'No additional caffeine fits the bedtime target'}</div></>
      : <div className="metric-note"><Link to="/settings">Set bedtime to enable cutoff guidance</Link></div>}
  </section>
}
