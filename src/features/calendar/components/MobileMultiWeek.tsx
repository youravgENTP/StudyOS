import { Plus } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import type { Project, Section, Task, Workstream } from '../../tasks/types'
import { taskCategoryLabels } from '../../tasks/types'
import { addDays, isoDate, sameDate } from '../date'
import type { CalendarEvent } from '../types'
import type { CalendarFilters } from './CalendarMonth'

type Selection = { kind: 'task'; value: Task } | { kind: 'event'; value: CalendarEvent }
type MobileItem =
  | { kind: 'event'; value: CalendarEvent; start: string; end: string; color: string }
  | { kind: 'workstream'; value: Workstream; start: string; end: string; color: string }
  | { kind: 'task'; value: Task; start: string; end: string; color: string }

const categoryColor = { study: '#719ce3', personal: '#a88bd8', errands: '#d4a15c', development: '#6eae91', other: '#89909a' }

function itemLabel(item: MobileItem, sections: Section[]) {
  if (item.kind === 'event') return item.value.subcategory?.name ?? item.value.subject?.name ?? taskCategoryLabels[item.value.category]
  if (item.kind === 'workstream') return `Workstream · ${taskCategoryLabels[item.value.category]}`
  return `${item.value.sectionId ? sections.find(section => section.id === item.value.sectionId)?.title ?? 'Section' : 'Ungrouped'} · Task · ${taskCategoryLabels[item.value.category]}`
}

function itemTime(item: MobileItem) {
  if (item.kind !== 'event' || item.value.allDay) return 'All day'
  const start = item.value.startTime?.slice(0, 5) ?? ''
  const end = item.value.endTime?.slice(0, 5) ?? ''
  return end ? `${start}–${end}` : start
}

export function MobileMultiWeek({ start, dayCount, tasks, workstreams, sections, projects, events, filters, onCreate, onSelect, onSelectWorkstream }: {
  start: Date; dayCount: number; tasks: Task[]; workstreams: Workstream[]; sections: Section[]; projects: Project[]; events: CalendarEvent[]; filters: CalendarFilters; onCreate: (date: Date) => void; onSelect: (selection: Selection) => void; onSelectWorkstream: (workstream: Workstream) => void
}) {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const items = useMemo<MobileItem[]>(() => [
    ...events
      .filter(item => filters.sources.has('event') && filters.categories.has(item.category) && !filters.hiddenSubcategories.has(item.subcategoryId ?? `uncategorized:${item.category}`))
      .map(value => ({ kind: 'event' as const, value, start: value.startDate, end: value.endDate, color: value.subcategory?.color ?? value.subject?.color ?? '#bf5af2' })),
    ...workstreams
      .filter(item => item.showOnCalendar && filters.sources.has('workstream') && filters.categories.has(item.category))
      .map(value => ({ kind: 'workstream' as const, value, start: value.startDate ?? value.dueDate, end: value.dueDate, color: value.subject?.color ?? categoryColor[projects.find(project => project.id === value.projectId)?.category ?? value.category] })),
    ...tasks
      .filter(item => item.showOnCalendar && filters.sources.has('task') && filters.categories.has(item.category))
      .map(value => ({ kind: 'task' as const, value, start: value.startDate ?? value.dueDate, end: value.dueDate, color: categoryColor[value.category] })),
  ], [events, filters, projects, tasks, workstreams])

  const visibleSelectedDate = selectedDate && selectedDate >= isoDate(start) && selectedDate <= isoDate(addDays(start, dayCount - 1)) ? selectedDate : null

  function activate(item: MobileItem) {
    if (item.kind === 'workstream') onSelectWorkstream(item.value)
    else if (item.kind === 'event') onSelect({ kind: 'event', value: item.value })
    else onSelect({ kind: 'task', value: item.value })
  }

  return <div className="mobile-multi-week">
    {Array.from({ length: Math.ceil(dayCount / 7) }, (_, weekIndex) => {
      const weekStart = addDays(start, weekIndex * 7)
      const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
      const expanded = Boolean(visibleSelectedDate && days.some(day => isoDate(day) === visibleSelectedDate))
      const selected = expanded ? days.find(day => isoDate(day) === visibleSelectedDate)! : null
      const selectedItems = selected ? items
        .filter(item => item.start <= isoDate(selected) && item.end >= isoDate(selected))
        .sort((a, b) => itemTime(a).localeCompare(itemTime(b)) || a.value.title.localeCompare(b.value.title)) : []

      return <section className={`mobile-calendar-week${expanded ? ' expanded' : ''}`} key={isoDate(weekStart)}>
        <div className="mobile-week-overview">
          {days.map(date => {
            const key = isoDate(date)
            const dayItems = items.filter(item => item.start <= key && item.end >= key)
            const active = visibleSelectedDate === key
            return <button type="button" className={`mobile-overview-day${sameDate(date, today) ? ' today' : ''}${active ? ' selected' : ''}`} key={key} aria-expanded={active} onClick={() => setSelectedDate(current => current === key ? null : key)}>
              <span>{date.getDate() === 1 ? `${date.getMonth() + 1}/${date.getDate()}` : date.getDate()}</span>
              <i className="mobile-day-markers" aria-label={`${dayItems.length} items`}>
                {dayItems.slice(0, 3).map(item => <b key={`${item.kind}-${item.value.id}`} style={{ '--marker-color': item.color } as CSSProperties} />)}
              </i>
            </button>
          })}
        </div>
        {selected && <div className="mobile-day-agenda">
          <header><div><strong>{new Intl.DateTimeFormat('ko', { month: 'long', day: 'numeric', weekday: 'long' }).format(selected)}</strong><span>{selectedItems.length}개 항목</span></div><button type="button" onClick={() => onCreate(selected)} aria-label={`${isoDate(selected)} 새 일정`}><Plus /></button></header>
          {selectedItems.length ? <div className="mobile-agenda-list">{selectedItems.map(item => <button type="button" className={`mobile-agenda-item ${item.kind}`} key={`${item.kind}-${item.value.id}`} onClick={() => activate(item)}>
            <i style={{ '--item-color': item.color } as CSSProperties} />
            <span className="mobile-agenda-time">{itemTime(item)}</span>
            <span><strong>{item.value.title}</strong><small>{itemLabel(item, sections)}{item.start !== item.end ? ` · ${item.start}–${item.end}` : ''}</small></span>
          </button>)}</div> : <button type="button" className="mobile-agenda-empty" onClick={() => onCreate(selected)}><Plus /> 이 날짜에 일정 추가</button>}
        </div>}
      </section>
    })}
  </div>
}
