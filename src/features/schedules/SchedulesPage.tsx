import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Archive, CalendarRange, ChevronDown, Edit3, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { listProjects, listSubjects, listWorkstreams } from '../tasks/api/tasks'
import { taskCategoryLabels, type Project, type Subject, type TaskCategory, type Workstream } from '../tasks/types'
import { deleteEvent, listAllEvents, moveEventsToSubcategory, onCalendarChanged } from '../calendar/api/events'
import { archiveScheduleSubcategory, createScheduleSubcategory, listScheduleSubcategories, updateScheduleSubcategory } from '../calendar/api/subcategories'
import { CalendarComposer } from '../calendar/components/CalendarComposer'
import type { CalendarEvent, ScheduleSubcategory } from '../calendar/types'
import './schedules.css'

type GroupBy = 'category' | 'subcategory' | 'subject' | 'month' | 'importance' | 'none'
const colors = ['#719ce3', '#a88bd8', '#d4a15c', '#6eae91', '#89909a', '#bf5af2']
const eventDate = (event: CalendarEvent) => event.startDate === event.endDate ? event.startDate : `${event.startDate} – ${event.endDate}`
const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function scheduleUrgency(event: CalendarEvent, now: Date): 'live' | 'tomorrow' | null {
  const today = dateKey(now)
  const nextDay = new Date(now); nextDay.setDate(nextDay.getDate() + 1)
  if (event.startDate <= today && event.endDate >= today) {
    if (event.allDay) return 'live'
    const startsAt = new Date(`${event.startDate}T${event.startTime ?? '00:00'}`)
    const endsAt = new Date(`${event.endDate}T${event.endTime ?? '23:59'}`)
    if (now >= startsAt && now <= endsAt) return 'live'
  }
  return event.startDate === dateKey(nextDay) ? 'tomorrow' : null
}

function compareSchedules(left: CalendarEvent, right: CalendarEvent, now: Date) {
  const today = dateKey(now)
  const rank = (event: CalendarEvent) => {
    if (scheduleUrgency(event, now) === 'live') return 0
    if (event.startDate === today) return 1
    if (scheduleUrgency(event, now) === 'tomorrow') return 2
    return event.endDate < today ? 4 : 3
  }
  const rankDifference = rank(left) - rank(right)
  if (rankDifference) return rankDifference
  if (rank(left) === 4) return right.startDate.localeCompare(left.startDate) || (right.startTime ?? '').localeCompare(left.startTime ?? '')
  return left.startDate.localeCompare(right.startDate) || (left.startTime ?? '').localeCompare(right.startTime ?? '') || left.title.localeCompare(right.title)
}

function groupLabel(event: CalendarEvent, groupBy: GroupBy) {
  if (groupBy === 'category') return taskCategoryLabels[event.category]
  if (groupBy === 'subcategory') return event.subcategory?.name ?? 'Uncategorized'
  if (groupBy === 'subject') return event.subject?.name ?? 'No subject'
  if (groupBy === 'month') return event.startDate.slice(0, 7)
  if (groupBy === 'importance') return event.isMajor ? 'Important' : 'Regular'
  return 'All schedules'
}

