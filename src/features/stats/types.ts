import type { CaffeineIntake } from '../caffeine/types'

export type StudySessionStat = {
  id: string
  durationSeconds: number
  startedAt: string | null
  endedAt: string
  source: 'timer' | 'manual'
}

export type StatsSourceData = {
  sessions: StudySessionStat[]
  caffeine: CaffeineIntake[]
}
