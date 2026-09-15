import { dataApi } from '../../lib/neon/data'
import type { DosageCatalogItem, DosageIntake, DosagePkProfile } from './types'

const CHANGED = 'studyos:dosage-changed'
const notify = () => window.dispatchEvent(new Event(CHANGED))
export function onDosageChanged(listener: () => void) { window.addEventListener(CHANGED, listener); return () => window.removeEventListener(CHANGED, listener) }

function fail(error: unknown) {
  if (import.meta.env.DEV) console.error('[dosage]', error)
  return new Error('복용 기록을 저장하거나 불러오지 못했습니다.')
}

function profile(row: Record<string, unknown>): DosagePkProfile {
  return {
    analyte: String(row.analyte), tmaxMinMinutes: row.tmax_min_minutes === null ? null : Number(row.tmax_min_minutes),
    tmaxMaxMinutes: row.tmax_max_minutes === null ? null : Number(row.tmax_max_minutes),
    halfLifeMinMinutes: row.half_life_min_minutes === null ? null : Number(row.half_life_min_minutes),
    halfLifeMaxMinutes: row.half_life_max_minutes === null ? null : Number(row.half_life_max_minutes),
    bioavailabilityMinPercent: row.bioavailability_min_percent === null ? null : Number(row.bioavailability_min_percent),
    bioavailabilityMaxPercent: row.bioavailability_max_percent === null ? null : Number(row.bioavailability_max_percent),
    absorptionNotes: String(row.absorption_notes), modelStatus: row.model_status as DosagePkProfile['modelStatus'],
    sourceTitle: String(row.source_title), sourceUrl: String(row.source_url),
  }
}

export async function listDosageCatalog(): Promise<DosageCatalogItem[]> {
  const [catalogResult, profileResult] = await Promise.all([
    dataApi.from('dosage_catalog').select('key,display_name,aliases,ingredient_name,category,strength_value,strength_unit,default_dose_quantity,dose_form,route,manufacturer').order('display_name'),
    dataApi.from('dosage_pk_profiles').select('catalog_key,analyte,tmax_min_minutes,tmax_max_minutes,half_life_min_minutes,half_life_max_minutes,bioavailability_min_percent,bioavailability_max_percent,absorption_notes,model_status,source_title,source_url'),
  ])
  if (catalogResult.error || profileResult.error) throw fail(catalogResult.error ?? profileResult.error)
  return (catalogResult.data ?? []).map(raw => {
    const row = raw as Record<string, unknown>
    return {
      key: String(row.key), displayName: String(row.display_name), aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
      ingredientName: String(row.ingredient_name), category: row.category as DosageCatalogItem['category'], strengthValue: Number(row.strength_value),
      strengthUnit: String(row.strength_unit), defaultDoseQuantity: Number(row.default_dose_quantity), doseForm: String(row.dose_form), route: String(row.route), manufacturer: row.manufacturer ? String(row.manufacturer) : null,
      pkProfiles: (profileResult.data ?? []).filter(item => String((item as Record<string, unknown>).catalog_key) === String(row.key)).map(item => profile(item as Record<string, unknown>)),
    }
  })
}

function intake(row: Record<string, unknown>): DosageIntake {
  return {
    id: String(row.id), catalogKey: String(row.catalog_key), productName: String(row.product_name), ingredientName: String(row.ingredient_name),
    doseQuantity: Number(row.dose_quantity), doseUnit: String(row.dose_unit), ingredientAmount: Number(row.ingredient_amount), ingredientUnit: String(row.ingredient_unit),
    route: String(row.route), takenAt: String(row.taken_at), note: row.note ? String(row.note) : null,
  }
}

export async function listDosageIntakes(from: Date, to: Date): Promise<DosageIntake[]> {
  const { data, error } = await dataApi.from('dosage_intakes').select('id,catalog_key,product_name,ingredient_name,dose_quantity,dose_unit,ingredient_amount,ingredient_unit,route,taken_at,note').gte('taken_at', from.toISOString()).lt('taken_at', to.toISOString()).order('taken_at', { ascending: false })
  if (error) throw fail(error)
  return (data ?? []).map(row => intake(row as Record<string, unknown>))
}

export async function createDosageIntake(item: DosageCatalogItem, takenAt: Date): Promise<DosageIntake> {
  const { data, error } = await dataApi.from('dosage_intakes').insert({
    catalog_key: item.key, product_name: item.displayName, ingredient_name: item.ingredientName,
    dose_quantity: item.defaultDoseQuantity, dose_unit: item.doseForm.toLowerCase().includes('capsule') ? 'capsule' : 'tablet',
    ingredient_amount: item.strengthValue * item.defaultDoseQuantity, ingredient_unit: item.strengthUnit, route: item.route, taken_at: takenAt.toISOString(),
  }).select('id,catalog_key,product_name,ingredient_name,dose_quantity,dose_unit,ingredient_amount,ingredient_unit,route,taken_at,note').single()
  if (error) throw fail(error)
  notify()
  return intake(data as Record<string, unknown>)
}

export async function deleteDosageIntake(id: string) {
  const { error } = await dataApi.from('dosage_intakes').delete().eq('id', id)
  if (error) throw fail(error)
  notify()
}
