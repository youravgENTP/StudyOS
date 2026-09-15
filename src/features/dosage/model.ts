import type { DosageCatalogItem, DosageIntake, DosagePkProfile } from './types'

const MINUTE = 60_000

function exposureForParameters(elapsedMinutes: number, tmaxMinutes: number, halfLifeMinutes: number) {
  if (elapsedMinutes < 0) return 0
  if (elapsedMinutes <= tmaxMinutes) return elapsedMinutes / tmaxMinutes * 100
  return 100 * Math.pow(0.5, (elapsedMinutes - tmaxMinutes) / halfLifeMinutes)
}

export function medicationExposureRangeAt(
  intakes: readonly DosageIntake[],
  catalogItem: DosageCatalogItem,
  profile: DosagePkProfile,
  time: Date,
): { min: number; max: number } | null {
  if (profile.tmaxMinMinutes === null || profile.halfLifeMinMinutes === null) return null
  const tmaxValues = [...new Set([profile.tmaxMinMinutes, profile.tmaxMaxMinutes ?? profile.tmaxMinMinutes])]
  const halfLifeValues = [...new Set([profile.halfLifeMinMinutes, profile.halfLifeMaxMinutes ?? profile.halfLifeMinMinutes])]
  let minimum = 0
  let maximum = 0

  for (const intake of intakes) {
    if (intake.catalogKey !== catalogItem.key) continue
    const elapsedMinutes = (time.getTime() - new Date(intake.takenAt).getTime()) / MINUTE
    const doseRatio = intake.ingredientUnit === catalogItem.strengthUnit
      ? intake.ingredientAmount / catalogItem.strengthValue
      : intake.doseQuantity
    const candidates = tmaxValues.flatMap(tmax => halfLifeValues.map(halfLife => exposureForParameters(elapsedMinutes, tmax, halfLife) * doseRatio))
    minimum += Math.min(...candidates)
    maximum += Math.max(...candidates)
  }

  return { min: minimum, max: maximum }
}
