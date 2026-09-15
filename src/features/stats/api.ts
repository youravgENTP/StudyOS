import { dataApi } from '../../lib/neon/data'
import type { CaffeineIntake } from '../caffeine/types'
import type { StatsSourceData, StudySessionStat } from './types'

function fail(error: unknown) {
  if (import.meta.env.DEV) console.error('[stats]', error)
  return new Error('통계 데이터를 불러오지 못했습니다.')
}

export async function loadStatsSource(from: Date, to: Date): Promise<StatsSourceData> {
  const [sessionsResult, caffeineResult] = await Promise.all([
    dataApi.from('study_sessions').select('id,duration_seconds,started_at,ended_at,source').gte('ended_at', from.toISOString()).lt('ended_at', to.toISOString()).order('ended_at'),
    dataApi.from('caffeine_intakes').select('id,source,caffeine_mg,started_at,duration_minutes,note').gte('started_at', from.toISOString()).lt('started_at', to.toISOString()).order('started_at'),
  ])
  if (sessionsResult.error || caffeineResult.error) throw fail(sessionsResult.error ?? caffeineResult.error)
  const sessions: StudySessionStat[] = (sessionsResult.data ?? []).map(raw => {
    const row = raw as Record<string, unknown>
    return { id: String(row.id), durationSeconds: Number(row.duration_seconds), startedAt: row.started_at ? String(row.started_at) : null, endedAt: String(row.ended_at), source: row.source as StudySessionStat['source'] }
  })
  const caffeine: CaffeineIntake[] = (caffeineResult.data ?? []).map(raw => {
    const row = raw as Record<string, unknown>
    return { id: String(row.id), source: String(row.source), caffeineMg: Number(row.caffeine_mg), startedAt: String(row.started_at), durationMinutes: Number(row.duration_minutes), note: row.note ? String(row.note) : null }
  })
  return { sessions, caffeine }
}

export async function updateStudySession(
  session: StudySessionStat,
  input: { durationSeconds: number; endedAt: string },
): Promise<StudySessionStat> {
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error('공부시간은 1분 이상이어야 합니다.')
  }

  const endedAt = new Date(input.endedAt)
  if (Number.isNaN(endedAt.getTime())) throw new Error('기록 시각을 확인해주세요.')

  const startedAt = session.startedAt === null
    ? null
    : new Date(endedAt.getTime() - input.durationSeconds * 1000).toISOString()
  const nextSession: StudySessionStat = {
    ...session,
    durationSeconds: input.durationSeconds,
    startedAt,
    endedAt: endedAt.toISOString(),
  }
  const { error } = await dataApi.from('study_sessions').update({
    duration_seconds: nextSession.durationSeconds,
    started_at: nextSession.startedAt,
    ended_at: nextSession.endedAt,
  }).eq('id', session.id)
  if (error) throw fail(error)
  return nextSession
}
