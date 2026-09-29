import test from 'node:test'
import assert from 'node:assert/strict'
import { localMidnightBoundaries } from './model.ts'

test('returns the local midnight crossed by a running timer', () => {
  const boundaries = localMidnightBoundaries(
    new Date(2026, 8, 29, 23, 30),
    new Date(2026, 8, 30, 1, 0),
  )

  assert.equal(boundaries.length, 1)
  assert.deepEqual(
    [boundaries[0].getFullYear(), boundaries[0].getMonth(), boundaries[0].getDate(), boundaries[0].getHours(), boundaries[0].getMinutes()],
    [2026, 8, 30, 0, 0],
  )
})

test('returns every missed local midnight in chronological order', () => {
  const boundaries = localMidnightBoundaries(
    new Date(2026, 8, 28, 23, 30),
    new Date(2026, 8, 30, 1, 0),
  )

  assert.equal(boundaries.length, 2)
  assert.ok(boundaries[0] < boundaries[1])
  assert.equal(boundaries[1].getDate(), 30)
  assert.equal(boundaries[1].getHours(), 0)
})

test('returns no boundary before midnight is reached', () => {
  assert.deepEqual(localMidnightBoundaries(
    new Date(2026, 8, 29, 22, 0),
    new Date(2026, 8, 29, 23, 59, 59),
  ), [])
})
