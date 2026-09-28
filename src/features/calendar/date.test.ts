import assert from 'node:assert/strict'
import test from 'node:test'
import { addIsoDays, shiftDateRange } from './date.ts'

test('calendar drag keeps the duration of a multi-day item', () => {
  assert.deepEqual(shiftDateRange('2026-09-28', '2026-10-02', '2026-11-10'), { start: '2026-11-10', end: '2026-11-14' })
})

test('calendar date shifting is stable across month and daylight-saving boundaries', () => {
  assert.equal(addIsoDays('2026-01-31', 1), '2026-02-01')
  assert.deepEqual(shiftDateRange('2026-03-07', '2026-03-09', '2026-10-31'), { start: '2026-10-31', end: '2026-11-02' })
})
