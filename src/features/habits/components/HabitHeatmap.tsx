import type {
  Habit,
  HabitCompletion,
} from '../types'

function iso(date: Date) {
  return date.toLocaleDateString('en-CA')
}

function mondayIndex(date: Date) {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

function buildWeeks(createdAt: string) {
  const created = new Date(createdAt)

  const monthStart = new Date(
    created.getFullYear(),
    created.getMonth(),
    1,
  )

  monthStart.setHours(0, 0, 0, 0)

  const firstMonday = new Date(monthStart)
  firstMonday.setDate(
    monthStart.getDate() -
      mondayIndex(monthStart),
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentMonday = new Date(today)
  currentMonday.setDate(
    today.getDate() - mondayIndex(today),
  )

  const weekCount =
    Math.floor(
      (currentMonday.getTime() -
        firstMonday.getTime()) /
        (7 * 86_400_000),
    ) + 1

  return Array.from(
    { length: weekCount },
    (_, weekIndex) =>
      Array.from(
        { length: 7 },
        (_, dayIndex) => {
          const date = new Date(firstMonday)

          date.setDate(
            firstMonday.getDate() +
              weekIndex * 7 +
              dayIndex,
          )

          return date
        },
      ),
  )
}

function monthLabel(
  week: Date[],
  previousWeek?: Date[],
) {
  const firstOfMonth = week.find(
    date => date.getDate() === 1,
  )

  if (firstOfMonth) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
    }).format(firstOfMonth)
  }

  if (!previousWeek) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
    }).format(week[0])
  }

  return ''
}

export function HabitHeatmap({
  habit,
  completions,
}: {
  habit: Habit
  completions: HabitCompletion[]
}) {
  const weeks = buildWeeks(habit.createdAt)

  const completed = new Set(
    completions
      .filter(
        completion =>
          completion.habitId === habit.id,
      )
      .map(completion => completion.date),
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="habit-heatmap-scroll">
      <div className="habit-heatmap-shell">
        <div className="habit-month-spacer" />

        <div className="habit-months">
          {weeks.map((week, index) => (
            <span key={iso(week[0])}>
              {monthLabel(
                week,
                index
                  ? weeks[index - 1]
                  : undefined,
              )}
            </span>
          ))}
        </div>

        <div className="habit-weekday-labels">
          <span>M</span>
          <span>T</span>
          <span>W</span>
          <span>T</span>
          <span>F</span>
          <span>S</span>
          <span>S</span>
        </div>

        <div className="habit-heatmap">
          {weeks.flatMap(week =>
            week.map((date, dayIndex) => {
              const key = iso(date)

              const scheduled =
                habit.weekdays.includes(dayIndex)

              const isComplete =
                completed.has(key)

              const future =
                date.getTime() >
                today.getTime()

              return (
                <span
                  key={key}
                  className={[
                    'habit-cell',
                    scheduled
                      ? 'scheduled'
                      : 'unscheduled',
                    isComplete
                      ? 'complete'
                      : '',
                    future ? 'future' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    isComplete
                      ? {
                          background:
                            habit.color,
                        }
                      : undefined
                  }
                  title={`${key}${
                    scheduled
                      ? isComplete
                        ? ' · complete'
                        : ' · scheduled'
                      : ' · not scheduled'
                  }`}
                />
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}