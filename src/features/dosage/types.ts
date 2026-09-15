export type DosagePkProfile = {
  analyte: string
  tmaxMinMinutes: number | null
  tmaxMaxMinutes: number | null
  halfLifeMinMinutes: number | null
  halfLifeMaxMinutes: number | null
  bioavailabilityMinPercent: number | null
  bioavailabilityMaxPercent: number | null
  absorptionNotes: string
  modelStatus: 'reference_only' | 'validated'
  sourceTitle: string
  sourceUrl: string
}

export type DosageCatalogItem = {
  key: string
  displayName: string
  aliases: string[]
  ingredientName: string
  category: 'medication' | 'supplement' | 'other'
  strengthValue: number
  strengthUnit: string
  defaultDoseQuantity: number
  doseForm: string
  route: string
  manufacturer: string | null
  pkProfiles: DosagePkProfile[]
}

export type DosageIntake = {
  id: string
  catalogKey: string
  productName: string
  ingredientName: string
  doseQuantity: number
  doseUnit: string
  ingredientAmount: number
  ingredientUnit: string
  route: string
  takenAt: string
  note: string | null
}