export function SchedulesPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [subcategories, setSubcategories] = useState<ScheduleSubcategory[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('category')
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [subcategoryFilter, setSubcategoryFilter] = useState<Set<string>>(new Set())
  const [rangeOpen, setRangeOpen] = useState(false)
  const [subcategoryOpen, setSubcategoryOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(undefined)
  const [manageOpen, setManageOpen] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    try {
      const [nextEvents, nextSubcategories, nextProjects, nextWorkstreams, nextSubjects] = await Promise.all([listAllEvents(), listScheduleSubcategories(), listProjects(), listWorkstreams(), listSubjects()])
      setEvents(nextEvents); setSubcategories(nextSubcategories); setProjects(nextProjects); setWorkstreams(nextWorkstreams); setSubjects(nextSubjects); setError('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load schedules.') }
  }, [])

  useEffect(() => { void load(); return onCalendarChanged(() => void load()) }, [load])
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer) }, [])

  const availableSubcategories = subcategories.filter(item => category === 'all' || item.category === category)
  const filtered = useMemo(() => events.filter(event => (!query || event.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && (!from || event.endDate >= from) && (!to || event.startDate <= to) && (category === 'all' || event.category === category) && (!subcategoryFilter.size || subcategoryFilter.has(event.subcategoryId ?? '__none__'))).sort((left, right) => compareSchedules(left, right, now)), [category, events, from, now, query, subcategoryFilter, to])
  const groups = useMemo(() => Object.entries(filtered.reduce<Record<string, CalendarEvent[]>>((result, event) => { const label = groupLabel(event, groupBy); (result[label] ??= []).push(event); return result }, {})).sort(([, left], [, right]) => compareSchedules(left[0], right[0], now)), [filtered, groupBy, now])

  function toggle(id: string) { setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  async function removeSelected() { if (!selected.size || !confirm(`Delete ${selected.size} schedule(s)?`)) return; await Promise.all([...selected].map(deleteEvent)); setSelected(new Set()) }
  async function moveSelected(value: string) { const subcategory = subcategories.find(item => item.id === value); await moveEventsToSubcategory([...selected], value === '__none__' ? null : value, subcategory?.category); setSelected(new Set()) }
  function toggleSubcategory(value: string) { setSubcategoryFilter(current => { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next }) }
  function setRange(preset: 'all' | 'upcoming' | 'month') {
    const today = dateKey(new Date())
    if (preset === 'all') { setFrom(''); setTo('') }
    if (preset === 'upcoming') { setFrom(today); setTo('') }
    if (preset === 'month') { const current = new Date(); setFrom(dateKey(new Date(current.getFullYear(), current.getMonth(), 1))); setTo(dateKey(new Date(current.getFullYear(), current.getMonth() + 1, 0))) }
    setRangeOpen(false)
  }
  const rangeLabel = !from && !to ? 'All dates' : from && to ? `${from} – ${to}` : from ? `From ${from}` : `Until ${to}`

  return <div className="page schedules-page">
    <header className="schedules-heading"><div><div className="eyebrow">Browse and manage</div><h1 className="page-title">Schedules</h1></div><div><button className="button" onClick={() => setManageOpen(true)}><SlidersHorizontal /> Subcategories</button><button className="button primary" onClick={() => setEditing(null)}><Plus /> Schedule</button></div></header>
    <section className="card schedule-toolbar">
      <input type="search" placeholder="Search schedules" value={query} onChange={event => setQuery(event.target.value)} />
      <label>Category<select value={category} onChange={event => { setCategory(event.target.value as TaskCategory | 'all'); setSubcategoryFilter(new Set()) }}><option value="all">All</option>{Object.entries(taskCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="schedule-filter-control"><span>Subcategory</span><button type="button" onClick={() => { setSubcategoryOpen(value => !value); setRangeOpen(false) }}>{subcategoryFilter.size ? `${subcategoryFilter.size} selected` : 'All'}<ChevronDown /></button>{subcategoryOpen && <div className="schedule-filter-popover subcategory-filter-popover"><button type="button" className="filter-clear" onClick={() => setSubcategoryFilter(new Set())}>Select all</button><label><input type="checkbox" checked={subcategoryFilter.has('__none__')} onChange={() => toggleSubcategory('__none__')} /><i />Uncategorized</label>{availableSubcategories.map(item => <label key={item.id}><input type="checkbox" checked={subcategoryFilter.has(item.id)} onChange={() => toggleSubcategory(item.id)} /><i style={{ background: item.color }} /><span>{category === 'all' ? `${taskCategoryLabels[item.category]} / ` : ''}{item.name}</span></label>)}</div>}</div>
      <div className="schedule-filter-control"><span>Date</span><button type="button" onClick={() => { setRangeOpen(value => !value); setSubcategoryOpen(false) }}><CalendarRange />{rangeLabel}<ChevronDown /></button>{rangeOpen && <div className="schedule-filter-popover date-filter-popover"><div><button type="button" onClick={() => setRange('all')}>All</button><button type="button" onClick={() => setRange('upcoming')}>Upcoming</button><button type="button" onClick={() => setRange('month')}>This month</button></div><label>Start<input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} /></label><label>End<input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} /></label><button type="button" className="button primary" onClick={() => setRangeOpen(false)}>Apply</button></div>}</div>
      <label>Group by<select value={groupBy} onChange={event => setGroupBy(event.target.value as GroupBy)}><option value="category">Category</option><option value="subcategory">Subcategory</option><option value="subject">Subject</option><option value="month">Month</option><option value="importance">Importance</option><option value="none">No grouping</option></select></label>
    </section>
    {selected.size > 0 && <div className="schedule-bulk"><strong>{selected.size} selected</strong><select defaultValue="" onChange={event => void moveSelected(event.target.value)}><option value="" disabled>Move to subcategory…</option><option value="__none__">Uncategorized</option>{subcategories.map(item => <option key={item.id} value={item.id}>{taskCategoryLabels[item.category]} / {item.name}</option>)}</select><button onClick={() => void removeSelected()}><Trash2 /> Delete</button></div>}
    {error && <p className="feature-error">{error}</p>}
    <div className="schedule-groups">{groups.map(([label, items]) => <section className="card schedule-group" key={label}><header><h2>{label}</h2><span>{items?.length ?? 0}</span></header>{items?.map(event => { const urgency = scheduleUrgency(event, now); return <div className="schedule-row" key={event.id}><input type="checkbox" checked={selected.has(event.id)} onChange={() => toggle(event.id)} aria-label={`Select ${event.title}`} /><i style={{ background: event.subcategory?.color ?? '#bf5af2' }} /><button className="schedule-title" onClick={() => setEditing(event)}><span className="schedule-title-line">{urgency === 'live' && <span className="schedule-live" aria-label="Live now"><i />LIVE</span>}{urgency === 'tomorrow' && <i className="schedule-tomorrow" title="Tomorrow" aria-label="Tomorrow" />}<strong>{event.title}</strong></span><small>{eventDate(event)}{event.startTime ? ` · ${event.startTime.slice(0, 5)}` : ''}</small></button><span>{taskCategoryLabels[event.category]}{event.subcategory ? ` / ${event.subcategory.name}` : ''}</span>{event.subject && <span>{event.subject.name}</span>}<button onClick={() => setEditing(event)} aria-label={`Edit ${event.title}`}><Edit3 /></button></div> })}</section>)}</div>
    {!filtered.length && !error && <div className="card empty-state"><CalendarRange /><h2>No matching schedules</h2><p>Change the filters or create a schedule.</p></div>}
    {editing !== undefined && <CalendarComposer date={editing?.startDate ?? new Date().toLocaleDateString('en-CA')} projects={projects} workstreams={workstreams} subjects={subjects} subcategories={subcategories} editing={editing ? { kind: 'event', value: editing } : null} onClose={() => { setEditing(undefined); void load() }} />}
    {manageOpen && <SubcategoryManager items={subcategories} onClose={() => setManageOpen(false)} />}
  </div>
}

function SubcategoryManager({ items, onClose }: { items: ScheduleSubcategory[]; onClose: () => void }) {
  const [editing, setEditing] = useState<ScheduleSubcategory | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<TaskCategory>('study')
  const [color, setColor] = useState(colors[0])
  const [error, setError] = useState('')
  function edit(item: ScheduleSubcategory) { setEditing(item); setName(item.name); setCategory(item.category); setColor(item.color) }
  function reset() { setEditing(null); setName(''); setColor(colors[0]) }
  async function submit(event: FormEvent) { event.preventDefault(); try { if (editing) await updateScheduleSubcategory(editing.id, { name, category: editing.category, color }); else await createScheduleSubcategory({ name, category, color }); reset() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save subcategory.') } }
  return <div className="subcategory-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="subcategory-manager"><button className="manager-close" onClick={onClose}><X /></button><h2>Subcategories</h2><form onSubmit={submit}><label>Category<select value={category} disabled={Boolean(editing)} onChange={event => setCategory(event.target.value as TaskCategory)}>{Object.entries(taskCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Subcategory name<input placeholder="Name" value={name} onChange={event => setName(event.target.value)} required maxLength={80} /></label><label>Color<input type="color" value={color} onChange={event => setColor(event.target.value)} /></label><div className="subcategory-form-actions"><button className="button primary">{editing ? 'Save' : 'Add'}</button>{editing && <button type="button" className="button" onClick={reset}>Cancel</button>}</div></form>{error && <p className="form-error">{error}</p>}<div className="subcategory-list-head"><strong>{taskCategoryLabels[category]}</strong><span>{items.filter(item => item.category === category).length}</span></div><div className="subcategory-rows">{items.filter(item => item.category === category).map(item => <div key={item.id}><i style={{ background: item.color }} /><strong>{item.name}</strong><span>{taskCategoryLabels[item.category]}</span><button onClick={() => edit(item)}><Edit3 /></button><button onClick={() => void archiveScheduleSubcategory(item.id)}><Archive /></button></div>)}</div></section></div>
}
