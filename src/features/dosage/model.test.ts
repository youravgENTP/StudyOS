import assert from 'node:assert/strict'
import test from 'node:test'
import { medicationExposureRangeAt } from './model.ts'
import type { DosageCatalogItem, DosageIntake, DosagePkProfile } from './types.ts'

const profile: DosagePkProfile = {
  analyte: 'Example', tmaxMinMinutes: 60, tmaxMaxMinutes: 60,
  halfLifeMinMinutes: 120, halfLifeMaxMinutes: 120,
  bioavailabilityMinPercent: null, bioavailabilityMaxPercent: null,
  absorptionNotes: '', modelStatus: 'reference_only', sourceTitle: '', sourceUrl: '',
}
const catalog: DosageCatalogItem = {
  key: 'example', displayName: 'Example 500 mg', aliases: [], ingredientName: 'Example', category: 'medication',
  strengthValue: 500, strengthUnit: 'mg', doseForm: 'Tablet', route: 'Oral', manufacturer: null, pkProfiles: [profile],
}
const intake: DosageIntake = {
  id: 'dose-1', catalogKey: 'example', productName: 'Example 500 mg', ingredientName: 'Example',
  doseQuantity: 1, doseUnit: 'tablet', ingredientAmount: 500, ingredientUnit: 'mg', route: 'Oral', takenAt: '2026-09-15T09:00:00Z', note: null,
}

test('relative medication exposure peaks at 100% and halves after one half-life', () => {
  assert.deepEqual(medicationExposureRangeAt([intake], catalog, profile, new Date('2026-09-15T10:00:00Z')), { min: 100, max: 100 })
  const result = medicationExposureRangeAt([intake], catalog, profile, new Date('2026-09-15T12:00:00Z'))
  assert.ok(result)
  assert.equal(Math.round(result.min), 50)
  assert.equal(Math.round(result.max), 50)
})

test('repeated doses add as a relative index and can exceed 100%', () => {
  const second = { ...intake, id: 'dose-2', takenAt: '2026-09-15T10:00:00Z' }
  const result = medicationExposureRangeAt([intake, second], catalog, profile, new Date('2026-09-15T11:00:00Z'))
  assert.ok(result)
  assert.ok(result.max > 100)
})

test('a profile without enough timing data is not modeled', () => {
  assert.equal(medicationExposureRangeAt([intake], catalog, { ...profile, halfLifeMinMinutes: null }, new Date()), null)
})
