import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { alignedTimeTicks } from '../caffeine/chartTime'
import { medicationExposureRangeAt, medicationExposureTimeWindow } from './model'
import type { DosageCatalogItem, DosageIntake, DosagePkProfile } from './types'

const W = 1600
const H = 470
const L = 72
const R = 24
const T = 42
const B = 112
const plotBottom = H - B
const seriesColors = ['#9b7be0', '#45a09c', '#d08a55', '#4f8ed6', '#d66583', '#77a84d']

type PlotPoint = { x: number; lowY: number; highY: number; middleY: number }
type SeriesDefinition = { item: DosageCatalogItem; profile: DosagePkProfile; label: string; color: string }

const linePath = (points: PlotPoint[]) => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.middleY.toFixed(1)}`).join(' ')
const bandPath = (points: PlotPoint[]) => `${points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.highY.toFixed(1)}`).join(' ')} ${[...points].reverse().map(point => `L${point.x.toFixed(1)},${point.lowY.toFixed(1)}`).join(' ')} Z`
const clock = (date: Date) => new Intl.DateTimeFormat('ko', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
const normalized = (value: string) => value.toLocaleLowerCase().replaceAll(/[^a-z0-9가-힣]/g, '')

function seriesLabel(item: DosageCatalogItem, profile: DosagePkProfile) {
  const analyte = normalized(profile.analyte)
  const ingredient = normalized(item.ingredientName)
  return analyte === ingredient ? item.displayName : `${item.displayName} · ${profile.analyte}`
}

export function MedicationExposureChart({
  catalog,
  intakes,
  now,
  axisFontSize,
  loading,
}: {
  catalog: DosageCatalogItem[]
  intakes: DosageIntake[]
  now: Date
  axisFontSize: number
  loading: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const positionedRef = useRef(false)
  const chart = useMemo(() => {
    const { visibleStart: start, visibleEnd: end } = medicationExposureTimeWindow(now)
    const x = (time: Date) => L + (time.getTime() - start.getTime()) / (end.getTime() - start.getTime()) * (W - L - R)
    const activeCatalogKeys = new Set(intakes.filter(intake => new Date(intake.takenAt) <= end).map(intake => intake.catalogKey))
    const definitions: SeriesDefinition[] = catalog.flatMap(item => activeCatalogKeys.has(item.key)
      ? item.pkProfiles.filter(profile => profile.tmaxMinMinutes !== null && profile.halfLifeMinMinutes !== null).map(profile => ({ item, profile, label: seriesLabel(item, profile), color: '' }))
      : [])
      .map((series, index) => ({ ...series, color: seriesColors[index % seriesColors.length] }))
    const sampleTimes = Array.from({ length: 361 }, (_, index) => new Date(start.getTime() + index * 10 * 60_000))
    const ranges = definitions.map(series => sampleTimes.map(time => medicationExposureRangeAt(intakes, series.item, series.profile, time)!))
    const highestValue = Math.max(100, ...ranges.flatMap(points => points.map(point => point.max)))
    const step = Math.max(25, Math.ceil(highestValue / 100) * 25)
    const maximum = step * 4
    const y = (value: number) => plotBottom - value / maximum * (plotBottom - T)
    const series = definitions.map((definition, definitionIndex) => ({
      ...definition,
      points: ranges[definitionIndex].map((range, pointIndex) => ({
        x: x(sampleTimes[pointIndex]),
        lowY: y(range.min),
        highY: y(range.max),
        middleY: y((range.min + range.max) / 2),
      })),
    }))
    const visibleIntakes = intakes.filter(intake => {
      const time = new Date(intake.takenAt)
      return time >= start && time <= end
    }).sort((first, second) => first.takenAt.localeCompare(second.takenAt))
    return { start, end, x, y, step, maximum, series, visibleIntakes }
  }, [catalog, intakes, now])

  useLayoutEffect(() => {
    if (loading || positionedRef.current || chart.series.length === 0) return
    const frame = requestAnimationFrame(() => {
      const element = scrollRef.current
      if (!element) return
      const nowInContent = chart.x(now) / W * element.scrollWidth
      element.scrollLeft = Math.max(0, nowInContent - element.clientWidth * 0.42)
      positionedRef.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [chart, loading, now])

  const ticks = Array.from({ length: 5 }, (_, index) => index * chart.step)
  const timeTicks = alignedTimeTicks(chart.start, chart.end)
  const currentX = chart.x(now)
  const axisStyle = { '--axis-font-size': `${axisFontSize}px` } as CSSProperties

  return <section className="card medication-exposure">
    <div className="card-head"><div><h2>Medication exposure</h2><span className="meta">Estimated relative exposure · rolling PK model</span></div><span className="medication-exposure-unit">Relative exposure (%)</span></div>
    {loading ? <p className="empty-copy">Loading exposure…</p> : chart.series.length === 0 ? <p className="empty-copy">최근 복용 기록 중 그래프로 표시할 약물이 없습니다.</p> : <>
      <div className="medication-exposure-legend">{chart.series.map(series => <span key={`${series.item.key}-${series.profile.analyte}`}><i style={{ background: series.color }} />{series.label}</span>)}</div>
      <div className="medication-exposure-scroll" ref={scrollRef}>
        <svg className="medication-exposure-chart" style={axisStyle} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="약물별 추정 상대 노출 그래프">
          {ticks.map(value => <g key={value}><line className="medication-grid horizontal" x1={L} x2={W - R} y1={chart.y(value)} y2={chart.y(value)} /><text className="medication-axis-label" x={L - 10} y={chart.y(value) + axisFontSize / 3} textAnchor="end">{value}</text></g>)}
          <text className="medication-axis-unit" x="13" y={T - 13}>%</text>
          {timeTicks.map(time => <g key={time.toISOString()}><line className="medication-grid" x1={chart.x(time)} x2={chart.x(time)} y1={T} y2={plotBottom} /><text className="medication-axis-label" x={chart.x(time)} y={plotBottom + 29} textAnchor="middle">{clock(time)}</text></g>)}
          {chart.series.map(series => <g key={`${series.item.key}-${series.profile.analyte}`}><path d={bandPath(series.points)} fill={series.color} opacity=".12" /><path d={linePath(series.points)} fill="none" stroke={series.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>)}
          <g className="medication-now-marker"><line x1={currentX} x2={currentX} y1={T} y2={plotBottom} /><text x={currentX + 7} y={T + 13}>Now</text></g>
          {chart.visibleIntakes.map((intake, index) => { const time = new Date(intake.takenAt); const x = chart.x(time); const lane = index % 3; return <g className="medication-dose-marker" key={intake.id}><line x1={x} x2={x} y1={plotBottom} y2={plotBottom + 31 + lane * 21} /><circle cx={x} cy={plotBottom} r="4" /><text x={x + 5} y={plotBottom + 40 + lane * 21}>{intake.productName} · {clock(time)}</text></g> })}
        </svg>
      </div>
    </>}
    <p className="medication-exposure-disclaimer">저장된 Tmax와 반감기 범위를 단순화한 추정 상대 지표입니다. 측정 혈중농도·임상 효과·복약 권고·안전한 재복용 시점을 의미하지 않습니다.</p>
  </section>
}
