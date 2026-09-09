import { useEffect, useMemo, useState } from 'react'
import { getTodayStudySeconds, recordStudySession } from './api/studySessions'

const RUNNING_KEY = 'studyos.study-timer.running.v2'
function loadStartedAt(): number | null { const value=localStorage.getItem(RUNNING_KEY);return value?Number(value):null }

export function useStudyTimer() {
  const [accumulatedSeconds,setAccumulatedSeconds]=useState(0)
  const [startedAt,setStartedAt]=useState<number|null>(loadStartedAt)
  const [now,setNow]=useState(0)
  const [isLoading,setIsLoading]=useState(true)
  const [isSaving,setIsSaving]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{let active=true;getTodayStudySeconds().then(total=>{if(active)setAccumulatedSeconds(total)}).catch(()=>{if(active)setError('Could not load today’s study time.')}).finally(()=>{if(active)setIsLoading(false)});return()=>{active=false}},[])
  useEffect(()=>{if(!startedAt)return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[startedAt])

  const seconds=useMemo(()=>accumulatedSeconds+(startedAt&&now?Math.max(0,Math.floor((now-startedAt)/1000)):0),[accumulatedSeconds,startedAt,now])
  function start(){if(startedAt)return;const time=Date.now();localStorage.setItem(RUNNING_KEY,String(time));setNow(time);setStartedAt(time)}
  async function pause(){if(!startedAt)return;const endedAt=new Date();const duration=Math.max(1,Math.floor((endedAt.getTime()-startedAt)/1000));setIsSaving(true);setError('');try{await recordStudySession({durationSeconds:duration,source:'timer',startedAt:new Date(startedAt),endedAt});setAccumulatedSeconds(total=>total+duration);localStorage.removeItem(RUNNING_KEY);setStartedAt(null)}catch{setError('Could not save this study session. The timer is still running.')}finally{setIsSaving(false)}}
  async function addMinutes(minutes:number){setIsSaving(true);setError('');try{await recordStudySession({durationSeconds:minutes*60,source:'manual'});setAccumulatedSeconds(total=>total+minutes*60)}catch{setError('Could not save the added study time.')}finally{setIsSaving(false)}}
  return{seconds,isRunning:Boolean(startedAt),isLoading,isSaving,error,start,pause,addMinutes}
}

export function formatDuration(total:number){const h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return[h,m,s].map(n=>String(n).padStart(2,'0')).join(':')}
