import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { calculateRecommendedCutoff, DEFAULT_CUTOFF_BUFFER_HOURS, nextBedtimeAt, totalLoadAt } from '../caffeine/model'
import { useCaffeine } from '../caffeine/useCaffeine'
import { useBedtime, useCaffeineHalfLifeHours } from '../settings/preferences'

const clock = (date: Date) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const datedClock = (date: Date) => new Intl.DateTimeFormat('en', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)

export function DashboardCaffeineCard() {
  const { intakes } = useCaffeine()
  const bedtimeSetting = useBedtime()
  const halfLifeHours = useCaffeineHalfLifeHours()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const bedtime = useMemo(() => bedtimeSetting ? nextBedtimeAt(now, bedtimeSetting) : null, [bedtimeSetting, now])
  const cutoff = bedtime ? calculateRecommendedCutoff({ bedtime, bufferHours: DEFAULT_CUTOFF_BUFFER_HOURS }) : null
  const current = totalLoadAt(intakes, now, halfLifeHours)

  return <section className="card caffeine-card">
    <div className="card-head"><h2>Caffeine intake</h2><Link className="meta" to="/caffeine">Details</Link></div>
    <div className="metric tabular">{Math.round(current)} <small>mg now</small></div>
    {bedtime && cutoff
      ? <div className="metric-note">Recommended cutoff <strong className="tabular">{datedClock(cutoff)}</strong> · bedtime {clock(bedtime)}</div>
      : <div className="metric-note"><Link to="/settings">Set bedtime to enable cutoff guidance</Link></div>}
  </section>
}
