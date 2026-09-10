import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRecommendedCutoff, calculateRemainingCaffeine, calculateTimeToResidual, nextBedtimeAt } from './model.ts'

const closeTo = (actual: number, expected: number, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

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
