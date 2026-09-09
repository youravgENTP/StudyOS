import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Plus } from 'lucide-react'
import {
  listCompletions,
  listHabits,
  onHabitsChanged,
} from './api/habits'
import { HabitCard } from './components/HabitCard'
import type {
  Habit,
  HabitCompletion,
} from './types'
import './habits.css'

function iso(date: Date) {
  return date.toLocaleDateString('en-CA')
}

function mondayIndex(date: Date) {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

function completionRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monday = new Date(today)
  monday.setDate(
    today.getDate() - mondayIndex(today),
  )

  const start = new Date(monday)
  start.setDate(
    monday.getDate() - 16 * 7,
  )

  return {
    from: iso(start),
    to: iso(today),
  }
}

export function HabitsPage() {
  const [habits, setHabits] =
    useState<Habit[]>([])

  const [
    completions,
    setCompletions,
  ] = useState<HabitCompletion[]>([])

  const [creating, setCreating] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const load = useCallback(async () => {
    try {
      const range = completionRange()

      const [
        nextHabits,
        nextCompletions,
      ] = await Promise.all([
        listHabits(),
        listCompletions(
          range.from,
          range.to,
        ),
      ])

      setHabits(nextHabits)
      setCompletions(nextCompletions)
      setError('')

      if (nextHabits.length > 0) {
        setCreating(false)
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not load habits.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()

    return onHabitsChanged(() =>
      void load(),
    )
  }, [load])

  return (
    <div className="page habits-page">
      <div className="eyebrow">
        Maintain behavior over time
      </div>

      <h1 className="page-title">
        Habits
      </h1>

      {error && (
        <div className="feature-error">
          {error}
        </div>
      )}

      {loading ? (
        <p className="empty-copy">
          Loading habits…
        </p>
      ) : (
        <div className="habit-cards">
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              completions={completions}
            />
          ))}

          {habits.length === 0 && (
            <HabitCard
              habit={null}
              completions={completions}
              initiallyEditing
            />
          )}

          {habits.length > 0 &&
            creating && (
              <HabitCard
                habit={null}
                completions={completions}
                initiallyEditing
                onCancelNew={() =>
                  setCreating(false)
                }
              />
            )}

          {habits.length > 0 &&
            !creating && (
              <button
                className="habit-add-card"
                onClick={() =>
                  setCreating(true)
                }
                aria-label="Add habit"
              >
                <Plus size={24} />
              </button>
            )}
        </div>
      )}
    </div>
  )
}