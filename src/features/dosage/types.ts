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
  sourceRetrievedAt: string
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
  archivedAt: string | null
  pkProfiles: DosagePkProfile[]
}

export type DosageCatalogFile = {
  format: 'studyos-medication-catalog'
  version: 1
  exportedAt: string
  medications: DosageCatalogTransferItem[]
}

export type DosageCatalogTransferProfile = {
  analyte: string
  tmaxMinutes: { min: number | null; max: number | null }
  halfLifeMinutes: { min: number | null; max: number | null }
  bioavailabilityPercent: { min: number | null; max: number | null }
  absorptionNotes: string
  modelStatus: 'reference_only' | 'validated'
  source: { title: string; url: string; retrievedAt: string }
}

export type DosageCatalogTransferItem = {
  key: string
  displayName: string
  aliases: string[]
  ingredientName: string
  category: DosageCatalogItem['category']
  strength: { value: number; unit: string }
  defaultDoseQuantity: number
  doseForm: string
  route: string
  manufacturer: string | null
  pkProfiles: DosageCatalogTransferProfile[]
}

export type DosageCatalogImportMode = 'merge' | 'update'
export type DosageCatalogImportResult = { inserted: number; updated: number; unchanged: number }

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
