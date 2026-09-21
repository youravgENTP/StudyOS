import { dataApi } from '../../../lib/neon/data'
type StudySessionSource = 'timer' | 'manual'
const ACTIVE_TIMER_END = '9999-12-31T23:59:59.999Z'
function localDayRange(date = new Date()){const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);return{start:start.toISOString(),end:end.toISOString()}}

export type StudyTimerSnapshot = { accumulatedSeconds: number; startedAt: number | null }

export async function getStudyTimerSnapshot(): Promise<StudyTimerSnapshot> {
  const { start, end } = localDayRange()
  const [sessionsResult, timerResult] = await Promise.all([
    dataApi.from('study_sessions').select('duration_seconds').gte('ended_at', start).lt('ended_at', end),
    dataApi.from('study_sessions').select('started_at').eq('ended_at', ACTIVE_TIMER_END).maybeSingle(),
  ])
  if (sessionsResult.error) throw sessionsResult.error
  if (timerResult.error) throw timerResult.error
  return {
    accumulatedSeconds: (sessionsResult.data ?? []).reduce((total, session) => total + Number(session.duration_seconds), 0),
    startedAt: timerResult.data?.started_at ? new Date(String(timerResult.data.started_at)).getTime() : null,
  }
}

export async function startStudyTimer(startedAt = new Date()): Promise<number> {
  const existing = await dataApi.from('study_sessions').select('started_at').eq('ended_at', ACTIVE_TIMER_END).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data?.started_at) return new Date(String(existing.data.started_at)).getTime()

  const inserted = await dataApi.from('study_sessions').insert({
    duration_seconds: 1, source: 'timer', started_at: startedAt.toISOString(), ended_at: ACTIVE_TIMER_END,
  }).select('started_at').single()
  if (!inserted.error && inserted.data?.started_at) return new Date(String(inserted.data.started_at)).getTime()

  // A different client may have won the unique-index race after our first read.
  const concurrent = await dataApi.from('study_sessions').select('started_at').eq('ended_at', ACTIVE_TIMER_END).maybeSingle()
  if (concurrent.error || !concurrent.data?.started_at) throw inserted.error ?? concurrent.error ?? new Error('Could not create active timer')
  return new Date(String(concurrent.data.started_at)).getTime()
}

export async function pauseStudyTimer(): Promise<number> {
  const active = await dataApi.from('study_sessions').select('id,started_at').eq('ended_at', ACTIVE_TIMER_END).maybeSingle()
  if (active.error) throw active.error
  if (!active.data?.started_at) return 0
  const endedAt = new Date()
  const durationSeconds = Math.max(1, Math.floor((endedAt.getTime() - new Date(String(active.data.started_at)).getTime()) / 1000))
  const updated = await dataApi.from('study_sessions').update({
    duration_seconds: durationSeconds, ended_at: endedAt.toISOString(),
  }).eq('id', String(active.data.id)).eq('ended_at', ACTIVE_TIMER_END).select('id')
  if (updated.error) throw updated.error
  return updated.data?.length ? durationSeconds : 0
}

export async function recordStudySession(input:{durationSeconds:number;source:StudySessionSource;startedAt?:Date;endedAt?:Date}){const{error}=await dataApi.from('study_sessions').insert({duration_seconds:input.durationSeconds,source:input.source,started_at:input.startedAt?.toISOString()??null,ended_at:(input.endedAt??new Date()).toISOString()});if(error)throw error}
