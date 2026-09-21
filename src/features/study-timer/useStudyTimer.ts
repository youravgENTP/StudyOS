import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStudyTimerSnapshot, pauseStudyTimer, recordStudySession, startStudyTimer } from './api/studySessions'

const RUNNING_KEY = 'studyos.study-timer.running.v2'
function loadStartedAt(): number | null { const value=localStorage.getItem(RUNNING_KEY);return value?Number(value):null }

export function useStudyTimer() {
  const [accumulatedSeconds,setAccumulatedSeconds]=useState(0)
  const [startedAt,setStartedAt]=useState<number|null>(null)
  const [now,setNow]=useState(Date.now)
  const [isLoading,setIsLoading]=useState(true)
  const [isSaving,setIsSaving]=useState(false)
  const [error,setError]=useState('')
  const refreshRequest = useRef(0)

  const refresh = useCallback(async (migrateLegacy = false) => {
    const request = ++refreshRequest.current
    let snapshot = await getStudyTimerSnapshot()
    const legacyStartedAt = loadStartedAt()
    if (migrateLegacy && snapshot.startedAt === null && legacyStartedAt && Number.isFinite(legacyStartedAt)) {
      await startStudyTimer(new Date(legacyStartedAt))
      snapshot = await getStudyTimerSnapshot()
    }
    if (request !== refreshRequest.current) return
    localStorage.removeItem(RUNNING_KEY)
    setAccumulatedSeconds(snapshot.accumulatedSeconds)
    setStartedAt(snapshot.startedAt)
    setNow(Date.now())
    setError('')
  }, [])

  useEffect(()=>{let active=true;refresh(true).catch(()=>{if(active)setError('Could not load today’s study time.')}).finally(()=>{if(active)setIsLoading(false)});return()=>{active=false}},[refresh])
  useEffect(()=>{const sync=()=>{if(!isSaving&&document.visibilityState==='visible')void refresh().catch(()=>setError('Could not sync the study timer.'))};const id=window.setInterval(sync,5000);document.addEventListener('visibilitychange',sync);return()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',sync)}},[isSaving,refresh])
  useEffect(()=>{if(!startedAt)return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[startedAt])

  const seconds=useMemo(()=>accumulatedSeconds+(startedAt&&now?Math.max(0,Math.floor((now-startedAt)/1000)):0),[accumulatedSeconds,startedAt,now])
  async function start(){if(startedAt||isSaving)return;refreshRequest.current++;setIsSaving(true);setError('');try{const time=await startStudyTimer();setNow(Date.now());setStartedAt(time)}catch{setError('Could not start the shared study timer.')}finally{setIsSaving(false)}}
  async function pause(){if(!startedAt||isSaving)return;refreshRequest.current++;setIsSaving(true);setError('');try{await pauseStudyTimer();await refresh()}catch{setError('Could not save this study session. The timer is still running.')}finally{setIsSaving(false)}}
  async function addMinutes(minutes:number){if(isSaving)return;refreshRequest.current++;setIsSaving(true);setError('');try{await recordStudySession({durationSeconds:minutes*60,source:'manual'});await refresh()}catch{setError('Could not save the added study time.')}finally{setIsSaving(false)}}
  return{seconds,isRunning:Boolean(startedAt),isLoading,isSaving,error,start,pause,addMinutes}
}

export function formatDuration(total:number){const h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return[h,m,s].map(n=>String(n).padStart(2,'0')).join(':')}
