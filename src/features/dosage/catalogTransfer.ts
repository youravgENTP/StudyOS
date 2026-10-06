import type { DosageCatalogFile, DosageCatalogItem, DosageCatalogTransferItem, DosageCatalogTransferProfile, DosagePkProfile } from './types'

const categories = ['medication', 'supplement', 'other'] as const
const record = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
const text = (value: unknown, label: string, max = 500) => { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label}이(가) 올바르지 않습니다.`); return value.trim() }
const optionalText = (value: unknown, label: string, max = 500) => value == null || value === '' ? null : text(value, label, max)
const number = (value: unknown, label: string, min: number, max: number) => { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}이(가) 올바르지 않습니다.`); return value }
const nullableNumber = (value: unknown, label: string, min: number, max: number) => value == null ? null : number(value, label, min, max)

function range(value: unknown, label: string, min: number, max: number) {
  const item = record(value)
  if (!item) return { min: null, max: null }
  const minimum = nullableNumber(item.min, `${label} 최솟값`, min, max)
  const maximum = nullableNumber(item.max, `${label} 최댓값`, min, max)
  if ((minimum === null) !== (maximum === null) || (minimum !== null && maximum !== null && maximum < minimum)) throw new Error(`${label} 범위가 올바르지 않습니다.`)
  return { min: minimum, max: maximum }
}

function parseProfile(value: unknown): DosageCatalogTransferProfile {
  const item = record(value), source = record(item?.source)
  if (!item || !source) throw new Error('약동학 정보가 올바르지 않습니다.')
  const tmax = range(item.tmaxMinutes, 'Tmax', 0, 525_600)
  const halfLife = range(item.halfLifeMinutes, '반감기', 1, 5_256_000)
  const bioavailability = range(item.bioavailabilityPercent, '생체이용률', 0, 100)
  const retrievedAt = text(source.retrievedAt, '자료 확인일', 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrievedAt) || Number.isNaN(new Date(`${retrievedAt}T00:00:00Z`).getTime())) throw new Error('자료 확인일은 YYYY-MM-DD 형식이어야 합니다.')
  const sourceUrl = text(source.url, '근거 URL', 2000)
  try { const url = new URL(sourceUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error() } catch { throw new Error('근거 URL은 http 또는 https 주소여야 합니다.') }
  if (!['reference_only', 'validated'].includes(String(item.modelStatus))) throw new Error('지원하지 않는 모델 상태입니다.')
  return { analyte: text(item.analyte, '분석 성분', 160), tmaxMinutes: tmax, halfLifeMinutes: halfLife, bioavailabilityPercent: bioavailability, absorptionNotes: text(item.absorptionNotes, '흡수 참고사항', 4000), modelStatus: item.modelStatus as DosagePkProfile['modelStatus'], source: { title: text(source.title, '근거 제목', 500), url: sourceUrl, retrievedAt } }
}

function parseMedication(value: unknown): DosageCatalogTransferItem {
  const item = record(value), strength = record(item?.strength)
  if (!item || !strength) throw new Error('약물 정보가 올바르지 않습니다.')
  const key = text(item.key, '약물 key', 80)
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(key)) throw new Error(`${key}: key는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.`)
  if (!categories.includes(item.category as typeof categories[number])) throw new Error(`${key}: 지원하지 않는 종류입니다.`)
  if (!Array.isArray(item.aliases) || item.aliases.length > 50) throw new Error(`${key}: 별칭 목록이 올바르지 않습니다.`)
  if (!Array.isArray(item.pkProfiles) || item.pkProfiles.length > 20) throw new Error(`${key}: 약동학 정보가 너무 많습니다.`)
  return { key, displayName: text(item.displayName, `${key} 표시 이름`, 160), aliases: item.aliases.map(alias => text(alias, `${key} 별칭`, 160)), ingredientName: text(item.ingredientName, `${key} 성분명`, 240), category: item.category as DosageCatalogItem['category'], strength: { value: number(strength.value, `${key} 함량`, 0.01, 9_999_999), unit: text(strength.unit, `${key} 함량 단위`, 40) }, defaultDoseQuantity: number(item.defaultDoseQuantity, `${key} 기본 복용량`, 0.01, 1000), doseForm: text(item.doseForm, `${key} 제형`, 80), route: text(item.route, `${key} 투여 경로`, 80), manufacturer: optionalText(item.manufacturer, `${key} 제조사`, 160), pkProfiles: item.pkProfiles.map(parseProfile) }
}

export function parseDosageCatalogFile(value: unknown): DosageCatalogFile {
  const payload = record(value)
  if (!payload || payload.format !== 'studyos-medication-catalog' || payload.version !== 1 || !Array.isArray(payload.medications)) throw new Error('지원하지 않는 StudyOS 약물 카탈로그 파일입니다.')
  if (!payload.medications.length || payload.medications.length > 500) throw new Error('약물은 1개 이상 500개 이하로 포함해 주세요.')
  const medications = payload.medications.map(parseMedication)
  if (new Set(medications.map(item => item.key)).size !== medications.length) throw new Error('중복된 약물 key가 있습니다.')
  return { format: 'studyos-medication-catalog', version: 1, exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(), medications }
}

const profileJson = (profile: DosagePkProfile) => ({ analyte: profile.analyte, tmaxMinutes: { min: profile.tmaxMinMinutes, max: profile.tmaxMaxMinutes }, halfLifeMinutes: { min: profile.halfLifeMinMinutes, max: profile.halfLifeMaxMinutes }, bioavailabilityPercent: { min: profile.bioavailabilityMinPercent, max: profile.bioavailabilityMaxPercent }, absorptionNotes: profile.absorptionNotes, modelStatus: profile.modelStatus, source: { title: profile.sourceTitle, url: profile.sourceUrl, retrievedAt: profile.sourceRetrievedAt } })
const medicationJson = (item: DosageCatalogItem) => ({ key: item.key, displayName: item.displayName, aliases: item.aliases, ingredientName: item.ingredientName, category: item.category, strength: { value: item.strengthValue, unit: item.strengthUnit }, defaultDoseQuantity: item.defaultDoseQuantity, doseForm: item.doseForm, route: item.route, manufacturer: item.manufacturer, pkProfiles: item.pkProfiles.map(profileJson) })

export function buildDosageCatalogFile(items: DosageCatalogItem[], now = new Date()) {
  return { format: 'studyos-medication-catalog' as const, version: 1 as const, exportedAt: now.toISOString(), medications: items.filter(item => !item.archivedAt).map(medicationJson) }
}

export const exampleDosageCatalogFile = { format: 'studyos-medication-catalog' as const, version: 1 as const, exportedAt: new Date().toISOString(), medications: [{ key: 'example-medication-100', displayName: '예시약 100mg', aliases: ['예시약', 'Example Medication'], ingredientName: 'Example ingredient', category: 'medication', strength: { value: 100, unit: 'mg' }, defaultDoseQuantity: 1, doseForm: 'Tablet', route: 'Oral', manufacturer: 'Example Pharma', pkProfiles: [{ analyte: 'Example ingredient', tmaxMinutes: { min: 60, max: 120 }, halfLifeMinutes: { min: 300, max: 420 }, bioavailabilityPercent: { min: null, max: null }, absorptionNotes: '공식 자료에 근거한 흡수 특성을 입력하세요.', modelStatus: 'reference_only', source: { title: '공식 제품 정보', url: 'https://example.com/source', retrievedAt: new Date().toISOString().slice(0, 10) } }] }] }
