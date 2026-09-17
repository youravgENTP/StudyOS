import assert from 'node:assert/strict'
import test from 'node:test'
import { heatmapIntensity, normalizeHabitValue } from './model.ts'

test('binary values are limited to zero or one', () => { assert.equal(normalizeHabitValue('binary', 7), 1); assert.equal(normalizeHabitValue('binary', -2), 0) })
test('counter values are non-negative integers', () => { assert.equal(normalizeHabitValue('counter', 3.8), 3); assert.equal(normalizeHabitValue('counter', -1), 0) })
test('counter heatmap intensity is bounded', () => { assert.equal(heatmapIntensity(0, 20), 0); assert.equal(heatmapIntensity(1, 20), 1); assert.equal(heatmapIntensity(200, 20), 5) })
