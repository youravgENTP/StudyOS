import type { CaffeineIntake } from './types'

export const GENERIC_SHOT_MG = 75
export const GENERIC_SINGLE_SHOT_MG = GENERIC_SHOT_MG
export const GENERIC_DOUBLE_SHOT_MG = GENERIC_SHOT_MG * 2
export const DEFAULT_DURATION_MINUTES = 60
export const DEFAULT_HALF_LIFE_HOURS = 5
export const LOW_RESIDUAL_REFERENCE_MG = 40
export const DEFAULT_BEDTIME_RESIDUAL_TARGET_MG = 30

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

export function calculateLatestAllowableIntakeTime({
  existingIntakes,
  hypotheticalDoseMg,
  hypotheticalDurationMinutes,
  bedtime,
  targetResidualMg,
  halfLifeHours = DEFAULT_HALF_LIFE_HOURS,
}: {
  existingIntakes: CaffeineIntake[]
  hypotheticalDoseMg: number
  hypotheticalDurationMinutes: number
  bedtime: Date
  targetResidualMg: number
  halfLifeHours?: number
}) {
  if (hypotheticalDoseMg <= 0 || hypotheticalDurationMinutes <= 0 || targetResidualMg <= 0) {
    throw new RangeError('Dose, duration, and bedtime target must be greater than zero.')
  }
  if (halfLifeHours <= 0) throw new RangeError('Half-life must be greater than zero.')

  const existingBedtimeLoad = totalLoadAt(existingIntakes, bedtime, halfLifeHours)
  if (existingBedtimeLoad >= targetResidualMg) return null

  const minute = 60_000
  const hour = 60 * minute
  const latestStart = bedtime.getTime() - hypotheticalDurationMinutes * minute
  const projectedLoad = (startedAt: number) => totalLoadAt([
    ...existingIntakes,
    {
      id: '__hypothetical__',
      source: 'Reference dose',
      caffeineMg: hypotheticalDoseMg,
      startedAt: new Date(startedAt).toISOString(),
      durationMinutes: hypotheticalDurationMinutes,
      note: null,
    },
  ], bedtime, halfLifeHours)

  if (projectedLoad(latestStart) <= targetResidualMg) return new Date(Math.floor(latestStart / minute) * minute)

  let lookback = 24 * hour
  let earliest = latestStart - lookback
  const maximumLookback = 366 * 24 * hour
  while (projectedLoad(earliest) > targetResidualMg && lookback < maximumLookback) {
    lookback *= 2
    earliest = latestStart - lookback
  }
  if (projectedLoad(earliest) > targetResidualMg) return null

  let allowed = earliest
  let disallowed = latestStart
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const candidate = allowed + (disallowed - allowed) / 2
    if (projectedLoad(candidate) <= targetResidualMg) allowed = candidate
    else disallowed = candidate
  }

  return new Date(Math.floor(allowed / minute) * minute)
}
