import type { Habit } from './types'

export function normalizeHabitValue(mode: Habit['trackingMode'], value: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  return mode === 'binary' ? Math.min(1, safe) : safe
}

export function heatmapIntensity(value: number, visibleMax: number) {
  if (value <= 0) return 0
  const ratio = Math.min(1, value / Math.max(1, visibleMax))
  return Math.min(5, Math.max(1, Math.ceil(ratio * 5)))
}
