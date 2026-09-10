import assert from 'node:assert/strict'
import test from 'node:test'
import { alignedTimeTicks } from './chartTime.ts'
import { DEFAULT_CAFFEINE_PRESETS } from './defaultPresets.ts'
import { calculateRecommendedCutoff, calculateRemainingCaffeine, calculateTimeToResidual, nextBedtimeAt } from './model.ts'

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

test('01:00 bedtime with an eight-hour buffer yields 17:00 on the previous date', () => {
  const bedtime = new Date(2026, 8, 10, 1, 0)
  const cutoff = calculateRecommendedCutoff({ bedtime, bufferHours: 8 })
  assert.equal(cutoff.getFullYear(), 2026)
  assert.equal(cutoff.getMonth(), 8)
  assert.equal(cutoff.getDate(), 9)
  assert.equal(cutoff.getHours(), 17)
  assert.equal(cutoff.getMinutes(), 0)
})

test('an after-midnight bedtime resolves to the next occurrence', () => {
  const now = new Date(2026, 8, 9, 23, 0)
  const bedtime = nextBedtimeAt(now, '01:00')
  assert.equal(bedtime.getDate(), 10)
  assert.equal(bedtime.getHours(), 1)
})
