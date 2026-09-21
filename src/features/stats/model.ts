import type { StudyOsTimetablePayload } from '../timetable/types'
import type { StatsSourceData } from './types'

export const AWAKE_START_MINUTE = 7 * 60
export const AWAKE_END_MINUTE = 24 * 60
export const DAILY_PERSONAL_TIME_MINUTES = 3 * 60

export const localDateKey = (date: Date) => date.toLocaleDateString('en-CA')

export function dateRangeEndingAt(end: Date, count: number) {
  const cursor = new Date(end); cursor.setHours(12, 0, 0, 0); cursor.setDate(cursor.getDate() - count + 1)
  return Array.from({ length: count }, () => { const value = new Date(cursor); cursor.setDate(cursor.getDate() + 1); return value })
}

export function currentWeekDates(date: Date) {
  const monday = new Date(date)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(monday)
    value.setDate(monday.getDate() + index)
    return value
  })
}

function isoWeekday(date: Date) { return date.getDay() === 0 ? 7 : date.getDay() }

export function availableMinutesForDate(timetable: StudyOsTimetablePayload | null, date: Date) {
  const gross = AWAKE_END_MINUTE - AWAKE_START_MINUTE
  if (!timetable) return gross - DAILY_PERSONAL_TIME_MINUTES
  const intervals = timetable.subjects.flatMap(subject => subject.meetings)
    .filter(meeting => meeting.weekday === isoWeekday(date))
    .map(meeting => [Math.max(AWAKE_START_MINUTE, meeting.startMinute), Math.min(AWAKE_END_MINUTE, meeting.endMinute)] as const)
    .filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of intervals) {
    const previous = merged.at(-1)
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end)
    else merged.push([start, end])
  }
  return Math.max(0, gross - DAILY_PERSONAL_TIME_MINUTES - merged.reduce((total, [start, end]) => total + end - start, 0))
}

export type DailyStat = {
  date: Date
  key: string
  availableMinutes: number
  studySeconds: number
  caffeineMg: number
  caffeineCount: number
}

export function buildDailyStats(days: Date[], timetable: StudyOsTimetablePayload | null, source: StatsSourceData): DailyStat[] {
  return days.map(date => {
    const key = localDateKey(date)
    const sessions = source.sessions.filter(session => localDateKey(new Date(session.endedAt)) === key)
    const caffeine = source.caffeine.filter(intake => localDateKey(new Date(intake.startedAt)) === key)
    return {
      date, key, availableMinutes: availableMinutesForDate(timetable, date),
      studySeconds: sessions.reduce((sum, session) => sum + session.durationSeconds, 0),
      caffeineMg: caffeine.reduce((sum, intake) => sum + intake.caffeineMg, 0), caffeineCount: caffeine.length,
    }
  })
}

export function averageDailyClock(intakes: { startedAt: string }[], edge: 'first' | 'last') {
  const groups = new Map<string, number[]>()
  for (const intake of intakes) {
    const date = new Date(intake.startedAt); const key = localDateKey(date); const values = groups.get(key) ?? []
    values.push(date.getHours() * 60 + date.getMinutes()); groups.set(key, values)
  }
  if (!groups.size) return null
  const values = [...groups.values()].map(day => edge === 'first' ? Math.min(...day) : Math.max(...day))
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function formatClockMinute(value: number | null) {
  if (value === null) return '—'
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
