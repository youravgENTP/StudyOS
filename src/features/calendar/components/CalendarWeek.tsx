import type { Task } from '../../tasks/types'
import type { CalendarEvent } from '../types'
import {
  addDays,
  isoDate,
  sameDate,
} from '../date'

export function CalendarWeek({
  weekStart,
  selectedDate,
  tasks,
  events,
  onSelectDate,
}: {
  weekStart: Date
  selectedDate: Date
  tasks: Task[]
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
}) {
  const today = new Date()

  const days = Array.from(
    { length: 7 },
    (_, index) => addDays(weekStart, index),
  )

  return (
    <div className="calendar-week">
      {days.map(date => {
        const key = isoDate(date)

        const dayTasks = tasks.filter(
          task => task.dueDate === key,
        )

        const dayEvents = events.filter(
          event =>
            event.startDate <= key &&
            event.endDate >= key,
        )

        return (
          <button
            key={key}
            type="button"
            className={[
              'calendar-day',
              sameDate(date, today) ? 'today' : '',
              sameDate(date, selectedDate) ? 'selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectDate(date)}
          >
            <div className="calendar-day-head">
              <span>
                {new Intl.DateTimeFormat('en', {
                  weekday: 'short',
                }).format(date)}
              </span>

              <strong>
                {date.getDate()}
              </strong>
            </div>

            <div className="calendar-day-items">
              {dayTasks.slice(0, 2).map(task => (
                <span
                  key={`task-${task.id}`}
                  className={`calendar-item task${task.isDday ? ' major' : ''}`}
                >
                  {task.title}
                </span>
              ))}

              {dayEvents.slice(0, 2).map(event => (
                <span
                  key={`event-${event.id}`}
                  className={`calendar-item event${event.isMajor ? ' major' : ''}`}
                >
                  {event.title}
                </span>
              ))}

              {dayTasks.length + dayEvents.length > 4 && (
                <span className="calendar-more">
                  +{dayTasks.length + dayEvents.length - 4}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}