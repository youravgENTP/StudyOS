import { useState, type CSSProperties } from 'react'
import type { Project, Task, TaskCategory, Workstream } from '../../tasks/types'
import type { CalendarEvent } from '../types'
import { addDays, isoDate, sameDate } from '../date'

type Selection = { kind: 'task'; value: Task } | { kind: 'event'; value: CalendarEvent }
type SourceKind = 'event' | 'workstream' | 'task'
type CalendarItem =
  | { kind: 'event'; value: CalendarEvent; start: string; end: string }
  | { kind: 'workstream'; value: Workstream; start: string; end: string }
  | { kind: 'task'; value: Task; start: string; end: string }

export type CalendarFilters = { categories: Set<TaskCategory>; sources: Set<SourceKind>; hiddenSubcategories: Set<string> }

const categoryColor = { study: '#719ce3', personal: '#a88bd8', errands: '#d4a15c', development: '#6eae91', other: '#89909a' }

function colorFor(item: CalendarItem, projects: Project[]) {
  if (item.kind === 'event') return item.value.subcategory?.color ?? item.value.subject?.color ?? '#bf5af2'
  if (item.kind === 'workstream') {
    const project = projects.find(candidate => candidate.id === item.value.projectId)
    return item.value.subject?.color ?? categoryColor[project?.category ?? item.value.category]
  }
  return categoryColor[item.value.category]
}

function itemKey(item: CalendarItem) { return `${item.kind}:${item.value.id}` }

function Week({ start, items, projects, highlightedItem, onHighlight, onCreate, onSelect, onSelectWorkstream }: {
  start: Date; items: CalendarItem[]; projects: Project[]; highlightedItem: string | null; onHighlight: (key: string | null) => void; onCreate: (date: Date) => void; onSelect: (selection: Selection) => void; onSelectWorkstream: (workstream: Workstream) => void
}) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const weekStart = isoDate(days[0]); const weekEnd = isoDate(days[6])
  const isBar = (item: CalendarItem) => item.start < item.end || (item.kind === 'event' && item.value.displayStyle === 'bar')
  const spanning = items.filter(item => isBar(item) && item.start <= weekEnd && item.end >= weekStart)
    .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end))
  const laneEnds: string[] = []
  const segments = spanning.map(item => {
    const segmentStart = item.start < weekStart ? weekStart : item.start
    const segmentEnd = item.end > weekEnd ? weekEnd : item.end
    const startColumn = days.findIndex(day => isoDate(day) === segmentStart)
    const endColumn = days.findIndex(day => isoDate(day) === segmentEnd)
    let lane = laneEnds.findIndex(end => end < segmentStart)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = segmentEnd
    return { item, lane, startColumn, endColumn, startsHere: item.start >= weekStart, endsHere: item.end <= weekEnd }
  })
  const singlesByDay = days.map(day => {
    const key = isoDate(day)
    return items.filter(item => !isBar(item) && item.start === item.end && item.start === key)
      .sort((a, b) => a.kind === 'event' && b.kind !== 'event' ? -1 : 0)
  })
  const maxSingles = Math.max(0, ...singlesByDay.map(day => day.length))
  const height = Math.max(92, 38 + laneEnds.length * 23 + maxSingles * 23 + 9)

  function activate(item: CalendarItem) {
    if (item.kind === 'workstream') onSelectWorkstream(item.value)
    else if (item.kind === 'event') onSelect({ kind: 'event', value: item.value })
    else onSelect({ kind: 'task', value: item.value })
  }

  function entry(item: CalendarItem, spanningBar = false) {
    const color = colorFor(item, projects)
    const timed = item.kind === 'event' && !item.value.allDay ? item.value.startTime?.slice(0, 5) : ''
    const major = item.kind === 'event' ? item.value.isMajor : item.value.isDday
    return <button className={`month-entry ${item.kind}${major ? ' major' : ''}${spanningBar ? ' calendar-span' : ''}${highlightedItem === itemKey(item) ? ' related-highlight' : ''}`} style={{ '--entry-color': color } as CSSProperties} onClick={event => { event.stopPropagation(); activate(item) }}><i />{timed && <small>{timed}</small>}<span>{item.value.title}</span></button>
  }

  return <div className="calendar-week" style={{ minHeight: height }}>
    <div className="calendar-week-days">{days.map((date, index) => {
      const key = isoDate(date)
      return <div key={key} className={`month-day${sameDate(date, today) ? ' today' : ''}`} onClick={() => onCreate(date)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') onCreate(date) }}>
        <div className="month-date"><span>{date.getDate() === 1 ? `${date.getMonth() + 1}월 ${date.getDate()}일` : date.getDate()}</span></div>
        <div className="month-items" style={{ paddingTop: laneEnds.length * 23 }}>{singlesByDay[index].map(item => <span className="calendar-single" key={`${item.kind}-${item.value.id}`}>{entry(item)}</span>)}</div>
      </div>
    })}</div>
    <div className="calendar-spans" aria-label="여러 날 일정">{segments.map(({ item, lane, startColumn, endColumn, startsHere, endsHere }) => <span key={`${item.kind}-${item.value.id}`} className={`calendar-span-position${startsHere ? ' starts-here' : ''}${endsHere ? ' ends-here' : ''}`} style={{ '--span-left': startColumn, '--span-width': endColumn - startColumn + 1, '--span-lane': lane } as CSSProperties} onMouseEnter={() => onHighlight(itemKey(item))} onMouseLeave={() => onHighlight(null)} onFocus={() => onHighlight(itemKey(item))} onBlur={() => onHighlight(null)}>{entry(item, true)}</span>)}</div>
  </div>
}

export function CalendarMonth({ start, dayCount, tasks, workstreams, projects, events, filters, onCreate, onSelect, onSelectWorkstream }: {
  start: Date; dayCount: number; tasks: Task[]; workstreams: Workstream[]; projects: Project[]; events: CalendarEvent[]; filters: CalendarFilters; onCreate: (date: Date) => void; onSelect: (selection: Selection) => void; onSelectWorkstream: (workstream: Workstream) => void
}) {
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null)
  const items: CalendarItem[] = [
    ...events.filter(item => filters.sources.has('event') && filters.categories.has(item.category) && !filters.hiddenSubcategories.has(item.subcategoryId ?? `uncategorized:${item.category}`)).map(value => ({ kind: 'event' as const, value, start: value.startDate, end: value.endDate })),
    ...workstreams.filter(item => item.showOnCalendar && filters.sources.has('workstream') && filters.categories.has(item.category)).map(value => ({ kind: 'workstream' as const, value, start: value.startDate ?? value.dueDate, end: value.dueDate })),
    ...tasks.filter(item => item.showOnCalendar && filters.sources.has('task') && filters.categories.has(item.category)).map(value => ({ kind: 'task' as const, value, start: value.startDate ?? value.dueDate, end: value.dueDate })),
  ]
  return <div className="month-grid">{Array.from({ length: Math.ceil(dayCount / 7) }, (_, week) => <Week key={isoDate(addDays(start, week * 7))} start={addDays(start, week * 7)} items={items} projects={projects} highlightedItem={highlightedItem} onHighlight={setHighlightedItem} onCreate={onCreate} onSelect={onSelect} onSelectWorkstream={onSelectWorkstream} />)}</div>
}
