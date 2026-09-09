import { dataApi } from '../../../lib/neon/data'
type StudySessionSource = 'timer' | 'manual'
function localDayRange(date = new Date()){const start=new Date(date);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);return{start:start.toISOString(),end:end.toISOString()}}
export async function getTodayStudySeconds(){const{start,end}=localDayRange();const{data,error}=await dataApi.from('study_sessions').select('duration_seconds').gte('ended_at',start).lt('ended_at',end);if(error)throw error;return(data??[]).reduce((total,session)=>total+session.duration_seconds,0)}
export async function recordStudySession(input:{durationSeconds:number;source:StudySessionSource;startedAt?:Date;endedAt?:Date}){const{error}=await dataApi.from('study_sessions').insert({duration_seconds:input.durationSeconds,source:input.source,started_at:input.startedAt?.toISOString()??null,ended_at:(input.endedAt??new Date()).toISOString()});if(error)throw error}
