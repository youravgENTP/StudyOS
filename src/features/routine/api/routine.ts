import { dataApi } from '../../../lib/neon/data'
import type { RoutineItem, RoutineItemInput, RoutineTemplate } from '../types'

const CHANGED = 'studyos:routine-changed'
const notify = () => window.dispatchEvent(new Event(CHANGED))

export function onRoutineChanged(listener: () => void) {
  window.addEventListener(CHANGED, listener)
  return () => window.removeEventListener(CHANGED, listener)
}

function failure(operation: string, userMessage: string, error: unknown) {
  if (import.meta.env.DEV) console.error(`[routine] ${operation}`, error)
  return new Error(userMessage)
}

function mapItem(row: Record<string, unknown>): RoutineItem {
  return {
    id: String(row.id),
    position: Number(row.position),
    scheduledTime: row.scheduled_time ? String(row.scheduled_time).slice(0, 5) : null,
    title: String(row.title),
    details: row.details ? String(row.details) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
  }
}

export async function getTemplate(weekday: number): Promise<RoutineTemplate> {
  let { data, error } = await dataApi.from('routine_templates').select('id,weekday').eq('weekday', weekday).maybeSingle()
  if (error) throw failure('load template', '루틴 템플릿을 불러오지 못했습니다.', error)
  if (!data) {
    const result = await dataApi.from('routine_templates').insert({ weekday }).select('id,weekday').single()
    if (result.error) throw failure('create template', '루틴 템플릿을 만들지 못했습니다.', result.error)
    data = result.data
  }
  return { id: String(data.id), weekday: Number(data.weekday) }
}

export async function listTemplateItems(templateId: string) {
  const { data, error } = await dataApi.from('routine_template_items').select('id,position,scheduled_time,title,details').eq('template_id', templateId).order('position')
  if (error) throw failure('load template items', '루틴 템플릿을 불러오지 못했습니다.', error)
  return (data ?? []).map(row => mapItem(row as Record<string, unknown>))
}

export async function saveTemplateItem(templateId: string, input: RoutineItemInput, id?: string) {
  if (id) {
    const { error } = await dataApi.from('routine_template_items').update({ title: input.title.trim(), scheduled_time: input.scheduledTime, details: input.details?.trim() || null }).eq('id', id)
    if (error) throw failure('update template item', '루틴 항목을 저장하지 못했습니다.', error)
  } else {
    const { count, error } = await dataApi.from('routine_template_items').select('id', { count: 'exact', head: true }).eq('template_id', templateId)
    if (error) throw failure('count template items', '루틴 항목을 저장하지 못했습니다.', error)
    const result = await dataApi.from('routine_template_items').insert({ template_id: templateId, position: count ?? 0, title: input.title.trim(), scheduled_time: input.scheduledTime, details: input.details?.trim() || null })
    if (result.error) throw failure('create template item', '루틴 항목을 저장하지 못했습니다.', result.error)
  }
  notify()
}

export async function deleteTemplateItem(id: string) {
  const { error } = await dataApi.from('routine_template_items').delete().eq('id', id)
  if (error) throw failure('delete template item', '루틴 항목을 삭제하지 못했습니다.', error)
  notify()
}

export async function moveTemplateItem(items: RoutineItem[], id: string, direction: -1 | 1) {
  const index = items.findIndex(item => item.id === id)
  const swap = index + direction
  if (index < 0 || swap < 0 || swap >= items.length) return
  const first = items[index]
  const second = items[swap]
  const [a, b] = await Promise.all([
    dataApi.from('routine_template_items').update({ position: second.position }).eq('id', first.id),
    dataApi.from('routine_template_items').update({ position: first.position }).eq('id', second.id),
  ])
  if (a.error || b.error) throw failure('reorder template items', '루틴 순서를 변경하지 못했습니다.', a.error ?? b.error)
  notify()
}

export async function getDailyRoutine(date: string) {
  const ensured = await dataApi.rpc('ensure_routine_instance', { target_date: date })
  if (ensured.error) throw failure('ensure daily snapshot', '오늘의 루틴을 불러오지 못했습니다.', ensured.error)
  const instanceId = String(ensured.data)
  const { data, error } = await dataApi.from('routine_instance_items').select('id,position,scheduled_time,title,details,completed_at').eq('instance_id', instanceId).order('position')
  if (error) throw failure('load daily snapshot', '오늘의 루틴을 불러오지 못했습니다.', error)
  return (data ?? []).map(row => mapItem(row as Record<string, unknown>))
}

export async function setRoutineItemCompleted(id: string, completed: boolean) {
  const { error } = await dataApi.from('routine_instance_items').update({ completed_at: completed ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw failure('update daily completion', '루틴 완료 상태를 저장하지 못했습니다.', error)
  notify()
}
