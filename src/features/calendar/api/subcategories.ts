import { dataApi } from '../../../lib/neon/data'
import type { ScheduleSubcategory, ScheduleSubcategoryInput } from '../types'

const failure = (error: unknown) => new Error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Subcategory request failed')
const changed = () => window.dispatchEvent(new Event('studyos:calendar-changed'))
const map = (row: Record<string, unknown>): ScheduleSubcategory => ({ id: String(row.id), category: row.category as ScheduleSubcategory['category'], name: String(row.name), color: String(row.color), position: Number(row.position), archivedAt: row.archived_at ? String(row.archived_at) : null })

export async function listScheduleSubcategories(includeArchived = false) {
  let query = dataApi.from('schedule_subcategories').select('id,category,name,color,position,archived_at').order('category').order('position')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw failure(error)
  return (data ?? []).map(row => map(row as Record<string, unknown>))
}

export async function createScheduleSubcategory(input: ScheduleSubcategoryInput) {
  const { count, error: countError } = await dataApi.from('schedule_subcategories').select('id', { count: 'exact', head: true }).eq('category', input.category)
  if (countError) throw failure(countError)
  const { error } = await dataApi.from('schedule_subcategories').insert({ category: input.category, name: input.name.trim(), color: input.color, position: count ?? 0 })
  if (error) throw failure(error); changed()
}

export async function updateScheduleSubcategory(id: string, input: ScheduleSubcategoryInput) {
  const { error } = await dataApi.from('schedule_subcategories').update({ category: input.category, name: input.name.trim(), color: input.color }).eq('id', id)
  if (error) throw failure(error); changed()
}

export async function archiveScheduleSubcategory(id: string) {
  const { error } = await dataApi.from('schedule_subcategories').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw failure(error); changed()
}
