import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listProjects, listSubjects, listTasks, listWorkstreams, onTasksChanged } from '../tasks/api/tasks'
import type { Project, Subject, Task, Workstream } from '../tasks/types'
import { listEvents, onCalendarChanged } from './api/events'
import { CalendarComposer } from './components/CalendarComposer'
import { CalendarMonth } from './components/CalendarMonth'
import { addDays, formatCalendarRange, isoDate, startOfWeekOn } from './date'
import { calendarPreferences } from './preferences'
import type { CalendarEvent } from './types'
import './calendar.css'
import './calendar-ten-week.css'
import './calendar-navigation.css'

type Selection = { kind: 'task'; value: Task } | { kind: 'event'; value: CalendarEvent }
const WEEKS_VISIBLE = 10
const DAYS_VISIBLE = WEEKS_VISIBLE * 7
const currentRangeStart = () => startOfWeekOn(new Date(), calendarPreferences.weekStartsOn)

export function CalendarPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [workstreams, setWorkstreams] = useState<Workstream[]>([])
  const [rangeStart, setRangeStart] = useState(currentRangeStart)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [composerDate, setComposerDate] = useState<Date | null>(null)
  const [editing, setEditing] = useState<Selection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const rangeEnd = useMemo(() => addDays(rangeStart, DAYS_VISIBLE - 1), [rangeStart])
  const rangeStartKey = isoDate(rangeStart)
  const rangeEndKey = isoDate(rangeEnd)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextProjects, nextWorkstreams, nextTasks, nextEvents, nextSubjects] = await Promise.all([listProjects(), listWorkstreams(), listTasks(), listEvents(rangeStartKey, rangeEndKey), listSubjects()])
      setProjects(nextProjects)
      setWorkstreams(nextWorkstreams)
      setTasks(nextTasks)
      setEvents(nextEvents)
      setSubjects(nextSubjects)
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

  const weekdayLabels = calendarPreferences.weekStartsOn === 0 ? ['일', '월', '화', '수', '목', '금', '토'] : ['월', '화', '수', '목', '금', '토', '일']

  return <div className="calendar-page">
    <header className="calendar-toolbar">
      <div><h1>{formatCalendarRange(rangeStart, rangeEnd)}</h1><span>{WEEKS_VISIBLE}주 보기</span></div>
      <div className="calendar-controls">
        <div className="calendar-week-shift">
          <button onClick={() => setRangeStart(addDays(rangeStart, -7))} aria-label="이전 1주"><ChevronUp /></button>
          <button onClick={() => setRangeStart(addDays(rangeStart, 7))} aria-label="다음 1주"><ChevronDown /></button>
        </div>
        <button className="today-button" onClick={() => setRangeStart(currentRangeStart())}>오늘</button>
        <button className="new-button" onClick={() => createAt(new Date())} aria-label="새 일정"><Plus /></button>
      </div>
    </header>
    {error && <div className="calendar-error">{error}</div>}
    <div className="weekday-header">{weekdayLabels.map(day => <span key={day}>{day}</span>)}</div>
    {loading ? <div className="calendar-loading">달력을 불러오는 중…</div> : <CalendarMonth start={rangeStart} dayCount={DAYS_VISIBLE} tasks={tasks} workstreams={workstreams} projects={projects} events={events} onCreate={createAt} onSelect={select} onSelectWorkstream={workstream => navigate(`/tasks/${workstream.projectId}`)} />}
    {composerDate && <CalendarComposer key={`${isoDate(composerDate)}-${editing?.kind ?? 'new'}-${editing?.value.id ?? ''}`} date={isoDate(composerDate)} projects={projects} workstreams={workstreams} subjects={subjects} editing={editing} onClose={close} />}
  </div>
}
