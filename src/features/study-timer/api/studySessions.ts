import { dataApi } from '../../../lib/neon/data'
type StudySessionSource = 'timer' | 'manual'
function localDayRange(date = new Date()){const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);return{start:start.toISOString(),end:end.toISOString()}}

export type StudyTimerSnapshot = { accumulatedSeconds: number; startedAt: number | null }

export async function getStudyTimerSnapshot(): Promise<StudyTimerSnapshot> {
  const { start, end } = localDayRange()
  const [sessionsResult, timerResult] = await Promise.all([
    dataApi.from('study_sessions').select('duration_seconds').gte('ended_at', start).lt('ended_at', end),
    dataApi.from('study_timer_state').select('started_at').maybeSingle(),
  ])
  if (sessionsResult.error) throw sessionsResult.error
  if (timerResult.error) throw timerResult.error
  return {
    accumulatedSeconds: (sessionsResult.data ?? []).reduce((total, session) => total + Number(session.duration_seconds), 0),
    startedAt: timerResult.data?.started_at ? new Date(String(timerResult.data.started_at)).getTime() : null,
  }
}

export async function startStudyTimer(startedAt = new Date()): Promise<number> {
  const { data, error } = await dataApi.rpc('start_study_timer', { requested_started_at: startedAt.toISOString() })
  if (error) throw error
  return new Date(String(data)).getTime()
}

export async function pauseStudyTimer(): Promise<number> {
  const { data, error } = await dataApi.rpc('pause_study_timer')
  if (error) throw error
  return Number(data ?? 0)
}

export async function recordStudySession(input:{durationSeconds:number;source:StudySessionSource;startedAt?:Date;endedAt?:Date}){const{error}=await dataApi.from('study_sessions').insert({duration_seconds:input.durationSeconds,source:input.source,started_at:input.startedAt?.toISOString()??null,ended_at:(input.endedAt??new Date()).toISOString()});if(error)throw error}
