import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import {
  archiveHabit,
  saveHabit,
  setHabitComplete,
} from '../api/habits'
import {
  shortWeekdays,
  type Habit,
  type HabitCompletion,
} from '../types'
import { HabitHeatmap } from './HabitHeatmap'

const DEFAULT_COLOR = '#6f8f78'
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function iso(date: Date) {
  return date.toLocaleDateString('en-CA')
}

function mondayIndex(date: Date) {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

export function HabitCard({
  habit,
  completions,
  initiallyEditing = false,
  onCancelNew,
}: {
  habit: Habit | null
  completions: HabitCompletion[]
  initiallyEditing?: boolean
  onCancelNew?: () => void
}) {
  const isNew = habit === null

  const [editing, setEditing] =
    useState(initiallyEditing || isNew)

  const [name, setName] = useState(
    habit?.name ?? 'New Habit',
  )

  const [color, setColor] = useState(
    habit?.color ?? DEFAULT_COLOR,
  )

  const [days, setDays] = useState<number[]>(
    habit?.weekdays ?? ALL_DAYS,
  )

  const [saving, setSaving] =
    useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    if (!habit) return

    setName(habit.name)
    setColor(habit.color)
    setDays(habit.weekdays)
  }, [habit])

  const today = new Date()
  const todayKey = iso(today)
  const todayDay = mondayIndex(today)

  const scheduledToday = habit
    ? habit.weekdays.includes(todayDay)
    : false

  const completeToday = habit
    ? completions.some(
        completion =>
          completion.habitId === habit.id &&
          completion.date === todayKey,
      )
    : false

  function toggleDay(day: number) {
    setDays(current =>
      current.includes(day)
        ? current.filter(value => value !== day)
        : [...current, day].sort(),
    )
  }

  function cancelEdit() {
    if (isNew) {
      onCancelNew?.()
      return
    }

    setName(habit.name)
    setColor(habit.color)
    setDays(habit.weekdays)
    setError('')
    setEditing(false)
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!name.trim() || days.length === 0) {
      return
    }

    setSaving(true)
    setError('')

    try {
      await saveHabit(
        name,
        color,
        days,
        habit?.id,
      )

      if (!isNew) {
        setEditing(false)
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not save habit.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!habit) return

    if (
      window.confirm(
        `Archive “${habit.name}”?`,
      )
    ) {
      await archiveHabit(habit.id)
    }
  }

  if (editing) {
    return (
      <section className="card habit-card editing">
        <form
          className="habit-card-form"
          onSubmit={submit}
        >
          <div className="habit-card-edit-head">
            <input
              className="habit-name-input"
              value={name}
              onChange={event =>
                setName(event.target.value)
              }
              maxLength={100}
              autoFocus={isNew}
              required
            />

            <input
              className="habit-color-input"
              type="color"
              value={color}
              onChange={event =>
                setColor(event.target.value)
              }
              aria-label="Habit color"
            />
          </div>

          <div className="habit-days">
            {shortWeekdays.map(
              (day, index) => (
                <button
                  key={index}
                  type="button"
                  className={
                    days.includes(index)
                      ? 'active'
                      : ''
                  }
                  style={
                    days.includes(index)
                      ? {
                          background:
                            color,
                          borderColor:
                            color,
                        }
                      : undefined
                  }
                  onClick={() =>
                    toggleDay(index)
                  }
                >
                  {day}
                </button>
              ),
            )}
          </div>

          <div className="habit-card-form-actions">
            <button
              className="button primary"
              disabled={
                saving ||
                days.length === 0 ||
                !name.trim()
              }
            >
              {saving
                ? 'Saving…'
                : isNew
                  ? 'Add habit'
                  : 'Save'}
            </button>

            <button
              type="button"
              className="text-button"
              onClick={cancelEdit}
            >
              Cancel
            </button>

            {!isNew && (
              <button
                type="button"
                className="text-button danger"
                onClick={remove}
              >
                Archive
              </button>
            )}
          </div>

          {error && (
            <p className="feature-error">
              {error}
            </p>
          )}
        </form>
      </section>
    )
  }

  if (!habit) return null

  return (
    <section className="card habit-card">
      <div className="habit-card-head">
        <div className="habit-card-title">
          <i
            style={{
              background: habit.color,
            }}
          />

          <div>
            <h2>{habit.name}</h2>

            <span className="meta">
              {habit.weekdays
                .map(
                  day =>
                    shortWeekdays[day],
                )
                .join(' · ')}
            </span>
          </div>
        </div>

        <div className="habit-card-controls">
          {scheduledToday && (
            <button
              type="button"
              className={`habit-complete-button${completeToday ? ' complete' : ''}`}
              style={
                completeToday
                  ? {
                      background: habit.color,
                      borderColor: habit.color,
                    }
                  : undefined
              }
              onClick={() =>
                void setHabitComplete(
                  habit.id,
                  todayKey,
                  !completeToday,
                )
              }
              aria-label={
                completeToday
                  ? `Mark ${habit.name} incomplete for today`
                  : `Mark ${habit.name} complete for today`
              }
            >
              ✓
            </button>
          )}

          <button
            className="text-button"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        </div>
      </div>

      <HabitHeatmap
        habit={habit}
        completions={completions}
      />
    </section>
  )
}