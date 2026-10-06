import assert from 'node:assert/strict'
import test from 'node:test'
import { exampleDosageCatalogFile, parseDosageCatalogFile } from './catalogTransfer.ts'

test('the downloadable example follows the validated import contract', () => {
  const parsed = parseDosageCatalogFile(exampleDosageCatalogFile)
  assert.equal(parsed.medications.length, 1)
  assert.equal(parsed.medications[0].pkProfiles[0].halfLifeMinutes.min, 300)
})

test('rejects duplicate keys and invalid pharmacokinetic ranges', () => {
  const duplicate = { ...exampleDosageCatalogFile, medications: [exampleDosageCatalogFile.medications[0], exampleDosageCatalogFile.medications[0]] }
  assert.throws(() => parseDosageCatalogFile(duplicate), /\uC911\uBCF5/)
  const invalid = structuredClone(exampleDosageCatalogFile)
  invalid.medications[0].pkProfiles[0].halfLifeMinutes = { min: 500, max: 100 }
  assert.throws(() => parseDosageCatalogFile(invalid), /\uBC18\uAC10\uAE30/)
})
