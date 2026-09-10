import type { CaffeineIntake } from './types'

export const GENERIC_ESPRESSO_SHOT_MG = 75
export const GENERIC_AMERICANO_SHOTS = 2
export const GENERIC_AMERICANO_MG = GENERIC_ESPRESSO_SHOT_MG * GENERIC_AMERICANO_SHOTS
export const DEFAULT_DURATION_MINUTES = 60
export const DEFAULT_HALF_LIFE_HOURS = 5
export const LOW_RESIDUAL_REFERENCE_MG = 40
export const SLEEP_CAUTION_REFERENCE_MG = 60
export const DEFAULT_CUTOFF_BUFFER_HOURS = 8

export function calculateRemainingCaffeine({ doseMg, elapsedHours, halfLifeHours = DEFAULT_HALF_LIFE_HOURS }: { doseMg: number; elapsedHours: number; halfLifeHours?: number }) {
  if (doseMg <= 0) return 0
  if (halfLifeHours <= 0) throw new RangeError('Half-life must be greater than zero.')
  if (elapsedHours <= 0) return doseMg
  return doseMg * 0.5 ** (elapsedHours / halfLifeHours)
}

export function calculateTimeToResidual({ doseMg, targetResidualMg, halfLifeHours = DEFAULT_HALF_LIFE_HOURS }: { doseMg: number; targetResidualMg: number; halfLifeHours?: number }) {
  if (doseMg <= 0 || targetResidualMg <= 0) throw new RangeError('Dose and target residual must be greater than zero.')
  if (halfLifeHours <= 0) throw new RangeError('Half-life must be greater than zero.')
  if (doseMg <= targetResidualMg) return 0
  return halfLifeHours * Math.log2(doseMg / targetResidualMg)
}

export function calculateRecommendedCutoff({ bedtime, bufferHours = DEFAULT_CUTOFF_BUFFER_HOURS }: { bedtime: Date; bufferHours?: number }) {
  return new Date(bedtime.getTime() - bufferHours * 3_600_000)
}

export function nextBedtimeAt(now: Date, bedtimeTime: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(bedtimeTime)
  if (!match) throw new RangeError('Bedtime must use HH:mm format.')
  const bedtime = new Date(now)
  bedtime.setHours(Number(match[1]), Number(match[2]), 0, 0)
  if (bedtime <= now) bedtime.setDate(bedtime.getDate() + 1)
  return bedtime
}

export function intakeLoadAt(intake: CaffeineIntake, time: Date, halfLifeHours = DEFAULT_HALF_LIFE_HOURS) {
  const elapsed = (time.getTime() - new Date(intake.startedAt).getTime()) / 3_600_000
  if (elapsed <= 0) return 0
  const duration = intake.durationMinutes / 60
  const eliminationRate = Math.log(2) / halfLifeHours
  const intakeRate = intake.caffeineMg / duration
  if (elapsed < duration) return intakeRate / eliminationRate * (1 - Math.exp(-eliminationRate * elapsed))
  const amountAtFinish = intakeRate / eliminationRate * (1 - Math.exp(-eliminationRate * duration))
  return calculateRemainingCaffeine({ doseMg: amountAtFinish, elapsedHours: elapsed - duration, halfLifeHours })
}

export function totalLoadAt(intakes: CaffeineIntake[], time: Date, halfLifeHours = DEFAULT_HALF_LIFE_HOURS) {
  return intakes.reduce((sum, intake) => sum + intakeLoadAt(intake, time, halfLifeHours), 0)
}
