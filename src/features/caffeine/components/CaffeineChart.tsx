import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { alignedTimeTicks } from '../chartTime'
import { LOW_RESIDUAL_REFERENCE_MG, totalLoadAt } from '../model'
import type { CaffeineIntake } from '../types'

const W = 1600
const H = 470
const L = 64
const R = 24
const T = 38
const B = 112
const HOUR = 3_600_000
const plotBottom = H - B

type Point = { time: Date; value: number }
type PlotPoint = Point & { x: number; y: number }

const path = (points: PlotPoint[]) =>
  points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')

const timeLabel = (date: Date) =>
  new Intl.DateTimeFormat('ko', { hour: 'numeric', minute: '2-digit' }).format(date)

function findLocalPeak(points: Point[], intakes: CaffeineIntake[], start: Date, end: Date, halfLifeHours: number) {
  const candidates: Point[] = []
  for (let index = 1; index < points.length - 1; index += 1) {
    if (points[index].value > points[index - 1].value && points[index].value >= points[index + 1].value) candidates.push(points[index])
  }
  for (const intake of intakes) {
    const time = new Date(new Date(intake.startedAt).getTime() + intake.durationMinutes * 60_000)
    if (time <= start || time >= end) continue
    const value = totalLoadAt(intakes, time, halfLifeHours)
    const before = totalLoadAt(intakes, new Date(time.getTime() - 1_000), halfLifeHours)
    const after = totalLoadAt(intakes, new Date(time.getTime() + 1_000), halfLifeHours)
    if (value > before && value >= after) candidates.push({ time, value })
  }
  return candidates.reduce<Point | null>((best, candidate) => !best || candidate.value > best.value ? candidate : best, null)
}

