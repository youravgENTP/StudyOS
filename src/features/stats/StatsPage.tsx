import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getLatestTimetable } from '../timetable/api'
import { formatMinutes } from '../timetable/model'
import { academicTermLabels } from '../tasks/types'
import { loadStatsSource } from './api'
import { averageDailyClock, buildDailyStats, capacityUtilization, currentWeekDates, formatClockMinute, localDateKey, utilizationChange } from './model'
import { StudySessionHistory } from './StudySessionHistory'
import type { StatsSourceData } from './types'
import './stats.css'
import './stats-enhancements.css'

const empty: StatsSourceData = { sessions: [], caffeine: [] }
const studyDuration = (seconds: number) => formatMinutes(Math.round(seconds / 60))
const shortDate = (date: Date) => new Intl.DateTimeFormat('ko', { month: 'numeric', day: 'numeric' }).format(date)
const shiftDate = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next }

export function StatsPage() {
  const [todayKey, setTodayKey] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [source, setSource] = useState<StatsSourceData>(empty)
  const [timetable, setTimetable] = useState<Awaited<ReturnType<typeof getLatestTimetable>>>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const days = useMemo(() => currentWeekDates(weekAnchor), [weekAnchor])
  const previousDays = useMemo(() => days.map(day => shiftDate(day, -7)), [days])
  const currentWeekStartKey = localDateKey(currentWeekDates(new Date(`${todayKey}T12:00:00`))[0])
  const selectedWeekStartKey = localDateKey(days[0])
  const isCurrentWeek = selectedWeekStartKey === currentWeekStartKey

  useEffect(() => {
    const timer = window.setInterval(() => setTodayKey(new Date().toLocaleDateString('en-CA')), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const from = new Date(previousDays[0]); from.setHours(0, 0, 0, 0)
    const to = new Date(days.at(-1)!); to.setDate(to.getDate() + 1); to.setHours(0, 0, 0, 0)
    void Promise.allSettled([loadStatsSource(from, to), getLatestTimetable()]).then(([sourceResult, timetableResult]) => {
      if (cancelled) return
      const errors: string[] = []
      if (sourceResult.status === 'fulfilled') setSource(sourceResult.value)
      else { setSource(empty); errors.push(sourceResult.reason instanceof Error ? sourceResult.reason.message : '통계 데이터를 불러오지 못했습니다.') }
      if (timetableResult.status === 'fulfilled') setTimetable(timetableResult.value)
      else { setTimetable(null); errors.push(timetableResult.reason instanceof Error ? timetableResult.reason.message : '시간표를 불러오지 못했습니다.') }
      setError(errors.join(' '))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days, previousDays])

  const daily = useMemo(() => buildDailyStats(days, timetable, source), [days, source, timetable])
  const previousDaily = useMemo(() => buildDailyStats(previousDays, timetable, source), [previousDays, source, timetable])
  const selectedSource = useMemo<StatsSourceData>(() => ({
    sessions: source.sessions.filter(session => { const key = localDateKey(new Date(session.endedAt)); return key >= localDateKey(days[0]) && key <= localDateKey(days.at(-1)!) }),
    caffeine: source.caffeine.filter(intake => { const key = localDateKey(new Date(intake.startedAt)); return key >= localDateKey(days[0]) && key <= localDateKey(days.at(-1)!) }),
  }), [days, source])
  const comparableDaily = isCurrentWeek ? daily.filter(day => day.key <= todayKey) : daily
  const comparablePreviousDaily = previousDaily.slice(0, comparableDaily.length)
  const available = daily.reduce((sum, day) => sum + day.availableMinutes, 0)
  const studied = comparableDaily.reduce((sum, day) => sum + day.studySeconds, 0)
  const utilization = capacityUtilization(comparableDaily)
  const utilizationDelta = utilizationChange(comparableDaily, comparablePreviousDaily)
  const caffeineTotal = daily.reduce((sum, day) => sum + day.caffeineMg, 0)
  const activeCaffeineDays = daily.filter(day => day.caffeineCount > 0).length
  const maxCapacity = Math.max(...daily.map(day => day.availableMinutes), 1)
  const maxCaffeine = Math.max(...daily.map(day => day.caffeineMg), 1)

  function moveWeek(amount: number) {
    setLoading(true)
    setWeekAnchor(current => shiftDate(current, amount * 7))
  }

  function returnToCurrentWeek() {
    setLoading(true)
    setWeekAnchor(new Date())
  }

  return <div className="page stats-page">
    <header className="stats-heading"><div><div className="eyebrow">Measured against your real week</div><h1 className="page-title">Stats</h1></div><div className="stats-week-navigation" aria-label="통계 주간 선택"><button type="button" onClick={() => moveWeek(-1)} aria-label="이전 주"><ChevronLeft /></button><div><strong>{shortDate(days[0])}–{shortDate(days.at(-1)!)}</strong><span>{isCurrentWeek ? '이번 주' : '월–일'}</span></div><button type="button" disabled={isCurrentWeek} onClick={() => moveWeek(1)} aria-label="다음 주"><ChevronRight /></button>{!isCurrentWeek && <button type="button" className="stats-this-week" onClick={returnToCurrentWeek}>이번 주</button>}</div></header>
    <div className="stats-context"><span>기상 07:00</span><span>취침 24:00</span><span>{timetable ? `${timetable.academicYear}년 ${academicTermLabels[timetable.academicTerm]} · ${timetable.source.timetableName}` : '시간표 없음'}</span></div>
    {error && <p className="feature-error">{error}</p>}
    {loading ? <section className="card"><p className="empty-copy">통계를 계산하는 중…</p></section> : <>
      <section className="stats-section">
        <div className="stats-section-title"><div><h2>Study capacity</h2><p>선택한 주의 07:00–24:00에서 수업과 하루 3시간의 식사·씻기·이동 시간을 제외해 계산합니다.</p></div></div>
        <div className="stats-metrics capacity-metrics"><article className="card"><small>주간 가용시간</small><strong>{formatMinutes(available)}</strong></article><article className="card"><small>{isCurrentWeek ? '오늘까지 기록된 공부' : '기록된 공부'}</small><strong>{studyDuration(studied)}</strong></article><article className="card"><small>{isCurrentWeek ? '오늘까지 누적 활용률' : '주간 활용률'}</small><strong>{utilization.toFixed(1)}%</strong></article><article className={`card stats-delta ${utilizationDelta > 0 ? 'positive' : utilizationDelta < 0 ? 'negative' : ''}`}><small>{isCurrentWeek ? '지난주 같은 기간 대비' : '이전 주 대비'}</small><strong>{utilizationDelta > 0 ? '+' : ''}{utilizationDelta.toFixed(1)}%p</strong></article><article className="card"><small>공부한 날짜</small><strong>{comparableDaily.filter(day => day.studySeconds > 0).length}일</strong></article></div>
        <section className="card capacity-chart"><div className="card-head"><h2>일별 가용시간과 공부시간</h2><span className="meta">{shortDate(days[0])}–{shortDate(days.at(-1)!)}</span></div><div className="capacity-bars">{daily.map(day => { const studyMinutes = day.studySeconds / 60; return <div className={`capacity-day${isCurrentWeek && day.key > todayKey ? ' future' : ''}`} key={day.key} title={`${day.key}: ${formatMinutes(day.availableMinutes)} 중 ${studyDuration(day.studySeconds)} 공부`}><div className="capacity-track"><i style={{ height: `${day.availableMinutes / maxCapacity * 100}%` }} /><b style={{ height: `${Math.min(studyMinutes / maxCapacity * 100, 100)}%` }} /></div><small>{new Intl.DateTimeFormat('ko', { weekday: 'narrow' }).format(day.date)}</small><span>{day.date.getDate()}</span></div>})}</div><div className="stats-legend"><span><i className="available" />가용시간</span><span><i className="studied" />공부시간</span></div><div className="daily-utilization-grid">{daily.map(day => { const rate = capacityUtilization([day]); return <article key={day.key} className={isCurrentWeek && day.key > todayKey ? 'future' : ''}><span>{new Intl.DateTimeFormat('ko', { weekday: 'short' }).format(day.date)} {day.date.getDate()}일</span><strong>{rate.toFixed(1)}%</strong><small>{studyDuration(day.studySeconds)} / {formatMinutes(day.availableMinutes)}</small></article>})}</div></section>
        <StudySessionHistory sessions={selectedSource.sessions} onUpdated={session => setSource(current => {
          const from = new Date(previousDays[0]); from.setHours(0, 0, 0, 0)
          const to = new Date(days.at(-1)!); to.setDate(to.getDate() + 1); to.setHours(0, 0, 0, 0)
          return { ...current, sessions: current.sessions.map(item => item.id === session.id ? session : item).filter(item => { const endedAt = new Date(item.endedAt); return endedAt >= from && endedAt < to }) }
        })} />
      </section>

      <section className="stats-section">
        <div className="stats-section-title"><div><h2>Caffeine intake</h2><p>기록된 섭취량과 시간대입니다. 약효나 성과의 인과관계를 의미하지 않습니다.</p></div></div>
        <div className="stats-metrics caffeine-stats"><article className="card"><small>총 섭취량</small><strong>{caffeineTotal.toFixed(0)} mg</strong></article><article className="card"><small>섭취일 평균</small><strong>{activeCaffeineDays ? (caffeineTotal / activeCaffeineDays).toFixed(0) : 0} mg</strong></article><article className="card"><small>섭취 횟수</small><strong>{selectedSource.caffeine.length}회</strong></article><article className="card"><small>평균 첫 섭취</small><strong>{formatClockMinute(averageDailyClock(selectedSource.caffeine, 'first'))}</strong></article><article className="card"><small>평균 마지막 섭취</small><strong>{formatClockMinute(averageDailyClock(selectedSource.caffeine, 'last'))}</strong></article></div>
        <section className="card caffeine-stat-chart"><div className="card-head"><h2>일별 카페인</h2><span className="meta">mg</span></div><div className="caffeine-stat-bars">{daily.map(day => <div key={day.key} title={`${day.key}: ${day.caffeineMg} mg`}><i style={{ height: `${day.caffeineMg / maxCaffeine * 100}%` }} /><small>{day.date.getDate()}</small></div>)}</div></section>
      </section>
    </>}
  </div>
}
