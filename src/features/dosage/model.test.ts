import assert from 'node:assert/strict'
import test from 'node:test'
import { medicationExposureRangeAt, medicationExposureTimeWindow } from './model.ts'
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

test('a previous-day intake still contributes after midnight', () => {
  const previousDay = { ...intake, takenAt: '2026-09-15T23:00:00Z' }
  const result = medicationExposureRangeAt([previousDay], catalog, profile, new Date('2026-09-16T02:00:00Z'))
  assert.ok(result)
  assert.equal(Math.round(result.min), 50)
})

test('different medications remain independently calculated', () => {
  const otherCatalog = { ...catalog, key: 'other', displayName: 'Other medicine' }
  const otherIntake = { ...intake, id: 'other-dose', catalogKey: 'other' }
  const onlyExample = medicationExposureRangeAt([intake, otherIntake], catalog, profile, new Date('2026-09-15T10:00:00Z'))
  const onlyOther = medicationExposureRangeAt([intake, otherIntake], otherCatalog, profile, new Date('2026-09-15T10:00:00Z'))
  assert.deepEqual(onlyExample, { min: 100, max: 100 })
  assert.deepEqual(onlyOther, { min: 100, max: 100 })
})

test('exposure is zero before an intake', () => {
  assert.deepEqual(medicationExposureRangeAt([intake], catalog, profile, new Date('2026-09-15T08:59:00Z')), { min: 0, max: 0 })
})

test('Tmax and half-life ranges produce an uncertainty envelope', () => {
  const ranged = { ...profile, tmaxMinMinutes: 30, tmaxMaxMinutes: 90, halfLifeMinMinutes: 60, halfLifeMaxMinutes: 240 }
  const result = medicationExposureRangeAt([intake], catalog, ranged, new Date('2026-09-15T11:00:00Z'))
  assert.ok(result)
  assert.ok(result.min < result.max)
})

test('rolling chart uses a seven-day calculation lookback around a 24h/36h view', () => {
  const now = new Date('2026-09-16T12:00:00Z')
  const window = medicationExposureTimeWindow(now)
  assert.equal((now.getTime() - window.visibleStart.getTime()) / 3_600_000, 24)
  assert.equal((window.visibleEnd.getTime() - now.getTime()) / 3_600_000, 36)
  assert.equal((now.getTime() - window.fetchStart.getTime()) / 86_400_000, 7)
  assert.equal(window.fetchEnd.toISOString(), window.visibleEnd.toISOString())
})
