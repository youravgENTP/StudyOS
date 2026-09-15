import { useMemo } from 'react'
import { medicationExposureRangeAt } from './model'
import type { DosageCatalogItem, DosageIntake } from './types'

const W = 1100
const L = 78
const R = 24
const T = 26
const LANE_HEIGHT = 148
const PLOT_HEIGHT = 86
const B = 54
const HOUR = 3_600_000
const colors = ['#9b7be0', '#45a09c', '#d08a55']

type PlotPoint = { x: number; lowY: number; highY: number; middleY: number }
const linePath = (points: PlotPoint[]) => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.middleY.toFixed(1)}`).join(' ')
const bandPath = (points: PlotPoint[]) => `${points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.highY.toFixed(1)}`).join(' ')} ${[...points].reverse().map(point => `L${point.x.toFixed(1)},${point.lowY.toFixed(1)}`).join(' ')} Z`
const clock = (date: Date) => new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)

export function MedicationExposureChart({ catalog, intakes, logDate }: { catalog: DosageCatalogItem[]; intakes: DosageIntake[]; logDate: string }) {
  const chart = useMemo(() => {
    const start = new Date(`${logDate}T00:00:00`)
    const end = new Date(start.getTime() + 36 * HOUR)
    const items = catalog.flatMap(item => {
      const itemIntakes = intakes.filter(intake => intake.catalogKey === item.key)
      const profiles = item.pkProfiles.filter(profile => profile.tmaxMinMinutes !== null && profile.halfLifeMinMinutes !== null)
      return itemIntakes.length && profiles.length ? [{ item, itemIntakes, profiles }] : []
    })
    const height = T + items.length * LANE_HEIGHT + B
    const x = (time: Date) => L + (time.getTime() - start.getTime()) / (end.getTime() - start.getTime()) * (W - L - R)
    const sampleTimes = Array.from({ length: 217 }, (_, index) => new Date(start.getTime() + index * 10 * 60_000))
    const lanes = items.map((entry, laneIndex) => {
      const samples = entry.profiles.map(profile => sampleTimes.map(time => medicationExposureRangeAt(entry.itemIntakes, entry.item, profile, time)!))
      const maximum = Math.max(100, ...samples.flatMap(series => series.map(point => point.max)))
      const scaleMaximum = Math.ceil(maximum / 50) * 50
      const plotBottom = T + laneIndex * LANE_HEIGHT + PLOT_HEIGHT + 30
      const y = (value: number) => plotBottom - Math.min(value / scaleMaximum, 1) * PLOT_HEIGHT
      return {
        ...entry, laneIndex, scaleMaximum, plotBottom,
        series: entry.profiles.map((profile, profileIndex) => ({
          profile,
          color: colors[profileIndex % colors.length],
          points: samples[profileIndex].map((range, index) => ({ x: x(sampleTimes[index]), lowY: y(range.min), highY: y(range.max), middleY: y((range.min + range.max) / 2) })),
        })),
      }
    })
    const ticks = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 6 * HOUR))
    return { start, end, height, x, lanes, ticks }
  }, [catalog, intakes, logDate])

  return <section className="card medication-exposure">
    <div className="card-head"><div><h2>Medication exposure</h2><span className="meta">{logDate} 복용 기록 · 36시간 전망</span></div><span className="medication-exposure-unit">1회 표시 용량 = 100%</span></div>
    {chart.lanes.length === 0 ? <p className="empty-copy">이 날짜에는 그래프로 표시할 약물 기록이 없습니다.</p> : <div className="medication-exposure-scroll">
      <svg viewBox={`0 0 ${W} ${chart.height}`} role="img" aria-label="약물별 추정 상대 잔존 비율 그래프">
        {chart.ticks.map(tick => <g key={tick.toISOString()}><line className="medication-grid" x1={chart.x(tick)} x2={chart.x(tick)} y1={T} y2={chart.height - B + 6} /><text className="medication-axis-label" x={chart.x(tick)} y={chart.height - 15} textAnchor="middle">{tick.getDate() === chart.start.getDate() ? clock(tick) : `+${Math.round((tick.getTime() - chart.start.getTime()) / HOUR)}h`}</text></g>)}
        {chart.lanes.map(lane => <g key={lane.item.key}>
          <text className="medication-lane-title" x={L} y={T + lane.laneIndex * LANE_HEIGHT + 14}>{lane.item.displayName}</text>
          {Array.from({ length: lane.scaleMaximum / 50 + 1 }, (_, index) => index * 50).map(value => { const y = lane.plotBottom - value / lane.scaleMaximum * PLOT_HEIGHT; return <g key={value}><line className="medication-grid horizontal" x1={L} x2={W - R} y1={y} y2={y} /><text className="medication-axis-label" x={L - 9} y={y + 4} textAnchor="end">{value}%</text></g> })}
          {lane.series.map((series, seriesIndex) => <g key={series.profile.analyte}><path d={bandPath(series.points)} fill={series.color} opacity=".14" /><path d={linePath(series.points)} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><g className="medication-series-label"><circle cx={W - R - 154} cy={T + lane.laneIndex * LANE_HEIGHT + 10 + seriesIndex * 14} r="4" fill={series.color} /><text x={W - R - 144} y={T + lane.laneIndex * LANE_HEIGHT + 14 + seriesIndex * 14}>{series.profile.analyte}</text></g></g>)}
          {lane.itemIntakes.map(intake => { const time = new Date(intake.takenAt); return <g className="medication-dose-marker" key={intake.id}><line x1={chart.x(time)} x2={chart.x(time)} y1={lane.plotBottom - PLOT_HEIGHT} y2={lane.plotBottom} /><circle cx={chart.x(time)} cy={lane.plotBottom} r="4" /><text x={chart.x(time) + 5} y={lane.plotBottom - 5}>{clock(time)}</text></g> })}
        </g>)}
      </svg>
    </div>}
    <p className="medication-exposure-disclaimer">저장된 흡수 최고점과 반감기 범위를 단순화해 계산한 상대 지표입니다. 혈중농도, 약효, 안전한 재복용 시점 또는 복약 권고를 의미하지 않습니다.</p>
  </section>
}
