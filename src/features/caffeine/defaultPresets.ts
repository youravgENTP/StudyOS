import { GENERIC_DOUBLE_SHOT_MG, GENERIC_SINGLE_SHOT_MG } from './model.ts'
import type { CaffeinePreset } from './types'

export const DEFAULT_CAFFEINE_PRESETS: CaffeinePreset[] = [
  { id: 'single-shot', name: '싱글샷', caffeineMg: GENERIC_SINGLE_SHOT_MG, kind: 'drink', durationMinutes: 60, color: '#8a8f98', builtIn: true },
  { id: 'double-shot', name: '더블샷', caffeineMg: GENERIC_DOUBLE_SHOT_MG, kind: 'drink', durationMinutes: 60, color: '#8a8f98', builtIn: true },
  { id: 'tablet-50', name: '카페인 50 mg', caffeineMg: 50, kind: 'tablet', durationMinutes: 45, color: '#7fa7d8', builtIn: true },
  { id: 'tablet-100', name: '카페인 100 mg', caffeineMg: 100, kind: 'tablet', durationMinutes: 45, color: '#9b83cf', builtIn: true },
]