export function CaffeineChart({ intakes, now, bedtime, axisFontSize, halfLifeHours, bedtimeResidualTargetMg }: { intakes: CaffeineIntake[]; now: Date; bedtime: Date | null; axisFontSize: number; halfLifeHours: number; bedtimeResidualTargetMg: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = scrollRef.current
      if (element) element.scrollLeft = element.scrollWidth - element.clientWidth
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const chart = useMemo(() => {
    const start = new Date(now.getTime() - 24 * HOUR)
    const end = new Date(now.getTime() + 16 * HOUR)
    const raw = Array.from({ length: 241 }, (_, index) => {
      const time = new Date(start.getTime() + index * 10 * 60_000)
      return { time, value: totalLoadAt(intakes, time, halfLifeHours) }
    })
    const localPeak = findLocalPeak(raw, intakes, start, end, halfLifeHours)
    const highestValue = Math.max(LOW_RESIDUAL_REFERENCE_MG, bedtimeResidualTargetMg, ...raw.map(point => point.value))
    const step = Math.max(20, Math.ceil(highestValue / 40) * 10)
    const max = step * 4
    const x = (time: Date) => L + (time.getTime() - start.getTime()) / (end.getTime() - start.getTime()) * (W - L - R)
    const y = (value: number) => plotBottom - value / max * (plotBottom - T)
    const current = { time: now, value: totalLoadAt(intakes, now, halfLifeHours) }
    const past = [...raw.filter(point => point.time < now), current].map(point => ({ ...point, x: x(point.time), y: y(point.value) }))
    const future = [current, ...raw.filter(point => point.time > now)].map(point => ({ ...point, x: x(point.time), y: y(point.value) }))
    return { start, end, localPeak, step, x, y, current, past, future }
  }, [bedtimeResidualTargetMg, halfLifeHours, intakes, now])

  const currentX = chart.x(now)
  const currentY = chart.y(chart.current.value)
  const lowResidualY = chart.y(LOW_RESIDUAL_REFERENCE_MG)
  const showLowResidualReference = bedtimeResidualTargetMg !== LOW_RESIDUAL_REFERENCE_MG
  const bedtimeTargetY = chart.y(bedtimeResidualTargetMg)
  const pastLine = path(chart.past)
  const futureLine = path(chart.future)
  const pastArea = `${pastLine} L${currentX},${plotBottom} L${chart.past[0].x},${plotBottom} Z`
  const futureArea = `${futureLine} L${chart.future.at(-1)?.x},${plotBottom} L${currentX},${plotBottom} Z`
  const ticks = Array.from({ length: 5 }, (_, index) => index * chart.step)
  const timeTicks = alignedTimeTicks(chart.start, chart.end)
  const bedtimeValue = bedtime ? totalLoadAt(intakes, bedtime, halfLifeHours) : null
  const bedtimePoint = bedtime && bedtimeValue !== null && bedtime >= chart.start && bedtime <= chart.end
    ? { x: chart.x(bedtime), y: chart.y(bedtimeValue), value: bedtimeValue }
    : null
  const visibleIntakes = intakes.filter(intake => {
    const time = new Date(intake.startedAt)
    return time >= chart.start && time <= chart.end
  }).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const axisStyle = { '--axis-font-size': `${axisFontSize}px` } as CSSProperties

  return <div className="caffeine-chart-wrap" ref={scrollRef}>
    <svg className="caffeine-chart" style={axisStyle} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Estimated caffeine over the previous 24 hours and next 16 hours">
      <defs>
        <linearGradient id="caffeinePast" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d99b43" stopOpacity=".4" /><stop offset="1" stopColor="#d99b43" stopOpacity=".02" /></linearGradient>
        <linearGradient id="caffeineFuture" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d99b43" stopOpacity=".13" /><stop offset="1" stopColor="#d99b43" stopOpacity="0" /></linearGradient>
      </defs>
      {ticks.map(value => <g key={value}><line x1={L} x2={W - R} y1={chart.y(value)} y2={chart.y(value)} className="chart-grid horizontal" /><text className="axis-label" x={L - 10} y={chart.y(value) + axisFontSize / 3} textAnchor="end">{value}</text></g>)}
      <text x="14" y={T - 12} className="axis-unit">mg</text>
      {timeTicks.map(time => <g key={time.toISOString()}><line x1={chart.x(time)} x2={chart.x(time)} y1={T} y2={plotBottom} className="chart-grid" /><text className="axis-label" x={chart.x(time)} y={plotBottom + 29} textAnchor="middle">{timeLabel(time)}</text></g>)}
      {showLowResidualReference && <><line x1={L} x2={W - R} y1={lowResidualY} y2={lowResidualY} className="residual-line" /><text x={W - R} y={lowResidualY + 15} textAnchor="end" className="residual-label">Low residual · {LOW_RESIDUAL_REFERENCE_MG} mg</text></>}
      <line x1={L} x2={W - R} y1={bedtimeTargetY} y2={bedtimeTargetY} className="sleep-caution-line" />
      <text x={W - R} y={bedtimeTargetY - 9} textAnchor="end" className="sleep-caution-label">Bedtime planning target · {bedtimeResidualTargetMg} mg</text>
      {bedtimePoint && <g><line x1={bedtimePoint.x} x2={bedtimePoint.x} y1={T} y2={plotBottom} className="bedtime-line" /><text x={bedtimePoint.x - 5} y={T + 13} textAnchor="end" className="bedtime-label">Bedtime</text></g>}
      <path d={pastArea} fill="url(#caffeinePast)" /><path d={futureArea} fill="url(#caffeineFuture)" /><path d={pastLine} className="caffeine-line past" /><path d={futureLine} className="caffeine-line future" />
      {bedtimePoint && <g className="bedtime-intersection"><circle cx={bedtimePoint.x} cy={bedtimePoint.y} r="5" fill="#a897df" stroke="var(--surface)" strokeWidth="3" /><text x={bedtimePoint.x - 10} y={Math.max(T + 31, bedtimePoint.y - 11)} textAnchor="end" fill="#c1b2ee" fontSize="11" fontWeight="700" paintOrder="stroke" stroke="var(--surface)" strokeWidth="4" strokeLinejoin="round">{Math.round(bedtimePoint.value)} mg</text></g>}
      {chart.localPeak && <g className="peak-marker"><circle cx={chart.x(chart.localPeak.time)} cy={chart.y(chart.localPeak.value)} r="6" /><text x={chart.x(chart.localPeak.time)} y={Math.max(T + 16, chart.y(chart.localPeak.value) - 15)} textAnchor={chart.x(chart.localPeak.time) > W - 180 ? 'end' : 'middle'}>Peak {Math.round(chart.localPeak.value)} mg · {timeLabel(chart.localPeak.time)}</text></g>}
      <g className="current-marker"><line x1={currentX} x2={currentX} y1={T} y2={plotBottom} className="now-line" /><circle cx={currentX} cy={currentY} r="8" className="now-dot" /><text x={currentX + 12} y={Math.max(T + 18, currentY - 13)}>Now {Math.round(chart.current.value)} mg</text></g>
      {visibleIntakes.map((intake, index) => { const x = chart.x(new Date(intake.startedAt)); const lane = index % 2; return <g className="intake-marker" key={intake.id}><line x1={x} x2={x} y1={plotBottom} y2={plotBottom + 35 + lane * 27} /><circle cx={x} cy={plotBottom} r="4" /><text x={x + 5} y={plotBottom + 43 + lane * 27}><tspan>{intake.source}</tspan><tspan x={x + 5} dy="13">{intake.caffeineMg} mg · {intake.durationMinutes} min</tspan></text></g> })}
    </svg>
  </div>
}
