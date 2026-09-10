import type { CSSProperties } from 'react'
import type { Project, Task, Workstream } from '../../tasks/types'
import { isEntityVisibleOnDate } from '../../tasks/model'
import type { CalendarEvent } from '../types'
import { addDays, isoDate, sameDate } from '../date'

type Selection = { kind: 'task'; value: Task } | { kind: 'event'; value: CalendarEvent }
const categoryColor = { study: '#719ce3', personal: '#a88bd8', errands: '#d4a15c', development: '#6eae91', other: '#89909a' }

export function CalendarMonth({ start, dayCount, tasks, workstreams, projects, events, onCreate, onSelect, onSelectWorkstream }: {
  start: Date; dayCount: number; tasks: Task[]; workstreams: Workstream[]; projects: Project[]; events: CalendarEvent[]; onCreate: (date: Date) => void; onSelect: (selection: Selection) => void; onSelectWorkstream: (workstream: Workstream) => void
}) {
  const today = new Date()
  const days = Array.from({ length: dayCount }, (_, index) => addDays(start, index))
  return <div className="month-grid">{days.map(date => {
    const key = isoDate(date)
    const dayTasks = tasks.filter(task => isEntityVisibleOnDate(task, key))
    const dayWorkstreams = workstreams.filter(workstream => isEntityVisibleOnDate(workstream, key))
    const dayEvents = events.filter(event => event.startDate <= key && event.endDate >= key)
    const items = [
      ...dayEvents.map(value => ({ kind: 'event' as const, value })),
      ...dayWorkstreams.map(value => ({ kind: 'workstream' as const, value })),
      ...dayTasks.map(value => ({ kind: 'task' as const, value })),
    ]
    return <div key={key} className={`month-day${sameDate(date, today) ? ' today' : ''}`} onClick={() => onCreate(date)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') onCreate(date) }}>
      <div className="month-date"><span>{date.getDate() === 1 ? `${date.getMonth() + 1}월 ${date.getDate()}일` : date.getDate()}</span></div>
      <div className="month-items">{items.slice(0, 4).map(item => {
        if (item.kind === 'event') {
          const color = item.value.subject?.color ?? '#bf5af2'; const time = !item.value.allDay ? item.value.startTime?.slice(0, 5) : ''
          return <button key={`event-${item.value.id}`} className={`month-entry event${item.value.isMajor ? ' major' : ''}`} style={{ '--entry-color': color } as CSSProperties} onClick={event => { event.stopPropagation(); onSelect(item) }}><i />{time && <small>{time}</small>}<span>{item.value.title}</span></button>
        }
        if (item.kind === 'workstream') {
          const entity = item.value
          const project = projects.find(candidate => candidate.id === entity.projectId)
          const color = entity.subject?.color ?? categoryColor[project?.category ?? entity.category]
          const rangeStart = entity.startDate ?? entity.dueDate
          const spanClass = entity.startDate ? ` spanning${key === rangeStart ? ' span-start' : ''}${key === entity.dueDate ? ' span-end' : ''}` : ' deadline-only'
          return <button key={`workstream-${entity.id}`} className={`month-entry workstream${entity.isDday ? ' major' : ''}${spanClass}`} style={{ '--entry-color': color } as CSSProperties} onClick={event => { event.stopPropagation(); onSelectWorkstream(entity) }}><i /><span>{entity.title}</span></button>
        }
        const entity = item.value
        const rangeStart = entity.startDate ?? entity.dueDate
        const spanClass = entity.startDate ? ` spanning${key === rangeStart ? ' span-start' : ''}${key === entity.dueDate ? ' span-end' : ''}` : ' deadline-only'
        return <button key={`task-${entity.id}`} className={`month-entry task${entity.isDday ? ' major' : ''}${spanClass}`} style={{ '--entry-color': categoryColor[entity.category] } as CSSProperties} onClick={event => { event.stopPropagation(); onSelect({ kind: 'task', value: entity }) }}><i /><span>{entity.title}</span></button>
      })}{items.length > 4 && <span className="month-more">{items.length - 4}개 더 보기</span>}</div>
    </div>
  })}</div>
}
