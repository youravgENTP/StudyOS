import assert from 'node:assert/strict'
import test from 'node:test'
import { alignedTimeTicks } from './chartTime.ts'
import { DEFAULT_CAFFEINE_PRESETS } from './defaultPresets.ts'
import { calculateLatestAllowableIntakeTime, calculateRemainingCaffeine, calculateTimeToResidual, nextBedtimeAt, totalLoadAt } from './model.ts'
import type { CaffeineIntake } from './types.ts'

const closeTo = (actual: number, expected: number, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

test('chart time labels align to a half-hour boundary', () => {
  const ticksAfterHalfPast = alignedTimeTicks(new Date(2026, 8, 10, 11, 26, 48), new Date(2026, 8, 11, 3, 26))
  assert.equal(ticksAfterHalfPast[0].getHours(), 11)
  assert.equal(ticksAfterHalfPast[0].getMinutes(), 30)
  assert.ok(ticksAfterHalfPast.every(tick => tick.getMinutes() === 30 && tick.getSeconds() === 0))

  const ticksOnTheHour = alignedTimeTicks(new Date(2026, 8, 10, 11, 44), new Date(2026, 8, 11, 3, 44))
  assert.equal(ticksOnTheHour[0].getHours(), 12)
  assert.equal(ticksOnTheHour[0].getMinutes(), 0)
  assert.ok(ticksOnTheHour.every(tick => tick.getMinutes() === 0 && tick.getSeconds() === 0))

  const ticksAfterExactBoundary = alignedTimeTicks(new Date(2026, 8, 10, 11, 30, 1), new Date(2026, 8, 10, 16, 0))
  assert.equal(ticksAfterExactBoundary[0].getHours(), 12)
  assert.equal(ticksAfterExactBoundary[0].getMinutes(), 0)
})

test('generic shot presets use 75 mg per shot and one-hour intake windows', () => {
  const single = DEFAULT_CAFFEINE_PRESETS.find(preset => preset.id === 'single-shot')
  const double = DEFAULT_CAFFEINE_PRESETS.find(preset => preset.id === 'double-shot')
  assert.deepEqual(single && { dose: single.caffeineMg, duration: single.durationMinutes }, { dose: 75, duration: 60 })
  assert.deepEqual(double && { dose: double.caffeineMg, duration: double.durationMinutes }, { dose: 150, duration: 60 })
})

test('150 mg follows a five-hour exponential half-life', () => {
  closeTo(calculateRemainingCaffeine({ doseMg: 150, elapsedHours: 0, halfLifeHours: 5 }), 150)
  closeTo(calculateRemainingCaffeine({ doseMg: 150, elapsedHours: 5, halfLifeHours: 5 }), 75)
  closeTo(calculateRemainingCaffeine({ doseMg: 150, elapsedHours: 8, halfLifeHours: 5 }), 49.48)
  closeTo(calculateRemainingCaffeine({ doseMg: 150, elapsedHours: 10, halfLifeHours: 5 }), 37.5)
})

test('time-to-residual calculation matches reference values', () => {
  closeTo(calculateTimeToResidual({ doseMg: 150, targetResidualMg: 60, halfLifeHours: 5 }), 6.61)
  closeTo(calculateTimeToResidual({ doseMg: 150, targetResidualMg: 40, halfLifeHours: 5 }), 9.53)
})

test('an after-midnight bedtime resolves to the next occurrence', () => {
  const now = new Date(2026, 8, 9, 23, 0)
  const bedtime = nextBedtimeAt(now, '01:00')
  assert.equal(bedtime.getDate(), 10)
  assert.equal(bedtime.getHours(), 1)
})

const bedtime = new Date('2026-09-11T00:00:00+09:00')
const referenceDose = { hypotheticalDoseMg: 150, hypotheticalDurationMinutes: 60, bedtime, targetResidualMg: 30 }
const intake = (startedAt: Date, caffeineMg = 75, durationMinutes = 60): CaffeineIntake => ({ id: startedAt.toISOString(), source: 'Test', caffeineMg, startedAt: startedAt.toISOString(), durationMinutes, note: null })
const projectedWithReference = (existingIntakes: CaffeineIntake[], start: Date, durationMinutes = 60, halfLifeHours = 5) => totalLoadAt([
  ...existingIntakes,
  intake(start, 150, durationMinutes),
], bedtime, halfLifeHours)

test('latest intake time uses the full intake model when no caffeine exists', () => {
  const latest = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose })
  assert.ok(latest)
  assert.ok(projectedWithReference([], latest) <= referenceDose.targetResidualMg)
})

test('existing caffeine moves the latest allowable intake earlier', () => {
  const existing = [intake(new Date(bedtime.getTime() - 8 * 3_600_000))]
  const withoutExisting = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose })
  const withExisting = calculateLatestAllowableIntakeTime({ existingIntakes: existing, ...referenceDose })
  assert.ok(withoutExisting && withExisting)
  assert.ok(withExisting < withoutExisting)
})

test('no additional intake is allowed when existing bedtime load reaches the target', () => {
  const existing = [intake(new Date(bedtime.getTime() - 2 * 3_600_000), 150)]
  assert.equal(calculateLatestAllowableIntakeTime({ existingIntakes: existing, ...referenceDose }), null)
})

test('a longer half-life moves the allowable intake earlier', () => {
  const shorter = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose, halfLifeHours: 4 })
  const longer = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose, halfLifeHours: 8 })
  assert.ok(shorter && longer)
  assert.ok(longer < shorter)
})

test('hypothetical intake duration changes the result using the same input model', () => {
  const quick = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose, hypotheticalDurationMinutes: 15 })
  const slow = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose, hypotheticalDurationMinutes: 90 })
  assert.ok(quick && slow)
  assert.notEqual(quick.getTime(), slow.getTime())
  assert.ok(projectedWithReference([], quick, 15) <= referenceDose.targetResidualMg)
  assert.ok(projectedWithReference([], slow, 90) <= referenceDose.targetResidualMg)
})

test('latest allowable boundary satisfies the target and one minute later exceeds it', () => {
  const latest = calculateLatestAllowableIntakeTime({ existingIntakes: [], ...referenceDose })
  assert.ok(latest)
  assert.ok(projectedWithReference([], latest) <= referenceDose.targetResidualMg)
  assert.ok(projectedWithReference([], new Date(latest.getTime() + 60_000)) > referenceDose.targetResidualMg)
})
