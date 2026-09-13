import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsLeft, Plus } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { AppShellContext } from '../../components/layout/AppShell'
import { listProjects, listSubjects, listTasks, listWorkstreams, onTasksChanged } from '../tasks/api/tasks'
import { taskCategoryLabels, type Project, type Subject, type Task, type TaskCategory, type Workstream } from '../tasks/types'
import { useWeekStartsOn } from '../settings/preferences'
import { listEvents, onCalendarChanged } from './api/events'
import { listScheduleSubcategories } from './api/subcategories'
import { CalendarComposer } from './components/CalendarComposer'
import { CalendarMonth, type CalendarFilters } from './components/CalendarMonth'
import { addDays, formatCalendarRange, isoDate, startOfWeekOn } from './date'
import type { CalendarEvent, ScheduleSubcategory } from './types'
import './calendar.css'
import './calendar-ten-week.css'
import './calendar-navigation.css'

type Selection = { kind: 'task'; value: Task } | { kind: 'event'; value: CalendarEvent }
const WEEKS_VISIBLE = 10
const DAYS_VISIBLE = WEEKS_VISIBLE * 7

export function CalendarPage() {
  const navigate = useNavigate()
  const { calendarToolsOpen, setCalendarToolsOpen } = useOutletContext<AppShellContext>()
  const weekStartsOn = useWeekStartsOn()
  const [projects, setProjects] = useState<Project[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [rangeAnchor, setRangeAnchor] = useState(() => new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subcategories, setSubcategories] = useState<ScheduleSubcategory[]>([])
  const [composerDate, setComposerDate] = useState<Date | null>(null)
  const [editing, setEditing] = useState<Selection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Set<TaskCategory>>(() => new Set(Object.keys(taskCategoryLabels) as TaskCategory[]))
  const [sources, setSources] = useState<CalendarFilters['sources']>(() => new Set(['event', 'workstream', 'task']))
  const [hiddenSubcategories, setHiddenSubcategories] = useState<Set<string>>(() => new Set())
  const rangeStart = useMemo(() => startOfWeekOn(rangeAnchor, weekStartsOn), [rangeAnchor, weekStartsOn])
  const rangeEnd = useMemo(() => addDays(rangeStart, DAYS_VISIBLE - 1), [rangeStart])
  const rangeStartKey = isoDate(rangeStart)
  const rangeEndKey = isoDate(rangeEnd)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextProjects, nextWorkstreams, nextTasks, nextEvents, nextSubjects, nextSubcategories] = await Promise.all([listProjects(), listWorkstreams(), listTasks(), listEvents(rangeStartKey, rangeEndKey), listSubjects(), listScheduleSubcategories()])
      setProjects(nextProjects)
      setWorkstreams(nextWorkstreams)
      setTasks(nextTasks)
      setEvents(nextEvents)
      setSubjects(nextSubjects)
      setSubcategories(nextSubcategories)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '달력을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [rangeEndKey, rangeStartKey])

  useEffect(() => {
    void load()
    const offCalendar = onCalendarChanged(() => void load())
    const offTasks = onTasksChanged(() => void load())
    return () => { offCalendar(); offTasks() }
  }, [load])

  function createAt(date: Date) {
    setEditing(null)
    setComposerDate(date)
  }

  function select(item: Selection) {
    setEditing(item)
    const key = item.kind === 'task' ? item.value.dueDate : item.value.startDate
    setComposerDate(new Date(`${key}T00:00:00`))
  }

  function close() {
    setComposerDate(null)
    setEditing(null)
    void load()
  }

  const weekdayLabels = (weekStartsOn === 0
    ? [{ label: '일', day: 0 }, { label: '월', day: 1 }, { label: '화', day: 2 }, { label: '수', day: 3 }, { label: '목', day: 4 }, { label: '금', day: 5 }, { label: '토', day: 6 }]
    : [{ label: '월', day: 1 }, { label: '화', day: 2 }, { label: '수', day: 3 }, { label: '목', day: 4 }, { label: '금', day: 5 }, { label: '토', day: 6 }, { label: '일', day: 0 }])

  function toggleCategory(category: TaskCategory) {
    setCategories(current => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next })
  }

  function toggleSource(source: 'event' | 'workstream' | 'task') {
    setSources(current => { const next = new Set(current); if (next.has(source)) next.delete(source); else next.add(source); return next })
  }

  function toggleSubcategory(id: string) {
    setHiddenSubcategories(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  return <div className="calendar-page">
    {calendarToolsOpen && <aside className="calendar-sidebar">
      <div className="calendar-sidebar-heading"><h2>캘린더</h2><button onClick={() => setCalendarToolsOpen(false)} aria-label="Show main StudyOS sidebar"><ChevronsLeft /></button></div>
      <fieldset><legend>표시할 항목</legend>
        {([['event', '일정'], ['workstream', 'Workstreams'], ['task', 'Tasks']] as const).map(([value, label]) => <label key={value}><input type="checkbox" checked={sources.has(value)} onChange={() => toggleSource(value)} /><span>{label}</span></label>)}
      </fieldset>
      <fieldset><legend>카테고리</legend>
        {(Object.entries(taskCategoryLabels) as [TaskCategory, string][]).map(([value, label]) => <div className="calendar-category-group" key={value}><label><input type="checkbox" checked={categories.has(value)} onChange={() => toggleCategory(value)} /><i className={`category-dot ${value}`} /><span>{label}</span></label><div className="calendar-subcategory-list">{subcategories.filter(item => item.category === value).map(item => <label key={item.id}><input type="checkbox" checked={!hiddenSubcategories.has(item.id)} onChange={() => toggleSubcategory(item.id)} /><i style={{ background: item.color }} /><span>{item.name}</span></label>)}<label><input type="checkbox" checked={!hiddenSubcategories.has(`uncategorized:${value}`)} onChange={() => toggleSubcategory(`uncategorized:${value}`)} /><i /><span>Uncategorized</span></label></div></div>)}
      </fieldset>
    </aside>}
    <section className="calendar-main">
    <header className="calendar-toolbar">
      <div><h1>{formatCalendarRange(rangeStart, rangeEnd)}</h1><span>{WEEKS_VISIBLE}주 보기</span></div>
      <div className="calendar-controls">
        <div className="calendar-week-shift">
          <button onClick={() => setRangeAnchor(addDays(rangeStart, -7))} aria-label="이전 1주"><ChevronUp /></button>
          <button onClick={() => setRangeAnchor(addDays(rangeStart, 7))} aria-label="다음 1주"><ChevronDown /></button>
        </div>
        <button className="today-button" onClick={() => setRangeAnchor(new Date())}>오늘</button>
        <button className="new-button" onClick={() => createAt(new Date())} aria-label="새 일정"><Plus /></button>
      </div>
    </header>
    {error && <div className="calendar-error">{error}</div>}
    <div className="weekday-header">{weekdayLabels.map(({ label, day }) => <span key={day} className={day === 0 ? 'sunday' : day === 6 ? 'saturday' : ''}>{label}</span>)}</div>
    {loading ? <div className="calendar-loading">달력을 불러오는 중…</div> : <CalendarMonth start={rangeStart} dayCount={DAYS_VISIBLE} tasks={tasks} workstreams={workstreams} projects={projects} events={events} filters={{ categories, sources, hiddenSubcategories }} onCreate={createAt} onSelect={select} onSelectWorkstream={workstream => navigate(`/tasks/${workstream.projectId}`)} />}
    </section>
    {composerDate && <CalendarComposer key={`${isoDate(composerDate)}-${editing?.kind ?? 'new'}-${editing?.value.id ?? ''}`} date={isoDate(composerDate)} projects={projects} workstreams={workstreams} subjects={subjects} subcategories={subcategories} editing={editing} onClose={close} />}
  </div>
}
