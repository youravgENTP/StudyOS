import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { listTasks } from '../tasks/api/tasks'
import type { Task } from '../tasks/types'
import {
  listEvents,
  onCalendarChanged,
} from './api/events'
import { CalendarWeek } from './components/CalendarWeek'
import {
  addDays,
  formatMonth,
  isoDate,
  startOfWeek,
} from './date'
import type { CalendarEvent } from './types'
import './calendar.css'

const WEEK_BEFORE = 3
const WEEK_AFTER = 3

export function CalendarPage() {
  const [selectedDate, setSelectedDate] =
    useState(new Date())

  const [tasks, setTasks] =
    useState<Task[]>([])

  const [events, setEvents] =
    useState<CalendarEvent[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const anchorWeek = useMemo(
    () => startOfWeek(new Date()),
    [],
  )

  const weeks = useMemo(
    () =>
      Array.from(
        {
          length:
            WEEK_BEFORE +
            WEEK_AFTER +
            1,
        },
        (_, index) =>
          addDays(
            anchorWeek,
            (index - WEEK_BEFORE) * 7,
          ),
      ),
    [anchorWeek],
  )

  const rangeStart = isoDate(weeks[0])

  const rangeEnd = isoDate(
    addDays(
      weeks[weeks.length - 1],
      6,
    ),
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)

      const [
        nextTasks,
        nextEvents,
      ] = await Promise.all([
        listTasks(),
        listEvents(
          rangeStart,
          rangeEnd,
        ),
      ])

      setTasks(nextTasks)
      setEvents(nextEvents)
      setError('')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not load calendar.',
      )
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    void load()

    return onCalendarChanged(() => {
      void load()
    })
  }, [load])

  const selectedKey =
    isoDate(selectedDate)

  const selectedTasks = tasks.filter(
    task =>
      task.dueDate === selectedKey,
  )

  const selectedEvents = events.filter(
    event =>
      event.startDate <= selectedKey &&
      event.endDate >= selectedKey,
  )

  return (
    <div className="page calendar-page">
      <div className="calendar-heading">
        <div>
          <div className="eyebrow">
            Plan across time
          </div>

          <h1 className="page-title">
            Calendar
          </h1>
        </div>

        <div className="calendar-current-month">
          {formatMonth(selectedDate)}
        </div>
      </div>

      {error && (
        <div className="feature-error">
          {error}
        </div>
      )}

      {loading ? (
        <p className="empty-copy">
          Loading calendar…
        </p>
      ) : (
        <div className="calendar-layout">
          <section className="calendar-weeks">
            {weeks.map(weekStart => (
              <CalendarWeek
                key={isoDate(weekStart)}
                weekStart={weekStart}
                selectedDate={selectedDate}
                tasks={tasks}
                events={events}
                onSelectDate={setSelectedDate}
              />
            ))}
          </section>

          <aside className="calendar-detail card">
            <div className="calendar-detail-head">
              <span>
                {new Intl.DateTimeFormat('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }).format(selectedDate)}
              </span>

              <strong>
                {selectedTasks.length +
                  selectedEvents.length}
              </strong>
            </div>

            <div className="calendar-detail-section">
              <h2>Tasks</h2>

              {selectedTasks.length ? (
                selectedTasks.map(task => (
                  <div
                    key={task.id}
                    className="calendar-detail-item"
                  >
                    <span
                      className={`calendar-detail-dot${task.isDday ? ' major' : ''}`}
                    />

                    <div>
                      <strong>
                        {task.title}
                      </strong>

                      <span className="meta">
                        {task.subject
                          ? task.subject.name
                          : task.category}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-copy">
                  No tasks due.
                </p>
              )}
            </div>

            <div className="calendar-detail-section">
              <h2>Events</h2>

              {selectedEvents.length ? (
                selectedEvents.map(event => (
                  <div
                    key={event.id}
                    className="calendar-detail-item"
                  >
                    <span
                      className={`calendar-detail-dot${event.isMajor ? ' major' : ''}`}
                    />

                    <div>
                      <strong>
                        {event.title}
                      </strong>

                      <span className="meta">
                        {event.allDay
                          ? 'All day'
                          : `${event.startTime?.slice(0, 5)} – ${event.endTime?.slice(0, 5)}`}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-copy">
                  No events.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}