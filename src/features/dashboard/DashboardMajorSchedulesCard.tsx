import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllEvents, onCalendarChanged } from '../calendar/api/events'
import type { CalendarEvent } from '../calendar/types'
import { ddayLabel } from './date'

export function DashboardMajorSchedulesCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA')
      setEvents((await listAllEvents()).filter(event => event.isMajor && event.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.startTime ?? '').localeCompare(b.startTime ?? '')).slice(0, 5))
      setError('')
    } catch { setError('Major schedules unavailable.') }
  }, [])
  useEffect(() => { void load(); return onCalendarChanged(() => void load()) }, [load])

  return <section className="card upcoming-card"><div className="card-head"><div><h2>Major Schedules</h2><span className="dashboard-card-caption">Important Calendar events</span></div><Link className="meta" to="/schedules">View all</Link></div>{error ? <p className="meta">{error}</p> : events.length ? <div className="upcoming-list">{events.map(event => <Link className="upcoming" to="/schedules" key={event.id}><span>{event.title}</span><strong className="tabular">{ddayLabel(event.startDate)}</strong><small>{event.startDate}{event.startTime ? ` · ${event.startTime.slice(0, 5)}` : ''}</small></Link>)}</div> : <p className="meta">No upcoming major schedules.</p>}</section>
}
