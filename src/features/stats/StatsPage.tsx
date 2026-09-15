import { useEffect, useMemo, useState } from 'react'
import { getLatestTimetable } from '../timetable/api'
import { formatMinutes } from '../timetable/model'
import { academicTermLabels } from '../tasks/types'
import { loadStatsSource } from './api'
import { averageDailyClock, buildDailyStats, dateRangeEndingAt, formatClockMinute } from './model'
import { StudySessionHistory } from './StudySessionHistory'
import type { StatsSourceData } from './types'
import './stats.css'

const empty: StatsSourceData = { sessions: [], caffeine: [] }
const studyDuration = (seconds: number) => formatMinutes(Math.round(seconds / 60))
const shortDate = (date: Date) => new Intl.DateTimeFormat('ko', { month: 'numeric', day: 'numeric' }).format(date)

export function StatsPage() {
  const [period, setPeriod] = useState(7)
  const [source, setSource] = useState<StatsSourceData>(empty)
  const [timetable, setTimetable] = useState<Awaited<ReturnType<typeof getLatestTimetable>>>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const days = useMemo(() => dateRangeEndingAt(new Date(), period), [period])

  useEffect(() => {
    let cancelled = false
    const from = new Date(days[0]); from.setHours(0, 0, 0, 0)
    const to = new Date(days.at(-1)!); to.setDate(to.getDate() + 1); to.setHours(0, 0, 0, 0)
    void Promise.all([loadStatsSource(from, to), getLatestTimetable()]).then(([nextSource, nextTimetable]) => {
      if (!cancelled) { setSource(nextSource); setTimetable(nextTimetable); setError('') }
    }).catch(caught => { if (!cancelled) setError(caught instanceof Error ? caught.message : '통계를 불러오지 못했습니다.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days])

  const daily = useMemo(() => buildDailyStats(days, timetable, source), [days, source, timetable])
  const available = daily.reduce((sum, day) => sum + day.availableMinutes, 0)
  const studied = daily.reduce((sum, day) => sum + day.studySeconds, 0)
  const utilization = available ? studied / 60 / available * 100 : 0
  const caffeineTotal = daily.reduce((sum, day) => sum + day.caffeineMg, 0)
  const activeCaffeineDays = daily.filter(day => day.caffeineCount > 0).length
  const maxCapacity = Math.max(...daily.map(day => day.availableMinutes), 1)
  const maxCaffeine = Math.max(...daily.map(day => day.caffeineMg), 1)

  return <div className="page stats-page">
    <header className="stats-heading"><div><div className="eyebrow">Measured against your real week</div><h1 className="page-title">Stats</h1></div><div className="stats-period" aria-label="통계 기간">{[7, 30, 90].map(value => <button className={period === value ? 'active' : ''} key={value} onClick={() => { setLoading(true); setPeriod(value) }}>{value}일</button>)}</div></header>
    <div className="stats-context"><span>기상 07:00</span><span>취침 24:00</span><span>{timetable ? `${timetable.academicYear}년 ${academicTermLabels[timetable.academicTerm]} · ${timetable.source.timetableName}` : '시간표 없음'}</span></div>
    {error && <p className="feature-error">{error}</p>}
    {loading ? <section className="card"><p className="empty-copy">통계를 계산하는 중…</p></section> : <>
      <section className="stats-section">
        <div className="stats-section-title"><div><h2>Study capacity</h2><p>07:00–24:00에서 시간표 수업을 제외한 시간과 실제 StudyOS 공부 기록을 비교합니다.</p></div></div>
        <div className="stats-metrics"><article className="card"><small>가용시간</small><strong>{formatMinutes(available)}</strong></article><article className="card"><small>기록된 공부</small><strong>{studyDuration(studied)}</strong></article><article className="card"><small>가용시간 활용률</small><strong>{utilization.toFixed(1)}%</strong></article><article className="card"><small>공부한 날짜</small><strong>{daily.filter(day => day.studySeconds > 0).length}일</strong></article></div>
        <section className="card capacity-chart"><div className="card-head"><h2>일별 가용시간과 공부시간</h2><span className="meta">{shortDate(days[0])}–{shortDate(days.at(-1)!)}</span></div><div className="capacity-bars">{daily.map(day => { const studyMinutes = day.studySeconds / 60; return <div className="capacity-day" key={day.key} title={`${day.key}: ${formatMinutes(day.availableMinutes)} 중 ${studyDuration(day.studySeconds)} 공부`}><div className="capacity-track"><i style={{ height: `${day.availableMinutes / maxCapacity * 100}%` }} /><b style={{ height: `${Math.min(studyMinutes / maxCapacity * 100, 100)}%` }} /></div><small>{new Intl.DateTimeFormat('ko', { weekday: 'narrow' }).format(day.date)}</small><span>{day.date.getDate()}</span></div>})}</div><div className="stats-legend"><span><i className="available" />가용시간</span><span><i className="studied" />공부시간</span></div></section>
        <StudySessionHistory sessions={source.sessions} onUpdated={session => setSource(current => {
          const from = new Date(days[0]); from.setHours(0, 0, 0, 0)
          const to = new Date(days.at(-1)!); to.setDate(to.getDate() + 1); to.setHours(0, 0, 0, 0)
          return { ...current, sessions: current.sessions.map(item => item.id === session.id ? session : item).filter(item => { const endedAt = new Date(item.endedAt); return endedAt >= from && endedAt < to }) }
        })} />
      </section>

      <section className="stats-section">
        <div className="stats-section-title"><div><h2>Caffeine intake</h2><p>기록된 섭취량과 시간대입니다. 약효나 성과의 인과관계를 의미하지 않습니다.</p></div></div>
        <div className="stats-metrics caffeine-stats"><article className="card"><small>총 섭취량</small><strong>{caffeineTotal.toFixed(0)} mg</strong></article><article className="card"><small>섭취일 평균</small><strong>{activeCaffeineDays ? (caffeineTotal / activeCaffeineDays).toFixed(0) : 0} mg</strong></article><article className="card"><small>섭취 횟수</small><strong>{source.caffeine.length}회</strong></article><article className="card"><small>평균 첫 섭취</small><strong>{formatClockMinute(averageDailyClock(source.caffeine, 'first'))}</strong></article><article className="card"><small>평균 마지막 섭취</small><strong>{formatClockMinute(averageDailyClock(source.caffeine, 'last'))}</strong></article></div>
        <section className="card caffeine-stat-chart"><div className="card-head"><h2>일별 카페인</h2><span className="meta">mg</span></div><div className="caffeine-stat-bars">{daily.map(day => <div key={day.key} title={`${day.key}: ${day.caffeineMg} mg`}><i style={{ height: `${day.caffeineMg / maxCaffeine * 100}%` }} /><small>{day.date.getDate()}</small></div>)}</div></section>
      </section>
    </>}
  </div>
}
