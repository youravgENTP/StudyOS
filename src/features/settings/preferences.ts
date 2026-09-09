import { useSyncExternalStore } from 'react'

const AXIS_FONT_KEY = 'studyos:caffeine-axis-font-size'
const SETTINGS_CHANGED = 'studyos:settings-changed'
export const DEFAULT_AXIS_FONT_SIZE = 14

export function getCaffeineAxisFontSize() {
  const raw = localStorage.getItem(AXIS_FONT_KEY)
  if (raw === null) return DEFAULT_AXIS_FONT_SIZE
  const stored = Number(raw)
  return Number.isFinite(stored) ? Math.min(20, Math.max(12, stored)) : DEFAULT_AXIS_FONT_SIZE
}

export function setCaffeineAxisFontSize(value: number) {
  localStorage.setItem(AXIS_FONT_KEY, String(Math.min(20, Math.max(12, value))))
  window.dispatchEvent(new Event(SETTINGS_CHANGED))
}

export function useCaffeineAxisFontSize() {
  return useSyncExternalStore(listener => {
    window.addEventListener(SETTINGS_CHANGED, listener)
    window.addEventListener('storage', listener)
    return () => {
      window.removeEventListener(SETTINGS_CHANGED, listener)
      window.removeEventListener('storage', listener)
    }
  }, getCaffeineAxisFontSize, () => DEFAULT_AXIS_FONT_SIZE)
}
