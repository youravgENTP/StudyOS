import { useSyncExternalStore } from 'react'
import { DEFAULT_BEDTIME_RESIDUAL_TARGET_MG, DEFAULT_HALF_LIFE_HOURS } from '../caffeine/model'

const AXIS_FONT_KEY = 'studyos:caffeine-axis-font-size'
const BEDTIME_KEY = 'studyos:bedtime'
const HALF_LIFE_KEY = 'studyos:caffeine-half-life-hours'
const BEDTIME_RESIDUAL_TARGET_KEY = 'studyos:bedtime-residual-target-mg'
const SETTINGS_CHANGED = 'studyos:settings-changed'
export const DEFAULT_AXIS_FONT_SIZE = 14

function subscribe(listener: () => void) {
  window.addEventListener(SETTINGS_CHANGED, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(SETTINGS_CHANGED, listener)
    window.removeEventListener('storage', listener)
  }
}

function changed() {
  window.dispatchEvent(new Event(SETTINGS_CHANGED))
}

export function getCaffeineAxisFontSize() {
  const raw = localStorage.getItem(AXIS_FONT_KEY)
  if (raw === null) return DEFAULT_AXIS_FONT_SIZE
  const stored = Number(raw)
  return Number.isFinite(stored) ? Math.min(20, Math.max(12, stored)) : DEFAULT_AXIS_FONT_SIZE
}

export function setCaffeineAxisFontSize(value: number) {
  localStorage.setItem(AXIS_FONT_KEY, String(Math.min(20, Math.max(12, value))))
  changed()
}

export function getBedtime() {
  const stored = localStorage.getItem(BEDTIME_KEY)
  return stored && /^\d{2}:\d{2}$/.test(stored) ? stored : ''
}

export function setBedtime(value: string) {
  if (value) localStorage.setItem(BEDTIME_KEY, value)
  else localStorage.removeItem(BEDTIME_KEY)
  changed()
}

export function getCaffeineHalfLifeHours() {
  const stored = Number(localStorage.getItem(HALF_LIFE_KEY))
  return Number.isFinite(stored) && stored >= 2 && stored <= 10 ? stored : DEFAULT_HALF_LIFE_HOURS
}

export function setCaffeineHalfLifeHours(value: number) {
  localStorage.setItem(HALF_LIFE_KEY, String(Math.min(10, Math.max(2, value))))
  changed()
}

export function getBedtimeResidualTargetMg() {
  const stored = Number(localStorage.getItem(BEDTIME_RESIDUAL_TARGET_KEY))
  return Number.isFinite(stored) && stored >= 20 && stored <= 60 ? stored : DEFAULT_BEDTIME_RESIDUAL_TARGET_MG
}

export function setBedtimeResidualTargetMg(value: number) {
  localStorage.setItem(BEDTIME_RESIDUAL_TARGET_KEY, String(Math.min(60, Math.max(20, value))))
  changed()
}

export function useCaffeineAxisFontSize() {
  return useSyncExternalStore(subscribe, getCaffeineAxisFontSize, () => DEFAULT_AXIS_FONT_SIZE)
}

export function useBedtime() {
  return useSyncExternalStore(subscribe, getBedtime, () => '')
}

export function useCaffeineHalfLifeHours() {
  return useSyncExternalStore(subscribe, getCaffeineHalfLifeHours, () => DEFAULT_HALF_LIFE_HOURS)
}

export function useBedtimeResidualTargetMg() {
  return useSyncExternalStore(subscribe, getBedtimeResidualTargetMg, () => DEFAULT_BEDTIME_RESIDUAL_TARGET_MG)
}
