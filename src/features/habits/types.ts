export type Habit = {
  id: string
  name: string
  color: string
  weekdays: number[]
  createdAt: string
  trackingMode: 'binary' | 'counter'
}

export type HabitCompletion = {
  habitId: string
  date: string
  value: number
}

export const shortWeekdays = [
  'M',
  'T',
  'W',
  'T',
  'F',
  'S',
  'S',
] as const
